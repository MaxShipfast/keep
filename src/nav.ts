export type RootStackParamList = {
  Welcome: undefined;
  SignIn:
    | {
        source: import('./lib/sync').SignupSource;
        /** Where to go after signing in; defaults to wherever the saved state says the user belongs. */
        next?: 'Reveal' | 'Home' | 'Reminders';
        marketingOptIn?: boolean;
      }
    | undefined;
  SavePlan: undefined;
  QuizMed: undefined;
  QuizShot: undefined;
  QuizWeight: undefined;
  QuizTrain: undefined;
  QuizGoal: undefined;
  Computing: undefined;
  Reveal: undefined;
  Projection: undefined;
  Paywall: undefined;
  SaveProgress: undefined;
  Reminders: undefined;
  Home: undefined;
  Guard: undefined;
  Streaks: undefined;
  Scan: undefined;
  Settings: undefined;
};
