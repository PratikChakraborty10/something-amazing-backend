export interface ContactData {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}

export interface SendTestEmailParams {
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  subject: string;
  htmlContent: string;
  campaignId: string;
}

export interface SendCampaignParams {
  campaignId: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  subject: string;
  htmlContent: string;
  contacts: ContactData[];
}

export interface SendCampaignResult {
  sent: number;
  failed: number;
  messageIds: string[];
}

export interface EmailProvider {
  sendTestEmail(params: SendTestEmailParams): Promise<{ messageId: string }>;
  sendCampaign(params: SendCampaignParams): Promise<SendCampaignResult>;
}
