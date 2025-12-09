# Campaigns Feature Documentation

This document provides a comprehensive overview of the Campaigns feature implementation in the frontend application, along with the backend API specifications required to make it fully dynamic.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Flow & Pages](#user-flow--pages)
3. [Data Models](#data-models)
4. [Frontend Implementation Details](#frontend-implementation-details)
5. [Backend API Specifications](#backend-api-specifications)
6. [Integration Notes](#integration-notes)

---

## Feature Overview

The Campaigns feature is a complete email marketing campaign management system that allows users to:

- **View & manage campaigns** - List all campaigns with filtering, sorting, and bulk actions
- **Create new campaigns** - Multi-step wizard for campaign creation
- **Design emails** - Rich text editor with templates and personalization
- **Review & send** - Final review with pre-send checklist
- **Track performance** - View analytics for sent campaigns

### Key Capabilities

| Capability | Description |
|------------|-------------|
| Campaign Listing | View all campaigns with status, recipients, and performance metrics |
| Multi-step Creation | 3-step wizard: Details → Design → Review |
| Rich Email Editor | TipTap-based WYSIWYG editor with formatting tools |
| Template Library | Pre-built email templates for quick starts |
| Personalization | Dynamic tokens ({{firstName}}, {{lastName}}, etc.) |
| Scheduling | Send now or schedule for later |
| Preview | Desktop/mobile responsive preview |
| Recipient Selection | Select from existing contact lists |

---

## User Flow & Pages

```
/campaigns ──> /campaigns/create-campaign ──> /campaigns/email-editor ──> /campaigns/review ──> Campaign Sent
    │
    ├──> View Campaign Details (/campaigns/[id])
    └──> View Campaign Report (/campaigns/[id]/report)
```

### Page Breakdown

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/campaigns` | Campaign listing & dashboard | Stats cards, tabbed view (All/Active/Drafts), search, sort, actions |
| `/campaigns/create-campaign` | Step 1: Campaign details | Campaign name, subject, sender info, scheduling, recipient lists |
| `/campaigns/email-editor` | Step 2: Email design | Rich text editor, templates, personalization tokens, preview |
| `/campaigns/review` | Step 3: Review & send | Summary, checklist, send/schedule confirmation |
| `/campaigns/[id]` | Campaign details (placeholder) | View individual campaign |
| `/campaigns/[id]/report` | Campaign analytics (placeholder) | Performance metrics |

---

## Data Models

### Campaign

The core campaign model representing an email campaign:

```typescript
interface Campaign {
  id: string;
  name: string;                    // Campaign name (internal)
  subject: string;                 // Email subject line
  status: CampaignStatus;          // Current status
  createdAt: Date;                 // Creation timestamp
  scheduledAt?: Date;              // Scheduled send time (optional)
  sentAt?: Date;                   // Actual send time (optional)
  recipients: number;              // Total recipient count
  delivered?: number;              // Emails delivered
  opened?: number;                 // Unique opens
  clicked?: number;                // Unique clicks
  listName: string;                // Display name of recipient list(s)
}

type CampaignStatus = 
  | "draft"      // Not yet complete
  | "scheduled"  // Complete, waiting for scheduled time
  | "sending"    // Currently being sent
  | "sent"       // Successfully sent
  | "paused"     // Sending paused
  | "failed";    // Send failed
```

### Extended Campaign Details (for create/edit)

```typescript
interface CampaignDetails extends Campaign {
  description?: string;            // Internal description
  preheader?: string;              // Email preheader text
  senderName: string;              // "From" name
  senderEmail: string;             // "From" email
  replyTo?: string;                // Reply-to email
  sendType: "now" | "scheduled";   // Send timing
  selectedListIds: string[];       // Contact list IDs
  htmlContent: string;             // Email HTML content
  templateId?: string;             // Used template ID
}
```

### Contact List (for recipient selection)

```typescript
interface ContactList {
  id: string;
  name: string;
  description: string;
  contactCount: number;           // Total contacts in list
  validCount: number;             // Verified/sendable emails
  tags: string[];                 // Categorization tags
}
```

### Email Template

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;               // e.g., "Onboarding", "Marketing"
  thumbnail?: string;             // Preview image URL
  content: string;                // HTML content
  tags: string[];                 // Search tags
}
```

### Personalization Token

```typescript
interface PersonalizationToken {
  label: string;                  // Display name
  value: string;                  // Token syntax (e.g., "{{firstName}}")
  icon: ComponentType;            // Icon component
}
```

---

## Frontend Implementation Details

### 1. Campaigns Listing Page (`page.tsx`)

**File:** `app/(campaigns)/campaigns/page.tsx`

#### Features Implemented

- **Stats Dashboard**: 6 stat cards showing totals and averages
- **Tabbed Navigation**: All / Active / Drafts
- **Search**: Filter by name, subject, or list name
- **Sorting**: By date, name, recipients, or status
- **Campaign Table**: Status badges, performance metrics, date info
- **Actions**: Edit, View, Duplicate, Delete (with confirmation dialog)
- **Empty States**: Friendly prompts when no campaigns exist

#### UI Components Used
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `DropdownMenu` for actions
- `AlertDialog` for delete confirmation
- `Badge` for status indicators

---

### 2. Create Campaign Page (`create-campaign/page.tsx`)

**File:** `app/(campaigns)/campaigns/create-campaign/page.tsx`

#### Features Implemented

- **Campaign Details Card**: Name, description
- **Email Settings Card**: Subject (with AI suggest placeholder), preheader, sender info
- **Schedule Card**: Send now vs scheduled (with date/time pickers)
- **Recipients Card**: Searchable contact list selection with multi-select
- **Validation**: Required field validation with error messages
- **Progress Indicator**: 3-step stepper

#### Form Fields

| Field | Required | Validation |
|-------|----------|------------|
| Campaign Name | Yes | Not empty |
| Subject Line | Yes | Not empty |
| Sender Name | Yes | Not empty |
| Sender Email | Yes | Valid email format |
| Contact Lists | Yes | At least one selected |
| Description | No | - |
| Preheader | No | - |
| Reply-To | No | Valid email if provided |
| Schedule Date/Time | Conditional | Required if scheduled |

---

### 3. Email Editor Page (`email-editor/page.tsx`)

**File:** `app/(campaigns)/campaigns/email-editor/page.tsx`

#### Features Implemented

- **Rich Text Editor**: TipTap-based with full formatting
- **Toolbar**: Bold, italic, underline, strikethrough, headings, alignment, lists, quotes, code blocks
- **Link/Image Dialogs**: Insert hyperlinks and images
- **Personalization Dropdown**: Insert dynamic tokens
- **Template Sheet**: Pre-built template library with preview
- **Live Preview**: Desktop/mobile responsive preview with token replacement
- **Auto-save**: Save as draft functionality

#### Editor Extensions Used
- `StarterKit` (basic formatting)
- `Underline`
- `TextAlign`
- `Link`
- `Image`
- `Placeholder`
- `TextStyle` & `Color`

#### Pre-built Templates
1. **Welcome Email** (Onboarding)
2. **Product Announcement** (Marketing)

---

### 4. Review & Send Page (`review/page.tsx`)

**File:** `app/(campaigns)/campaigns/review/page.tsx`

#### Features Implemented

- **Campaign Details Summary**: Read-only view of all settings
- **Recipients Summary**: Selected lists with counts
- **Email Preview**: Responsive preview (desktop/mobile)
- **Pre-Send Checklist**: Visual checklist with warnings
- **Send Schedule Display**: Shows timing selection
- **Send Confirmation**: Dialog with recipient count
- **Success State**: Post-send confirmation screen

#### Checklist Items
- Subject line added ✓
- Sender info complete ✓
- Recipients selected ✓
- Email content ready ✓
- Unsubscribe link (Warning: Recommended)

---

## Backend API Specifications

The following APIs are required to make the campaigns feature fully dynamic.

### Base URL
```
/api/campaigns
```

---

### 1. Campaign CRUD Operations

#### List Campaigns

```http
GET /api/campaigns
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Items per page |
| `status` | string | all | Filter by status (draft, scheduled, sending, sent, paused, failed) |
| `search` | string | - | Search by name, subject, or list name |
| `sortBy` | string | createdAt | Sort field (createdAt, name, recipients, status) |
| `sortOrder` | string | desc | Sort direction (asc, desc) |

**Response:**

```json
{
  "data": [
    {
      "id": "camp_123",
      "name": "December Newsletter",
      "subject": "Your December update is here!",
      "status": "sent",
      "createdAt": "2024-12-01T00:00:00Z",
      "scheduledAt": null,
      "sentAt": "2024-12-05T10:00:00Z",
      "recipients": 5420,
      "delivered": 5380,
      "opened": 2156,
      "clicked": 432,
      "listName": "Newsletter Subscribers"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "stats": {
    "totalCampaigns": 45,
    "drafts": 5,
    "scheduled": 2,
    "sent": 35,
    "avgOpenRate": 42.5,
    "avgClickRate": 12.3
  }
}
```

---

#### Get Campaign by ID

```http
GET /api/campaigns/:id
```

**Response:**

```json
{
  "id": "camp_123",
  "name": "December Newsletter",
  "description": "Monthly newsletter for December",
  "subject": "Your December update is here!",
  "preheader": "Check out what's new this month",
  "senderName": "John from Acme",
  "senderEmail": "hello@acme.com",
  "replyTo": "support@acme.com",
  "status": "draft",
  "sendType": "now",
  "scheduledAt": null,
  "selectedListIds": ["list_1", "list_2"],
  "htmlContent": "<h1>Hello {{firstName}}!</h1>...",
  "templateId": "welcome-email",
  "createdAt": "2024-12-01T00:00:00Z",
  "updatedAt": "2024-12-05T10:00:00Z",
  "recipients": 14845,
  "delivered": null,
  "opened": null,
  "clicked": null
}
```

---

#### Create Campaign

```http
POST /api/campaigns
```

**Request Body:**

```json
{
  "name": "December Newsletter",
  "description": "Monthly newsletter for December",
  "subject": "Your December update is here!",
  "preheader": "Check out what's new this month",
  "senderName": "John from Acme",
  "senderEmail": "hello@acme.com",
  "replyTo": "support@acme.com",
  "sendType": "scheduled",
  "scheduledAt": "2024-12-10T09:00:00Z",
  "selectedListIds": ["list_1", "list_2"]
}
```

**Response:** `201 Created`

```json
{
  "id": "camp_124",
  "name": "December Newsletter",
  "status": "draft",
  "createdAt": "2024-12-06T14:30:00Z"
}
```

---

#### Update Campaign

```http
PATCH /api/campaigns/:id
```

**Request Body:** (partial update)

```json
{
  "name": "Updated Newsletter Name",
  "htmlContent": "<h1>Updated content...</h1>"
}
```

**Response:** `200 OK`

```json
{
  "id": "camp_123",
  "name": "Updated Newsletter Name",
  "updatedAt": "2024-12-06T15:00:00Z"
}
```

---

#### Delete Campaign

```http
DELETE /api/campaigns/:id
```

**Response:** `204 No Content`

> **Note:** Only draft campaigns should be deletable. Sent/scheduled campaigns should require archiving instead.

---

#### Duplicate Campaign

```http
POST /api/campaigns/:id/duplicate
```

**Response:** `201 Created`

```json
{
  "id": "camp_125",
  "name": "December Newsletter (Copy)",
  "status": "draft",
  "createdAt": "2024-12-06T15:30:00Z"
}
```

---

### 2. Campaign Actions

#### Send Campaign Now

```http
POST /api/campaigns/:id/send
```

**Response:** `202 Accepted`

```json
{
  "id": "camp_123",
  "status": "sending",
  "estimatedCompletion": "2024-12-06T15:45:00Z"
}
```

---

#### Schedule Campaign

```http
POST /api/campaigns/:id/schedule
```

**Request Body:**

```json
{
  "scheduledAt": "2024-12-10T09:00:00Z"
}
```

**Response:** `200 OK`

```json
{
  "id": "camp_123",
  "status": "scheduled",
  "scheduledAt": "2024-12-10T09:00:00Z"
}
```

---

#### Pause Campaign

```http
POST /api/campaigns/:id/pause
```

**Response:** `200 OK`

---

#### Resume Campaign

```http
POST /api/campaigns/:id/resume
```

**Response:** `200 OK`

---

### 3. Email Templates

#### List Templates

```http
GET /api/email-templates
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `search` | string | Search by name or tags |

**Response:**

```json
{
  "data": [
    {
      "id": "welcome-email",
      "name": "Welcome Email",
      "description": "A warm welcome email for new subscribers",
      "category": "Onboarding",
      "thumbnail": "https://cdn.example.com/templates/welcome.png",
      "tags": ["welcome", "onboarding", "new-user"]
    }
  ]
}
```

---

#### Get Template Content

```http
GET /api/email-templates/:id
```

**Response:**

```json
{
  "id": "welcome-email",
  "name": "Welcome Email",
  "description": "A warm welcome email for new subscribers",
  "category": "Onboarding",
  "content": "<h1>Welcome aboard, {{firstName}}! 🎉</h1>...",
  "tags": ["welcome", "onboarding", "new-user"]
}
```

---

### 4. Contact Lists (for recipient selection)

#### List Contact Lists

```http
GET /api/contact-lists
```

> **Note:** This endpoint may already exist in your contacts API. Ensure it returns `validCount` for accurate recipient counts.

**Response:**

```json
{
  "data": [
    {
      "id": "list_1",
      "name": "Q4 Product Launch Leads",
      "description": "Enterprise prospects for Q4 campaign",
      "contactCount": 2847,
      "validCount": 2756,
      "tags": ["enterprise", "product-launch"]
    }
  ]
}
```

---

### 5. Campaign Analytics

#### Get Campaign Report

```http
GET /api/campaigns/:id/analytics
```

**Response:**

```json
{
  "campaignId": "camp_123",
  "overview": {
    "recipients": 5420,
    "delivered": 5380,
    "deliveryRate": 99.3,
    "opened": 2156,
    "openRate": 40.1,
    "clicked": 432,
    "clickRate": 8.0,
    "bounced": 40,
    "bounceRate": 0.7,
    "unsubscribed": 12,
    "unsubscribeRate": 0.2,
    "complained": 2,
    "complaintRate": 0.04
  },
  "timeline": [
    {
      "timestamp": "2024-12-05T10:00:00Z",
      "event": "sent",
      "count": 5420
    },
    {
      "timestamp": "2024-12-05T10:15:00Z",
      "event": "opened",
      "count": 1200
    }
  ],
  "linkClicks": [
    {
      "url": "https://example.com/product",
      "clicks": 245,
      "uniqueClicks": 198
    }
  ]
}
```

---

### 6. Send Test Email

```http
POST /api/campaigns/:id/test
```

**Request Body:**

```json
{
  "recipientEmail": "test@example.com"
}
```

**Response:** `200 OK`

```json
{
  "message": "Test email sent successfully",
  "recipientEmail": "test@example.com"
}
```

---

### 7. AI Subject Line Suggestions (Future)

```http
POST /api/campaigns/suggest-subjects
```

**Request Body:**

```json
{
  "campaignName": "December Newsletter",
  "description": "Monthly update with new features",
  "tone": "friendly"
}
```

**Response:**

```json
{
  "suggestions": [
    "Your December update is here! 🎉",
    "What's new this month at Acme",
    "December highlights just for you"
  ]
}
```

---

## Resend API Integration (Backend)

The backend is responsible for integrating with [Resend](https://resend.com) to actually send campaign emails. Below are the implementation requirements.

### Required Environment Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Resend SDK Setup

Install the Resend SDK in your backend:

```bash
npm install resend
```

Initialize the client:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
```

---

### Email Sending Implementation

#### Single Email (for test emails)

```typescript
// POST /api/campaigns/:id/test
async function sendTestEmail(campaignId: string, recipientEmail: string) {
  const campaign = await getCampaignById(campaignId);
  
  // Replace personalization tokens with test data
  const htmlContent = replaceTokens(campaign.htmlContent, {
    firstName: 'Test',
    lastName: 'User',
    email: recipientEmail,
    company: 'Test Company',
  });

  const { data, error } = await resend.emails.send({
    from: `${campaign.senderName} <${campaign.senderEmail}>`,
    to: recipientEmail,
    replyTo: campaign.replyTo || campaign.senderEmail,
    subject: `[TEST] ${campaign.subject}`,
    html: htmlContent,
    headers: {
      'X-Campaign-Id': campaignId,
      'X-Email-Type': 'test',
    },
  });

  if (error) {
    throw new Error(`Failed to send test email: ${error.message}`);
  }

  return { messageId: data.id };
}
```

---

#### Batch Email Sending (for campaigns)

For sending to multiple recipients, use Resend's batch API:

```typescript
// POST /api/campaigns/:id/send
async function sendCampaign(campaignId: string) {
  const campaign = await getCampaignById(campaignId);
  const contacts = await getContactsFromLists(campaign.selectedListIds);
  
  // Update campaign status to "sending"
  await updateCampaignStatus(campaignId, 'sending');
  
  // Prepare batch emails (max 100 per batch in Resend)
  const BATCH_SIZE = 100;
  const batches = chunkArray(contacts, BATCH_SIZE);
  
  let totalSent = 0;
  let totalFailed = 0;

  for (const batch of batches) {
    const emails = batch.map((contact) => ({
      from: `${campaign.senderName} <${campaign.senderEmail}>`,
      to: contact.email,
      replyTo: campaign.replyTo || campaign.senderEmail,
      subject: replaceTokens(campaign.subject, contact),
      html: replaceTokens(campaign.htmlContent, contact),
      headers: {
        'X-Campaign-Id': campaignId,
        'X-Contact-Id': contact.id,
      },
    }));

    const { data, error } = await resend.batch.send(emails);

    if (error) {
      totalFailed += batch.length;
      console.error(`Batch failed: ${error.message}`);
    } else {
      totalSent += data.length;
    }
  }

  // Update campaign with results
  await updateCampaign(campaignId, {
    status: 'sent',
    sentAt: new Date(),
    delivered: totalSent,
  });

  return { sent: totalSent, failed: totalFailed };
}
```

---

### Personalization Token Replacement

Replace personalization tokens with contact data before sending:

```typescript
interface ContactData {
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  [key: string]: string | undefined;
}

function replaceTokens(content: string, contact: ContactData): string {
  return content
    .replace(/\{\{firstName\}\}/g, contact.firstName || '')
    .replace(/\{\{lastName\}\}/g, contact.lastName || '')
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{company\}\}/g, contact.company || '');
}
```

---

### Webhook Handling for Delivery Events

Set up a webhook endpoint to receive email events from Resend:

```typescript
// POST /api/webhooks/resend
async function handleResendWebhook(payload: ResendWebhookPayload) {
  const { type, data } = payload;
  
  const campaignId = data.headers?.['X-Campaign-Id'];
  const contactId = data.headers?.['X-Contact-Id'];
  
  if (!campaignId) return;

  switch (type) {
    case 'email.delivered':
      await incrementCampaignMetric(campaignId, 'delivered');
      break;
      
    case 'email.opened':
      await incrementCampaignMetric(campaignId, 'opened');
      await logEmailEvent(campaignId, contactId, 'opened');
      break;
      
    case 'email.clicked':
      await incrementCampaignMetric(campaignId, 'clicked');
      await logEmailEvent(campaignId, contactId, 'clicked', {
        url: data.link?.url,
      });
      break;
      
    case 'email.bounced':
      await incrementCampaignMetric(campaignId, 'bounced');
      await markContactBounced(contactId);
      break;
      
    case 'email.complained':
      await incrementCampaignMetric(campaignId, 'complained');
      await markContactUnsubscribed(contactId);
      break;
  }
}
```

#### Resend Webhook Event Types

| Event | Description |
|-------|-------------|
| `email.sent` | Email was sent from Resend servers |
| `email.delivered` | Email was delivered to recipient's mail server |
| `email.opened` | Recipient opened the email (tracked via pixel) |
| `email.clicked` | Recipient clicked a link in the email |
| `email.bounced` | Email bounced (invalid address) |
| `email.complained` | Recipient marked email as spam |

---

### Scheduled Campaign Processing

For scheduled campaigns, use a cron job or queue processor:

```typescript
// Run every minute via cron or queue
async function processScheduledCampaigns() {
  const now = new Date();
  
  const scheduledCampaigns = await findCampaigns({
    status: 'scheduled',
    scheduledAt: { lte: now },
  });

  for (const campaign of scheduledCampaigns) {
    await sendCampaign(campaign.id);
  }
}
```

---

### Resend API Response Types

```typescript
// Success response from resend.emails.send()
interface ResendSendResponse {
  id: string;  // Message ID
}

// Success response from resend.batch.send()
interface ResendBatchResponse {
  data: Array<{ id: string }>;
}

// Webhook payload structure
interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    headers?: Record<string, string>;
    link?: { url: string };
  };
}
```

---

### Database Schema Additions

To track email delivery events:

```sql
-- Campaign metrics (denormalized for fast reads)
ALTER TABLE campaigns ADD COLUMN delivered INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN opened INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN clicked INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN bounced INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN complained INTEGER DEFAULT 0;

-- Detailed event log (for analytics)
CREATE TABLE campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
```

---

## Integration Notes

### State Management

The frontend currently uses React's `useState` for local state. For production, consider:

1. **Zustand store** for campaign creation wizard state (persists across steps)
2. **React Query / SWR** for server state management and caching
3. **URL params** to pass campaign ID between wizard steps

### Data Flow for Campaign Creation

```
User starts Create Campaign
    │
    ▼
Frontend: GET /api/contact-lists
    │
    ▼
User fills details, selects lists
    │
    ▼
Frontend: POST /api/campaigns (creates draft)
    │
    ▼
User designs email
    │
    ▼
Frontend: PATCH /api/campaigns/:id (saves htmlContent)
    │
    ▼
User reviews & sends
    │
    ▼
Frontend: POST /api/campaigns/:id/send
    │
    ▼
Redirect to success page
```

### Required Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# For image uploads (future)
NEXT_PUBLIC_UPLOAD_URL=https://cdn.example.com/upload
```

### Error Handling

All API endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "Campaign with ID camp_123 not found",
    "details": {}
  }
}
```

---

## Summary

This campaigns feature provides a complete email marketing workflow. The frontend implementation is fully functional with mock data and requires the documented backend APIs to become production-ready.

### Priority Implementation Order

1. **Campaign CRUD** - Core functionality
2. **Contact Lists integration** - Recipient selection
3. **Send/Schedule** - Campaign delivery
4. **Templates** - Quick start content
5. **Analytics** - Performance tracking
6. **AI Suggestions** - Enhancement feature
