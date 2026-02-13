# Postmark App Integration (Next.js)

## Environment Variables
Set in `/web/.env.local` (dev) and hosting env (prod):
- POSTMARK_SERVER_TOKEN
- POSTMARK_FROM_EMAIL
- POSTMARK_FROM_NAME
- POSTMARK_REPLY_TO
- POSTMARK_MESSAGE_STREAM
- POSTMARK_TEMPLATE_WELCOME_ID
- POSTMARK_TEMPLATE_EPK_UPDATED_ID
- POSTMARK_TEMPLATE_ADMIN_NEW_APP_ID
- ADMIN_NOTIFY_EMAIL
- APP_BASE_URL
- EMAIL_TEST_KEY

## Server Code
- **Email service**: `/web/src/services/email/postmark.ts`
- **Email routes**:
  - `/api/email/welcome`
  - `/api/email/epk-updated`
  - `/api/email/admin-new-application`
  - `/api/email/test`

> Do **not** call Postmark from the client. Tokens must remain server-only.

## Local Run
From `/web`:
```
 npm run dev
```

## Test API
```
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "x-email-test-key: $EMAIL_TEST_KEY" \
  -d '{"to":"YOUR_EMAIL_HERE"}'
```

## Notes
- Uses **message stream: outbound** by default.
- Templates are used when IDs are provided; HTML/text fallback remains.
