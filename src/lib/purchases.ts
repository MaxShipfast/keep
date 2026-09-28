import Constants from 'expo-constants';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesIntroPrice,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

/**
 * RevenueCat wrapper. In Expo Go (or with no API key configured) it runs in
 * mock mode: plans render from hardcoded copy and "purchasing" simply grants
 * the entitlement locally. In an EAS/dev-client build with
 * EXPO_PUBLIC_RC_API_KEY set, it talks to real StoreKit via react-native-purchases.
 *
 * Live mode never falls back to mock plans: if the store can't be reached the
 * caller gets a readable error to show, so a broken store configuration is
 * visible instead of silently rendering plans that can't actually be bought.
 */

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';
/** App Store Connect product ids. Also used as a fallback entitlement check. */
export const PRODUCT_IDS = { yearly: 'keep_pro_yearly', weekly: 'keep_pro_weekly' } as const;

const RC_KEY = process.env.EXPO_PUBLIC_RC_API_KEY ?? '';
// Expo Go ships no RevenueCat native module. `appOwnership` is deprecated in SDK 57 but is still
// the only Constants value that separates Expo Go ('expo') from a dev-client build (null).
const isExpoGo = Constants.appOwnership === 'expo';

type PurchasesModule = typeof import('react-native-purchases').default;

let Purchases: PurchasesModule | null = null;
if (!isExpoGo && RC_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Purchases = require('react-native-purchases').default;
  } catch {
    Purchases = null;
  }
}

/**
 * Simulated purchases are a development convenience only. A store build that somehow lacks
 * RevenueCat must fail closed (show an error) rather than hand out Keep Pro for free.
 */
const MOCK_ALLOWED = __DEV__ || isExpoGo;

/** Thrown when the store can't be used at all; the paywall shows a friendly retry message. */
class StoreUnavailableError extends Error {}

/** True when purchases are simulated (Expo Go / development without RevenueCat). */
export function purchasesAreMock(): boolean {
  return !Purchases && MOCK_ALLOWED;
}

export type Plan = {
  id: 'yearly' | 'weekly';
  title: string;
  sub: string;
  /** Headline price, e.g. the per-week equivalent. */
  price: string;
  priceNote: string;
  badge?: string;
  /** Free-trial length in days; 0 when the store product carries no free introductory offer. */
  trialDays: number;
  /** Full price for one billing period, e.g. "$49.99". */
  periodPrice: string;
  rcPackage?: PurchasesPackage;
};

const MOCK_PLANS: Plan[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    sub: '3-day free trial, then $49.99/yr',
    price: '$0.96',
    priceNote: 'per week',
    badge: 'Save 86%',
    trialDays: 3,
    periodPrice: '$49.99',
  },
  {
    id: 'weekly',
    title: 'Weekly',
    sub: 'Billed weekly, cancel anytime',
    price: '$6.99',
    priceNote: 'per week',
    trialDays: 0,
    periodPrice: '$6.99',
  },
];

function isEntitled(info: CustomerInfo): boolean {
  if (info.entitlements.active[PRO_ENTITLEMENT] !== undefined) return true;
  // Fallback: a live subscription to one of our products counts even if the product→entitlement
  // mapping in the RevenueCat dashboard is missing. Paying users must never be locked out.
  const ids: readonly string[] = Object.values(PRODUCT_IDS);
  return info.activeSubscriptions.some((id) => ids.includes(id));
}

/** Resolves once configure() has run, so plan/purchase calls never race app start. */
let ready: Promise<void> = Promise.resolve();

/**
 * Configures RevenueCat and keeps the local entitlement flag in sync with the store.
 * `onEntitled` fires with the current state at launch and again whenever it changes
 * (purchase, renewal, expiry, restore on a new phone).
 */
export function initPurchases(onEntitled: (entitled: boolean) => void): void {
  const rc = Purchases;
  if (!rc) return;
  ready = (async () => {
    try {
      if (__DEV__) await rc.setLogLevel(rc.LOG_LEVEL.DEBUG);
      rc.configure({ apiKey: RC_KEY });
    } catch (e) {
      // Native module missing (dev client built before the SDK was added). Mock keeps dev usable.
      console.warn('[purchases] configure failed — running in mock mode:', e);
      Purchases = null;
      return;
    }
    rc.addCustomerInfoUpdateListener((info) => onEntitled(isEntitled(info)));
    try {
      onEntitled(isEntitled(await rc.getCustomerInfo()));
    } catch {
      // Offline at launch: keep whatever the local store already says.
    }
  })();
}

/**
 * Ties the RevenueCat customer to the Keep account, so the subscription follows the account and
 * email tools can match purchase events to it. Best-effort: access never depends on this.
 */
export async function linkPurchasesUser(userId: string, email: string | null): Promise<void> {
  const rc = Purchases;
  if (!rc) return;
  await ready;
  try {
    await rc.logIn(userId);
    if (email) await rc.setEmail(email);
  } catch {
    // Access still comes from the App Store receipt on this Apple ID.
  }
}

/** Removes the email from the RevenueCat customer when the account is deleted. */
export async function clearPurchasesEmail(): Promise<void> {
  const rc = Purchases;
  if (!rc) return;
  await ready;
  try {
    await rc.setEmail(null);
  } catch {
    // Nothing to clean up if RevenueCat is unreachable; the next sign-in overwrites it.
  }
}

/**
 * Loads the plans to show. Mock mode returns fixed copy; live mode throws a readable
 * error (see `describeError`) when the offering or its packages can't be loaded.
 */
export async function getPlans(): Promise<Plan[]> {
  await ready;
  if (!Purchases) {
    if (MOCK_ALLOWED) return MOCK_PLANS;
    throw new StoreUnavailableError('RevenueCat is not configured in this build (missing EXPO_PUBLIC_RC_API_KEY?).');
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current ?? Object.values(offerings.all)[0] ?? null;
  if (!current) {
    throw new StoreUnavailableError('No offering is marked "current" in the RevenueCat dashboard.');
  }

  const annual = current.annual ?? findPackage(current, PRODUCT_IDS.yearly, /annual|year/i);
  const weekly = current.weekly ?? findPackage(current, PRODUCT_IDS.weekly, /week/i);

  const plans: Plan[] = [];
  if (annual) plans.push(planFromPackage('yearly', annual, weekly));
  if (weekly) plans.push(planFromPackage('weekly', weekly));
  if (plans.length === 0) {
    throw new StoreUnavailableError(
      `Offering "${current.identifier}" has no yearly or weekly package. Check that ${PRODUCT_IDS.yearly} and ${PRODUCT_IDS.weekly} are attached to it in RevenueCat and approved in App Store Connect.`
    );
  }
  return plans;
}

function findPackage(offering: PurchasesOffering, productId: string, idPattern: RegExp): PurchasesPackage | null {
  return (
    offering.availablePackages.find((p) => p.product.identifier === productId) ??
    offering.availablePackages.find((p) => idPattern.test(p.identifier)) ??
    null
  );
}

function planFromPackage(id: Plan['id'], pkg: PurchasesPackage, weeklyPkg?: PurchasesPackage | null): Plan {
  const product = pkg.product;
  const intro = product.introPrice;
  const trialDays = intro && intro.price === 0 ? introDays(intro) : 0;

  if (id === 'yearly') {
    const perWeek = product.pricePerWeekString ?? formatMoney(product.price / 52, product.currencyCode);
    const weeklyPrice = weeklyPkg?.product.price ?? 0;
    const save =
      product.pricePerWeek && weeklyPrice > 0 ? Math.round((1 - product.pricePerWeek / weeklyPrice) * 100) : 0;
    return {
      id,
      title: 'Yearly',
      sub: trialDays > 0 ? `${trialDays}-day free trial, then ${product.priceString}/yr` : `${product.priceString}/yr, cancel anytime`,
      price: perWeek,
      priceNote: 'per week',
      badge: save > 0 ? `Save ${save}%` : undefined,
      trialDays,
      periodPrice: product.priceString,
      rcPackage: pkg,
    };
  }
  return {
    id,
    title: 'Weekly',
    sub: trialDays > 0 ? `${trialDays}-day free trial, then ${product.priceString}/wk` : 'Billed weekly, cancel anytime',
    price: product.priceString,
    priceNote: 'per week',
    trialDays,
    periodPrice: product.priceString,
    rcPackage: pkg,
  };
}

function introDays(intro: PurchasesIntroPrice): number {
  const units = intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  switch (intro.periodUnit) {
    case 'WEEK':
      return units * 7;
    case 'MONTH':
      return units * 30;
    case 'YEAR':
      return units * 365;
    default:
      return units;
  }
}

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export type PurchaseOutcome =
  /** Store confirmed the purchase and RevenueCat granted access. */
  | 'entitled'
  /** The user dismissed the App Store sheet. */
  | 'cancelled'
  /** The store confirmed a purchase but no entitlement came back (dashboard mapping problem). */
  | 'not_entitled';

export async function purchase(plan: Plan): Promise<PurchaseOutcome> {
  if (!Purchases) {
    if (!MOCK_ALLOWED) throw new StoreUnavailableError('Purchase attempted without RevenueCat in a store build.');
    await new Promise((r) => setTimeout(r, 600));
    return 'entitled'; // development only: grant entitlement locally
  }
  if (!plan.rcPackage) {
    throw new StoreUnavailableError('Plan has no RevenueCat package attached.');
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.rcPackage);
    return isEntitled(customerInfo) ? 'entitled' : 'not_entitled';
  } catch (e) {
    if (isCancelled(e)) return 'cancelled';
    if (errorCode(e) === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      // Already subscribed on this Apple ID — treat like a restore.
      return isEntitled(await Purchases.getCustomerInfo()) ? 'entitled' : 'not_entitled';
    }
    throw e;
  }
}

/** Returns true when the user ends up entitled. Throws on store/network failure. */
export async function restore(): Promise<boolean> {
  await ready;
  if (!Purchases) {
    if (MOCK_ALLOWED) return false;
    throw new StoreUnavailableError('Restore attempted without RevenueCat in a store build.');
  }
  return isEntitled(await Purchases.restorePurchases());
}

function errorCode(e: unknown): string | undefined {
  const err = e as Partial<PurchasesError> | undefined;
  return err?.code !== undefined && err.code !== null ? String(err.code) : undefined;
}

function isCancelled(e: unknown): boolean {
  const err = e as Partial<PurchasesError> | undefined;
  return err?.userCancelled === true || errorCode(e) === Purchases?.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export type StoreErrorMessage = {
  /** Plain-language sentence safe to show any customer (and App Review). */
  friendly: string;
  /** Underlying StoreKit/RevenueCat detail, shown only behind "Show details". */
  technical: string;
};

const UNAVAILABLE = "Subscriptions couldn't be loaded right now. Please try again in a moment.";

/** Splits a RevenueCat/StoreKit error into a customer-facing sentence and the technical detail. */
export function describeError(e: unknown): StoreErrorMessage {
  const err = e as (Partial<PurchasesError> & { message?: string }) | undefined;
  const codes = Purchases?.PURCHASES_ERROR_CODE;
  const code = errorCode(e);
  const label = err?.userInfo?.readableErrorCode ?? err?.readableErrorCode;
  const detail = err?.underlyingErrorMessage || err?.message || '';
  const technical = [label ?? code, detail].filter(Boolean).join(': ') || 'No further detail.';

  if (e instanceof StoreUnavailableError) return { friendly: UNAVAILABLE, technical };

  const known: Array<[string | undefined, string]> = codes
    ? [
        [codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR, UNAVAILABLE],
        [codes.CONFIGURATION_ERROR, UNAVAILABLE],
        [codes.PAYMENT_PENDING_ERROR, "Your purchase is waiting for approval (Ask to Buy). Keep Pro unlocks as soon as it's approved."],
        [codes.NETWORK_ERROR, "You're offline. Check your connection and try again."],
        [codes.OFFLINE_CONNECTION_ERROR, "You're offline. Check your connection and try again."],
        [codes.STORE_PROBLEM_ERROR, 'The App Store had a problem. Please try again in a moment.'],
        [codes.PURCHASE_NOT_ALLOWED_ERROR, "Purchases aren't allowed on this device (Screen Time or parental restrictions)."],
      ]
    : [];
  const hit = code !== undefined ? known.find(([c]) => c === code) : undefined;
  return { friendly: hit ? hit[1] : 'Something went wrong. Please try again.', technical };
}
