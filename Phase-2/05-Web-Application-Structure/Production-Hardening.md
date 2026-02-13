# Production Hardening

## Email API Security
- All `/api/email/*` routes require Firebase Admin `verifyIdToken`.
- `/api/email/test` returns **404** in production unless `x-email-test-key` is present.

## Rate Limiting
- In-memory limiter applied to `/api/email/*` routes.
- Default: 10 requests/hour per `uid + ip`.

## Error Handling
- Server errors return `{ ok:false, error:"..." }` with status codes.
- No secrets logged; logs include request id + uid only.
