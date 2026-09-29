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

/** Apple's cancel-by rule is 24 hours before renewal; 30 leaves a margin to act. */
const TRIAL_REMINDER_LEAD_MS = 30 * 3600 * 1000;
const QUIET_START = 21;
const QUIET_END = 8;

/** Rotating wording: the same message every evening stops being read. */
const EVENING = [
  (left: number) => `${left}g to go today. A shake or Greek yogurt closes the gap.`,
  (left: number) => `You're ${left}g short of your floor. Cottage cheese, eggs or a shake will do it.`,
  (left: number) => `${left}g left. A protein-dense snack now keeps today's muscle protected.`,
  (left: number) => `Close today's ring: ${left}g to go. Tuna, chicken or skyr are easy wins.`,
  (left: number) => `Almost there? ${left}g left on today's floor.`,
];

/** Moves a time that lands in quiet hours to 8 pm the evening before (never later). */
function outsideQuietHours(d: Date): Date {
  const h = d.getHours();
  if (h >= QUIET_END && h < QUIET_START) return d;
  const e = new Date(d);
  if (h < QUIET_END) e.setDate(e.getDate() - 1);
  e.setHours(20, 0, 0, 0);
  return e;
}

/**
 * The next 7 days of reminders for this state, in time order, excluding anything already past.
 * At most one habit nudge a day (the evening check), plus the injection-day and Sunday notes and the
 * trial heads-up. No medication or injection wording, since notifications show on the lock screen.
 */
export function reminderJobs(st: ReminderState, now: Date): ReminderJob[] {
  const floor = floorG(st.profile.weightLb);
  const soon = now.getTime() + 60_000;
  const eaten = proteinOn(st, dateKey(now));
  const streak = currentStreak(st);
  const jobs: ReminderJob[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const isToday = i === 0;
    const weekday = weekdayMon0(day);
    const lowAppetiteDay = weekday === st.profile.shotDay;

    if (lowAppetiteDay) {
      jobs.push({
        when: at(day, 9, 0),
        title: 'Easy day today',
        body: 'Small, protein-dense portions work best today, and your streak is protected.',
      });
    } else if (weekday === 6) {
      jobs.push({
        when: at(day, 18, 0),
        title: 'Your Muscle Guard score is ready',
        body: 'See how this week protected your muscle, and the one thing to fix next week.',
      });
    }

    // The one daily habit nudge: only while today's floor is not yet hit.
    if (!(isToday && eaten >= floor)) {
      const left = isToday ? floor - eaten : floor;
      const variant = EVENING[(day.getDate() + day.getMonth()) % EVENING.length];
      jobs.push({
        when: at(day, 19, 30),
        title: isToday && streak >= 3 && !lowAppetiteDay ? `Keep your ${streak}-day streak` : 'Evening protein check',
        body: isToday ? variant(left) : `Still short of ${floor}g? A protein shake or Greek yogurt closes the gap.`,
      });
    }
  }

  // Honest heads-up before a free trial turns into a paid subscription.
  if (st.trialEndsAt) {
    const end = new Date(st.trialEndsAt);
    jobs.push({
      when: outsideQuietHours(new Date(st.trialEndsAt - TRIAL_REMINDER_LEAD_MS)),
      title: 'Your free trial ends soon',
      body: `Keep Pro renews ${DAY_FULL[weekdayMon0(end)]} at ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. To avoid the charge, cancel at least 24 hours before in Settings > your name > Subscriptions.`,
    });
  }

  return jobs.filter((j) => j.when.getTime() >= soon).sort((a, b) => a.when.getTime() - b.when.getTime());
}
