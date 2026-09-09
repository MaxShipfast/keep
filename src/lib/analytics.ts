import PostHog from 'posthog-react-native';

/**
 * Analytics wrapper. No-ops without EXPO_PUBLIC_POSTHOG_KEY so development
 * stays quiet. The five events that drive the day-30 kill/scale decision:
 * quiz_step, paywall_view, trial_start, scan_complete, app_open.
 */

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

export function initAnalytics(): void {
  if (!KEY || client) return;
  try {
    client = new PostHog(KEY, { host: HOST });
  } catch {
    client = null;
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
  try {
    client?.capture(event, props);
  } catch {
    // analytics must never crash the app
  }
}
