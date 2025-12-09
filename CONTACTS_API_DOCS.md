# Contacts API Documentation

> **Base URL:** `http://localhost:8000/api`  
> **Authentication:** All endpoints require a Bearer token in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

---

## Table of Contents

- [Contacts](#contacts)
  - [Create Contact](#create-contact)
  - [Bulk Import Contacts](#bulk-import-contacts)
  - [List Contacts](#list-contacts)
  - [Get Contact Statistics](#get-contact-statistics)
  - [Get Single Contact](#get-single-contact)
  - [Update Contact](#update-contact)
  - [Delete Contact](#delete-contact)
  - [Bulk Delete Contacts](#bulk-delete-contacts)
- [Contact Lists](#contact-lists)
  - [Create Contact List](#create-contact-list)
  - [Get All Contact Lists](#get-all-contact-lists)
  - [Get Single Contact List](#get-single-contact-list)
  - [Update Contact List](#update-contact-list)
  - [Delete Contact List](#delete-contact-list)
  - [Add Contacts to List](#add-contacts-to-list)
  - [Remove Contacts from List](#remove-contacts-from-list)
  - [Export List as CSV](#export-list-as-csv)
- [Data Types](#data-types)
- [Error Responses](#error-responses)

---

## Contacts

### Create Contact

Create a single contact for the authenticated user.

```
POST /contacts
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "role": "CEO",
  "tags": ["vip", "enterprise"],
  "customMeta": {
    "source": "website",
    "campaign": "Q4-2024"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ Yes | Valid email address (max 320 chars) |
| `firstName` | string | No | First name (max 100 chars) |
| `lastName` | string | No | Last name (max 100 chars) |
| `company` | string | No | Company name (max 200 chars) |
| `role` | string | No | Job title/role (max 200 chars) |
| `tags` | string[] | No | Array of tag strings |
| `customMeta` | object | No | Key-value metadata object |

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "role": "CEO",
  "tags": ["vip", "enterprise"],
  "customMeta": { "source": "website", "campaign": "Q4-2024" },
  "status": "valid",
  "validationErrors": [],
  "createdAt": "2024-12-09T10:30:00.000Z",
  "updatedAt": "2024-12-09T10:30:00.000Z"
}
```

**Errors:**
- `400` - Invalid email format
- `409` - Contact with this email already exists

---

### Bulk Import Contacts

Import multiple contacts with deduplication handling.

```
POST /contacts/bulk
```

**Request Body:**

```json
{
  "contacts": [
    { "email": "alice@example.com", "firstName": "Alice" },
    { "email": "bob@example.com", "firstName": "Bob", "company": "Tech Co" },
    { "email": "charlie@example.com", "tags": ["lead"] }
  ],
  "dedupeStrategy": "keepLast"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | array | ✅ Yes | Array of contact objects (max 10,000) |
| `dedupeStrategy` | string | ✅ Yes | One of: `keepFirst`, `keepLast`, `merge` |

**Deduplication Strategies:**

| Strategy | Behavior |
|----------|----------|
| `keepFirst` | Keep first occurrence, discard duplicates |
| `keepLast` | Replace with latest occurrence |
| `merge` | Combine fields: prefer non-empty values from latest, merge tags |

**Response (201 Created):**

```json
{
  "imported": 3,
  "skipped": 1,
  "duplicates": 2,
  "contacts": [ /* array of created/updated Contact objects */ ],
  "errors": [
    { "row": 5, "email": "invalid-email", "reason": "Invalid email format" }
  ]
}
```

---

### List Contacts

Get paginated list of contacts with filtering and search.

```
GET /contacts
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (starts at 1) |
| `limit` | number | 50 | Items per page (max 100) |
| `search` | string | - | Search email, firstName, lastName, company |
| `status` | string | `all` | Filter: `all`, `valid`, `invalid`, `duplicate` |
| `domain` | string | - | Filter by email domain (e.g., `gmail.com`) |
| `sortBy` | string | `createdAt` | Sort field: `email`, `createdAt`, `updatedAt` |
| `sortOrder` | string | `desc` | Sort order: `asc`, `desc` |

**Example:**

```
GET /contacts?page=1&limit=20&status=valid&search=john&sortBy=email&sortOrder=asc
```

**Response (200 OK):**

```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Acme Inc",
      "role": "CEO",
      "tags": ["vip"],
      "customMeta": {},
      "status": "valid",
      "validationErrors": [],
      "createdAt": "2024-12-09T10:30:00.000Z",
      "updatedAt": "2024-12-09T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Get Contact Statistics

Get aggregate statistics for all contacts.

```
GET /contacts/stats
```

**Response (200 OK):**

```json
{
  "total": 1250,
  "valid": 1100,
  "invalid": 100,
  "duplicate": 50,
  "topDomains": [
    { "domain": "gmail.com", "count": 450 },
    { "domain": "outlook.com", "count": 230 },
    { "domain": "yahoo.com", "count": 180 },
    { "domain": "company.com", "count": 120 },
    { "domain": "example.org", "count": 85 }
  ]
}
```

---

### Get Single Contact

Get a contact by ID.

```
GET /contacts/:id
```

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "role": "CEO",
  "tags": ["vip"],
  "customMeta": { "source": "website" },
  "status": "valid",
  "validationErrors": [],
  "createdAt": "2024-12-09T10:30:00.000Z",
  "updatedAt": "2024-12-09T10:30:00.000Z"
}
```

**Errors:**
- `404` - Contact not found

---

### Update Contact

Update a contact's fields.

```
PATCH /contacts/:id
```

**Request Body (all fields optional):**

```json
{
  "email": "john.doe@example.com",
  "firstName": "Jonathan",
  "lastName": "Doe",
  "company": "Acme Corporation",
  "role": "CTO",
  "tags": ["vip", "priority"],
  "customMeta": { "updated": "true" }
}
```

**Response (200 OK):**

Returns the updated Contact object.

**Errors:**
- `404` - Contact not found
- `409` - Email already exists (if changing email)

---

### Delete Contact

Delete a single contact.

```
DELETE /contacts/:id
```

**Response (200 OK):**

```json
{
  "message": "Contact deleted successfully"
}
```

**Errors:**
- `404` - Contact not found

---

### Bulk Delete Contacts

Delete multiple contacts by ID.

```
DELETE /contacts/bulk
```

**Request Body:**

```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Response (200 OK):**

```json
{
  "deleted": 3,
  "message": "3 contact(s) deleted successfully"
}
```

---

## Contact Lists

### Create Contact List

Create a new contact list with optional initial contacts.

```
POST /contact-lists
```

**Request Body:**

```json
{
  "name": "Q4 Product Launch",
  "description": "Leads for the Q4 product launch campaign",
  "tags": ["campaign", "q4-2024"],
  "contactIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | List name (max 200 chars) |
| `description` | string | No | List description |
| `tags` | string[] | No | Array of tag strings |
| `contactIds` | string[] | No | Contact IDs to add initially |

**Response (201 Created):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Q4 Product Launch",
  "description": "Leads for the Q4 product launch campaign",
  "tags": ["campaign", "q4-2024"],
  "contactCount": 2,
  "validCount": 2,
  "createdAt": "2024-12-09T10:30:00.000Z",
  "updatedAt": "2024-12-09T10:30:00.000Z"
}
```

---

### Get All Contact Lists

Get all contact lists for the authenticated user.

```
GET /contact-lists
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name, description, or tags |

**Response (200 OK):**

```json
{
  "lists": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Q4 Product Launch",
      "description": "Leads for the Q4 product launch campaign",
      "tags": ["campaign"],
      "contactCount": 150,
      "validCount": 145,
      "createdAt": "2024-12-09T10:30:00.000Z",
      "updatedAt": "2024-12-09T10:30:00.000Z"
    }
  ]
}
```

---

### Get Single Contact List

Get a contact list by ID with optional contacts.

```
GET /contact-lists/:id
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeContacts` | boolean | `true` | Include contacts in response |
| `page` | number | 1 | Page for contacts pagination |
| `limit` | number | 50 | Contacts per page (max 100) |

**Response (200 OK):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Q4 Product Launch",
  "description": "Leads for the Q4 product launch campaign",
  "tags": ["campaign"],
  "contactCount": 150,
  "validCount": 145,
  "createdAt": "2024-12-09T10:30:00.000Z",
  "updatedAt": "2024-12-09T10:30:00.000Z",
  "contacts": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "company": "Acme Inc",
        "role": "CEO",
        "tags": ["vip"],
        "customMeta": {},
        "status": "valid",
        "validationErrors": [],
        "createdAt": "2024-12-09T10:30:00.000Z",
        "updatedAt": "2024-12-09T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

**Errors:**
- `404` - Contact list not found

---

### Update Contact List

Update list metadata.

```
PATCH /contact-lists/:id
```

**Request Body (all fields optional):**

```json
{
  "name": "Q4 Product Launch - Updated",
  "description": "Updated description",
  "tags": ["campaign", "q4-2024", "updated"]
}
```

**Response (200 OK):**

Returns the updated list object (without contacts).

---

### Delete Contact List

Delete a contact list. **Contacts remain in the database.**

```
DELETE /contact-lists/:id
```

**Response (200 OK):**

```json
{
  "message": "Contact list deleted successfully"
}
```

---

### Add Contacts to List

Add contacts to an existing list.

```
POST /contact-lists/:id/contacts
```

**Request Body:**

```json
{
  "contactIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Response (200 OK):**

```json
{
  "added": 2,
  "alreadyInList": 0
}
```

---

### Remove Contacts from List

Remove contacts from a list.

```
DELETE /contact-lists/:id/contacts
```

**Request Body:**

```json
{
  "contactIds": [
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}
```

**Response (200 OK):**

```json
{
  "removed": 1
}
```

---

### Export List as CSV

Download all contacts in a list as a CSV file.

```
GET /contact-lists/:id/export
```

**Response:**

- **Content-Type:** `text/csv; charset=utf-8`
- **Content-Disposition:** `attachment; filename="list_name.csv"`

**CSV Format:**

```csv
Email,First Name,Last Name,Company,Role,Tags,Status
john@example.com,John,Doe,Acme Inc,CEO,vip;enterprise,valid
jane@example.com,Jane,Smith,Tech Co,CTO,lead,valid
```

---

## Data Types

### Contact

```typescript
interface Contact {
  id: string;                        // UUID
  email: string;                     // Validated, lowercase
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  tags: string[];
  customMeta: Record<string, string>;
  status: "valid" | "invalid" | "duplicate";
  validationErrors: string[];        // Error messages if invalid
  createdAt: string;                 // ISO 8601 datetime
  updatedAt: string;                 // ISO 8601 datetime
}
```

### ContactList

```typescript
interface ContactList {
  id: string;                        // UUID
  name: string;
  description: string | null;
  tags: string[];
  contactCount: number;              // Total contacts in list
  validCount: number;                // Contacts with valid status
  createdAt: string;                 // ISO 8601 datetime
  updatedAt: string;                 // ISO 8601 datetime
}
```

### Pagination

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid email format",
  "timestamp": "2024-12-09T10:30:00.000Z"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | Invalid request body or parameters |
| `401` | Unauthorized | Missing or invalid access token |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate email (contact already exists) |
| `422` | Unprocessable Entity | Validation failed |
| `500` | Internal Server Error | Server error |

---

## TypeScript Types (Frontend)

```typescript
// API client types
type DedupeStrategy = "keepFirst" | "keepLast" | "merge";
type ContactStatus = "valid" | "invalid" | "duplicate";
type ContactStatusFilter = "all" | "valid" | "invalid" | "duplicate";
type SortBy = "email" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

// Request DTOs
interface CreateContactRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  tags?: string[];
  customMeta?: Record<string, string>;
}

interface BulkImportRequest {
  contacts: CreateContactRequest[];
  dedupeStrategy: DedupeStrategy;
}

interface ListContactsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContactStatusFilter;
  domain?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

interface CreateListRequest {
  name: string;
  description?: string;
  tags?: string[];
  contactIds?: string[];
}
```
