# Frontend Authentication Implementation Prompt

You are implementing authentication for a Next.js 16 email marketing SaaS application. The backend API is built with NestJS and uses Supabase Auth for authentication.

---

## Backend API Details

**Base URL:** `http://localhost:3001/api`

### Available Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/signup` | ❌ | Register new user |
| POST | `/auth/signin` | ❌ | Login user |
| GET | `/auth/me` | ✅ | Get current user |
| GET | `/profile` | ✅ | Get user profile |
| PATCH | `/profile` | ✅ | Update profile |

### Authentication Header
For protected endpoints, include:
```
Authorization: Bearer <access_token>
```

---

## Implementation Requirements

### 1. Auth Context/Provider

Create an authentication context that:
- Stores the current user and access token
- Provides `signUp`, `signIn`, `signOut` functions
- Persists token to localStorage or secure cookie
- Auto-fetches user profile on app load if token exists
- Handles token expiration gracefully

### 2. Signup Flow

**Endpoint:** `POST /api/auth/signup`

**Request:**
```typescript
interface SignupRequest {
  email: string;
  password: string;      // min 8 characters
  firstName?: string;
  lastName?: string;
}
```

**Response:**
```typescript
interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  } | null;  // null if email confirmation required
}
```

**UI Requirements:**
- Email and password fields (password min 8 chars)
- Optional first name and last name fields
- Show validation errors from API (400 response)
- Handle "email already exists" error (409 response)
- On success, store token and redirect to dashboard

### 3. Signin Flow

**Endpoint:** `POST /api/auth/signin`

**Request:**
```typescript
interface SigninRequest {
  email: string;
  password: string;
}
```

**Response:**
```typescript
interface SigninResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
}
```

**UI Requirements:**
- Email and password fields
- "Forgot password" link (can be placeholder)
- Handle invalid credentials error (401 response)
- On success, store token and redirect to dashboard

### 4. Profile Page (`/settings/profile`)

**GET Profile:** `GET /api/profile`
**Update Profile:** `PATCH /api/profile`

**Profile Fields:**
```typescript
interface Profile {
  id: string;
  email: string;           // read-only
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  company: string | null;
  avatarUrl: string | null;
  
  // Notification Preferences (default false)
  notifyCampaignReports: boolean;
  notifyWeeklyDigest: boolean;
  notifyProductUpdates: boolean;
  
  createdAt: string;
  updatedAt: string;
}
```

**Update Request (all fields optional):**
```typescript
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  company?: string;
  avatarUrl?: string;
  notifyCampaignReports?: boolean;
  notifyWeeklyDigest?: boolean;
  notifyProductUpdates?: boolean;
}
```

**UI Requirements per screenshot:**
- Personal Information section:
  - Avatar upload/change button
  - First Name, Last Name (text inputs)
  - Email Address (read-only)
  - Phone Number (text input)
  - Company (text input)
  - "Save Changes" button
- Notification Preferences section:
  - Campaign Reports toggle
  - Weekly Digest toggle
  - Product Updates toggle
- Danger Zone section:
  - Delete Account button (can be placeholder)

### 5. Protected Routes

Create a higher-order component or middleware that:
- Checks for valid token before rendering protected pages
- Redirects to `/login` if no token
- Fetches user via `GET /api/auth/me` to validate token
- Shows loading state while checking auth

### 6. API Utility

Create a fetch wrapper that:
- Adds `Content-Type: application/json` header
- Adds `Authorization: Bearer <token>` for authenticated requests
- Handles 401 responses by clearing token and redirecting to login
- Parses JSON responses and errors consistently

```typescript
// Example usage
const api = {
  async post<T>(url: string, data: object): Promise<T>,
  async get<T>(url: string): Promise<T>,
  async patch<T>(url: string, data: object): Promise<T>,
}
```

---

## Error Handling

API errors return:
```typescript
interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];  // array for validation errors
  timestamp: string;
}
```

Display errors using toast notifications (sonner).

---

## Tech Stack Reference

- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Toasts:** sonner
- **Icons:** lucide-react

---

## File Structure Suggestion

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (dashboard)/
│   └── settings/
│       └── profile/
│           └── page.tsx
lib/
├── api.ts           # API utility functions
├── auth-context.tsx # Auth provider & hooks
hooks/
├── use-auth.ts      # Auth hook
├── use-profile.ts   # Profile fetching hook
```

---

## Testing Checklist

- [ ] Can register new user with valid data
- [ ] Shows error for duplicate email
- [ ] Shows validation errors for short password
- [ ] Can login with correct credentials
- [ ] Shows error for wrong password
- [ ] Token is stored after login
- [ ] Protected routes redirect if not authenticated
- [ ] Profile page loads user data
- [ ] Can update profile fields
- [ ] Notification toggles work
- [ ] Logout clears token and redirects
