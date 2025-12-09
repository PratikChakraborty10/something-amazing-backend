import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Contact data for personalization
 */
export interface ContactData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}

/**
 * ResendService handles email sending via Resend API
 */
@Injectable()
export class ResendService {
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('⚠️  RESEND_API_KEY not configured - email sending will fail');
      throw new Error('RESEND_API_KEY is required for email sending');
    }

    this.resend = new Resend(apiKey);
    this.logger.log('✅ Resend service initialized');
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
   * Send a single test email
   */
  async sendTestEmail(params: {
    recipientEmail: string;
    senderName: string;
    senderEmail: string;
    replyTo?: string | null;
    subject: string;
    htmlContent: string;
    campaignId: string;
  }): Promise<{ messageId: string }> {
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
      const { data, error } = await this.resend.emails.send({
        from: `${params.senderName} <${params.senderEmail}>`,
        to: params.recipientEmail,
        replyTo: params.replyTo || params.senderEmail,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
        headers: {
          'X-Campaign-Id': params.campaignId,
          'X-Email-Type': 'test',
        },
      });

      if (error) {
        this.logger.error(`Failed to send test email: ${error.message}`);
        throw new Error(`Failed to send test email: ${error.message}`);
      }

      this.logger.log(`Test email sent successfully to ${params.recipientEmail}`);
      return { messageId: data!.id };
    } catch (error) {
      this.logger.error(`Error sending test email: ${error}`);
      throw error;
    }
  }

  /**
   * Send campaign to multiple contacts
   * Sends in batches of 100 (Resend's limit)
   */
  async sendCampaign(params: {
    campaignId: string;
    senderName: string;
    senderEmail: string;
    replyTo?: string | null;
    subject: string;
    htmlContent: string;
    contacts: ContactData[];
  }): Promise<{
    sent: number;
    failed: number;
    messageIds: string[];
  }> {
    const BATCH_SIZE = 100;
    const batches: ContactData[][] = [];
    
    // Split contacts into batches
    for (let i = 0; i < params.contacts.length; i += BATCH_SIZE) {
      batches.push(params.contacts.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;
    const messageIds: string[] = [];
    const errors: string[] = [];

    this.logger.log(`Sending campaign ${params.campaignId} to ${params.contacts.length} contacts in ${batches.length} batches`);

    for (const [index, batch] of batches.entries()) {
      this.logger.log(`Processing batch ${index + 1}/${batches.length} (${batch.length} contacts)`);

      const emails = batch.map((contact) => ({
        from: `${params.senderName} <${params.senderEmail}>`,
        to: contact.email,
        replyTo: params.replyTo || params.senderEmail,
        subject: this.replaceTokens(params.subject, contact),
        html: this.replaceTokens(params.htmlContent, contact),
        headers: {
          'X-Campaign-Id': params.campaignId,
          'X-Contact-Id': contact.id,
        },
      }));

      try {
        const { data, error } = await this.resend.batch.send(emails);

        if (error) {
          this.logger.error(`Batch ${index + 1} failed: ${error.message}`);
          errors.push(error.message);
          
          // Throw immediately on critical errors like domain verification
          if (error.message.includes('not verified') || 
              error.message.includes('domain') ||
              error.message.includes('API key')) {
            throw new Error(error.message);
          }
          
          totalFailed += batch.length;
        } else {
          const batchMessageIds = data!.data.map((d) => d.id);
          messageIds.push(...batchMessageIds);
          totalSent += batchMessageIds.length;
          this.logger.log(`Batch ${index + 1} sent successfully (${batchMessageIds.length} emails)`);
        }
      } catch (error) {
        this.logger.error(`Error processing batch ${index + 1}: ${error.message}`);
        // Re-throw the error to propagate to the controller
        throw error;
      }
    }

    // If no emails were sent at all, throw an error
    if (totalSent === 0 && totalFailed > 0) {
      const errorMessage = errors.length > 0 
        ? errors[0] 
        : 'Failed to send campaign emails';
      throw new Error(errorMessage);
    }

    this.logger.log(`Campaign ${params.campaignId} complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      sent: totalSent,
      failed: totalFailed,
      messageIds,
    };
  }
}
