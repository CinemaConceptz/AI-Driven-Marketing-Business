# Firebase App Hosting Deployment — verifiedsound-aec78

> **Note:** I don’t have access to your Firebase/Squarespace consoles from here, so I can’t complete the live deployment or domain verification. The steps below are exact and ready for execution in your console/CLI.

---

## 1) Create / Select App Hosting Backend
1. Firebase Console → **Build → App Hosting**
2. Create or select backend for **verifiedsound-aec78**
3. Connect the GitHub repo and set root to `/web`
4. Build settings:
   - **Framework:** Next.js
   - **Node runtime:** default

---

## 2) Set Production Environment Variables (App Hosting → Environment)
**Required:**
- POSTMARK_SERVER_TOKEN
- POSTMARK_FROM_EMAIL=info@verifiedsoundar.com
- POSTMARK_MESSAGE_STREAM=verifiedsound-transactional
- POSTMARK_TEMPLATE_WELCOME_ID
- POSTMARK_TEMPLATE_EPK_UPDATED_ID
- POSTMARK_TEMPLATE_ADMIN_NEW_APP_ID
- ADMIN_NOTIFY_EMAIL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- STRIPE_SUCCESS_URL=https://verifiedsoundar.com/apply/success
- STRIPE_CANCEL_URL=https://verifiedsoundar.com/pricing
- FIREBASE_PROJECT_ID=verifiedsound-aec78
- APP_BASE_URL=https://verifiedsoundar.com

**Firebase Admin (Production ADC):**
- Ensure the App Hosting runtime identity has Firestore access.
- No JSON key required in prod (ADC).

---

## 3) Deploy
From repo root:
```
cd /web
firebase deploy --only apphosting --project verifiedsound-aec78
```

---

## 4) Connect Custom Domain (Squarespace DNS)
Firebase Console → **Hosting → Add custom domain** → `verifiedsoundar.com`

Firebase will provide exact DNS records. Add them **as shown** in Squarespace DNS.

### Expected Record Types (Firebase-provided values required)
- **TXT** (domain verification)
- **A/AAAA** (apex domain)
- **CNAME** for `www` (optional)

> Paste the exact records Firebase provides into Squarespace. Values are unique per project and must be copied from Firebase.

---

## 5) SSL + Verification
- Wait for DNS propagation (5–30 minutes)
- Firebase → Domain status should show **Connected** + **SSL issued**

---

## 6) Post‑Deploy Checks
- https://verifiedsoundar.com loads the Next.js app (no “Under construction”)
- `/api/email/test` returns 404 in production without key
- Stripe webhook endpoint reachable: `/api/stripe/webhook`

---

## DNS Records to Paste (fill from Firebase Console)
| Type | Name | Value |
|---|---|---|
| TXT | {{firebase-verification-host}} | {{firebase-verification-value}} |
| A | @ | {{firebase-apex-ip-1}} |
| A | @ | {{firebase-apex-ip-2}} |
| AAAA | @ | {{firebase-apex-ipv6-1}} |
| CNAME | www | {{firebase-www-host}} |

---

## Verification Checklist
- [ ] App Hosting deployment succeeded
- [ ] Env vars set in App Hosting
- [ ] DNS records added in Squarespace
- [ ] SSL issued
- [ ] App loads at https://verifiedsoundar.com
- [ ] `/api/email/test` protected in production
- [ ] `/api/stripe/webhook` reachable
