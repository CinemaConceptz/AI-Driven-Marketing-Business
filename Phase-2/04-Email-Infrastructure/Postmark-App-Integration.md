# Postmark App Integration (Next.js)

## Environment Variables
Set in `/web/.env.local` (dev) and hosting env (prod):
- POSTMARK_SERVER_TOKEN
- POSTMARK_FROM_EMAIL
- POSTMARK_REPLY_TO
- APP_BASE_URL
- EMAIL_TEST_KEY

## Server Code
- **Email service**: `/web/src/services/email/postmark.ts`
- **Test API route**: `/web/src/app/api/email/test/route.ts`

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
- Templates can be added later.
