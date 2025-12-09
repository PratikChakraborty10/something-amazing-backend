# Global Contacts Feature - Complete Documentation

> **Purpose:** This document provides a comprehensive overview of the Global Contacts feature implementation in the frontend, designed to be handed off to the backend development agent for implementing the corresponding API services.

---

## 1. Feature Overview

The **Global Contacts** feature is a centralized contact management system for an email marketing SaaS application. It allows users to:

1. **Import contacts** from multiple sources (CSV upload, paste text, manual entry)
2. **Validate and clean** contact data (email validation, deduplication)
3. **Organize contacts** into named lists for use in email campaigns
4. **Manage contact lists** with CRUD operations

### Core Use Cases

| Use Case | Description |
|----------|-------------|
| **Bulk Import** | Upload CSV/Excel files with thousands of contacts |
| **Quick Add** | Paste text containing emails (extracts automatically) |
| **Manual Entry** | Add single contacts via form |
| **Deduplication** | Automatically handle duplicate emails |
| **List Creation** | Save curated contacts as named lists |
| **Campaign Integration** | Use saved lists when creating email campaigns |

---

## 2. Data Models

### 2.1 Contact

The core contact entity with all relevant fields:

```typescript
interface Contact {
  id: string;                      // Unique identifier (e.g., "contact_1702000000000_a1b2c3d4e")
  email: string;                   // Required, validated, lowercased
  firstName: string;               // Optional
  lastName: string;                // Optional
  company: string;                 // Optional
  role: string;                    // Optional (job title/position)
  tags: string[];                  // Array of tag strings
  customMeta: Record<string, string>; // Extensible key-value metadata
  status: "valid" | "invalid" | "duplicate";
  validationErrors: string[];      // Array of error messages if invalid
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Contact List

A named collection of contacts for campaign use:

```typescript
interface ContactList {
  id: string;                      // e.g., "list_1"
  name: string;                    // e.g., "Q4 Product Launch Leads"
  description: string;             // Brief description
  contactCount: number;            // Total contacts in list
  validCount: number;              // Contacts with valid status
  createdAt: Date;
  updatedAt: Date;
  tags: string[];                  // List-level tags for organization
}
```

### 2.3 Canonical Fields for CSV Mapping

When importing CSV files, columns are mapped to these canonical fields:

```typescript
type CanonicalField =
  | "email"      // Required
  | "firstName"
  | "lastName"
  | "company"
  | "role"
  | "tags"       // Semicolon or comma separated
  | "ignore";    // Skip this column
```

**Auto-detection mappings for common header names:**

| Header Variations | Maps To |
|-------------------|---------|
| email, e-mail, emailaddress, mail | `email` |
| firstname, first name, fname, givenname | `firstName` |
| lastname, last name, lname, surname | `lastName` |
| company, organization, org, employer | `company` |
| role, title, jobtitle, position | `role` |
| tags, tag, labels | `tags` |

---

## 3. Validation Rules

### 3.1 Email Validation

**Regex Pattern (RFC 5322 simplified):**
```regex
^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
```

**Validation Rules:**
- Email is **required**
- Must match valid email format
- Stored as lowercase, trimmed

**Validation Errors Returned:**
- `"Email is required"` - if email field is empty
- `"Invalid email format"` - if email doesn't match regex

### 3.2 Contact Status

| Status | Condition |
|--------|-----------|
| `valid` | Email is present and valid format |
| `invalid` | Email missing or invalid format |
| `duplicate` | Email already exists in the list |

---

## 4. Deduplication Strategies

When importing contacts, duplicates can be handled with three strategies:

```typescript
type DedupeStrategy = "keepFirst" | "keepLast" | "merge";
```

| Strategy | Behavior |
|----------|----------|
| `keepFirst` | Keep the first occurrence, discard later duplicates |
| `keepLast` | Replace with the latest occurrence (default) |
| `merge` | Combine fields: prefer non-empty values from latest, merge tags |

### Merge Strategy Details

When merging duplicates:
```typescript
{
  ...existingContact,
  firstName: newContact.firstName || existingContact.firstName,
  lastName: newContact.lastName || existingContact.lastName,
  company: newContact.company || existingContact.company,
  role: newContact.role || existingContact.role,
  tags: [...new Set([...existingContact.tags, ...newContact.tags])],
  customMeta: { ...existingContact.customMeta, ...newContact.customMeta },
  updatedAt: new Date(),
}
```

---

## 5. Import Methods

### 5.1 CSV/Excel File Upload

**Supported formats:** `.csv`, `.xlsx`, `.xls`

**Flow:**
1. User uploads file via drag-drop or file picker
2. Frontend parses file, extracts headers and sample data
3. Column mapping modal shown with auto-detected mappings
4. User confirms/adjusts mappings
5. Contacts created with validation applied
6. Deduplication applied if enabled

**CSV Parsing Rules:**
- Comma-separated values
- Quoted fields supported (`"value with,comma"`)
- First row treated as headers
- Minimum 2 rows required (header + 1 data row)

### 5.2 Paste Text Import

**Supported patterns:**
- Plain emails: `john@example.com`
- Name + email: `John Doe <john@example.com>`
- Multiple formats in same text
- Automatically extracts unique emails

**Extraction Pattern:**
```regex
([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})
```

Attempts to extract names from patterns like `Name <email>`.

### 5.3 Manual Entry

**Required field:** Email only

**Optional fields:**
- First Name
- Last Name
- Company
- Role

**Validation:** Real-time email format validation on blur.

---

## 6. Contact List Operations

### 6.1 Create List

**Trigger:** "Save Contact List" button after importing contacts

**Required data:**
- `name` (string) - User-provided list name
- Contacts array with all imported contacts

**Behavior:**
- Saves current session's contacts as a named list
- Lists are available for use in campaigns

### 6.2 List Management (CRUD)

| Operation | Description |
|-----------|-------------|
| **View all** | Display all saved lists with stats |
| **Search** | Filter lists by name, description, or tags |
| **Edit** | Update list name and description |
| **Delete** | Remove list (contacts remain in global database) |
| **Export** | Download list contacts as CSV |

### 6.3 List Statistics

Displayed stats for each list:
- Total contacts count
- Valid contacts count
- Validity rate (percentage)
- Last updated date

Aggregate stats shown:
- Total lists count
- Total contacts across all lists
- Total valid contacts
- Overall validity rate

---

## 7. Filtering & Search

### 7.1 Contact Filters

| Filter | Options |
|--------|---------|
| **Status** | all, valid, invalid, duplicate |
| **Domain** | Dynamic list from imported emails |
| **Search** | Matches email, firstName, lastName, company |

### 7.2 List Filters

- Search by name, description, or tags

---

## 8. Export Functionality

### 8.1 CSV Export Format

**Columns:**
```
Email,First Name,Last Name,Company,Role,Tags,Status
```

**Rules:**
- Fields with commas/quotes are escaped
- Tags are joined with semicolons
- UTF-8 encoding

### 8.2 Export Options

- **Export All:** Download all contacts
- **Export Selected:** Download only checked contacts

---

## 9. Edge Cases & Error Handling

### 9.1 Import Edge Cases

| Scenario | Handling |
|----------|----------|
| File with only headers | Error: "Must contain at least 1 data row" |
| No email column mapped | Error: "Please map at least one column to Email" |
| Empty email in row | Contact marked as `invalid` |
| Malformed email | Contact marked as `invalid` |
| Duplicate in file | Handled by dedupe strategy |
| Duplicate with existing | Handled by dedupe strategy |
| All duplicates rejected | Error shown if auto-dedupe is off |

### 9.2 API Error Scenarios

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Validation failed | 400 | Field-specific errors |
| Unauthorized | 401 | Invalid/missing token |
| List not found | 404 | List ID doesn't exist |
| Duplicate email | 409 | Email already exists (if not deduping) |

---

## 10. Application Integration

### 10.1 Navigation

```
/global-contacts          → Import & manage contacts
/global-contacts/lists    → View saved lists
```

### 10.2 Campaign Integration

Contact lists are used when creating email campaigns:
1. User creates/selects a campaign
2. User picks a contact list as recipients
3. System uses list's contacts for email sending

### 10.3 Template Variables

When saving lists, contacts support template personalization:
```
Hi {{firstName}} — your email is {{email}}
```

Fallback shown in preview: `{{firstName}}`

---

## 11. Frontend-Only Current State

> [!IMPORTANT]
> The current implementation is **frontend-only** with mock data. All state is held in React component state and is not persisted.

**Current limitations:**
- Contacts lost on page refresh
- Lists use hardcoded mock data
- No authentication on data operations
- No persistence layer

---

## 12. Statistics & Analytics

### Contact Stats Computed

```typescript
interface ContactStats {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  topDomains: Array<{ domain: string; count: number }>;
}
```

Top 3 domains are computed and displayed.

---

## 13. UI Components Summary

| Component | Purpose |
|-----------|---------|
| `EmptyState` | Shown when no contacts exist |
| `StatusBadge` | Visual indicator of contact status |
| `ColumnMappingRow` | CSV column → field mapping UI |
| `EditableCell` | Inline editing for table cells |

---

## 14. Files Reference

| File | Purpose |
|------|---------|
| `app/(contacts)/global-contacts/page.tsx` | Main contacts import page (1290 lines) |
| `app/(contacts)/global-contacts/lists/page.tsx` | Contact lists management (443 lines) |
| `lib/contact-utils.ts` | Utility functions for contact operations (370 lines) |

---

## 15. Required Backend APIs

> [!CAUTION]
> All APIs below must be **authenticated**. The backend should validate the user's access token before processing any request.

### Summary of Required Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/contacts` | Create single contact |
| POST | `/api/contacts/bulk` | Import multiple contacts |
| GET | `/api/contacts` | List contacts with filters/pagination |
| GET | `/api/contacts/:id` | Get single contact |
| PATCH | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete single contact |
| DELETE | `/api/contacts/bulk` | Delete multiple contacts |
| POST | `/api/contact-lists` | Create contact list |
| GET | `/api/contact-lists` | List all contact lists |
| GET | `/api/contact-lists/:id` | Get list with contacts |
| PATCH | `/api/contact-lists/:id` | Update list metadata |
| DELETE | `/api/contact-lists/:id` | Delete list |
| GET | `/api/contact-lists/:id/export` | Export list as CSV |
| GET | `/api/contacts/stats` | Get contact statistics |

---

This document provides the complete specification for the backend agent to implement the required API services.
