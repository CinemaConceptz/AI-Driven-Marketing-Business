# Security Access Matrix - Verified Sound A&R

## Overview
This document defines the access control permissions for all Firestore collections and Storage paths.

---

## Roles

| Role | Description | Identifier |
|------|-------------|------------|
| **Anonymous** | Unauthenticated visitor | `request.auth == null` |
| **Owner** | Authenticated user accessing their own data | `request.auth.uid == {uid}` |
| **Admin** | User with entry in `admins` collection | `exists(/databases/.../admins/{auth.uid})` |
| **System** | Server-side API routes using Firebase Admin SDK | Bypasses security rules |

---

## Firestore Collections

### `users/{uid}`
User profile and payment status.

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create | ❌ | ✅ | ❌ | ❌ | ✅ |
| Update | ❌ | ✅ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `users/{uid}/media/{mediaId}`
Press image metadata subcollection.

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ❌ | ✅ |
| Create | ❌ | ✅ | ❌ | ❌ | ✅ |
| Update | ❌ | ✅ | ❌ | ❌ | ✅ |
| Delete | ❌ | ✅ | ❌ | ❌ | ✅ |

---

### `admins/{uid}`
Admin allowlist. Managed exclusively via Firebase Console or Admin SDK.

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ (own doc) | ❌ | ❌ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `submissions/{submissionId}`
Artist application submissions. Contains `uid` field linking to owner.

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create | ❌ | ✅ | ❌ | ❌ | ✅ |
| Update | ❌ | ✅ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `payments/{sessionId}`
Stripe payment records. Created by webhook (System only).

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `emailLogs/{logId}`
Postmark email send logs. Created by API routes (System only).

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `intakeChats/{uid}/messages/{messageId}`
AI chatbox conversation history. Created by API (System only).

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### `intakeProfiles/{uid}`
Structured data extracted from AI chat. Created/updated by API (System only).

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Firebase Storage Paths

### `users/{uid}/media/press/*`
Press images uploaded by artists.

| Operation | Anonymous | Owner | Other User | Admin | System |
|-----------|-----------|-------|------------|-------|--------|
| Read | ❌ | ✅ | ❌ | ❌ | ✅ |
| Write | ❌ | ✅ | ❌ | ❌ | ✅ |
| Delete | ❌ | ✅ | ❌ | ❌ | ✅ |

**Constraints:**
- Max file size: 10 MB
- Allowed content types: `image/jpeg`, `image/png`, `image/webp`

---

## Security Rules Implementation

### Helper Functions
```javascript
function signedIn() {
  return request.auth != null;
}

function isOwner(uid) {
  return signedIn() && request.auth.uid == uid;
}

function isAdmin() {
  return signedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

---

## API Route Security

All API routes should:
1. Verify Firebase ID token for authenticated endpoints
2. Use Firebase Admin SDK for database writes (bypasses client rules)
3. Implement rate limiting for public endpoints
4. Never expose sensitive keys in responses or logs

---

## Security Headers (Middleware)

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unnecessary APIs |
| `Content-Security-Policy` | See middleware.ts | Restrict resource loading |

---

## Last Updated
December 2025
