import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AppState, View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { colors } from './src/theme';
import { useStore } from './src/store';
import { initAnalytics, track } from './src/lib/analytics';
import { initPurchases } from './src/lib/purchases';
import type { RootStackParamList } from './src/nav';
import {
  WelcomeScreen,
  QuizMedScreen,
  QuizShotScreen,
  QuizWeightScreen,
  QuizTrainScreen,
  QuizGoalScreen,
  ComputingScreen,
  RevealScreen,
  ProjectionScreen,
} from './src/screens/OnboardingScreens';
import { SignInScreen, SavePlanScreen, SaveProgressScreen } from './src/screens/AuthScreens';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { schedulePush, recordPro, watchAppleRevocation } from './src/lib/sync';
import { rescheduleReminders } from './src/lib/reminders';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { GuardScreen } from './src/screens/GuardScreen';
import { StreaksScreen } from './src/screens/StreaksScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.ground, card: colors.ground, text: colors.text },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const onboarded = useStore((s) => s.profile.onboarded);
  const entitled = useStore((s) => s.entitled);
  // The persisted store loads from AsyncStorage asynchronously. Mounting the navigator before that
  // finishes picks the initial route from default state, so a paid user could land on Welcome.
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    const unsubHydration = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    // Last-resort gate: storage reads can't reject (see persistStorage), but a hung read must
    // still never leave the user on a blank screen.
    const gateTimer = setTimeout(() => setHydrated(true), 4000);
    initAnalytics();
    track('app_open');
    let reminderTimer: ReturnType<typeof setTimeout> | null = null;
    // Best-effort cloud backup on every local change (no-op when signed out).
    const unsub = useStore.subscribe((s, prev) => {
      schedulePush(() => ({
        profile: s.profile,
        mealsByDate: s.mealsByDate,
        liftDates: s.liftDates,
        weighIns: s.weighIns,
      }));
      // Lifecycle email needs to know who is Pro (no-op when signed out).
      if (s.entitled !== prev.entitled) recordPro(s.entitled).catch(() => {});
      if (
        s.mealsByDate !== prev.mealsByDate ||
        s.entitled !== prev.entitled ||
        s.remindersOn !== prev.remindersOn ||
        s.trialEndsAt !== prev.trialEndsAt ||
        s.profile !== prev.profile
      ) {
        if (reminderTimer) clearTimeout(reminderTimer);
        reminderTimer = setTimeout(() => rescheduleReminders().catch(() => {}), 1500);
      }
    });
    // Today's reminders depend on the date and the grams logged, so refresh them on every return.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') rescheduleReminders().catch(() => {});
    });
    const unwatchApple = watchAppleRevocation();
    return () => {
      unsub();
      appStateSub.remove();
      if (reminderTimer) clearTimeout(reminderTimer);
      unwatchApple();
      unsubHydration();
      clearTimeout(gateTimer);
    };
  }, []);

  // RevenueCat starts only after the saved state has loaded: hydration overwrites `entitled`
  // with the stored value, which would clobber a fresher answer from the store.
  useEffect(() => {
    if (!hydrated) return;
    initPurchases((v, trialEndsAt) => {
      useStore.getState().setEntitled(v);
      useStore.getState().setTrialEndsAt(trialEndsAt);
    });
    rescheduleReminders().catch(() => {});
  }, [hydrated]);

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  // Onboarded but not entitled (subscription lapsed, or RevenueCat found no purchase on this
  // device) goes straight back to the hard paywall instead of redoing the quiz.
  const initialRoute: keyof RootStackParamList = !onboarded ? 'Welcome' : entitled ? 'Home' : 'Paywall';

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ground },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="QuizMed" component={QuizMedScreen} />
        <Stack.Screen name="QuizShot" component={QuizShotScreen} />
        <Stack.Screen name="QuizWeight" component={QuizWeightScreen} />
        <Stack.Screen name="QuizTrain" component={QuizTrainScreen} />
        <Stack.Screen name="QuizGoal" component={QuizGoalScreen} />
        <Stack.Screen name="Computing" component={ComputingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SavePlan" component={SavePlanScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Reveal" component={RevealScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Projection" component={ProjectionScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SaveProgress" component={SaveProgressScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Reminders" component={RemindersScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Guard" component={GuardScreen} />
        <Stack.Screen name="Streaks" component={StreaksScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
