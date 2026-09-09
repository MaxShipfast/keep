import Constants from 'expo-constants';

/**
 * RevenueCat wrapper. In Expo Go (or with no API key configured) it runs in
 * mock mode: plans render from hardcoded copy and "purchasing" simply grants
 * the entitlement locally. In an EAS/dev-client build with
 * EXPO_PUBLIC_RC_API_KEY set, it talks to real StoreKit via react-native-purchases.
 */

const RC_KEY = process.env.EXPO_PUBLIC_RC_API_KEY ?? '';
const isExpoGo = Constants.appOwnership === 'expo';

let Purchases: any = null;
if (!isExpoGo && RC_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Purchases = require('react-native-purchases').default;
  } catch {
    Purchases = null;
  }
}

export const purchasesAreMock = !Purchases;

export type Plan = {
  id: 'yearly' | 'weekly';
  title: string;
  sub: string;
  price: string;
  priceNote: string;
  badge?: string;
  rcPackage?: unknown;
};

const MOCK_PLANS: Plan[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    sub: '3-day free trial, then $49.99/yr',
    price: '$0.96',
    priceNote: 'per week',
    badge: 'Save 86%',
  },
  { id: 'weekly', title: 'Weekly', sub: 'Billed weekly, cancel anytime', price: '$6.99', priceNote: 'per week' },
];

export async function initPurchases(): Promise<void> {
  if (!Purchases) return;
  Purchases.configure({ apiKey: RC_KEY });
}

export async function getPlans(): Promise<Plan[]> {
  if (!Purchases) return MOCK_PLANS;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return MOCK_PLANS;
    const plans: Plan[] = [];
    if (current.annual) {
      plans.push({
        id: 'yearly',
        title: 'Yearly',
        sub: `3-day free trial, then ${current.annual.product.priceString}/yr`,
        price: current.annual.product.pricePerWeekString ?? '',
        priceNote: 'per week',
        badge: 'Save 86%',
        rcPackage: current.annual,
      });
    }
    if (current.weekly) {
      plans.push({
        id: 'weekly',
        title: 'Weekly',
        sub: 'Billed weekly, cancel anytime',
        price: current.weekly.product.priceString,
        priceNote: 'per week',
        rcPackage: current.weekly,
      });
    }
    return plans.length ? plans : MOCK_PLANS;
  } catch {
    return MOCK_PLANS;
  }
}

/** Returns true when the user ends up entitled. */
export async function purchase(plan: Plan): Promise<boolean> {
  if (!Purchases) {
    await new Promise((r) => setTimeout(r, 600));
    return true; // mock: grant entitlement locally
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.rcPackage);
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}
