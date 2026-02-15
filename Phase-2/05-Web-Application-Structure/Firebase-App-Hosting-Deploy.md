# Firebase App Hosting Deployment Guide

## Prerequisites Checklist

Before deploying, ensure you have:
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Access to the Firebase project `verifiedsound-aec78`
- [ ] Google Cloud CLI installed (for Secret Manager)

---

## Step 1: Local Build Verification

From the `/web` directory:

```bash
cd /path/to/web
yarn install --frozen-lockfile
yarn build   # Uses --webpack flag to avoid Turbopack issues
```

---

## Step 2: Firebase Setup

```bash
# Check Firebase CLI version
firebase --version

# Login if needed
firebase login

# List your projects
firebase projects:list

# Select the correct project
firebase use verifiedsound-aec78
```

---

## Step 3: Set Up Secrets in Google Secret Manager

App Hosting uses **Secret Manager** for sensitive environment variables. Run these commands:

```bash
# Enable Secret Manager API (if not already)
gcloud services enable secretmanager.googleapis.com

# Create secrets (you'll be prompted to enter each value)
echo -n "YOUR_OPENAI_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "YOUR_POSTMARK_TOKEN" | gcloud secrets create POSTMARK_SERVER_TOKEN --data-file=-
echo -n "YOUR_STRIPE_SECRET" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "YOUR_STRIPE_WEBHOOK_SECRET" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
echo -n "YOUR_STRIPE_PRICE_ID" | gcloud secrets create STRIPE_PRICE_ID --data-file=-
```

Or use the Google Cloud Console:
1. Go to: https://console.cloud.google.com/security/secret-manager
2. Select project `verifiedsound-aec78`
3. Click "Create Secret" for each:
   - `OPENAI_API_KEY`
   - `POSTMARK_SERVER_TOKEN`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`

---

## Step 4: Deploy Firestore Rules First

```bash
firebase deploy --only firestore:rules
```

---

## Step 5: Deploy to Firebase App Hosting

```bash
firebase deploy --only hosting
```

If that fails, try:
```bash
firebase deploy
```

---

## Step 6: Update apphosting.yaml Values

Edit `/web/apphosting.yaml` to update non-secret values:
- `POSTMARK_FROM_EMAIL` - Your verified sender email
- `ADMIN_NOTIFY_EMAIL` - Admin notification email
- `APP_BASE_URL` - Your production URL

Then redeploy:
```bash
firebase deploy --only hosting
```

---

## Step 7: Connect Custom Domain

### In Firebase Console:

1. Go to **Hosting → Add custom domain**
2. Add: `verifiedsoundar.com`
3. Add: `www.verifiedsoundar.com` (recommended)
4. Firebase will provide DNS records

### In Squarespace DNS:

Add the DNS records Firebase provides. Typically:

| Type | Host | Value |
|------|------|-------|
| A | @ | (Firebase IP 1) |
| A | @ | (Firebase IP 2) |
| AAAA | @ | (Firebase IPv6 1) |
| AAAA | @ | (Firebase IPv6 2) |
| CNAME | www | verifiedsound-aec78.web.app |

---

## Step 8: Create Admin User

Add yourself as an admin in Firestore:

1. Go to **Firebase Console → Firestore Database**
2. Create collection: `admins`
3. Add document with ID = your Firebase UID
4. Fields: `{ "role": "admin" }`

---

## Step 9: Final Validation Checklist

Test each flow on the live site:

- [ ] `/login` - Sign up/in works
- [ ] `/apply` - AI chatbox appears and responds
- [ ] `/admin` - Admin access works with allowlist
- [ ] Stripe checkout creates payment
- [ ] Emails logged in `/admin/emails`

---

## Troubleshooting

### Turbopack Symlink Error
The build script now uses `--webpack` flag to avoid this.

### CVE Block
Next.js 16.1.6 includes the security patches for CVE-2025-55184.

### Secrets Not Found
Ensure secrets are created in the same GCP project (`verifiedsound-aec78`).

### Build Fails on Firebase
Check Cloud Build logs in GCP Console for detailed errors.

---

## Key Files

| File | Purpose |
|------|---------|
| `apphosting.yaml` | Environment variables and secrets config |
| `firebase.json` | Firebase services config |
| `firebase/firestore.rules` | Database security rules |
| `package.json` | Build script with `--webpack` flag |
