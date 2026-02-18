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
- `/pricing` - Tiered subscription pricing (Tier I/II/III)
- `/apply` - Artist intake form with AI Chatbox
- `/login` - User authentication
- `/dashboard` - Protected user dashboard (subscription status, press images, EPK settings)
- `/settings` - Profile management and EPK configuration
- `/epk` - User's own EPK preview
- `/epk/[slug]` - Public shareable EPK page
- `/media` - Press image manager
- `/billing/success` & `/billing/cancel` - Stripe payment flow
- `/privacy` & `/terms` - Legal pages
- `/admin/*` - Admin Dashboard (protected)

### Database Schema (Firestore)
- `users/{uid}` - User profiles, payment status, email flags
- `users/{uid}/media/{mediaId}` - Press image metadata (supports multiple images)
- `admins/{uid}` - Admin allowlist
- `submissions/{submissionId}` - Artist application data
- `payments/{paymentId}` - Stripe payment records
- `emailLogs/{logId}` - Postmark email logs
- `intakeChats/{uid}/messages/{messageId}` - AI chat transcripts
- `intakeProfiles/{uid}` - Extracted intake data from AI chat
- `contactInquiries/{inquiryId}` - Contact form submissions

### 3rd Party Integrations
- **Firebase**: Auth, Firestore, Storage, App Check
- **Stripe**: Subscription tiers (Tier I/II/III monthly & annual)
- **Postmark**: Transactional emails with retry logic
- **OpenAI GPT-5.2**: AI Assistant (global chatbox + intake)

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

### Session: February 17, 2025 - Media System Enhancement

#### Phase 3, Step B - Media System Finalization (Completed)

**Multiple Press Images Support**
- Updated `/app/web/src/services/pressMedia.ts`:
  - Support for up to 3 images per user
  - `getAllPressMedia()` - fetch all images ordered by sortOrder
  - `uploadPressImage()` - upload with count limit check and retry logic
  - `deletePressImage()` - delete specific image by ID with retry
  - `updateSortOrder()` - batch update for reordering
  - `validateFile()` - frontend validation (type + 10MB size limit)
  - Added `withRetry()` wrapper for network resilience
  - Upload progress tracking via `uploadBytesResumable`

**Drag-and-Drop Reordering**
- Updated `/app/web/src/components/PressImageManager.tsx`:
  - Grid view with 3 columns
  - Native HTML5 drag-and-drop
  - Visual feedback (primary badge, order numbers)
  - Hover states with delete buttons
  - Image info overlay (dimensions, size)
  - Upload progress indicator

**EPK Gallery View**
- Updated `/app/web/src/app/epk/page.tsx` to fetch multiple images
- Updated `/app/web/src/components/epk/EpkLayout.tsx` for array prop
- Updated `/app/web/src/components/epk/sections/EpkPressImage.tsx`:
  - Main image display with thumbnails
  - Click to select/preview
  - Primary image indicator

---

### Session: February 17, 2025 - Global Chatbox & Pricing

#### Global AI Assistant Chatbox
- Created `/app/web/src/components/GlobalChatbox.tsx`:
  - Floating chat button (bottom-right corner)
  - Available on all pages for all users
  - Works for authenticated and unauthenticated users
- Created `/app/web/src/app/api/chat-assistant/route.ts`:
  - Separate from intake chat
  - Rate limited (30 req/min per IP)
  - In-memory session storage for conversation context
  - System prompt with correct Tier I/II/III pricing info

#### Pricing Page Update
- Updated `/app/web/src/app/pricing/page.tsx`:
  - Tier I: $39/mo or $390/yr
  - Tier II: $89/mo or $890/yr (Most Popular)
  - Tier III: $139/mo or $1,390/yr
  - Monthly/Annual toggle with savings display
- Updated `/app/web/src/app/api/stripe/checkout/route.ts`:
  - Maps tier + billing period to correct Stripe price IDs
  - Mode changed to "subscription" for recurring billing

---

### Session: February 17, 2025 - Phase 3C & 3D

#### Phase 3, Step C - Public EPK Polish (Completed)
- Created `/app/web/src/app/epk/[slug]/page.tsx`:
  - Server-rendered public EPK pages
  - Fetches user by `epkSlug` field or falls back to uid
  - Checks `epkPublished` flag
  - Dynamic OG meta tags (title, description, image)
  - Twitter card support
- Created `/app/web/src/app/epk/[slug]/PublicEpkView.tsx`:
  - Artist name, genre, location display
  - Press images gallery with thumbnails
  - Bio section
  - Social links (Spotify, SoundCloud, Instagram, YouTube, Website)
  - Share button with copy-to-clipboard
  - Contact CTA with email link
  - Download image button

#### Phase 3, Step D - Email Infrastructure (Completed)
- Updated `/app/web/src/services/email/postmark.ts`:
  - Added `withRetry()` wrapper with exponential backoff
  - `isRetryableError()` checks for network/server errors
  - Max 3 retries with increasing delays
- Created `/app/web/src/app/api/contact/route.ts`:
  - Contact form API endpoint
  - Input validation and sanitization
  - Rate limiting (5 req/min per IP)
  - Logs inquiries to `contactInquiries` collection
  - Sends email via Postmark with retry support
  - Supports artist-specific or admin fallback recipient
- Updated Firestore rules for `contactInquiries` collection

---

### Session: February 17, 2025 - EPK Settings & Profile Management

#### EPK Publish Toggle & Custom Slug
- Created `/app/web/src/components/EpkSettingsPanel.tsx`:
  - Toggle to publish/unpublish EPK
  - Custom URL slug input with validation
  - Copy link button
  - View EPK button
  - Updates `epkPublished` and `epkSlug` fields in user document

#### Settings Page Enhancement
- Updated `/app/web/src/app/settings/page.tsx`:
  - Full profile editor (artist name, contact email, bio, genre, location)
  - Social links section (Spotify, SoundCloud, Instagram, YouTube, Website)
  - Save profile functionality
  - Integrated EpkSettingsPanel

#### Dashboard Update
- Updated `/app/web/src/app/dashboard/page.tsx`:
  - Added EpkSettingsPanel below press images
  - Updated press images description for 3 images

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

## Test Reports

### Iteration 9 - Phase 3 Regression Test (December 2025)
- **Success Rate:** 90% frontend
- **Passed:** Homepage, Pricing, Login, Dashboard, Settings, Media, Admin, Security Headers
- **Known Issues (Local Only):**
  - Chat assistant needs OPENAI_API_KEY (configured in production via Secret Manager)
  - Public EPK needs GOOGLE_APPLICATION_CREDENTIALS (configured in production)
- **CSP Fix Applied:** Added google.com and gstatic.com to connect-src for reCAPTCHA

---

## Phase 4 Progress

### Phase 4C - PDF EPK Generator (ENHANCED)
- **Template:** `/app/web/src/lib/pdf/EpkPdfTemplate.tsx`
  
  **Tier I (Basic) - $39/mo:**
  - 3-4 pages (Cover, Bio, Music, Images)
  - Clean black/white minimalist theme
  - "Powered by Verified Sound" watermark
  - Max 3 tracks, 4 images
  - On-demand generation only
  
  **Tier II (Professional) - $89/mo:**
  - 5 pages with enhanced styling
  - Dark theme with emerald accent
  - NO watermark
  - Stats & social links page
  - QR codes for tracks
  - Cached PDFs (1-hour cache)
  - Regenerate button
  
  **Tier III (Advanced) - $139/mo:**
  - 6-7 pages with full branding
  - Custom accent color & background
  - Custom logo placement
  - Press quotes section
  - Highlights section (venues, awards)
  - Cached + versioned PDFs
  - Full analytics tracking

- **API:** `/app/web/src/app/api/pdf/epk/route.tsx`
  - GET: Generate/download PDF (checks tier, caches for II/III)
  - POST: Clear cache and regenerate
  - Rate limited: 10/hour per user
  - Logs to `pdfDownloads` collection with analytics

- **UI:** `/app/web/src/components/DownloadEpkButton.tsx`
  - Tier-specific feature badges
  - Download + Regenerate buttons (II/III)
  - Cache status indicator
  - Generation time display

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
- [x] A5: Firebase App Check integration (reCAPTCHA v3)
- [ ] Admin ability to update submission status
- [ ] User notifications for status changes

### P2 (Nice to Have) - Phase 3 Continued
- [x] Phase 3 Step B: Media System Finalization (multiple images, reordering)
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
