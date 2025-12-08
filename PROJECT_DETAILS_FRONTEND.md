 # Email Marketing Platform - Project Documentation

> **Purpose**: This document provides comprehensive context for building the backend API for this email marketing platform. The frontend is built with Next.js 16 and expects a RESTful API.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)  
3. [Feature Modules](#feature-modules)
4. [Data Models & Database Schema](#data-models--database-schema)
5. [API Endpoints Required](#api-endpoints-required)
6. [Third-Party Integrations](#third-party-integrations)
7. [Authentication & Authorization](#authentication--authorization)
8. [File Structure](#file-structure)

---

## 🎯 Project Overview

This is an **email marketing platform** that allows users to:

- Create and manage email campaigns
- Import and organize contacts into lists
- Design emails with a rich text editor
- Verify sending domains via DNS records
- Track campaign performance (opens, clicks, bounces)
- Schedule campaigns for future delivery

### Target Users
- Marketing teams
- Small to medium businesses
- Newsletter operators

### Core Value Proposition
Self-service email campaign management with custom domain verification for professional sending.

---

## 🛠 Technology Stack

### Frontend (This Repository)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.7 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | Component library (new-york style, neutral base) |
| Tiptap | Latest | Rich text email editor |
| Sonner | Latest | Toast notifications |
| Lucide React | Latest | Icons |

### Backend (To Be Built)
| Recommended | Purpose |
|-------------|---------|
| NestJS or Express | API framework |
| PostgreSQL (Neon) | Primary database |
| Prisma or Drizzle | ORM |
| Resend | Email sending & domain verification |
| Redis | Job queues, caching |
| Bull/BullMQ | Background job processing |

---

## 📦 Feature Modules

### 1. Campaigns Module

**Description**: Create, edit, schedule, and send email campaigns.

**Frontend Pages**:
- `/campaigns` - List all campaigns with filtering, sorting, tabs (All/Active/Drafts)
- `/campaigns/create-campaign` - Create new campaign (name, subject, sender, recipients)
- `/campaigns/email-editor` - Design email content with Tiptap rich text editor
- `/campaigns/review` - Review & send/schedule campaign

**Campaign Statuses**:
| Status | Description |
|--------|-------------|
| `draft` | Created but not sent |
| `scheduled` | Queued for future sending |
| `sending` | Currently being delivered |
| `sent` | Delivery complete |
| `paused` | Temporarily stopped |
| `failed` | Delivery failed |

**Campaign Fields**:
```typescript
interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  htmlContent: string;
  textContent?: string;
  status: CampaignStatus;
  recipientListIds: string[];
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  
  // Metrics (populated after sending)
  totalRecipients?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
}
```

**Features**:
- Rich text email editor with formatting toolbar
- Email templates (pre-built designs)
- Template variables: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{companyName}}`
- Desktop/mobile preview toggle
- Duplicate campaign functionality
- Bulk delete

---

### 2. Contacts Module

**Description**: Manage email contacts and organize them into lists.

**Frontend Pages**:
- `/global-contacts` - View all contacts across all lists
- `/global-contacts/[listId]` - View contacts in a specific list

**Contact Fields**:
```typescript
interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  tags: string[];
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  source: 'import' | 'manual' | 'api' | 'form';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
```

**Features**:
- CSV import with column mapping
- Manual contact creation
- Bulk selection and actions (delete, add tags, move to list)
- Search by name, email, or tags
- Filter by status, tags, date range
- Export contacts to CSV
- Tag management

**Import Flow**:
1. User uploads CSV file
2. Frontend parses and shows column mapping UI
3. User maps CSV columns to contact fields
4. Frontend sends parsed data to backend
5. Backend validates, deduplicates, and inserts

---

### 3. Domains Module (Sending Domains)

**Description**: Verify custom domains for email sending via DNS records.

**Frontend Pages**:
- `/settings/domains` - List all domains
- `/settings/domains/[id]` - View DNS records for a domain

**Domain Fields**:
```typescript
interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  region: string;
  createdAt: string;
  verifiedAt?: string;
  records: DnsRecord[];
  userId: string;
}

interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  ttl: string;
  status: 'pending' | 'verified' | 'failed';
  priority?: number;
}
```

**Current API Routes** (already implemented in frontend API routes, proxy to Resend):
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/domains` | List all domains |
| POST | `/api/domains` | Add new domain |
| GET | `/api/domains/[id]` | Get domain with DNS records |
| POST | `/api/domains/[id]/verify` | Trigger DNS verification |
| DELETE | `/api/domains/[id]` | Remove domain |

**Resend Integration**:
- Uses `resend.domains.create()`, `.list()`, `.get()`, `.verify()`, `.remove()`
- Requires `RESEND_API_KEY` environment variable
- Records include SPF, DKIM, DMARC for email authentication

---

### 4. Settings Module

**Frontend Pages**:
- `/settings/profile` - User profile, notification preferences
- `/settings/api-keys` - Manage API keys for programmatic access
- `/settings/billing` - Subscription, usage meters, invoices

All currently use mock data - backend needs to implement these.

---

## 🗄 Data Models & Database Schema

### Recommended PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  company VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact Lists
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'subscribed',
  source VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Contact-List junction table
CREATE TABLE contact_list_members (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (contact_id, list_id)
);

-- Contact Tags
CREATE TABLE contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL
);

-- Verified Domains
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resend_domain_id VARCHAR(100),
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  region VARCHAR(50),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preheader VARCHAR(500),
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  html_content TEXT NOT NULL,
  text_content TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Recipients (which lists to send to)
CREATE TABLE campaign_recipients (
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, list_id)
);

-- Email Events (opens, clicks, bounces, etc.)
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  metadata JSONB, -- click URL, bounce reason, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- for display: "sk_live_abc..."
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_user_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_campaigns_user_status ON campaigns(user_id, status);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
```

---

## 🔌 API Endpoints Required

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Login, return JWT |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts` | List all contacts (paginated) |
| POST | `/contacts` | Create single contact |
| POST | `/contacts/import` | Bulk import from CSV data |
| GET | `/contacts/:id` | Get contact details |
| PATCH | `/contacts/:id` | Update contact |
| DELETE | `/contacts/:id` | Delete contact |
| POST | `/contacts/bulk-delete` | Delete multiple contacts |
| POST | `/contacts/bulk-tag` | Add tags to multiple contacts |

### Contact Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lists` | List all contact lists |
| POST | `/lists` | Create new list |
| GET | `/lists/:id` | Get list with contacts |
| PATCH | `/lists/:id` | Update list |
| DELETE | `/lists/:id` | Delete list |
| POST | `/lists/:id/contacts` | Add contacts to list |
| DELETE | `/lists/:id/contacts` | Remove contacts from list |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List all campaigns |
| POST | `/campaigns` | Create new campaign |
| GET | `/campaigns/:id` | Get campaign details |
| PATCH | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |
| POST | `/campaigns/:id/duplicate` | Duplicate campaign |
| POST | `/campaigns/:id/send` | Send campaign immediately |
| POST | `/campaigns/:id/schedule` | Schedule campaign |
| POST | `/campaigns/:id/pause` | Pause sending campaign |
| GET | `/campaigns/:id/stats` | Get campaign statistics |

### Domains (proxy to Resend, already implemented)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/domains` | List verified domains |
| POST | `/domains` | Add domain to verify |
| GET | `/domains/:id` | Get domain DNS records |
| POST | `/domains/:id/verify` | Check DNS verification |
| DELETE | `/domains/:id` | Remove domain |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/profile` | Get user profile |
| PATCH | `/settings/profile` | Update profile |
| GET | `/api-keys` | List API keys |
| POST | `/api-keys` | Create API key |
| DELETE | `/api-keys/:id` | Delete API key |
| GET | `/billing` | Get billing info |
| GET | `/billing/usage` | Get usage stats |
| GET | `/billing/invoices` | List invoices |

### Webhooks (for Resend events)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/resend` | Receive email events from Resend |

---

## 🔗 Third-Party Integrations

### Resend (Required)

**Purpose**: Email sending infrastructure and domain verification.

**Setup**:
1. Create account at https://resend.com
2. Get API key from dashboard
3. Set `RESEND_API_KEY` environment variable

**APIs Used**:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Domains
await resend.domains.create({ name: 'mail.example.com' });
await resend.domains.list();
await resend.domains.get(domainId);
await resend.domains.verify(domainId);
await resend.domains.remove(domainId);

// Sending emails
await resend.emails.send({
  from: 'sender@verified-domain.com',
  to: 'recipient@example.com',
  subject: 'Hello',
  html: '<p>Email body</p>',
});

// Batch sending
await resend.batch.send([...emails]);
```

**Webhook Events to Handle**:
- `email.sent`
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`

### Future Integrations (Optional)

| Service | Purpose |
|---------|---------|
| Stripe | Subscription billing |
| AWS S3 | Email asset storage |
| Cloudflare R2 | Alternative storage |
| Redis | Job queues, rate limiting |

---

## 🔐 Authentication & Authorization

### Recommended Approach

**JWT-based authentication**:
- Access token (short-lived, 15min)
- Refresh token (long-lived, 7 days, stored in httpOnly cookie)

**User Roles** (for future multi-tenant):
- `owner` - Full access
- `admin` - Manage users, campaigns
- `editor` - Create and edit campaigns
- `viewer` - Read-only access

### Security Considerations

1. **Rate limiting** - Prevent abuse on auth endpoints, email sending
2. **Email validation** - Verify sender email belongs to verified domain
3. **API key scoping** - Limit what each API key can access
4. **CORS** - Restrict origins in production
5. **Input sanitization** - Prevent XSS in email content
6. **Webhook verification** - Validate Resend webhook signatures

---

## 📁 File Structure

### Frontend Structure
```
app/
├── (campaigns)/
│   └── campaigns/
│       ├── page.tsx              # Campaign list
│       ├── create-campaign/
│       │   └── page.tsx          # Create campaign form
│       ├── email-editor/
│       │   └── page.tsx          # Rich text editor
│       └── review/
│           └── page.tsx          # Review & send
├── (contacts)/
│   └── global-contacts/
│       └── page.tsx              # Contact list with import
├── (settings)/
│   └── settings/
│       ├── layout.tsx            # Settings sidebar layout
│       ├── page.tsx              # Redirects to domains
│       ├── profile/
│       │   └── page.tsx          # User profile
│       ├── domains/
│       │   ├── page.tsx          # Domain list
│       │   └── [id]/
│       │       └── page.tsx      # DNS records view
│       ├── api-keys/
│       │   └── page.tsx          # API key management
│       └── billing/
│           └── page.tsx          # Billing & subscription
├── api/
│   └── domains/                  # Resend domain proxy routes
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           └── verify/
│               └── route.ts
├── layout.tsx                    # Root layout with navbar
├── page.tsx                      # Home/redirect
└── globals.css                   # Global styles

components/
├── ui/                           # shadcn/ui components
├── navbar.tsx                    # Top navigation
├── mode-toggle.tsx               # Dark/light mode
└── theme-provider.tsx            # Theme context

lib/
├── resend.ts                     # Resend client & types
├── utils.ts                      # Utility functions
└── contact-utils.ts              # Contact parsing utilities
```

---

## 🚀 Development Notes

### Environment Variables

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxx

# Backend will need
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key
RESEND_WEBHOOK_SECRET=whsec_...
```

### Frontend API Calls

The frontend uses `fetch()` to call API endpoints. Example patterns:

```typescript
// GET request
const response = await fetch('/api/campaigns');
const data = await response.json();

// POST request
const response = await fetch('/api/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, subject, ... }),
});

// Error handling
if (!response.ok) {
  const error = await response.json();
  toast.error(error.message);
}
```

### Toast Notifications

Using `sonner` for toasts:
```typescript
import { toast } from 'sonner';
toast.success('Campaign created');
toast.error('Failed to send');
toast.info('Processing...');
```

---

## 📝 Summary for Backend Development

**Priority order for implementation**:

1. **Authentication** - User registration, login, JWT management
2. **Contacts & Lists** - CRUD operations, CSV import, tagging
3. **Campaigns** - CRUD, status management, content storage
4. **Email Sending** - Integration with Resend, batch sending
5. **Event Tracking** - Webhook handling, statistics aggregation
6. **Domains** - Can use existing proxy routes or reimplement in backend
7. **Settings** - Profile, API keys, billing integration

**Critical paths**:
- User creates campaign → selects recipients → designs email → sends
- User imports CSV → maps columns → contacts created in database
- User adds domain → gets DNS records → configures DNS → verifies

---

*Generated for backend development context. Last updated: December 2024*
