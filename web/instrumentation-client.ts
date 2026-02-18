import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
  beforeSend(event) {
    return event;
  },
});
