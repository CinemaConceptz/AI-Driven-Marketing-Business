# Firebase App Hosting Deployment Guide

## Prerequisites Checklist

Before deploying, ensure you have:
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Access to the Firebase project `verifiedsound-aec78`
- [ ] All environment variables ready (see section below)

---

## Step 1: Local Build Verification

From the `/web` directory:

```bash
cd /path/to/web
npm ci          # Clean install dependencies
npm run build   # Verify production build works
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

## Step 3: Deploy Firestore Rules First

```bash
firebase deploy --only firestore:rules
```

This deploys the updated security rules with:
- `isAdmin()` function for admin access
- Rules for: `admins`, `submissions`, `payments`, `emailLogs`, `intakeChats`, `intakeProfiles`

---

## Step 4: Deploy to Firebase App Hosting

```bash
firebase deploy --only hosting
```

If that fails, try full deploy:

```bash
firebase deploy
```

---

## Step 5: Set Production Environment Variables

In **Firebase Console → Hosting → Settings → Environment Variables**, add:

### Required Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key for GPT-5.2 |
| `OPENAI_MODEL` | `gpt-5.2` (or your preferred model) |
| `POSTMARK_SERVER_TOKEN` | Postmark server API token |
| `POSTMARK_FROM_EMAIL` | Verified sender email |
| `POSTMARK_FROM_NAME` | "Verified Sound A&R" |
| `POSTMARK_MESSAGE_STREAM` | Your Postmark stream ID |
| `ADMIN_NOTIFY_EMAIL` | Admin email for notifications |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Your Stripe price ID |
| `STRIPE_SUCCESS_URL` | `https://verifiedsoundar.com/apply/success` |
| `STRIPE_CANCEL_URL` | `https://verifiedsoundar.com/apply` |
| `APP_BASE_URL` | `https://verifiedsoundar.com` |
| `FIREBASE_PROJECT_ID` | `verifiedsound-aec78` |

### Client-side Variables (NEXT_PUBLIC_*)

These should already be in your `.env.local` and bundled at build time:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

After setting env vars, redeploy:

```bash
firebase deploy --only hosting
```

---

## Step 6: Connect Custom Domain

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

Wait for DNS propagation (can take up to 48 hours, usually faster).

Firebase will automatically provision SSL certificate once verified.

---

## Step 7: Create Admin User

Add yourself as an admin in Firestore:

1. Go to **Firebase Console → Firestore Database**
2. Create collection: `admins`
3. Add document with ID = your Firebase UID
4. Fields:
   ```json
   {
     "role": "admin",
     "createdAt": (timestamp),
     "note": "DeJohne"
   }
   ```

To find your UID:
- Go to **Authentication → Users**
- Find your email and copy the UID

---

## Step 8: Final Validation Checklist

Test each flow on the live site:

### Authentication
- [ ] `/login` - Sign up new user
- [ ] `/login` - Sign in existing user
- [ ] Redirect to `/dashboard` after login

### Payment Flow
- [ ] `/pricing` - View pricing
- [ ] `/apply` - See payment required message
- [ ] Stripe checkout completes
- [ ] `/apply/success` - Payment confirmed
- [ ] `payments/*` document created in Firestore

### AI Intake Chat
- [ ] `/apply` - AI chatbox appears (after payment)
- [ ] Chat responds with GPT-5.2
- [ ] Form fields auto-fill from extracted data
- [ ] `intakeChats/{uid}/messages/*` populated
- [ ] `intakeProfiles/{uid}` updated

### Admin Dashboard
- [ ] Non-admin redirected away from `/admin`
- [ ] Admin can access `/admin`
- [ ] `/admin` - Overview stats load
- [ ] `/admin/submissions` - List shows
- [ ] `/admin/submissions` - "View Chat" opens transcript
- [ ] `/admin/payments` - Payments list shows
- [ ] `/admin/emails` - Email logs show
- [ ] `/admin/users` - Users list shows

### Emails
- [ ] Welcome email sent on signup
- [ ] Admin notification on application submit
- [ ] `emailLogs/*` documents created

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npm run build
```

### Env Vars Not Working
- Server-side vars must be set in Firebase Console, not `.env.local`
- Client-side `NEXT_PUBLIC_*` vars are bundled at build time
- Redeploy after changing env vars

### Admin Access Denied
- Verify your UID in `admins/{uid}` document
- Check Firestore security rules are deployed
- Ensure you're signed in with the correct account

### OpenAI Not Working
- Verify `OPENAI_API_KEY` is set correctly
- Check rate limits on your OpenAI account
- Look at server logs in Firebase Console

---

## Quick Commands Reference

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules  
firebase deploy --only storage

# View deployment logs
firebase hosting:channel:deploy preview

# Open Firebase Console
firebase open hosting
```
