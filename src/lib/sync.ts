import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Accounts + cloud backup (Supabase). Env-gated like every integration:
 * without EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY, `syncEnabled` is false and
 * the app stays local-first. Sign-in is a first-party email one-time code
 * (no Google button, so Apple's Sign-in-with-Apple requirement is not
 * triggered). User state lives in one JSONB row per user (table
 * `user_state`, RLS: owner-only — see README for the SQL).
 */

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const syncEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(error.message);
}

export async function currentEmail(): Promise<string | null> {
  if (!syncEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user?.email ?? null;
}

export async function signOut(): Promise<void> {
  if (!syncEnabled) return;
  await supabase().auth.signOut();
}

export type SyncedState = Record<string, unknown>;

export async function pullState(): Promise<SyncedState | null> {
  const { data: sess } = await supabase().auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase().from('user_state').select('data').eq('user_id', uid).maybeSingle();
  if (error || !data) return null;
  return (data.data as SyncedState) ?? null;
}

export async function pushState(state: SyncedState): Promise<void> {
  const { data: sess } = await supabase().auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return;
  await supabase()
    .from('user_state')
    .upsert({ user_id: uid, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

/** Deletes the user's backed-up data row. (Full auth-record deletion needs a
 *  server-side function — required by App Review before shipping accounts; see README.) */
export async function deleteRemoteData(): Promise<void> {
  const { data: sess } = await supabase().auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return;
  await supabase().from('user_state').delete().eq('user_id', uid);
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
