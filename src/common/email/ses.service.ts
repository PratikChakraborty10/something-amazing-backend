import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  SendBulkTemplatedEmailCommand,
  BulkEmailDestination,
} from '@aws-sdk/client-ses';
import {
  EmailProvider,
  SendTestEmailParams,
  SendCampaignParams,
  SendCampaignResult,
  ContactData,
} from './email.interface';

@Injectable()
export class SesService implements EmailProvider {
  private readonly ses: SESClient;
  private readonly logger = new Logger(SesService.name);

  constructor(private readonly configService: ConfigService) {
    // CRITICAL: Read region from multiple sources to ensure it's set correctly
    // Priority: 1. ConfigService AWS_SES_REGION, 2. process.env.AWS_SES_REGION, 3. Hardcoded ap-south-1
    const configSesRegion = this.configService.get<string>('AWS_SES_REGION');
    const envSesRegion = process.env.AWS_SES_REGION;
    const lambdaRegion = process.env.AWS_REGION; // Lambda sets this to deployment region

    // Debug logging - critical for troubleshooting Lambda
    this.logger.log(
      `DEBUG - AWS_SES_REGION from ConfigService: "${configSesRegion}"`,
    );
    this.logger.log(
      `DEBUG - AWS_SES_REGION from process.env: "${envSesRegion}"`,
    );
    this.logger.log(
      `DEBUG - AWS_REGION from process.env (Lambda): "${lambdaRegion}"`,
    );

    // Use AWS_SES_REGION first (from config or env), then HARDCODED ap-south-1
    // Do NOT use AWS_REGION as it's set by Lambda to the deployment region (could be different)
    // IMPORTANT: Explicitly check for truthy value, not just || which can fail on empty string
    let region = 'ap-south-1'; // Default - HARDCODED
    if (configSesRegion && configSesRegion.trim() !== '') {
      region = configSesRegion.trim();
    } else if (envSesRegion && envSesRegion.trim() !== '') {
      region = envSesRegion.trim();
    }

    this.logger.log(`FINAL - Using SES region: "${region}"`);

    // We do NOT manually set credentials here.
    // The AWS SDK (v3) automatically detects credentials from the environment:
    // 1. In Lambda: It uses the IAM Role credentials
    // 2. Locally: It uses credentials from process.env provided by .env

    this.ses = new SESClient({ region });
  }

  /**
   * Replace personalization tokens with contact data
   */
  private replaceTokens(content: string, contact: ContactData): string {
    return content
      .replace(/\{\{firstName\}\}/g, contact.firstName || '')
      .replace(/\{\{lastName\}\}/g, contact.lastName || '')
      .replace(/\{\{email\}\}/g, contact.email || '')
      .replace(/\{\{company\}\}/g, contact.company || '');
  }

  /**
   * Send a single test email using generic SendEmail
   */
  async sendTestEmail(
    params: SendTestEmailParams,
  ): Promise<{ messageId: string }> {
    const testContact: ContactData = {
      id: 'test',
      email: params.recipientEmail,
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
    };

    const htmlContent = this.replaceTokens(params.htmlContent, testContact);
    const subject = this.replaceTokens(params.subject, testContact);

    try {
      const command = new SendEmailCommand({
        Source: `${params.senderName} <${params.senderEmail}>`,
        Destination: {
          ToAddresses: [params.recipientEmail],
        },
        ReplyToAddresses: params.replyTo
          ? [params.replyTo]
          : [params.senderEmail],
        Message: {
          Subject: {
            Data: `[TEST] ${subject}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
          },
        },
        Tags: [
          { Name: 'CampaignId', Value: params.campaignId },
          { Name: 'EmailType', Value: 'test' },
        ],
      });

      const result = await this.ses.send(command);
      this.logger.log(
        `Test email sent successfully to ${params.recipientEmail}`,
      );

      return { messageId: result.MessageId || 'unknown' };
    } catch (error) {
      this.logger.error(`Error sending test email: ${error}`);
      throw error;
    }
  }

  /**
   * Send campaign using SendBulkTemplatedEmail
   * Note: SES requires templates to be created beforehand for Bulk sending,
   * BUT we can also use SendEmail in parallel/batches if we don't want to manage SES templates.
   *
   * However, for "Bulk" sending with personalization, SES recommends SendBulkTemplatedEmail.
   * Since we are doing client-side replacement in the previous code, we can stick to that
   * OR use SES templates. Creating SES templates dynamically is complex.
   *
   * ALTERNATIVE: Use `SendEmail` in batches (rate limited).
   * AWS SES default rate limit is usually 14 emails/second in sandbox, higher in production.
   *
   * Let's stick to client-side replacement and batched `SendEmail` calls for simplicity
   * and to match the previous logic, but we must be careful with rate limits.
   *
   * ACTUALLY: `SendBulkTemplatedEmail` is best, but requires a template.
   * A common pattern is to create a temporary template or use a generic one.
   *
   * FOR NOW: To keep it simple and robust without managing SES templates state,
   * I will implement batched `SendEmail` calls (Raw email sending).
   * This is what the ResendService was doing (batch endpoint).
   * SES doesn't have a simple "batch send these raw emails" endpoint like Resend.
   *
   * So we will iterate and send.
   */
  async sendCampaign(params: SendCampaignParams): Promise<SendCampaignResult> {
    // SES Rate limits can be tricky. We'll do chunks.
    // Default to a safe concurrency.
    const CONCURRENCY = 10;
    const contacts = params.contacts;

    let totalSent = 0;
    let totalFailed = 0;
    const messageIds: string[] = [];

    this.logger.log(
      `Sending campaign ${params.campaignId} to ${contacts.length} contacts via SES`,
    );

    // Process in chunks to avoid overwhelming the rate limiter
    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const chunk = contacts.slice(i, i + CONCURRENCY);
      const promises = chunk.map(async (contact) => {
        try {
          const htmlContent = this.replaceTokens(params.htmlContent, contact);
          const subject = this.replaceTokens(params.subject, contact);

          const command = new SendEmailCommand({
            Source: `${params.senderName} <${params.senderEmail}>`,
            Destination: { ToAddresses: [contact.email] },
            ReplyToAddresses: params.replyTo
              ? [params.replyTo]
              : [params.senderEmail],
            Message: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: { Html: { Data: htmlContent, Charset: 'UTF-8' } },
            },
            Tags: [
              { Name: 'CampaignId', Value: params.campaignId },
              { Name: 'ContactId', Value: contact.id },
            ],
          });

          const result = await this.ses.send(command);
          return { success: true, id: result.MessageId };
        } catch (error) {
          this.logger.error(
            `Failed to send to ${contact.email}: ${error.message}`,
          );
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);

      results.forEach((r) => {
        if (r.success && r.id) {
          totalSent++;
          messageIds.push(r.id);
        } else {
          totalFailed++;
        }
      });

      // Small delay to be nice to the rate limiter (approx 14/sec usually)
      // 10 emails / 500ms = 20 emails/sec max
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.logger.log(
      `Campaign ${params.campaignId} complete: ${totalSent} sent, ${totalFailed} failed`,
    );

    return {
      sent: totalSent,
      failed: totalFailed,
      messageIds,
    };
  }
}
