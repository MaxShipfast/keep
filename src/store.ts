import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, daysAgo, weekdayMon0 } from './lib/dates';

export type Meal = {
  id: string;
  name: string;
  proteinG: number;
  calories?: number;
  carbsG?: number;
  at: number;
  source: 'scan' | 'manual';
};

export type Profile = {
  med: string;
  /** 0 = Monday … 6 = Sunday */
  shotDay: number;
  weightLb: number;
  /** Display unit the user picked during onboarding; weights are stored in lb. */
  unit: 'lb' | 'kg';
  train: string;
  goal: string;
  onboarded: boolean;
};

export type WeighIn = { at: number; weightLb: number };

type State = {
  profile: Profile;
  mealsByDate: Record<string, Meal[]>;
  liftDates: Record<string, true>;
  weighIns: WeighIn[];
  entitled: boolean;
  /** The user agreed to send meal photos to OpenAI for analysis (App Review 5.1.2(i)). */
  aiConsent: boolean;
  /** Daily protein reminders (local notifications); see lib/reminders. */
  remindersOn: boolean;
  /** When a renewing free trial converts to paid, from RevenueCat; null otherwise. */
  trialEndsAt: number | null;

  setProfile: (p: Partial<Profile>) => void;
  logMeal: (m: Omit<Meal, 'id' | 'at'>) => void;
  logLift: () => void;
  logWeighIn: (weightLb: number) => void;
  setEntitled: (v: boolean) => void;
  setAiConsent: (v: boolean) => void;
  setRemindersOn: (v: boolean) => void;
  setTrialEndsAt: (v: number | null) => void;
  resetAll: () => void;
  /** Replaces local data with a cloud backup (used at sign-in). */
  hydrate: (remote: Partial<Pick<State, 'profile' | 'mealsByDate' | 'liftDates' | 'weighIns'>>) => void;
};

/** Pounds only where people weigh themselves in pounds; kilograms everywhere else. */
function localeUnit(): 'lb' | 'kg' {
  try {
    const parts = Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/);
    const region = parts.find((p, i) => i > 0 && /^[A-Z]{2}$/.test(p));
    if (!region) return 'lb';
    return ['US', 'LR', 'MM', 'GB'].includes(region) ? 'lb' : 'kg';
  } catch {
    return 'lb';
  }
}

const defaultProfile: Profile = {
  med: 'Zepbound',
  shotDay: 3,
  weightLb: 200,
  unit: localeUnit(),
  train: '1-2 times a week',
  goal: '',
  onboarded: false,
};

/**
 * AsyncStorage adapter that can never block launch: an unreadable or corrupted save
 * resolves to "no saved state" (defaults) instead of rejecting — zustand leaves the
 * hydration gate closed forever when getItem rejects, which would black-screen the app.
 */
export const persistStorage: PersistStorage<State> = {
  getItem: async (name) => {
    try {
      const raw = await AsyncStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<State>) : null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Disk full or similar: the next state change retries the write.
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Nothing useful to do; a stale key is overwritten on the next write.
    }
  },
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      mealsByDate: {},
      liftDates: {},
      weighIns: [],
      entitled: false,
      aiConsent: false,
      remindersOn: false,
      trialEndsAt: null,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      logMeal: (m) =>
        set((s) => {
          const key = dateKey();
          const meal: Meal = { ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() };
          return { mealsByDate: { ...s.mealsByDate, [key]: [...(s.mealsByDate[key] ?? []), meal] } };
        }),
      logLift: () => set((s) => ({ liftDates: { ...s.liftDates, [dateKey()]: true } })),
      logWeighIn: (weightLb) =>
        set((s) => {
          // One weigh-in per day: re-weighing (or fixing a typo) replaces today's entry.
          const today = dateKey();
          const others = s.weighIns.filter((w) => dateKey(new Date(w.at)) !== today);
          return {
            weighIns: [...others, { at: Date.now(), weightLb }],
            profile: { ...s.profile, weightLb },
          };
        }),
      setEntitled: (v) => set({ entitled: v }),
      setAiConsent: (v) => set({ aiConsent: v }),
      setRemindersOn: (v) => set({ remindersOn: v }),
      setTrialEndsAt: (v) => set({ trialEndsAt: v }),
      // Erases the plan and logs but not the subscription: that belongs to the Apple ID.
      resetAll: () =>
        set((s) => ({ profile: defaultProfile, mealsByDate: {}, liftDates: {}, weighIns: [], entitled: s.entitled })),
      hydrate: (remote) =>
        set((s) => ({
          profile: { ...s.profile, ...(remote.profile ?? {}) },
          mealsByDate: remote.mealsByDate ?? s.mealsByDate,
          liftDates: remote.liftDates ?? s.liftDates,
          weighIns: remote.weighIns ?? s.weighIns,
        })),
    }),
    {
      name: 'keep-store',
      storage: persistStorage,
      // Data persisted by an older build may predate newer Profile fields (e.g. `unit`).
      // Layer whatever was stored over the defaults so added fields never come back undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, profile: { ...defaultProfile, ...(p.profile ?? {}) } };
      },
    }
  )
);

/* ---------- derived helpers (pure functions over state) ---------- */

/**
 * Illustrative 12-week projection, in lb: total loss (~8% of body weight) and the typical lean-mass
 * share of it (38%, the STEP 1 trial's DXA split; about half of lean mass is muscle). Keep never
 * predicts a "with Keep" number: that outcome isn't established, so it is shown only as an aim.
 */
export function projectionLb(weightLb: number): { loss: number; lean: number } {
  const loss = Math.round(weightLb * 0.08);
  return { loss, lean: Math.max(1, Math.round(loss * 0.38)) };
}

/** Clinical guidance midpoint: 1.4 g protein per kg body weight, rounded to an even number. */
export function floorG(weightLb: number): number {
  return Math.round((weightLb * 0.4536 * 1.4) / 2) * 2;
}

export function proteinOn(s: Pick<State, 'mealsByDate'>, key: string): number {
  return (s.mealsByDate[key] ?? []).reduce((sum, m) => sum + m.proteinG, 0);
}

export function todayProtein(s: Pick<State, 'mealsByDate'>): number {
  return proteinOn(s, dateKey());
}

export function dayHit(s: Pick<State, 'mealsByDate' | 'profile'>, d: Date): boolean {
  return proteinOn(s, dateKey(d)) >= floorG(s.profile.weightLb);
}

/** Streak of consecutive floor-hit days ending today; the shot day never breaks it (grace). */
export function currentStreak(s: Pick<State, 'mealsByDate' | 'profile'>): number {
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const d = daysAgo(i);
    if (dayHit(s, d)) {
      streak++;
    } else if (weekdayMon0(d) === s.profile.shotDay) {
      continue; // shot-day grace: neither breaks nor counts
    } else if (i === 0) {
      continue; // today isn't over yet — an unfinished today doesn't break the streak
    } else {
      break;
    }
  }
  return streak;
}

export function bestStreak(s: Pick<State, 'mealsByDate' | 'profile'>): number {
  const keys = Object.keys(s.mealsByDate).sort();
  if (keys.length === 0) return 0;
  let best = 0;
  let run = 0;
  const start = new Date(keys[0]);
  const today = new Date();
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    if (dayHit(s, d)) {
      run++;
      best = Math.max(best, run);
    } else if (weekdayMon0(d) !== s.profile.shotDay) {
      run = 0;
    }
  }
  return Math.max(best, currentStreak(s));
}

export function hitRatePct(s: Pick<State, 'mealsByDate' | 'profile'>): number {
  const keys = Object.keys(s.mealsByDate);
  if (keys.length === 0) return 0;
  const hits = keys.filter((k) => proteinOn(s, k) >= floorG(s.profile.weightLb)).length;
  return Math.round((hits / keys.length) * 100);
}

export function hitDaysLast7(s: Pick<State, 'mealsByDate' | 'profile'>): number {
  let hits = 0;
  for (let i = 0; i < 7; i++) if (dayHit(s, daysAgo(i))) hits++;
  return hits;
}

export function liftsLast7(s: Pick<State, 'liftDates'>): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (s.liftDates[dateKey(daysAgo(i))]) n++;
  return n;
}

const DAY_MS = 24 * 3600 * 1000;
/** Weigh-ins closer together than this are noise (water, meals), not a loss rate. */
const MIN_PACE_GAP_MS = 3 * DAY_MS;

/**
 * Weekly loss as % of body weight, from the latest weigh-in and the most recent one at least
 * three days before it. Null until such a pair exists.
 */
export function weeklyLossPct(s: Pick<State, 'weighIns'>): number | null {
  if (s.weighIns.length < 2) return null;
  const sorted = [...s.weighIns].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];
  let prev: WeighIn | undefined;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (last.at - sorted[i].at >= MIN_PACE_GAP_MS) {
      prev = sorted[i];
      break;
    }
  }
  if (!prev) return null;
  const weeks = (last.at - prev.at) / (7 * DAY_MS);
  return ((prev.weightLb - last.weightLb) / prev.weightLb / weeks) * 100;
}

export type GuardBreakdown = {
  protein: number;
  lift: number;
  pace: number;
  /** Weekly loss rate behind `pace`; null until two weigh-ins far enough apart exist. */
  paceRate: number | null;
  total: number;
};

/**
 * Muscle Guard score, 0–100: 60 pts protein-floor adherence (last 7 days) + 25 pts strength
 * sessions (target 3/wk) + 15 pts loss pace (full at ≤1.25%/wk, scaled down to 5 above).
 * Each part is rounded on its own and the total is their sum, so the breakdown the Guard
 * screen shows always adds up to the headline score.
 */
export function guardBreakdown(s: Pick<State, 'mealsByDate' | 'profile' | 'liftDates' | 'weighIns'>): GuardBreakdown {
  const protein = Math.round((hitDaysLast7(s) / 7) * 60);
  const lift = Math.round((Math.min(liftsLast7(s), 3) / 3) * 25);
  const paceRate = weeklyLossPct(s);
  const pace = paceRate !== null && paceRate > 1.25 ? Math.round(Math.max(5, 15 - (paceRate - 1.25) * 8)) : 15;
  return { protein, lift, pace, paceRate, total: protein + lift + pace };
}

export function guardScore(s: Pick<State, 'mealsByDate' | 'profile' | 'liftDates' | 'weighIns'>): number {
  return guardBreakdown(s).total;
}
