# Campaigns API Documentation

This document provides comprehensive documentation for the Campaigns and Email Templates API endpoints. All endpoints are designed for frontend consumption and follow RESTful conventions.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL](#base-url)
3. [Campaigns API](#campaigns-api)
   - [List Campaigns](#list-campaigns)
   - [Get Campaign](#get-campaign)
   - [Create Campaign](#create-campaign)
   - [Update Campaign](#update-campaign)
   - [Delete Campaign](#delete-campaign)
   - [Duplicate Campaign](#duplicate-campaign)
   - [Send Campaign](#send-campaign)
   - [Schedule Campaign](#schedule-campaign)
   - [Pause Campaign](#pause-campaign)
   - [Resume Campaign](#resume-campaign)
   - [Get Analytics](#get-analytics)
   - [Send Test Email](#send-test-email)
4. [Email Templates API](#email-templates-api)
   - [List Templates](#list-templates)
   - [Get Template Categories](#get-template-categories)
   - [Get Template](#get-template)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Frontend Integration Examples](#frontend-integration-examples)

---

## Authentication

All endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Base URL

```
http://localhost:3001/api
```

For production, replace with your production API URL.

---

## Campaigns API

### List Campaigns

Retrieve all campaigns with pagination, filtering, and statistics.

**Endpoint:** `GET /campaigns`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Items per page (max: 100) |
| `status` | string | all | Filter by status: `all`, `draft`, `scheduled`, `sending`, `sent`, `paused`, `failed` |
| `search` | string | - | Search by campaign name or subject |
| `sortBy` | string | createdAt | Sort field: `createdAt`, `name`, `recipients`, `status` |
| `sortOrder` | string | desc | Sort direction: `asc`, `desc` |

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/campaigns?page=1&limit=10&status=draft" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
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
      "sentAt": null,
      "htmlContent": "<h1>Hello {{firstName}}!</h1>...",
      "templateId": "welcome-email",
      "recipients": 5420,
      "delivered": 0,
      "opened": 0,
      "clicked": 0,
      "bounced": 0,
      "complained": 0,
      "createdAt": "2024-12-01T00:00:00.000Z",
      "updatedAt": "2024-12-05T10:00:00.000Z",
      "listName": "Newsletter Subscribers, VIP Customers"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
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

### Get Campaign

Retrieve a single campaign by ID.

**Endpoint:** `GET /campaigns/:id`

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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
  "sentAt": null,
  "htmlContent": "<h1>Hello {{firstName}}!</h1>...",
  "templateId": "welcome-email",
  "recipients": 5420,
  "delivered": 0,
  "opened": 0,
  "clicked": 0,
  "bounced": 0,
  "complained": 0,
  "createdAt": "2024-12-01T00:00:00.000Z",
  "updatedAt": "2024-12-05T10:00:00.000Z",
  "listName": "Newsletter Subscribers",
  "lists": [
    {
      "id": "list-uuid",
      "name": "Newsletter Subscribers"
    }
  ]
}
```

---

### Create Campaign

Create a new campaign. New campaigns are always created with `draft` status.

**Endpoint:** `POST /campaigns`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Campaign name (internal) |
| `subject` | string | ✅ | Email subject line |
| `senderName` | string | ✅ | "From" display name |
| `senderEmail` | string | ✅ | "From" email address |
| `description` | string | ❌ | Internal description |
| `preheader` | string | ❌ | Email preheader text |
| `replyTo` | string | ❌ | Reply-to email address |
| `sendType` | string | ❌ | `now` or `scheduled` (default: `now`) |
| `scheduledAt` | string | ❌ | ISO 8601 date for scheduled send |
| `selectedListIds` | string[] | ❌ | Array of contact list UUIDs |

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "December Newsletter",
    "subject": "Your December update is here!",
    "senderName": "John from Acme",
    "senderEmail": "hello@acme.com",
    "description": "Monthly newsletter for December",
    "preheader": "Check out what is new this month",
    "replyTo": "support@acme.com",
    "sendType": "now",
    "selectedListIds": ["list-uuid-1", "list-uuid-2"]
  }'
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "December Newsletter",
  "status": "draft",
  "createdAt": "2024-12-06T14:30:00.000Z",
  "recipients": 14845
}
```

---

### Update Campaign

Update an existing draft campaign. Only draft campaigns can be updated.

**Endpoint:** `PATCH /campaigns/:id`

**Request Body:** (all fields optional)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Campaign name |
| `subject` | string | Email subject line |
| `senderName` | string | "From" display name |
| `senderEmail` | string | "From" email address |
| `description` | string | Internal description |
| `preheader` | string | Email preheader text |
| `replyTo` | string | Reply-to email address |
| `sendType` | string | `now` or `scheduled` |
| `scheduledAt` | string | ISO 8601 date |
| `selectedListIds` | string[] | Array of contact list UUIDs |
| `htmlContent` | string | Email HTML content |
| `templateId` | string | Template ID used |

**Example Request:**
```bash
curl -X PATCH "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "htmlContent": "<h1>Updated content</h1><p>Hello {{firstName}}!</p>",
    "subject": "Updated Subject Line"
  }'
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "December Newsletter",
  "subject": "Updated Subject Line",
  "htmlContent": "<h1>Updated content</h1><p>Hello {{firstName}}!</p>",
  "updatedAt": "2024-12-06T15:00:00.000Z"
}
```

---

### Delete Campaign

Delete a draft campaign. Only draft campaigns can be deleted.

**Endpoint:** `DELETE /campaigns/:id`

**Example Request:**
```bash
curl -X DELETE "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

**Response:** `204 No Content`

---

### Duplicate Campaign

Create a copy of an existing campaign as a new draft.

**Endpoint:** `POST /campaigns/:id/duplicate`

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/duplicate" \
  -H "Authorization: Bearer <token>"
```

**Response:** `201 Created`
```json
{
  "id": "new-campaign-uuid",
  "name": "December Newsletter (Copy)",
  "status": "draft",
  "createdAt": "2024-12-06T15:30:00.000Z"
}
```

---

### Send Campaign

Send a campaign immediately. Campaign must have HTML content and recipients.

**Endpoint:** `POST /campaigns/:id/send`

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/send" \
  -H "Authorization: Bearer <token>"
```

**Response:** `202 Accepted`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "sent",
  "sentAt": "2024-12-06T15:45:00.000Z",
  "delivered": 5420
}
```

---

### Schedule Campaign

Schedule a campaign for later sending.

**Endpoint:** `POST /campaigns/:id/schedule`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduledAt` | string | ✅ | ISO 8601 date/time (must be in future) |

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/schedule" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2024-12-10T09:00:00Z"
  }'
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "scheduled",
  "scheduledAt": "2024-12-10T09:00:00.000Z"
}
```

---

### Pause Campaign

Pause a sending or scheduled campaign.

**Endpoint:** `POST /campaigns/:id/pause`

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/pause" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "paused"
}
```

---

### Resume Campaign

Resume a paused campaign.

**Endpoint:** `POST /campaigns/:id/resume`

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/resume" \
  -H "Authorization: Bearer <token>"
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "scheduled"
}
```

---

### Get Analytics

Retrieve campaign performance analytics.

**Endpoint:** `GET /campaigns/:id/analytics`

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/analytics" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "campaignId": "550e8400-e29b-41d4-a716-446655440000",
  "overview": {
    "recipients": 5420,
    "delivered": 5380,
    "deliveryRate": 99.26,
    "opened": 2156,
    "openRate": 40.07,
    "clicked": 432,
    "clickRate": 8.03,
    "bounced": 40,
    "bounceRate": 0.74,
    "complained": 2,
    "complaintRate": 0.04
  },
  "timeline": [
    {
      "timestamp": "2024-12-05T10:00:00.000Z",
      "event": "sent",
      "count": 5420
    },
    {
      "timestamp": "2024-12-05T10:15:00.000Z",
      "event": "opened",
      "count": 1200
    }
  ]
}
```

---

### Send Test Email

Send a test email to a specific recipient for preview.

**Endpoint:** `POST /campaigns/:id/test`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipientEmail` | string | ✅ | Email address for test |

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/campaigns/550e8400-e29b-41d4-a716-446655440000/test" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "test@example.com"
  }'
```

**Response:** `200 OK`
```json
{
  "message": "Test email sent successfully (simulated)",
  "recipientEmail": "test@example.com"
}
```

> **Note:** Actual email sending is simulated in Phase 1. Resend integration will be added in Phase 2.

---

## Email Templates API

### List Templates

Retrieve all available email templates (without full content).

**Endpoint:** `GET /email-templates`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `search` | string | Search by name or tags |

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/email-templates?category=Marketing" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "welcome-email",
      "name": "Welcome Email",
      "description": "A warm welcome email for new subscribers",
      "category": "Onboarding",
      "thumbnail": null,
      "tags": ["welcome", "onboarding", "new-user"],
      "createdAt": "2024-12-01T00:00:00.000Z",
      "updatedAt": "2024-12-01T00:00:00.000Z"
    },
    {
      "id": "product-announcement",
      "name": "Product Announcement",
      "description": "Announce new features or products to your audience",
      "category": "Marketing",
      "thumbnail": null,
      "tags": ["product", "announcement", "launch", "marketing"],
      "createdAt": "2024-12-01T00:00:00.000Z",
      "updatedAt": "2024-12-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Template Categories

Retrieve all available template categories.

**Endpoint:** `GET /email-templates/categories`

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/email-templates/categories" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
["Marketing", "Newsletter", "Onboarding"]
```

---

### Get Template

Retrieve a single template with full HTML content.

**Endpoint:** `GET /email-templates/:id`

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/email-templates/welcome-email" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": "welcome-email",
  "name": "Welcome Email",
  "description": "A warm welcome email for new subscribers",
  "category": "Onboarding",
  "thumbnail": null,
  "content": "<div style=\"font-family: Arial...\">...</div>",
  "tags": ["welcome", "onboarding", "new-user"],
  "createdAt": "2024-12-01T00:00:00.000Z",
  "updatedAt": "2024-12-01T00:00:00.000Z"
}
```

---

## Data Models

### Campaign Status Values

| Status | Description |
|--------|-------------|
| `draft` | Campaign is being created/edited |
| `scheduled` | Campaign is scheduled for future send |
| `sending` | Campaign is currently being sent |
| `sent` | Campaign has been sent |
| `paused` | Campaign sending is paused |
| `failed` | Campaign send failed |

### Send Type Values

| Type | Description |
|------|-------------|
| `now` | Send immediately when triggered |
| `scheduled` | Send at scheduled time |

### Personalization Tokens

These tokens can be used in email content and subject lines:

| Token | Description |
|-------|-------------|
| `{{firstName}}` | Contact's first name |
| `{{lastName}}` | Contact's last name |
| `{{email}}` | Contact's email address |
| `{{company}}` | Contact's company name |

---

## Error Handling

All errors return a consistent JSON format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |

### Campaign-Specific Errors

| Error | Cause |
|-------|-------|
| "Only draft campaigns can be updated" | Trying to update non-draft campaign |
| "Only draft campaigns can be deleted" | Trying to delete non-draft campaign |
| "Campaign has no email content" | Trying to send without HTML content |
| "Campaign has no recipients" | Trying to send without selected lists |
| "Scheduled time must be in the future" | Invalid schedule date |

---

## Frontend Integration Examples

### React/Next.js API Service

```typescript
// lib/campaigns-api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Campaigns
export const campaignsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchWithAuth(`/campaigns?${query}`);
  },

  get: (id: string) => fetchWithAuth(`/campaigns/${id}`),

  create: (data: {
    name: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    description?: string;
    preheader?: string;
    replyTo?: string;
    sendType?: 'now' | 'scheduled';
    scheduledAt?: string;
    selectedListIds?: string[];
  }) => fetchWithAuth('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: Partial<{
    name: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    description: string;
    preheader: string;
    replyTo: string;
    sendType: 'now' | 'scheduled';
    scheduledAt: string;
    selectedListIds: string[];
    htmlContent: string;
    templateId: string;
  }>) => fetchWithAuth(`/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => fetchWithAuth(`/campaigns/${id}`, {
    method: 'DELETE',
  }),

  duplicate: (id: string) => fetchWithAuth(`/campaigns/${id}/duplicate`, {
    method: 'POST',
  }),

  send: (id: string) => fetchWithAuth(`/campaigns/${id}/send`, {
    method: 'POST',
  }),

  schedule: (id: string, scheduledAt: string) => fetchWithAuth(`/campaigns/${id}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  }),

  pause: (id: string) => fetchWithAuth(`/campaigns/${id}/pause`, {
    method: 'POST',
  }),

  resume: (id: string) => fetchWithAuth(`/campaigns/${id}/resume`, {
    method: 'POST',
  }),

  getAnalytics: (id: string) => fetchWithAuth(`/campaigns/${id}/analytics`),

  sendTest: (id: string, recipientEmail: string) => fetchWithAuth(`/campaigns/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ recipientEmail }),
  }),
};

// Email Templates
export const templatesApi = {
  list: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchWithAuth(`/email-templates?${query}`);
  },

  getCategories: () => fetchWithAuth('/email-templates/categories'),

  get: (id: string) => fetchWithAuth(`/email-templates/${id}`),
};
```

### Usage Example

```typescript
// Example: Create Campaign Flow

import { campaignsApi, templatesApi } from '@/lib/campaigns-api';

// Step 1: Create campaign with basic info
const campaign = await campaignsApi.create({
  name: 'December Newsletter',
  subject: 'Your December update is here!',
  senderName: 'John from Acme',
  senderEmail: 'hello@acme.com',
  selectedListIds: ['list-uuid-1'],
});

// Step 2: Load a template
const template = await templatesApi.get('welcome-email');

// Step 3: Update campaign with template content
await campaignsApi.update(campaign.id, {
  htmlContent: template.content,
  templateId: template.id,
});

// Step 4: Send test email
await campaignsApi.sendTest(campaign.id, 'test@example.com');

// Step 5: Send campaign
await campaignsApi.send(campaign.id);
```

---

## Database Tables Created

The following tables are automatically created by TypeORM:

### `campaigns`
Main campaign storage with status, metrics, and email content.

### `campaign_events`
Event tracking for analytics (opens, clicks, bounces, etc.).

### `campaign_lists`
Join table linking campaigns to contact lists (many-to-many).

### `email_templates`
Pre-built email templates with HTML content.

---

## Default Templates Available

| ID | Name | Category |
|----|------|----------|
| `welcome-email` | Welcome Email | Onboarding |
| `product-announcement` | Product Announcement | Marketing |
| `newsletter` | Newsletter | Newsletter |
| `promotional` | Promotional Offer | Marketing |

These templates are automatically seeded when the server starts.
