# Email Flows

## Welcome Email
- Route: `POST /api/email/welcome`
- Trigger: after signup (client calls once)
- Idempotent via `users/{uid}.emailFlags.welcomeSentAt`

## EPK Updated Email
- Route: `POST /api/email/epk-updated`
- Trigger: press image upload success
- Idempotent via `emailFlags.epkUpdatedLastSentAt` vs `press.updatedAt`

## Admin New Application
- Route: `POST /api/email/admin-new-application`
- Trigger: apply form submission (server creates submission + emails admin)

## Payment Confirmation
- Route: `POST /api/stripe/webhook`
- On `checkout.session.completed` → sends confirmation to user + admin (template if provided)
