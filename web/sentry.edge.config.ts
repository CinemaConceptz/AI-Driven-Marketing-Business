import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: process.env.SENTRY_RELEASE || "verifiedsound@1.0.0",
  tracesSampleRate: 0.05,
  environment: process.env.NODE_ENV,
  integrations: [],
});
