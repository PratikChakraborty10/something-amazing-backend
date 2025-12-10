# Domain Verification API Documentation

This document details the API endpoints for managing domain verification with AWS SES. Domains are persisted in the database and associated with the authenticated user.

## Base URL
All endpoints are prefixed with `/domains`.

## Authentication
All endpoints require JWT authentication. Include the `Authorization: Bearer <token>` header.

---

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique domain ID |
| `userId` | UUID | Owner's user ID |
| `domain` | string | The domain name (e.g., `example.com`) |
| `verificationToken` | string | TXT record value for domain verification |
| `dkimTokens` | string[] | Array of 3 DKIM tokens for CNAME records |
| `verificationStatus` | enum | `Pending`, `Success`, `Failed`, `TemporaryFailure`, `NotStarted` |
| `dkimVerificationStatus` | enum | `Pending`, `Success`, `Failed`, `TemporaryFailure`, `NotStarted` |
| `isDefault` | boolean | Whether this is the default sending domain |
| `lastCheckedAt` | Date | Last time status was refreshed from AWS |
| `createdAt` | Date | When the domain was added |
| `updatedAt` | Date | Last update timestamp |

---

## Endpoints

### 1. List All Domains
Retrieve all domains for the current user.

- **URL:** `GET /domains`
- **Auth:** Required

**Response:**
```json
[
  {
    "id": "uuid-1",
    "domain": "example.com",
    "verificationStatus": "Success",
    "dkimVerificationStatus": "Success",
    "isDefault": true,
    "createdAt": "2025-12-09T12:00:00.000Z"
  }
]
```

---

### 2. Verify New Domain
Add and verify a new domain. Returns DNS records for configuration.

- **URL:** `POST /domains`
- **Auth:** Required
- **Body:**
  ```json
  {
    "domain": "example.com"
  }
  ```

**Response:**
```json
{
  "id": "uuid-1",
  "domain": "example.com",
  "verificationToken": "R4e...token",
  "dkimTokens": ["token1", "token2", "token3"],
  "verificationStatus": "Pending",
  "dkimVerificationStatus": "Pending",
  "isDefault": false,
  "createdAt": "2025-12-09T12:00:00.000Z"
}
```

**DNS Configuration:**

| Type | Name | Value |
|------|------|-------|
| TXT | `_amazonses.example.com` | `{verificationToken}` |
| CNAME | `{token1}._domainkey.example.com` | `{token1}.dkim.amazonses.com` |
| CNAME | `{token2}._domainkey.example.com` | `{token2}.dkim.amazonses.com` |
| CNAME | `{token3}._domainkey.example.com` | `{token3}.dkim.amazonses.com` |

---

### 3. Get Domain by ID
Retrieve a specific domain's details.

- **URL:** `GET /domains/:id`
- **Auth:** Required

**Response:** Full domain object (see Data Model).

---

### 4. Refresh Domain Status
Fetch the latest verification status from AWS SES and update the database.

- **URL:** `PATCH /domains/:id/refresh`
- **Auth:** Required

**Response:** Updated domain object with latest status.

---

### 5. Set Default Domain
Mark a domain as the default sending domain.

- **URL:** `PATCH /domains/:id/set-default`
- **Auth:** Required

**Response:** Updated domain object with `isDefault: true`.

---

### 6. Delete Domain
Remove a domain from both AWS SES and the database.

- **URL:** `DELETE /domains/:id`
- **Auth:** Required

**Response:**
```json
{
  "message": "Domain deleted successfully"
}
```

---

## Verification Status Values

| Status | Description |
|--------|-------------|
| `Pending` | DNS records added, waiting for propagation |
| `Success` | Domain verified and ready for sending |
| `Failed` | Verification failed |
| `TemporaryFailure` | Temporary issue, retry later |
| `NotStarted` | Verification not initiated |

---

## Frontend Workflow

1. **Add Domain:** Call `POST /domains` with the domain name.
2. **Display DNS Records:** Show the TXT and CNAME records from the response.
3. **Poll Status:** Call `PATCH /domains/:id/refresh` periodically to check if verification is complete.
4. **Set Default:** Once verified, allow user to call `PATCH /domains/:id/set-default`.
