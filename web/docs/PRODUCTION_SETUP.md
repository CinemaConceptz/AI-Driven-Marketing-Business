# Production Secrets & Scheduler Setup Guide

## Overview

This guide covers the final production configuration for Verified Sound A&R:
1. CRON_SECRET - For securing scheduled email jobs
2. STRIPE_WEBHOOK_SECRET - For Stripe payment webhook verification
3. POSTMARK_SERVER_TOKEN - For email delivery
4. Cloud Scheduler - For automated email drip sequences

---

## 1. CRON_SECRET Setup

The cron endpoint (`/api/cron/emails`) is protected by a secret token in production.

### Generate a Secure Secret
```bash
# Generate a random 32-character secret
openssl rand -hex 32
# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Add to Google Secret Manager
```bash
# Using Firebase CLI
firebase apphosting:secrets:set CRON_SECRET

# Or using gcloud CLI
echo -n "your-generated-secret" | gcloud secrets create CRON_SECRET --data-file=-
```

### Verify in apphosting.yaml
```yaml
env:
  - variable: CRON_SECRET
    secret: CRON_SECRET
    availability:
      - RUNTIME
```

---

## 2. STRIPE_WEBHOOK_SECRET Setup

Stripe uses webhook secrets to verify that incoming webhook requests are authentic.

### Create Webhook Endpoint in Stripe Dashboard
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL: `https://verifiedsoundar.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### Add to Google Secret Manager
```bash
# Using Firebase CLI
firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET
# Paste: whsec_your_signing_secret_here

# Or using gcloud CLI
echo -n "whsec_your_signing_secret_here" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
```

### Test Webhook
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

---

## 3. POSTMARK_SERVER_TOKEN Verification

Ensure your Postmark server token is valid for production email delivery.

### Get Token from Postmark
1. Log in to [Postmark](https://account.postmarkapp.com/)
2. Go to your Server → API Tokens
3. Copy the "Server API Token"

### Verify Current Token
```bash
# Test API token
curl -X GET "https://api.postmarkapp.com/server" \
  -H "Accept: application/json" \
  -H "X-Postmark-Server-Token: YOUR_TOKEN_HERE"
```

### Update in Secret Manager (if needed)
```bash
firebase apphosting:secrets:set POSTMARK_SERVER_TOKEN
# Paste your valid Postmark server token
```

### Configure Sender Signature
1. In Postmark, go to Sender Signatures
2. Add and verify: `info@verifiedsoundar.com`
3. Ensure DNS records (SPF, DKIM) are configured

---

## 4. Cloud Scheduler Setup

Automated email drip sequences require Cloud Scheduler to call the cron endpoint daily.

### Prerequisites
```bash
# Enable required APIs
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable appengine.googleapis.com  # Required for scheduler

# Set project
gcloud config set project verifiedsound-aec78
```

### Create Scheduler Job (All Emails)
```bash
# Single job for all email types - recommended approach
gcloud scheduler jobs create http verified-sound-email-drip \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="UTC" \
  --uri="https://verifiedsoundar.com/api/cron/emails?type=all" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="Daily email drip sequences - Day 2, 5, 7, reengagement" \
  --attempt-deadline=300s
```

### Or Create Individual Jobs (Optional)
```bash
# Day 2 - Profile Reminder
gcloud scheduler jobs create http email-drip-day2 \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="UTC" \
  --uri="https://verifiedsoundar.com/api/cron/emails?type=day2" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="Day 2 profile completion reminder"

# Day 5 - EPK Guide
gcloud scheduler jobs create http email-drip-day5 \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="UTC" \
  --uri="https://verifiedsoundar.com/api/cron/emails?type=day5" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="Day 5 EPK setup guide"

# Day 7 - Upgrade Prompt
gcloud scheduler jobs create http email-drip-day7 \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="UTC" \
  --uri="https://verifiedsoundar.com/api/cron/emails?type=day7" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="Day 7 upgrade prompt for Tier I users"

# Reengagement
gcloud scheduler jobs create http email-reengagement \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --time-zone="UTC" \
  --uri="https://verifiedsoundar.com/api/cron/emails?type=reengagement" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="7+ day inactive user re-engagement"
```

### Test Scheduler Job
```bash
# Dry run (preview without sending)
curl -X GET "https://verifiedsoundar.com/api/cron/emails?type=all&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Manually trigger job
gcloud scheduler jobs run verified-sound-email-drip --location=us-central1
```

### Monitor Jobs
```bash
# List all jobs
gcloud scheduler jobs list --location=us-central1

# View job details
gcloud scheduler jobs describe verified-sound-email-drip --location=us-central1

# View execution history (in Cloud Console)
# https://console.cloud.google.com/cloudscheduler
```

---

## 5. Deployment Checklist

Before going live, verify all secrets are configured:

```bash
# Check all secrets exist in Secret Manager
gcloud secrets list --filter="name:CRON_SECRET OR name:STRIPE_WEBHOOK_SECRET OR name:POSTMARK_SERVER_TOKEN"

# Verify apphosting.yaml references secrets correctly
cat apphosting.yaml | grep -A3 "secret:"

# Deploy with new configuration
firebase deploy --only hosting
```

### Quick Verification Commands
```bash
# 1. Test cron endpoint (should return 401 without auth)
curl -s https://verifiedsoundar.com/api/cron/emails | head -1

# 2. Test with auth (should return results)
curl -s "https://verifiedsoundar.com/api/cron/emails?type=all&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 3. Test Stripe webhook (should return 400 - missing signature)
curl -s -X POST https://verifiedsoundar.com/api/stripe/webhook | head -1

# 4. Test Postmark (send test email via dashboard or API)
```

---

## Troubleshooting

### Cron Job Not Running
- Check Cloud Scheduler logs: `gcloud logging read "resource.type=cloud_scheduler_job"`
- Verify CRON_SECRET matches between scheduler and Secret Manager
- Ensure endpoint is accessible (not blocked by firewall)

### Stripe Webhooks Failing
- Check Stripe Dashboard → Webhooks → Recent deliveries
- Verify webhook secret is correct
- Check app logs for signature verification errors

### Emails Not Sending
- Verify Postmark sender signature is active
- Check Postmark activity feed for delivery status
- Ensure email addresses are valid and not bounced

---

## Summary

| Secret | Purpose | Where to Get |
|--------|---------|--------------|
| CRON_SECRET | Protect cron endpoint | Generate with `openssl rand -hex 32` |
| STRIPE_WEBHOOK_SECRET | Verify Stripe webhooks | Stripe Dashboard → Webhooks |
| POSTMARK_SERVER_TOKEN | Send transactional emails | Postmark Dashboard → API Tokens |

| Service | Schedule | Endpoint |
|---------|----------|----------|
| Email Drip (All) | Daily 9 AM UTC | `/api/cron/emails?type=all` |
