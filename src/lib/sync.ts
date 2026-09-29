import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useStore } from '../store';
import { linkPurchasesUser, clearPurchasesEmail } from './purchases';

/**
 * Accounts + cloud backup (Supabase). Env-gated like every integration: without
 * EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY, `syncEnabled` is false and the app stays local-first.
 *
 * Sign in with Apple is the main door (one Face ID tap). Email one-time codes are the fallback and
 * need a custom SMTP sender in Supabase, so they stay off until EXPO_PUBLIC_EMAIL_SIGNIN=1.
 * Tables and the delete function live in supabase/migrations.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const syncEnabled = Boolean(SUPABASE_URL && KEY);
export const emailSignInEnabled = syncEnabled && process.env.EXPO_PUBLIC_EMAIL_SIGNIN === '1';
/** Google needs a client ID and secret in the Supabase dashboard first (see README). */
export const googleSignInEnabled = syncEnabled && process.env.EXPO_PUBLIC_GOOGLE_SIGNIN === '1';

export type SignupSource = 'save_plan' | 'after_purchase' | 'settings' | 'welcome';

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, KEY, {
      // PKCE: the Google redirect carries a one-time code, never tokens, back into the app.
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
    });
  }
  return client;
}

export type AccountUser = { id: string; email: string | null };

export async function currentUser(): Promise<AccountUser | null> {
  if (!syncEnabled) return null;
  const { data } = await supabase().auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

export async function currentEmail(): Promise<string | null> {
  return (await currentUser())?.email ?? null;
}

/* ---------- Sign in with Apple ---------- */

export async function appleSignInAvailable(): Promise<boolean> {
  if (!syncEnabled || Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Shows Apple's sign-in sheet and exchanges its identity token for a Supabase session.
 * Resolves null when the user cancels. Apple hashes the nonce into the token; Supabase gets the
 * raw value and checks it, so a stolen token can't be replayed.
 */
export async function signInWithApple(): Promise<{ firstName: string | null } | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw new Error("Apple sign-in didn't finish. Try again in a moment.");
  }
  if (!credential.identityToken) throw new Error("Apple didn't return a sign-in token. Try again in a moment.");
  const { error } = await supabase().auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw new Error(error.message);
  // Apple shares the name only on the very first sign-in, so it is saved now or never.
  const firstName = credential.fullName?.givenName?.trim() || null;
  if (firstName) await supabase().auth.updateUser({ data: { first_name: firstName } });
  return { firstName };
}

/** Signs the user out on this phone if they revoke Keep's access in their Apple ID settings. */
export function watchAppleRevocation(): () => void {
  if (!syncEnabled || Platform.OS !== 'ios') return () => {};
  const sub = AppleAuthentication.addRevokeListener(() => {
    signOut().catch(() => {});
  });
  return () => sub.remove();
}

/* ---------- Google (Supabase OAuth in a secure browser sheet) ---------- */

/**
 * Opens Google's sign-in page in an in-app browser sheet and turns the returned one-time code into
 * a session. Resolves null when the user closes the sheet.
 */
export async function signInWithGoogle(): Promise<{ firstName: string | null } | null> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data?.url) throw new Error("Google sign-in isn't available right now. Try again in a moment.");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error("Google didn't finish signing you in. Try again.");
  const { data: session, error: exchangeError } = await supabase().auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(exchangeError.message);
  const meta = session.user?.user_metadata ?? {};
  const full = (meta.full_name ?? meta.name ?? '') as string;
  return { firstName: full.trim().split(/\s+/)[0] || null };
}

/* ---------- Email one-time code ---------- */

export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(error.message);
}

/* ---------- After sign-in ---------- */

/** Only the US allows marketing email without an explicit opt-in, so it is pre-ticked only there. */
export function marketingOptInDefault(): boolean {
  return deviceRegion() === 'US';
}

function deviceRegion(): string | null {
  try {
    const parts = Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/);
    return parts.find((p, i) => i > 0 && /^[A-Z]{2}$/.test(p)) ?? null;
  } catch {
    return null;
  }
}

function snapshot(): SyncedState {
  const s = useStore.getState();
  return { profile: s.profile, mealsByDate: s.mealsByDate, liftDates: s.liftDates, weighIns: s.weighIns };
}

/**
 * Finishes any sign-in: restores a completed plan from the cloud or backs this phone up, links the
 * subscription to the account, and records the profile fields used for lifecycle email.
 */
export async function completeSignIn(opts: {
  source: SignupSource;
  marketingOptIn: boolean;
  firstName?: string | null;
}): Promise<'restored' | 'backed_up'> {
  const user = await currentUser();
  if (!user) throw new Error('Sign-in did not complete. Try again.');

  const remote = await pullState();
  const remoteProfile = remote?.profile as { onboarded?: boolean } | undefined;
  let outcome: 'restored' | 'backed_up';
  if (remote && remoteProfile?.onboarded) {
    // A completed plan in the cloud wins: this is a returning user on a new or reset phone.
    useStore.getState().hydrate(remote as Parameters<ReturnType<typeof useStore.getState>['hydrate']>[0]);
    outcome = 'restored';
  } else {
    // No usable backup yet, so this phone's data becomes the account's first backup.
    // (Restoring a half-finished cloud profile here would wipe a plan the user just built.)
    await pushState(snapshot());
    outcome = 'backed_up';
  }

  await linkPurchasesUser(user.id, user.email);

  const now = new Date().toISOString();
  const db = supabase();
  // Every sign-in refreshes what may have changed.
  await db
    .from('profiles')
    .update({
      ...(opts.firstName ? { first_name: opts.firstName } : {}),
      pro: useStore.getState().entitled,
      pro_updated_at: now,
      updated_at: now,
    })
    .eq('user_id', user.id);
  // Consent and origin are recorded once, when the account is new; a later sign-in never changes them.
  await db
    .from('profiles')
    .update({ signup_source: opts.source, marketing_opt_in: opts.marketingOptIn, country: deviceRegion(), updated_at: now })
    .eq('user_id', user.id)
    .is('signup_source', null);

  return outcome;
}

/** First paywall view, for "saw the price but didn't subscribe" emails. */
export async function markPaywallSeen(): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const now = new Date().toISOString();
  await supabase()
    .from('profiles')
    .update({ paywall_seen_at: now, updated_at: now })
    .eq('user_id', user.id)
    .is('paywall_seen_at', null);
}

export async function recordPro(pro: boolean): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const now = new Date().toISOString();
  await supabase().from('profiles').update({ pro, pro_updated_at: now, updated_at: now }).eq('user_id', user.id);
}

/* ---------- Sign out and delete ---------- */

/**
 * Leaves RevenueCat logged in on purpose: its logOut() starts a fresh anonymous customer without the
 * receipt, which would lock a paying user out until they tapped Restore.
 */
export async function signOut(): Promise<void> {
  if (!syncEnabled) return;
  await supabase().auth.signOut();
  await forgetLocalSession();
}

/** Deletes the account and all backed-up data on our servers (App Review 5.1.1(v)). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase().rpc('delete_account');
  if (error) throw new Error(error.message);
  await clearPurchasesEmail();
  // The server session died with the user, so only the local copy needs clearing.
  await supabase().auth.signOut({ scope: 'local' });
  await forgetLocalSession();
}

/**
 * Removes the stored session directly. signOut() returns (rather than throws) when it can't reach
 * or refresh the server, and in that case it can leave the old session in storage: a deleted
 * account must never still look signed in.
 */
async function forgetLocalSession(): Promise<void> {
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  const key = `sb-${ref}-auth-token`;
  await AsyncStorage.multiRemove([key, `${key}-code-verifier`, `${key}-user`]).catch(() => {});
}

/* ---------- Backup ---------- */

export type SyncedState = Record<string, unknown>;

export async function pullState(): Promise<SyncedState | null> {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await supabase().from('user_state').select('data').eq('user_id', user.id).maybeSingle();
  if (error || !data) return null;
  return (data.data as SyncedState) ?? null;
}

export async function pushState(state: SyncedState): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  await supabase()
    .from('user_state')
    .upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced backup — call on every local state change; no-ops when signed out. */
export function schedulePush(getState: () => SyncedState): void {
  if (!syncEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushState(getState()).catch(() => {
      // backup is best-effort; never surface as an app error
    });
  }, 3000);
}
