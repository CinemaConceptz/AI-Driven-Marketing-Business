import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://www.google.com https://www.gstatic.com blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com https://firebasestorage.googleapis.com https://*.firebasestorage.app",
    "font-src 'self' https://fonts.gstatic.com",
    // ADDED: media-src for audio playback
    "media-src 'self' blob: data: https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.googleapis.com",
    // ADDED: Sentry and Firebase Storage domains
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://api.stripe.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com https://www.gstatic.com https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'self' https://js.stripe.com https://www.google.com https://recaptcha.google.com https://*.firebaseapp.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // ADDED: worker-src for blob workers
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
