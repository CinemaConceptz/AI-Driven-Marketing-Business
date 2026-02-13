# Email Flows

## Welcome Email
- Route: `POST /api/email/welcome`
- Trigger: after signup or first dashboard load
- Idempotent via:
  - `users/{uid}.emailFlags.welcomeSentAt`
  - `users/{uid}.emailFlags.welcomeMessageId`

## EPK Updated Email
- Route: `POST /api/email/epk-updated`
- Trigger: press image upload success
- Throttle:
  - Skip if `press.updatedAt <= emailFlags.epkUpdatedLastSentAt`
  - Skip if last send < 10 minutes
- Idempotent via:
  - `users/{uid}.emailFlags.epkUpdatedLastSentAt`
  - `users/{uid}.emailFlags.epkUpdatedMessageId`

## Admin New Application
- Route: `POST /api/email/admin-new-application`
- Trigger: apply form submission (server creates submission + emails admin)
- Idempotent via:
  - `submissions/{uid}.emailFlags.adminNotifiedAt`
  - `submissions/{uid}.emailFlags.adminNotifiedMessageId`
