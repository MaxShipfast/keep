import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useStore, floorG, proteinOn, currentStreak } from '../store';
import { dateKey, weekdayMon0, DAY_FULL } from './dates';

/**
 * Local reminders, scheduled on the phone (no push server, no APNs capability needed). A rolling
 * 7-day window is rebuilt whenever the app opens or the day's protein changes, so today's
 * reminders can say how many grams are left and disappear once the floor is hit. At most two a day.
 */

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!supported) return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Shows the system prompt (once); turns reminders on when allowed. */
export async function enableReminders(): Promise<boolean> {
  if (!supported) return false;
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  useStore.getState().setRemindersOn(p.granted);
  await rescheduleReminders();
  return p.granted;
}

export async function disableReminders(): Promise<void> {
  useStore.getState().setRemindersOn(false);
  if (supported) await Notifications.cancelAllScheduledNotificationsAsync();
}

function at(day: Date, hour: number, minute: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

let running: Promise<void> | null = null;

/** Rebuilds every scheduled reminder from the current state. Safe to call often. */
export function rescheduleReminders(): Promise<void> {
  // Serialize: overlapping cancel/schedule passes would duplicate reminders.
  running = (running ?? Promise.resolve()).then(buildSchedule, buildSchedule);
  return running;
}

async function buildSchedule(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const st = useStore.getState();
  if (!st.remindersOn || !st.entitled || !st.profile.onboarded) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  for (const job of reminderJobs(st, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: job.title, body: job.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: job.when },
    });
  }
}

export type ReminderJob = { when: Date; title: string; body: string };
type ReminderState = Pick<
  ReturnType<typeof useStore.getState>,
  'profile' | 'mealsByDate' | 'trialEndsAt'
>;

/** The next 7 days of reminders for this state, in time order, excluding anything already past. */
export function reminderJobs(st: ReminderState, now: Date): ReminderJob[] {
  const floor = floorG(st.profile.weightLb);
  const perMeal = Math.round(floor / 3);
  const soon = now.getTime() + 60_000;
  const eaten = proteinOn(st, dateKey(now));
  const streak = currentStreak(st);
  const jobs: ReminderJob[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const isToday = i === 0;
    const weekday = weekdayMon0(day);
    const shotDay = weekday === st.profile.shotDay;
    const sunday = weekday === 6;
    const floorHit = isToday && eaten >= floor;

    // One daytime slot: the shot-day tip, the Sunday score, or the lunch nudge.
    if (shotDay) {
      jobs.push({
        when: at(day, 9, 0),
        title: 'Shot day',
        body: 'Appetite dips for about 48 hours. Small, protein-dense portions work best, and your streak is safe today.',
      });
    } else if (sunday) {
      jobs.push({
        when: at(day, 18, 0),
        title: 'Your Muscle Guard score is ready',
        body: 'See how this week protected your muscle, and the one thing to fix next week.',
      });
    } else if (!(isToday && eaten >= floor / 2)) {
      jobs.push({
        when: at(day, 12, 30),
        title: 'Protein check',
        body: `Lunch is your best protein window. Aim for about ${perMeal}g.`,
      });
    }

    // Evening: only while the floor isn't hit. Today's reminder knows the exact gap.
    if (!floorHit) {
      const left = floor - eaten;
      jobs.push({
        when: at(day, 19, 30),
        title: isToday && streak >= 3 && !shotDay ? `Keep your ${streak}-day streak` : 'Evening protein check',
        body: isToday
          ? `You're at ${eaten}/${floor}g. ${left}g to go: a shake or Greek yogurt closes the gap.`
          : `Still short of ${floor}g? A protein shake or Greek yogurt closes the gap.`,
      });
    }
  }

  // Honest heads-up the day before a free trial turns into a paid subscription.
  if (st.trialEndsAt) {
    const end = new Date(st.trialEndsAt);
    const dayBefore = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    jobs.push({
      when: at(dayBefore, 10, 0),
      title: 'Your free trial ends tomorrow',
      body: `Keep Pro renews on ${DAY_FULL[weekdayMon0(end)]} unless you cancel in Settings > your name > Subscriptions.`,
    });
  }

  return jobs.filter((j) => j.when.getTime() >= soon).sort((a, b) => a.when.getTime() - b.when.getTime());
}
