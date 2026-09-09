export type ScanResult = {
  food: string;
  proteinG: number;
  calories: number;
  carbsG: number;
  portion: string;
  confidence: 'high' | 'medium' | 'low';
};

const SCAN_URL = process.env.EXPO_PUBLIC_SCAN_URL ?? '';
const SCAN_TOKEN = process.env.EXPO_PUBLIC_SCAN_TOKEN ?? '';

const MOCK_RESULTS: ScanResult[] = [
  { food: 'Grilled chicken salad', proteinG: 31, calories: 305, carbsG: 9, portion: '1.5 cups', confidence: 'high' },
  { food: 'Greek yogurt with berries', proteinG: 18, calories: 160, carbsG: 14, portion: '1 cup', confidence: 'high' },
  { food: 'Protein shake', proteinG: 25, calories: 180, carbsG: 6, portion: '12 oz', confidence: 'medium' },
  { food: 'Scrambled eggs and toast', proteinG: 21, calories: 340, carbsG: 22, portion: '2 eggs, 1 slice', confidence: 'high' },
];

let mockIdx = 0;

/**
 * Sends a photo to the scan backend (Cloudflare Worker wrapping Claude vision).
 * With no EXPO_PUBLIC_SCAN_URL configured, returns rotating mock data so the
 * app is fully testable before backend keys exist.
 */
export async function scanMeal(imageBase64: string): Promise<ScanResult> {
  if (!SCAN_URL) {
    await new Promise((r) => setTimeout(r, 1400));
    const result = MOCK_RESULTS[mockIdx % MOCK_RESULTS.length];
    mockIdx++;
    return result;
  }

  const res = await fetch(`${SCAN_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SCAN_TOKEN ? { Authorization: `Bearer ${SCAN_TOKEN}` } : {}),
    },
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Scan failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as ScanResult;
}

export const scanIsMock = !SCAN_URL;
