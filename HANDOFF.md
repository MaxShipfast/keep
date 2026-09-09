# Keep — Developer Handoff & Project Brief

_Last updated: August 2026. Companion doc to `README.md` (setup/runbook). This file explains what
Keep is, why it exists, everything that has been built, and what remains before/after launch._

---

## 1. Project brief

**Keep** is an iOS app for people on GLP-1 weight-loss medication (Ozempic, Zepbound, Mounjaro,
Wegovy). One-line positioning: **"Lose fat, not muscle."**

### The problem
- ~28M US adults (11%) are currently on a GLP-1; the user base roughly quadrupled in two years.
- Clinical studies show **up to 40% of weight lost on GLP-1s can be lean mass** (muscle/bone).
- Generic calorie apps are architected around calorie *ceilings* ("eat less"). GLP-1 users have the
  opposite problem: appetite is chemically suppressed and they under-eat **protein**. They need a
  *floor*, not a ceiling.

### The product answer
- A daily **protein floor** (1.4 g/kg body weight — midpoint of 1.2–1.6 g/kg clinical guidance).
- **Photo scan**: point camera at a meal → AI returns protein/calories/carbs → one tap logs it.
- **Muscle Guard score** (0–100/week): 60% floor adherence + 25% strength sessions + 15% loss pace.
  The number that "disagrees with the scale" — a crash-diet week scores low even when weight drops.
- **Fire streaks with shot-day grace**: the streak never breaks on the user's injection day
  (appetite craters post-shot; protection shouldn't punish medication adherence). Bronze/Silver/Gold
  shields at 7/30/90 days.

### Business model
- Hard paywall after onboarding (no free tier — converts ~5× better per RevenueCat data).
- `keep_pro_yearly` $49.99/yr with 3-day free trial (anchor) · `keep_pro_weekly` $6.99/wk.
- Competitive proof: Shotsy (solo-built GLP-1 shot tracker) est. ~$2.7M/yr run-rate. Keep is
  deliberately NOT a shot tracker — the wedge is muscle protection, which no incumbent owns.

### Goal & kill/scale gates (day 30 after marketing starts)
$1k MRR side-bet to validate the niche. Pre-committed gates: paywall→trial ≥ 8% · trial→paid ≥ 40%
· CAC/trial ≤ $30 · D7 paid retention ≥ 40%. Hit 3/4 → scale UGC spend; miss product metrics →
one repositioning, then kill. Ad creative hook: *"40% of GLP-1 weight loss can be muscle."*

### Design language
Dark-only UI: ground `#0A0E15`, cards `#131A26`, primary blue `#3D7BFF` (gradients
`#5F8FFF→#3D6EF7`), streak flame orange `#FF9F43`, success green `#3DDC97`, warning amber
`#FFB454`. Inter (400/600/700/800). Sentence case everywhere — **no all-caps microcopy**. Real SVG
icons (Ionicons), never emoji. Radius 16. Tokens live in `src/theme.ts` — treat it as the single
source of truth.

---

## 2. What exists (two codebases + two design artifacts)

| Piece | Where | State |
|---|---|---|
| iOS app | `keep/` (this repo) | Feature-complete for v1; builds green on EAS |
| Scan backend | `../keep-backend/` | **Deployed & live** |
| Clickable HTML prototype (17 screens) | https://claude.ai/code/artifact/d17e7a8e-6f9a-413e-98b1-e5e3633a1161 | Reference for UX intent |
| App Store screenshots (6 × 1320×2868) | https://claude.ai/code/artifact/28968ba8-af4f-4d4f-8677-0dec93688fa6 | Edit headlines on canvas, export PNG per artboard |

---

## 3. Architecture

```
iPhone app (Expo SDK 57, React Native, TypeScript)
  ├─ state: zustand + AsyncStorage (local-first; ALL health data on-device)
  ├─ scan:  POST https://keep-scan.shipfastvc.workers.dev/scan  (Bearer token)
  │           └─ Cloudflare Worker → OpenAI gpt-5-mini (vision, strict JSON schema)
  ├─ payments: RevenueCat (entitlement id: "pro") → StoreKit
  ├─ analytics: PostHog (env-gated, currently off)
  └─ accounts: Supabase email-OTP + JSONB backup (env-gated, currently off)
```

**Every integration is env-gated with a mock fallback** — the app runs fully with zero keys
(demo scan results, mock paywall). This is deliberate: dev in Expo Go needs no secrets, and a
missing key can never crash production. Pattern: see `src/lib/scan.ts`, `purchases.ts`,
`analytics.ts`, `sync.ts`.

### App structure (`keep/src/`)
- `theme.ts` — design tokens. `nav.ts` — route types.
- `store.ts` — zustand store **and all product math as pure functions**: `floorG` (1.4 g/kg,
  even-rounded), `guardScore` (60/25/15 split; pace penalty above 1.25%/wk loss), `currentStreak`
  (consecutive floor-hit days; shot-day grace; unfinished *today* doesn't break), `bestStreak`,
  `hitRatePct`. Unit tests should target this file first.
- `lib/` — `scan.ts`, `purchases.ts`, `analytics.ts`, `sync.ts`, `dates.ts` (Mon-first weekdays),
  `units.ts` (lb↔kg; **weights are always stored in lb**, `profile.unit` drives display).
- `components/` — `ui.tsx` (Screen, GButton, Card, OptionCard, BackButton…), `ProteinRing.tsx`
  (animated SVG ring), `ProjectionChart.tsx`, `anim.tsx` (FadeSlideIn, useCountUp).
- `screens/` — Onboarding (welcome benefits carousel → 5-step quiz → computing → reveal with
  count-up → 12-week projection → paywall), Home (ring + Guard/streak cards + floating scan FAB),
  Scan (camera → result sheet → log; manual entry fallback), Guard detail (score breakdown +
  one-tap lift/weigh-in logs), Streaks (flame hero, shields, calendar), Settings, SignIn (email
  OTP; shows "coming soon" until Supabase keys exist).

### Analytics events (drive the kill/scale decision)
`app_open`, `quiz_step`, `paywall_view`, `trial_start`, `scan_complete`, `meal_logged`,
`lift_logged`, `weighin_logged`, `sign_in`.

### Backend (`keep-backend/`)
Single Cloudflare Worker (`src/index.ts`):
- `POST /scan` — `{imageBase64, mediaType}` → `{food, proteinG, calories, carbsG, portion,
  confidence}`. Bearer auth (`APP_TOKEN` secret), per-IP rate limit (20/10min, in-memory), 8MB
  cap, OpenAI `gpt-5-mini` with a **strict JSON schema** (`response_format: json_schema`) and a
  GLP-1-aware prompt (small portions; protein accuracy first; non-food → zeros/low confidence).
- `GET /privacy`, `GET /terms` — the legal pages App Store Connect links to.
- Secrets via `wrangler secret put` (`OPENAI_API_KEY`, `APP_TOKEN`); local dev via `.dev.vars`
  (gitignored). Deploy: `npm run deploy`. Wrangler pinned to v3 (v4 needs Node ≥22 everywhere).

---

## 4. Live infrastructure & accounts inventory

| Thing | Value / where |
|---|---|
| Worker URL | `https://keep-scan.shipfastvc.workers.dev` (Cloudflare, account subdomain `shipfastvc`) |
| Legal pages | `…/privacy` and `…/terms` (contact: info@shipfast.agency) |
| Bundle ID | `com.maxwellzhou.keepapp` (permanent) |
| EAS project | `@maxshipfasts-team/keepglp1`, id `9340e51c-a0ff-4572-b97b-1f300eede7dc` |
| Apple team | Yu Zhou (Individual), `MWJJZT649D`; signing credentials stored on EAS (valid to 2027) |
| App Store name | **Keep — GLP-1 Protein Tracker** · SKU `keepglp1` |
| Subscriptions | Group "Keep Pro": `keep_pro_yearly` $49.99 + 3-day trial · `keep_pro_weekly` $6.99 |
| RevenueCat | Entitlement **`pro`** (exact string; code checks it), default offering with `annual` + `weekly` packages; public key `appl_OFjzkfNuvpUayPuoYHJLxOjDloz` |
| Env for builds | Public values pinned in `eas.json` `build.*.env` (a gitignored `.env` is NOT uploaded to EAS — this bit us once; don't remove the pinning) |
| Supabase | **Not created yet** — accounts render as "coming soon" until `EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY` exist. Setup SQL + email-template step in `README.md` |

## 5. Current status & remaining launch checklist

Done: app + backend built and verified end-to-end · production build compiled on EAS
(`2a02218b…`) · signing credentials stored · legal pages live · screenshots designed ·
subscriptions + RevenueCat configured.

Remaining (in order):
1. `eas submit --platform ios --latest` (first run is interactive: Apple login + create/select the
   ASC app record — claims the name). After the first submit, builds AND submits run fully
   non-interactively.
2. TestFlight sandbox test: real purchase sheet, prices from RevenueCat, app unlocks after trial
   start. This is the highest-risk untested integration.
3. Export screenshots from the canvas → App Store listing (subtitle "Lose fat, not muscle";
   keywords: glp-1, ozempic, protein, zepbound, mounjaro, wegovy, tracker).
4. App Privacy questionnaire: Photos (app functionality, not linked) + Usage Data (analytics, not
   linked). Review notes: informational tracker, no dosing advice, data on-device, photos
   processed transiently.
5. Submit for review. Health+subscription apps sometimes bounce once — respond, don't panic.

### Security TODOs (pre- or immediately post-launch)
- **Rotate the OpenAI key** (it transited chat/terminal during setup): new key at
  platform.openai.com → `wrangler secret put OPENAI_API_KEY` → update `keep-backend/.dev.vars`.
- Set a **monthly spend limit** in the OpenAI dashboard (backstop if the app's scan token is ever
  extracted from the binary — it ships in the build by necessity; the rate limiter + image cap +
  spend cap bound the damage).
- Rotating `APP_TOKEN` later = `wrangler secret put APP_TOKEN` + update `eas.json` + new build.

## 6. v1.1 backlog (deliberately NOT in v1)
1. **Enable accounts** (create Supabase project, add keys) — but first build the account-deletion
   edge function (`auth.admin.deleteUser`); **Apple rejects account creation without in-app
   deletion**. Settings already has "Delete cloud backup" (data row only).
2. HealthKit: auto-count strength workouts (Apple Watch/Hevy/Strong) + weight from smart scales.
   Needs dev build + config plugin. This is the retention unlock — score stays alive without opens.
3. Weekly "Muscle Report" push notification.
4. Advanced nutrition toggle (carbs/fat targets — scan already captures them; display-only change).
5. Adjusted-body-weight protein floor for BMI > ~30 (raw weight overshoots for heavy users).
6. Android (icons/permissions already scaffolded in `app.json`).

## 7. Dev workflow & gotchas

```bash
# run (Expo Go on device; SDK 57 build of Expo Go required — expo.dev/go)
cd keep && npm install && npx expo start

# type-safety gate (keep clean; CI-worthy)
npx tsc --noEmit

# production build + TestFlight (after first interactive submit)
eas build --platform ios --profile production
eas submit --platform ios --latest

# backend deploy
cd ../keep-backend && npm run deploy
```

Gotchas learned the hard way:
- **Node ≥ 22 required** (Expo's `.env` parser uses `util.parseEnv`; wrangler 4 also wants it).
  nvm is installed; `nvm use 22`.
- `.env` is read **when the dev server starts** — after changing it, restart with
  `npx expo start --clear` or the app silently runs in mock mode (the scan screen shows a
  "Demo mode" caption whenever the backend URL didn't make it into the bundle — trust that caption).
- Expo Go can't show the app icon/splash or run RevenueCat — those need an EAS build.
- `AGENTS.md` rule: check the SDK 57 docs before using Expo APIs from memory; they moved things.
- The repo is not under git yet — `git init` recommended before multi-dev work; `.gitignore`
  already covers `.env`, `/ios`, `/android`.

## 8. Product rules that must not drift (the "spec")

1. Protein floor = `round(kg × 1.4 / 2) × 2` grams. Framing is always "clinical guidance, confirm
   with your doctor" — never medical advice, never dosing guidance anywhere in the app.
2. Guard score = 60% floor-days/7 + 25% min(lifts,3)/3 + 15% pace (full marks ≤1.25%/wk loss,
   scaled penalty above, floor of 5; benefit of the doubt with <2 weigh-ins).
3. Streaks: shot-day never breaks a streak; an unfinished today never breaks a streak. Grace days
   don't *count* toward the streak either — they're neutral.
4. Weights stored in **lb** always; `profile.unit` is presentation-only and must be respected on
   every surface (projection, settings, weigh-in input).
5. Paywall is hard (no free tier, no close button). Restore purchase must stay visible. No
   fabricated social proof — the ★rating was removed deliberately; only reinstate with real data.
6. Meal photos are transient: never stored server-side; privacy policy language depends on this.
