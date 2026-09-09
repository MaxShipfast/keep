import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
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
import { SignInScreen } from './src/screens/AuthScreens';
import { schedulePush } from './src/lib/sync';
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

  useEffect(() => {
    initAnalytics();
    initPurchases();
    track('app_open');
    // Best-effort cloud backup on every local change (no-op when signed out).
    const unsub = useStore.subscribe((s) =>
      schedulePush(() => ({
        profile: s.profile,
        mealsByDate: s.mealsByDate,
        liftDates: s.liftDates,
        weighIns: s.weighIns,
      }))
    );
    return unsub;
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  const initialRoute: keyof RootStackParamList = onboarded && entitled ? 'Home' : 'Welcome';

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
        <Stack.Screen name="Reveal" component={RevealScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Projection" component={ProjectionScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Guard" component={GuardScreen} />
        <Stack.Screen name="Streaks" component={StreaksScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
