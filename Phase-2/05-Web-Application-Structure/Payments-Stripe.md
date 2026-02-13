# Payments — Stripe Checkout

## Flow
1. `/pricing` or `/apply` CTA calls `POST /api/stripe/checkout`
2. Stripe Checkout Session created with `STRIPE_PRICE_ID`
3. Success → `/apply/success?session_id=...`
4. Webhook `POST /api/stripe/webhook` verifies signature and writes:
   - `payments/{sessionId} = { uid, status:"paid", amountTotal, currency, customerEmail, createdAt }`
   - `users/{uid}.paymentStatus = "paid"`
   - `users/{uid}.paymentPaidAt = serverTimestamp()`

## Env Vars
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- STRIPE_SUCCESS_URL
- STRIPE_CANCEL_URL

## Notes
- `/apply` is gated by `users/{uid}.paymentStatus === "paid"`
- Webhook must receive raw body for signature verification
