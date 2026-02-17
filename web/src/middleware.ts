import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Headers Middleware
 * Applies security headers to all responses for production hardening.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Strict Transport Security - Force HTTPS for 1 year
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS Protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable unnecessary browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );

  // Content Security Policy
  // Configured for Firebase, Stripe, and common CDNs
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: self, inline for Next.js hydration, Firebase, Stripe, reCAPTCHA
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://www.google.com https://www.gstatic.com",
    // Styles: self, inline for Tailwind
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self, data URIs, Firebase Storage, common image hosts
    "img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com https://firebasestorage.googleapis.com",
    // Fonts: self, Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Connect: APIs, Firebase, Stripe, OpenAI (proxied)
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://api.stripe.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    // Frames: Stripe checkout, reCAPTCHA
    "frame-src 'self' https://js.stripe.com https://www.google.com https://recaptcha.google.com",
    // Form actions: self only
    "form-action 'self'",
    // Base URI: self only
    "base-uri 'self'",
    // Object: none (disable plugins)
    "object-src 'none'",
    // Upgrade insecure requests in production
    "upgrade-insecure-requests",
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return response;
}

// Apply middleware to all routes except static files and API routes that need different handling
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
