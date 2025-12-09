# Backend Implementation Prompt - Global Contacts API

You are implementing a complete **Contacts and Contact Lists API** for an email marketing SaaS application. The backend is built with **NestJS** and uses **Supabase PostgreSQL** for the database. Authentication is already implemented using Supabase Auth with JWT tokens.

---

## Project Context

This application allows users to:
1. Import contacts (email recipients) from CSV files, pasted text, or manual entry
2. Validate and deduplicate contacts
3. Save contacts into named lists for use in email campaigns
4. Manage contact lists with full CRUD operations

All endpoints must be **authenticated** — validate the user's JWT access token before processing any request.

---

## Authentication Pattern

Follow the existing auth pattern in this project:

```typescript
// Protected endpoints require Bearer token
Authorization: Bearer <access_token>
```

The user ID should be extracted from the JWT token and used to scope all data operations. A user can only access their own contacts and lists.

---

## Database Schema

Create the following tables in Supabase PostgreSQL:

### Table: `contacts`

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(200),
  role VARCHAR(200),
  tags TEXT[] DEFAULT '{}',
  custom_meta JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'invalid', 'duplicate')),
  validation_errors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, email)
);

-- Indexes for performance
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);
```

### Table: `contact_lists`

```sql
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_lists_user_id ON contact_lists(user_id);
```

### Table: `contact_list_members` (Junction Table)

```sql
CREATE TABLE contact_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(list_id, contact_id)
);

CREATE INDEX idx_list_members_list_id ON contact_list_members(list_id);
CREATE INDEX idx_list_members_contact_id ON contact_list_members(contact_id);
```

---

## API Endpoints Specification

### 1. Contacts CRUD

#### POST `/api/contacts` — Create Single Contact

**Request Body:**
```typescript
{
  email: string;          // Required, validated
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  tags?: string[];
  customMeta?: Record<string, string>;
}
```

**Response (201):**
```typescript
{
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  tags: string[];
  customMeta: Record<string, string>;
  status: "valid" | "invalid";
  validationErrors: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Validation:**
- Email required, valid format (RFC 5322)
- Email must be unique per user
- Store email as lowercase, trimmed

**Errors:**
- `400` - Invalid email format
- `409` - Contact with this email already exists

---

#### POST `/api/contacts/bulk` — Bulk Import Contacts

**Request Body:**
```typescript
{
  contacts: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    tags?: string[];
  }>;
  dedupeStrategy: "keepFirst" | "keepLast" | "merge";
}
```

**Response (201):**
```typescript
{
  imported: number;        // Successfully imported count
  skipped: number;         // Skipped (invalid) count
  duplicates: number;      // Duplicates handled count
  contacts: Contact[];     // Full contact objects
  errors: Array<{
    row: number;
    email: string;
    reason: string;
  }>;
}
```

**Behavior:**
- Validate each contact
- Apply dedupe strategy for duplicates
- Return detailed import results
- Handle up to 10,000 contacts per request

---

#### GET `/api/contacts` — List Contacts

**Query Parameters:**
```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 50, max: 100
  search?: string;         // Search email, firstName, lastName, company
  status?: "valid" | "invalid" | "duplicate" | "all";
  domain?: string;         // Filter by email domain
  sortBy?: "email" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}
```

**Response (200):**
```typescript
{
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

#### GET `/api/contacts/:id` — Get Single Contact

**Response (200):** Full Contact object

**Errors:**
- `404` - Contact not found (or not owned by user)

---

#### PATCH `/api/contacts/:id` — Update Contact

**Request Body (all optional):**
```typescript
{
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  tags?: string[];
  customMeta?: Record<string, string>;
}
```

**Response (200):** Updated Contact object

**Behavior:**
- Re-validate email if changed
- Update `updatedAt` timestamp
- Recalculate status based on validation

---

#### DELETE `/api/contacts/:id` — Delete Single Contact

**Response (200):**
```typescript
{ message: "Contact deleted successfully" }
```

---

#### DELETE `/api/contacts/bulk` — Delete Multiple Contacts

**Request Body:**
```typescript
{
  ids: string[];  // Array of contact IDs to delete
}
```

**Response (200):**
```typescript
{
  deleted: number;
  message: string;
}
```

---

### 2. Contact Lists CRUD

#### POST `/api/contact-lists` — Create Contact List

**Request Body:**
```typescript
{
  name: string;              // Required
  description?: string;
  tags?: string[];
  contactIds?: string[];     // Optional: add contacts immediately
}
```

**Response (201):**
```typescript
{
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  contactCount: number;
  validCount: number;
  createdAt: string;
  updatedAt: string;
}
```

---

#### GET `/api/contact-lists` — List All Contact Lists

**Query Parameters:**
```typescript
{
  search?: string;  // Search name, description, tags
}
```

**Response (200):**
```typescript
{
  lists: Array<{
    id: string;
    name: string;
    description: string | null;
    tags: string[];
    contactCount: number;
    validCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

**Note:** `contactCount` and `validCount` are computed via JOIN with contacts table.

---

#### GET `/api/contact-lists/:id` — Get Contact List with Contacts

**Query Parameters:**
```typescript
{
  includeContacts?: boolean;  // Default: true
  page?: number;
  limit?: number;
}
```

**Response (200):**
```typescript
{
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  contactCount: number;
  validCount: number;
  createdAt: string;
  updatedAt: string;
  contacts?: {
    data: Contact[];
    pagination: { ... };
  };
}
```

---

#### PATCH `/api/contact-lists/:id` — Update Contact List

**Request Body (all optional):**
```typescript
{
  name?: string;
  description?: string;
  tags?: string[];
}
```

**Response (200):** Updated list object

---

#### DELETE `/api/contact-lists/:id` — Delete Contact List

**Response (200):**
```typescript
{ message: "Contact list deleted successfully" }
```

**Note:** Only deletes the list and memberships; contacts remain in the database.

---

#### POST `/api/contact-lists/:id/contacts` — Add Contacts to List

**Request Body:**
```typescript
{
  contactIds: string[];
}
```

**Response (200):**
```typescript
{
  added: number;
  alreadyInList: number;
}
```

---

#### DELETE `/api/contact-lists/:id/contacts` — Remove Contacts from List

**Request Body:**
```typescript
{
  contactIds: string[];
}
```

**Response (200):**
```typescript
{
  removed: number;
}
```

---

#### GET `/api/contact-lists/:id/export` — Export List as CSV

**Response (200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="list-name.csv"`

**CSV Format:**
```
Email,First Name,Last Name,Company,Role,Tags,Status
john@example.com,John,Doe,Acme Inc,CEO,enterprise;vip,valid
```

---

### 3. Statistics Endpoint

#### GET `/api/contacts/stats` — Get Contact Statistics

**Response (200):**
```typescript
{
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  topDomains: Array<{
    domain: string;
    count: number;
  }>;  // Top 5 domains
}
```

---

## Validation Rules

### Email Validation

Use this regex pattern (RFC 5322 simplified):
```regex
^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
```

### Contact Status Determination

```typescript
function determineStatus(contact): "valid" | "invalid" {
  if (!contact.email || !isValidEmail(contact.email)) {
    return "invalid";
  }
  return "valid";
}
```

### Deduplication Logic

```typescript
// During bulk import, check for existing contacts
async function handleDuplicates(newContacts, existingContacts, strategy) {
  switch (strategy) {
    case "keepFirst":
      // Skip contacts that already exist
      break;
    case "keepLast":
      // Update existing contacts with new data
      break;
    case "merge":
      // Merge fields: prefer non-empty new values, combine tags
      break;
  }
}
```

---

## Error Response Format

Follow the existing pattern:
```typescript
{
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
}
```

---

## NestJS Module Structure

```
src/
├── contacts/
│   ├── contacts.module.ts
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   ├── dto/
│   │   ├── create-contact.dto.ts
│   │   ├── update-contact.dto.ts
│   │   ├── bulk-import.dto.ts
│   │   └── query-contacts.dto.ts
│   └── entities/
│       └── contact.entity.ts
├── contact-lists/
│   ├── contact-lists.module.ts
│   ├── contact-lists.controller.ts
│   ├── contact-lists.service.ts
│   ├── dto/
│   │   ├── create-list.dto.ts
│   │   └── update-list.dto.ts
│   └── entities/
│       ├── contact-list.entity.ts
│       └── contact-list-member.entity.ts
```

---

## Security Considerations

1. **Authentication Required** — All endpoints require valid JWT
2. **Data Scoping** — Users can only access their own contacts/lists
3. **Rate Limiting** — Consider limits on bulk import (e.g., 100 req/min)
4. **Input Sanitization** — Sanitize all string inputs
5. **SQL Injection** — Use parameterized queries (Supabase client does this)

---

## Testing Checklist

- [ ] Create single contact with valid data
- [ ] Reject contact with invalid email format
- [ ] Reject duplicate email for same user
- [ ] Bulk import 100+ contacts successfully
- [ ] Bulk import with deduplication (all 3 strategies)
- [ ] List contacts with pagination
- [ ] Search contacts by email/name/company
- [ ] Filter contacts by status
- [ ] Filter contacts by domain
- [ ] Update contact fields
- [ ] Delete single contact
- [ ] Delete multiple contacts
- [ ] Create contact list
- [ ] Add contacts to list
- [ ] Remove contacts from list
- [ ] Export list as CSV
- [ ] Delete list (contacts remain)
- [ ] Get contact statistics
- [ ] Verify user data isolation (can't access other user's data)
- [ ] Verify 401 for unauthenticated requests

---

## Example cURL Commands

```bash
# Create contact
curl -X POST http://localhost:3001/api/contacts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","firstName":"John","lastName":"Doe"}'

# Bulk import
curl -X POST http://localhost:3001/api/contacts/bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"contacts":[{"email":"a@b.com"},{"email":"c@d.com"}],"dedupeStrategy":"keepLast"}'

# List contacts
curl "http://localhost:3001/api/contacts?page=1&limit=20&status=valid" \
  -H "Authorization: Bearer <token>"

# Create list
curl -X POST http://localhost:3001/api/contact-lists \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My List","contactIds":["uuid1","uuid2"]}'

# Export list
curl "http://localhost:3001/api/contact-lists/<id>/export" \
  -H "Authorization: Bearer <token>" \
  -o contacts.csv
```

---

## Frontend Integration Points

The frontend will call these APIs via Next.js API routes that proxy to the backend:
- `/api/contacts` → `http://localhost:3001/api/contacts`
- `/api/contact-lists` → `http://localhost:3001/api/contact-lists`

The frontend handles:
- CSV parsing (before bulk import)
- Column mapping UI
- Client-side validation feedback
- Optimistic updates

The backend handles:
- Final validation
- Data persistence
- Deduplication logic
- Statistics computation

---

This prompt provides everything needed to implement the complete backend API for the Global Contacts feature.
