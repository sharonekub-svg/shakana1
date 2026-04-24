import * as Sentry from '@sentry/react-native';
import { env } from './env';

let initialized = false;

export function initSentry(): void {
  if (initialized || !env.sentryDsn) return;
  initialized = true;
  Sentry.init({
    dsn: env.sentryDsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
    _experiments: { profilesSampleRate: 0.1 },
    enableNative: true,
    debug: false,
  });
}

export function identifySentryUser(id: string | null): void {
  if (!env.sentryDsn) return;
  Sentry.setUser(id ? { id } : null);
}

export { Sentry };
