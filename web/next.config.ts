import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: "verifiedsound",
  project: "javascript-nextjs",
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
