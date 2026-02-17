# Verified Sound A&R - Product Requirements Document

## Original Problem Statement
Build a full-stack application using Next.js 14+ for the frontend and backend (via App Router API routes). The platform is "Verified Sound A&R" - a premium representation platform for musicians focused on House, EDM, Disco, Afro, Soulful, and Trance releases.

## Core Features

### Authentication & Security
- Firebase Authentication (email/password)
- Protected routes: `/dashboard`, `/media`, `/epk`, `/admin`
- Admin role-based access via Firestore `admins/{uid}` collection

### Pages
- `/` - Home/Landing
- `/pricing` - Pricing information
- `/apply` - Artist intake form with AI Chatbox
- `/login` - User authentication
- `/dashboard` - Protected user dashboard (subscription status, press images)
- `/epk` - Electronic Press Kit
- `/media` - Press image manager
- `/billing/success` & `/billing/cancel` - Stripe payment flow
- `/privacy` & `/terms` - Legal pages
- `/admin/*` - Admin Dashboard (protected)

### Database Schema (Firestore)
- `users/{uid}` - User profiles, payment status, email flags
- `users/{uid}/media/press` - Press image metadata
- `admins/{uid}` - Admin allowlist
- `submissions/{submissionId}` - Artist application data
- `payments/{paymentId}` - Stripe payment records
- `emailLogs/{logId}` - Postmark email logs
- `intakeChats/{uid}/messages/{messageId}` - AI chat transcripts
- `intakeProfiles/{uid}` - Extracted intake data from AI chat

### 3rd Party Integrations
- **Firebase**: Auth, Firestore, Storage
- **Stripe**: One-time submission fee payment
- **Postmark**: Transactional emails (welcome, EPK updated, admin notifications)
- **OpenAI GPT-5.2**: AI Intake Chatbox assistant

---

## What's Been Implemented

### Session: February 17, 2025 - Security Hardening

#### Phase 3, Step A - Security Hardening (Completed A1-A4)

**A1: Security Access Matrix**
- Created comprehensive `/app/web/docs/SECURITY_ACCESS_MATRIX.md` documenting:
  - Role definitions (Anonymous, Owner, Admin, System)
  - Read/write permissions for all Firestore collections
  - Storage path permissions and constraints
  - API route security requirements
  - Security header specifications

**A2: Enhanced Firestore Rules** (`/app/web/firebase/firestore.rules`)
- Added `isValidString()` and `isValidEmail()` helper functions for future validation
- Separated create/update/delete permissions for fine-grained control
- Added catch-all deny rule to prevent accidental exposure of new collections
- Improved documentation and organization of rules

**A3: Enhanced Storage Rules** (`/app/web/firebase/storage.rules`)
- Added `isAllowedImageType()` validation (jpeg, png, webp only)
- Added `isUnderSizeLimit()` validation (10 MB max)
- Separated read/write/delete permissions
- Added catch-all deny rule for undefined paths

**A4: Security Headers Middleware** (`/app/web/src/middleware.ts`)
- `Strict-Transport-Security`: 1 year HSTS with preload
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY (prevents clickjacking)
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: Disabled camera, microphone, geolocation
- `Content-Security-Policy`: Configured for Firebase, Stripe, Google

**A5: Firebase App Check** (Completed)
- Integrated reCAPTCHA v3 provider in `/app/web/src/lib/firebase.ts`
- Added `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` to `apphosting.yaml`
- Auto-refresh tokens enabled for seamless user experience

---

### Session: February 15, 2025

#### Admin Dashboard (NEW)
- `/admin` - Overview with stats (submissions, payments, email failures, users)
- `/admin/submissions` - Submissions list with pending/all filter + "View Chat" button
- `/admin/payments` - Stripe payments log
- `/admin/emails` - Email logs with all/failed filter
- `/admin/users` - Users list
- Admin guard via `admins/{uid}` collection
- Chat transcript viewer modal for reviewing AI conversations

#### AI Intake Chatbox (NEW)
- `IntakeChatbox.tsx` component on `/apply` page
- `/api/intake-chat` API route with OpenAI GPT-5.2 integration
- Multi-turn conversation with session persistence
- Structured data extraction (artist name, email, genre, links, goals)
- Firestore logging: `intakeChats/{uid}/messages/{messageId}`
- Intake profile updates: `intakeProfiles/{uid}`
- Auto-fills form fields from extracted data

#### Email Logging (UPDATED)
- All Postmark sends now logged to `emailLogs` collection
- Supports both successful sends and failures
- Fields: type, to, status, postmarkMessageId, error, meta

#### Firestore Security Rules (UPDATED)
- Added `isAdmin()` function
- Admin read access to: users, submissions, payments, emailLogs
- Added rules for: intakeChats, intakeProfiles

---

## Environment Variables Required

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=

# Postmark
POSTMARK_SERVER_TOKEN=
POSTMARK_FROM_EMAIL=
POSTMARK_FROM_NAME=
POSTMARK_MESSAGE_STREAM=
ADMIN_NOTIFY_EMAIL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2

# App
APP_BASE_URL=
```

---

## Tech Stack
- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Google Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Cloud Storage
- **Payments**: Stripe
- **Email**: Postmark
- **AI**: OpenAI GPT-5.2

---

## Prioritized Backlog

### P0 (Critical)
- [x] Admin Dashboard
- [x] AI Intake Chatbox
- [x] Build fixes (Suspense boundaries for useSearchParams)
- [x] Firebase.json App Hosting configuration
- [x] Deploy to Firebase App Hosting (completed)
- [ ] Custom domain setup (verifiedsoundar.com) (user action required)

### P1 (High Priority) - Phase 3 Security Hardening
- [x] A1: Security Access Matrix documentation (docs/SECURITY_ACCESS_MATRIX.md)
- [x] A2: Enhanced Firestore security rules (helper functions, catch-all deny)
- [x] A3: Enhanced Storage rules (file type/size validation)
- [x] A4: Security headers middleware (CSP, HSTS, X-Frame-Options, etc.)
- [ ] A5: Firebase App Check integration (awaiting reCAPTCHA v3 keys from user)
- [ ] Admin ability to update submission status
- [ ] User notifications for status changes

### P2 (Nice to Have) - Phase 3 Continued
- [ ] Phase 3 Step B: Media System Finalization (upload limits, reordering)
- [ ] Phase 3 Step C: Public EPK Polish (server-rendered /epk/[slug] with OG tags)
- [ ] Phase 3 Step D: Email Infrastructure review
- [ ] Admin user management (add/remove admins)
- [ ] Bulk email sending
- [ ] Analytics dashboard
- [ ] EPK customization options

---

## Test Credentials
- Email: `verifiedsoundmedia@gmail.com`
- Password: `D3nv3r11$$`

---

## Code Architecture
```
/app/web/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── api/
│   │   │   ├── admin/       # Admin-only API routes
│   │   │   ├── email/       # Postmark email routes
│   │   │   ├── intake-chat/ # AI chatbox API
│   │   │   └── stripe/      # Payment routes
│   │   ├── apply/           # Artist intake form
│   │   ├── dashboard/       # User dashboard
│   │   └── ...
│   ├── components/
│   │   ├── admin/           # Admin UI components
│   │   ├── intake/          # AI chatbox component
│   │   └── ...
│   └── lib/
│       ├── admin/           # Admin queries & guard
│       ├── firestore/       # Email logging helper
│       ├── firebase.ts      # Client Firebase
│       ├── firebaseAdmin.ts # Server Firebase Admin
│       ├── openai.ts        # OpenAI client
│       └── stripe.ts        # Stripe client
├── firebase/
│   ├── firestore.rules
│   └── storage.rules
└── package.json
```
