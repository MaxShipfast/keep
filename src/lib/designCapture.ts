/**
 * Development-only switch for exporting screens to a designer from the web preview
 * (EXPO_PUBLIC_DESIGN_CAPTURE=1 in a local .env). It stands in for iPhone-only pieces the browser
 * can't show: the Sign in with Apple button, the notification prompt, and the camera.
 * Always false in store builds (__DEV__ is false there).
 */
export const designCapture = __DEV__ && process.env.EXPO_PUBLIC_DESIGN_CAPTURE === '1';

/** Opens the scan screen straight on its result sheet (web preview URL ends with ?scan=result). */
export const designCaptureScanResult =
  designCapture && typeof globalThis.location !== 'undefined' && globalThis.location.search.includes('scan=result');
