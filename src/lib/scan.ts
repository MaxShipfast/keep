export type ScanResult = {
  food: string;
  proteinG: number;
  calories: number;
  carbsG: number;
  portion: string;
  confidence: 'high' | 'medium' | 'low';
};

const SCAN_URL = (process.env.EXPO_PUBLIC_SCAN_URL ?? '').replace(/\/+$/, '');
const SCAN_TOKEN = process.env.EXPO_PUBLIC_SCAN_TOKEN ?? '';
/** Hard stop for one scan round-trip. The backend normally answers in a few seconds. */
const SCAN_TIMEOUT_MS = 45_000;

const MOCK_RESULTS: ScanResult[] = [
  { food: 'Grilled chicken salad', proteinG: 31, calories: 305, carbsG: 9, portion: '1.5 cups', confidence: 'high' },
  { food: 'Greek yogurt with berries', proteinG: 18, calories: 160, carbsG: 14, portion: '1 cup', confidence: 'high' },
  { food: 'Protein shake', proteinG: 25, calories: 180, carbsG: 6, portion: '12 oz', confidence: 'medium' },
  { food: 'Scrambled eggs and toast', proteinG: 21, calories: 340, carbsG: 22, portion: '2 eggs, 1 slice', confidence: 'high' },
];

let mockIdx = 0;

/** True when no backend URL made it into this bundle (Expo Go without .env, or a build without eas.json env). */
export const scanIsMock = !SCAN_URL;

/**
 * Sends a photo to the scan backend (Cloudflare Worker wrapping OpenAI vision).
 * `imageBase64` is raw base64 (no data-URI prefix) of an already-downscaled JPEG.
 * With no EXPO_PUBLIC_SCAN_URL configured, returns rotating mock data so the
 * app is fully testable before backend keys exist.
 */
export async function scanMeal(imageBase64: string, mediaType: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<ScanResult> {
  if (scanIsMock) {
    await new Promise((r) => setTimeout(r, 1400));
    const result = MOCK_RESULTS[mockIdx % MOCK_RESULTS.length];
    mockIdx++;
    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SCAN_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SCAN_TOKEN ? { Authorization: `Bearer ${SCAN_TOKEN}` } : {}),
      },
      body: JSON.stringify({ imageBase64, mediaType }),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) throw new Error('The scan took too long. Check your connection and try again.');
    throw new Error('Could not reach the scan server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(await describeFailure(res));

  const data = (await res.json().catch(() => null)) as Partial<ScanResult> | null;
  if (!data || typeof data.proteinG !== 'number' || typeof data.food !== 'string') {
    throw new Error('The scan server returned an unexpected response. Try again.');
  }
  return {
    food: data.food,
    proteinG: Math.max(0, Math.round(data.proteinG)),
    calories: Math.max(0, Math.round(data.calories ?? 0)),
    carbsG: Math.max(0, Math.round(data.carbsG ?? 0)),
    portion: data.portion ?? '',
    confidence: data.confidence === 'high' || data.confidence === 'medium' ? data.confidence : 'low',
  };
}

/** True when the model saw no food in the frame (backend returns zeros + low confidence). */
export function isNotFood(r: ScanResult): boolean {
  return r.proteinG === 0 && r.calories === 0 && r.confidence === 'low';
}

async function describeFailure(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
  const detail = body?.error ? `${body.error}${body.detail ? ` (${body.detail})` : ''}` : '';
  switch (res.status) {
    case 401:
      return 'The scan server rejected this app build (token mismatch). Rebuild with the current EXPO_PUBLIC_SCAN_TOKEN.';
    case 429:
      return 'Too many scans in a row. Wait a few minutes and try again.';
    case 504:
      return 'The scan took too long. Try again with better lighting or a closer shot.';
    default:
      return detail ? `Scan failed: ${detail}` : `Scan failed (HTTP ${res.status}).`;
  }
}
