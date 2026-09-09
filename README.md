# Keep — GLP-1 muscle-protection app

Lose fat, not muscle. Protein-floor tracking for people on Ozempic / Zepbound / Mounjaro.

Two codebases:

- `keep/` — this repo: Expo (React Native + TypeScript) iOS app
- `../keep-backend/` — Cloudflare Worker that wraps OpenAI vision (gpt-5-mini) for the photo protein scan

Everything runs in **mock mode with zero configuration** — no keys needed to develop or demo. Real
integrations light up as you add env vars.

## Run it now

```bash
cd keep
npm install
npx expo start        # press i for iOS simulator (uses Expo Go)
```

What works with no keys: full onboarding quiz → personalized protein floor → projection → paywall
(mock purchase grants access) → home ring → camera scan (returns demo results) → manual meal log →
Muscle Guard score, streaks, calendar — all real logic over locally persisted data (AsyncStorage).

## Architecture

| Piece | Choice | Notes |
|---|---|---|
| App | Expo SDK 57, React Navigation native stack | screens in `src/screens/` |
| State | zustand + AsyncStorage persist | `src/store.ts` — all scoring logic lives here as pure functions |
| Scan | Cloudflare Worker → OpenAI vision (`gpt-5-mini`, strict JSON schema) | `src/lib/scan.ts` client; mock without `EXPO_PUBLIC_SCAN_URL` |
| Payments | RevenueCat (`react-native-purchases`) | `src/lib/purchases.ts`; mock in Expo Go or without key |
| Analytics | PostHog | `src/lib/analytics.ts`; no-op without key |
| Accounts | None in v1 (local-first) | Auth screens exist but explain "no account needed yet" |

Product rules encoded in `src/store.ts`:

- Protein floor = `kg × 1.4 g` (midpoint of 1.2–1.6 g/kg clinical guidance), even-rounded
- Muscle Guard score = 60% floor adherence (7d) + 25% lifts (target 3/wk) + 15% loss pace (≤1.25%/wk safe)
- Streaks: consecutive floor-hit days; the user's shot day never breaks a streak (grace); an
  unfinished *today* doesn't break it either
- Shields: Bronze 7d / Silver 30d / Gold 90d

## Go-live checklist

### 1. Backend (15 min)

```bash
cd keep-backend
npm install
npx wrangler login
npx wrangler secret put OPENAI_API_KEY      # from platform.openai.com
npx wrangler secret put APP_TOKEN           # any long random string
npm run deploy                              # prints https://keep-scan.<account>.workers.dev
```

Local dev: secrets live in `.dev.vars` (gitignored); `npm run dev` then POST to
`http://localhost:8787/scan`. Note: wrangler is pinned to v3 because this machine runs Node 21
(wrangler 4 needs Node 22+ — upgrade Node and wrangler together when convenient). Also set a
monthly spend limit in the OpenAI dashboard as the abuse backstop.

Smoke test: `curl -X POST <url>/scan -H "Authorization: Bearer <APP_TOKEN>" -d '{"imageBase64":"..."}'`

### 2. App env

Copy `.env.example` → `.env`, set `EXPO_PUBLIC_SCAN_URL`, `EXPO_PUBLIC_SCAN_TOKEN`,
`EXPO_PUBLIC_POSTHOG_KEY`. Restart `expo start` after changes.

### 3. Apple + RevenueCat (the slow part — start enrollment first)

1. Apple Developer Program enrollment ($99/yr).
2. App Store Connect: create the app (decide final name; bundle id `com.maxwellzhou.keepapp` in
   `app.json` — change before first build if you want a different one, it's permanent).
3. Create subscriptions in App Store Connect: `keep_pro_yearly` $49.99 with 3-day free trial,
   `keep_pro_weekly` $6.99, both in one subscription group.
4. RevenueCat: new project → entitlement **`pro`** (the code checks this exact id) → attach both
   products → default offering with `annual` and `weekly` packages.
5. Put the public Apple API key in `.env` as `EXPO_PUBLIC_RC_API_KEY`.

### 4. Build & ship

```bash
npm install -g eas-cli
eas init && eas build --platform ios --profile production
eas submit --platform ios
```

Note: RevenueCat and real StoreKit only work in EAS/dev-client builds, never Expo Go.

### App Review notes (health app)

- Informational tracking only — no dosing advice anywhere; keep it that way.
- Disclaimer lives in Settings ("not medical advice… follow your prescriber").
- Camera permission string explains exactly why (already in `app.json`).
- Paywall has restore purchase, cancel-anytime copy, and no charge before trial end — keep visible.
- The ★ 4.8 social-proof line on the paywall is placeholder — REMOVE or replace with real ratings
  before submission (fabricated ratings are a rejection + FTC risk).

## Analytics: the 5 numbers that decide day-30

Events already wired: `app_open`, `quiz_step`, `paywall_view`, `trial_start`, `scan_complete`,
`meal_logged`, `lift_logged`, `weighin_logged`.

Gate (pre-committed): paywall→trial ≥ 8% · trial→paid ≥ 40% · CAC/trial ≤ $30 · D7 paid retention ≥ 40%.
Hit 3 of 4 → scale. Miss on creative metrics → new creatives. Miss on product metrics → one
repositioning, then kill.

## Accounts & cloud backup (Supabase)

Optional accounts via email one-time code, with the user's full state backed up to one JSONB row.
No Google/Apple SSO by design: first-party email codes don't trigger Apple's Sign-in-with-Apple
requirement. Without the env keys the app stays local-first and the sign-in screen says so.

Setup: create a free project at supabase.com → Auth → Email provider: enable "Email OTP".
Then run this SQL (SQL editor):

```sql
create table public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own row" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

**Before shipping accounts to the App Store:** Apple requires in-app account *deletion*.
Settings has "Delete cloud backup" (deletes the data row); full auth-record deletion needs a tiny
edge function calling `auth.admin.deleteUser` — add it before submitting a build with Supabase
keys baked in, or ship v1 without the keys (accounts off) and enable in v1.1.

## v1.1 backlog (deliberately not in v1)

- HealthKit sync (auto lifts from Apple Watch, weight from smart scales) — needs dev build + plugin
- Real auth + cloud sync (Supabase; Apple + Google SSO — Apple requires Sign in with Apple if Google is offered)
- Weekly "Muscle Report" push notification
- Advanced nutrition toggle (carbs/fat targets — data already captured per scan)
