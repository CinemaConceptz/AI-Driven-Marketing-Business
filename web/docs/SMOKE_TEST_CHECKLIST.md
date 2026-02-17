# Production Smoke Test Checklist

Run this checklist after every deployment (5-10 minutes max).

## Pre-Deployment
- [ ] `firebase deploy --only firestore,storage` for rule updates
- [ ] `git push` to trigger App Hosting deployment
- [ ] Wait for build to complete in Firebase Console

---

## 1. Public Pages (No Auth Required)

### Homepage `/`
- [ ] Page loads without errors
- [ ] Navigation links work
- [ ] AI chatbox button visible (bottom-right)

### Pricing `/pricing`
- [ ] Page loads
- [ ] Tier I shows $39/mo or $390/yr
- [ ] Tier II shows $89/mo or $890/yr  
- [ ] Tier III shows $139/mo or $1,390/yr
- [ ] Monthly/Annual toggle works
- [ ] CTA buttons redirect to login (if not authenticated)

### Public EPK `/epk/{test-slug}`
- [ ] Published EPK loads with artist info
- [ ] Unpublished EPK shows "not published" message
- [ ] Share button copies URL to clipboard
- [ ] OG meta tags render (test with https://developers.facebook.com/tools/debug/)

---

## 2. Authentication Flow

### Login `/login`
- [ ] Page loads
- [ ] Login with test account: `verifiedsoundmedia@gmail.com` / `D3nv3r11$$`
- [ ] Successful login redirects to dashboard
- [ ] Failed login shows error message

### Logout
- [ ] Logout button works
- [ ] Redirects to homepage

---

## 3. Authenticated User Flow

### Dashboard `/dashboard`
- [ ] Page loads after login
- [ ] Subscription tier displayed
- [ ] Application status displayed
- [ ] Press images section visible
- [ ] EPK settings panel visible

### Media `/media`
- [ ] Page loads
- [ ] Existing images displayed
- [ ] Upload new image (if under limit)
- [ ] Delete image works
- [ ] Drag-to-reorder works (if multiple images)

### Settings `/settings`
- [ ] Page loads
- [ ] Profile form populated with existing data
- [ ] Save profile works
- [ ] EPK publish toggle works
- [ ] Custom slug input works

### EPK Preview `/epk`
- [ ] Page loads with user's EPK data
- [ ] Images display correctly
- [ ] Bio and links display

---

## 4. AI Chatbox

- [ ] Floating button visible on all pages
- [ ] Click opens chat panel
- [ ] Type message and get response
- [ ] Clear chat works
- [ ] Close button works

---

## 5. Admin Dashboard (Admin Only)

### Login as Admin
- [ ] Login with admin account
- [ ] Navigate to `/admin`
- [ ] Access granted (not redirected)

### Admin Pages
- [ ] `/admin` - Overview stats load
- [ ] `/admin/submissions` - List loads
- [ ] `/admin/payments` - List loads
- [ ] `/admin/emails` - List loads
- [ ] `/admin/users` - List loads

### Non-Admin Access
- [ ] Login with non-admin user
- [ ] Navigate to `/admin`
- [ ] Redirected to `/dashboard`

---

## 6. Payment Flow (Test Mode)

### Checkout
- [ ] Click pricing CTA while logged in
- [ ] Redirects to Stripe checkout
- [ ] Correct price displayed

### Webhook (requires Stripe CLI for local testing)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```
- [ ] Webhook received without error
- [ ] Payment record created in Firestore
- [ ] User `paymentStatus` updated

---

## 7. Contact Form

### Public EPK Contact
- [ ] Contact button visible on public EPK
- [ ] Form submits successfully
- [ ] Email received (check inbox)
- [ ] Entry created in `contactInquiries` collection

---

## 8. API Health Checks

```bash
# Replace with your production URL
BASE_URL="https://verifiedsoundar.com"

# Public endpoints
curl -I "$BASE_URL/"
curl -I "$BASE_URL/pricing"
curl -I "$BASE_URL/epk/test-slug"

# API endpoints (should return 401 without auth)
curl -X POST "$BASE_URL/api/stripe/checkout" -H "Content-Type: application/json"
curl -X POST "$BASE_URL/api/contact" -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","message":"Test message"}'
```

---

## 9. Performance Checks

- [ ] Initial page load < 3 seconds
- [ ] No console errors in browser
- [ ] No 500 errors in App Hosting logs

---

## 10. Security Headers

```bash
curl -I "$BASE_URL/" | grep -E "(strict-transport|x-frame|x-content|content-security)"
```

Expected headers:
- [ ] `strict-transport-security`
- [ ] `x-frame-options: DENY`
- [ ] `x-content-type-options: nosniff`
- [ ] `content-security-policy`

---

## Rollback Plan

If critical issues found:

1. **Firebase Console** → App Hosting → Select backend
2. Click **Rollouts** tab
3. Find previous successful deployment
4. Click **Rollback to this version**

Or via CLI:
```bash
# List recent commits
git log --oneline -10

# Force deploy specific commit
git checkout <commit-hash>
git push --force
```

---

## Post-Deploy Monitoring

Check these after 30 minutes:
- [ ] Firebase Console → App Hosting → Logs (no errors)
- [ ] Stripe Dashboard → Webhooks → Recent events (no failures)
- [ ] Postmark → Activity → Sent emails (no bounces)

---

**Last Updated:** December 2025
**Test Account:** verifiedsoundmedia@gmail.com / D3nv3r11$$
