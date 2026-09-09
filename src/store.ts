import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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

  setProfile: (p: Partial<Profile>) => void;
  logMeal: (m: Omit<Meal, 'id' | 'at'>) => void;
  logLift: () => void;
  logWeighIn: (weightLb: number) => void;
  setEntitled: (v: boolean) => void;
  resetAll: () => void;
  /** Replaces local data with a cloud backup (used at sign-in). */
  hydrate: (remote: Partial<Pick<State, 'profile' | 'mealsByDate' | 'liftDates' | 'weighIns'>>) => void;
};

const defaultProfile: Profile = {
  med: 'Zepbound',
  shotDay: 3,
  weightLb: 200,
  unit: 'lb',
  train: '1–2× a week',
  goal: '',
  onboarded: false,
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      mealsByDate: {},
      liftDates: {},
      weighIns: [],
      entitled: false,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      logMeal: (m) =>
        set((s) => {
          const key = dateKey();
          const meal: Meal = { ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() };
          return { mealsByDate: { ...s.mealsByDate, [key]: [...(s.mealsByDate[key] ?? []), meal] } };
        }),
      logLift: () => set((s) => ({ liftDates: { ...s.liftDates, [dateKey()]: true } })),
      logWeighIn: (weightLb) =>
        set((s) => ({
          weighIns: [...s.weighIns, { at: Date.now(), weightLb }],
          profile: { ...s.profile, weightLb },
        })),
      setEntitled: (v) => set({ entitled: v }),
      resetAll: () =>
        set({ profile: defaultProfile, mealsByDate: {}, liftDates: {}, weighIns: [], entitled: false }),
      hydrate: (remote) =>
        set((s) => ({
          profile: { ...s.profile, ...(remote.profile ?? {}) },
          mealsByDate: remote.mealsByDate ?? s.mealsByDate,
          liftDates: remote.liftDates ?? s.liftDates,
          weighIns: remote.weighIns ?? s.weighIns,
        })),
    }),
    { name: 'keep-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);

/* ---------- derived helpers (pure functions over state) ---------- */

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

/** Weekly loss as % of body weight; null when fewer than two weigh-ins. */
export function weeklyLossPct(s: Pick<State, 'weighIns'>): number | null {
  if (s.weighIns.length < 2) return null;
  const sorted = [...s.weighIns].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const weeks = Math.max((last.at - prev.at) / (7 * 24 * 3600 * 1000), 0.25);
  return ((prev.weightLb - last.weightLb) / prev.weightLb / weeks) * 100;
}

/**
 * Muscle Guard score, 0–100.
 * 60% protein-floor adherence (last 7 days) + 25% strength sessions (target 3/wk)
 * + 15% loss pace (full points at ≤1.25%/wk; scaled penalty above).
 */
export function guardScore(s: Pick<State, 'mealsByDate' | 'profile' | 'liftDates' | 'weighIns'>): number {
  const proteinPts = (hitDaysLast7(s) / 7) * 60;
  const liftPts = (Math.min(liftsLast7(s), 3) / 3) * 25;
  const pace = weeklyLossPct(s);
  let pacePts = 15;
  if (pace !== null && pace > 1.25) {
    pacePts = Math.max(5, 15 - (pace - 1.25) * 8);
  }
  return Math.round(proteinPts + liftPts + pacePts);
}
