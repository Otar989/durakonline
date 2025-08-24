// Sentry instrumentation entry point (Next.js >=13 App Router)
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from '@sentry/nextjs';

export function register() {
  if (Sentry.isInitialized()) return; // avoid double init in edge/server runtimes
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
    tracesSampleRate: 0.1,
    enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  });
}
