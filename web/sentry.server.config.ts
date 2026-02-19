import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: process.env.SENTRY_RELEASE || "verifiedsound@1.0.0",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
  beforeSend(event, hint) {
    // Skip health/internal pings
    if (event.request?.url?.includes("/_next")) return null;
    return event;
  },
});
