# Backend API Documentation - Authentication & Profile

> API Base URL: `http://localhost:8000/api`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### POST `/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | ✅ | Valid email format |
| password | string | ✅ | Min 8 characters |
| firstName | string | ❌ | - |
| lastName | string | ❌ | - |

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh-token-here",
    "expiresIn": 3600,
    "expiresAt": 1702012345
  }
}
```

**Error Responses:**
- `400` - Validation errors (invalid email, password too short)
- `409` - User with this email already exists

---

### POST `/auth/signin`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh-token-here",
    "expiresIn": 3600,
    "expiresAt": 1702012345
  }
}
```

**Error Responses:**
- `400` - Validation errors
- `401` - Invalid credentials

---

### GET `/auth/me`

Get the current authenticated user's profile. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": null,
  "company": null,
  "avatarUrl": null,
  "notifyCampaignReports": false,
  "notifyWeeklyDigest": false,
  "notifyProductUpdates": false,
  "createdAt": "2024-12-07T00:00:00.000Z",
  "updatedAt": "2024-12-07T00:00:00.000Z"
}
```

**Error Responses:**
- `401` - Unauthorized (missing/invalid token)

---

### GET `/profile`

Get the current user's full profile. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):** Same as `/auth/me`

---

### PATCH `/profile`

Update the current user's profile. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1 555 000-0000",
  "company": "Acme Inc",
  "avatarUrl": "https://example.com/avatar.jpg",
  "notifyCampaignReports": true,
  "notifyWeeklyDigest": true,
  "notifyProductUpdates": false
}
```

| Field | Type | Validation |
|-------|------|------------|
| firstName | string | - |
| lastName | string | - |
| phoneNumber | string | - |
| company | string | - |
| avatarUrl | string | Valid URL |
| notifyCampaignReports | boolean | - |
| notifyWeeklyDigest | boolean | - |
| notifyProductUpdates | boolean | - |

**Success Response (200):** Returns updated profile object

**Error Responses:**
- `400` - Validation errors
- `401` - Unauthorized
- `404` - Profile not found

---

## Error Response Format

All errors follow this structure:
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid credentials",
  "timestamp": "2024-12-07T00:00:00.000Z"
}
```

---

## Token Management

- **Access Token**: JWT issued by Supabase, expires in ~1 hour
- **Refresh Token**: Used to get new access tokens
- Store `accessToken` securely (memory or httpOnly cookie)
- Include token in `Authorization: Bearer <token>` header for protected routes
