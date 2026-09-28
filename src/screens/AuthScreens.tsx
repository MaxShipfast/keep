import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, GhostButton, Eyebrow, H1, Lede, BackButton, InsightCard } from '../components/ui';
import { useStore } from '../store';
import { syncEnabled, sendCode, verifyCode, pullState, pushState, currentEmail } from '../lib/sync';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type SignInProps = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

/**
 * First-party email one-time-code sign-in (Supabase OTP). Deliberately no
 * Google button: offering third-party login triggers Apple's mandatory
 * Sign-in-with-Apple requirement. Accounts are optional — the app is fully
 * usable without one; signing in backs up data and restores it on a new phone.
 */
export function SignInScreen({ navigation }: SignInProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const hydrate = useStore((st) => st.hydrate);

  if (!syncEnabled) {
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <Eyebrow style={{ marginTop: 14 }}>Accounts</Eyebrow>
        <H1>No account needed</H1>
        <Lede>
          Keep stores everything privately on this phone, so there's nothing to sign in to. Cloud backup is on the
          way in a future update.
        </Lede>
        <GButton title="Got it" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  const onSend = async () => {
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      Alert.alert('Check the address', 'Enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      await sendCode(addr);
      setStage('code');
    } catch (e: any) {
      Alert.alert('Could not send code', e?.message ?? 'Try again in a minute.');
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (code.trim().length < 6) return;
    setBusy(true);
    try {
      await verifyCode(email.trim().toLowerCase(), code.trim());
      track('sign_in');
      const remote = await pullState();
      const remoteProfile = remote?.profile as { onboarded?: boolean } | undefined;
      if (remote && remoteProfile?.onboarded) {
        // A completed plan in the cloud wins: this is a returning user on a new or reset phone.
        hydrate(remote as Parameters<typeof hydrate>[0]);
      } else {
        // No usable backup yet, so this phone's data becomes the account's first backup.
        // (Restoring a half-finished cloud profile here would wipe a plan the user just built.)
        const s = useStore.getState();
        await pushState({
          profile: s.profile,
          mealsByDate: s.mealsByDate,
          liftDates: s.liftDates,
          weighIns: s.weighIns,
        });
      }
      // Access is decided by the App Store subscription on this Apple ID, never by the backup.
      const st = useStore.getState();
      const next = !st.profile.onboarded ? 'QuizMed' : st.entitled ? 'Home' : 'Paywall';
      navigation.reset({ index: 0, routes: [{ name: next }] });
    } catch (e: any) {
      Alert.alert('Code not accepted', e?.message ?? 'Check the 6-digit code and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => (stage === 'code' ? setStage('email') : navigation.goBack())} />
      <Eyebrow style={{ marginTop: 14 }}>{stage === 'email' ? 'Sign in or create account' : 'Check your email'}</Eyebrow>
      {stage === 'email' ? (
        <>
          <H1>One email. No password.</H1>
          <Lede>We'll send a 6-digit code to sign you in — new or returning, same door. Your data backs up to your
          account and restores on any phone.</Lede>
          <TextInput
            placeholder="you@email.com"
            placeholderTextColor={colors.text3}
            style={s.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <GButton title={busy ? 'Sending…' : 'Email me a code'} onPress={onSend} disabled={busy} style={{ marginTop: 18 }} />
        </>
      ) : (
        <>
          <H1>Enter the 6-digit code</H1>
          <Lede>Sent to {email.trim()} — it can take a minute. Check spam if it's shy.</Lede>
          <TextInput
            placeholder="123456"
            placeholderTextColor={colors.text3}
            style={[s.input, { letterSpacing: 8, fontSize: 22, textAlign: 'center', fontFamily: font.bold }]}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <GButton title={busy ? 'Checking…' : 'Sign in'} onPress={onVerify} disabled={busy} style={{ marginTop: 18 }} />
          <GhostButton title="Resend code" onPress={onSend} />
        </>
      )}
      <InsightCard style={{ marginTop: 'auto' }}>
        <Ionicons name="lock-closed" size={12} color={colors.blue} />{' '}
        <Text style={{ color: colors.text, fontFamily: font.bold }}>Private by design: </Text>
        your meals and weights sync to your account only. No passwords stored, nothing shared.
      </InsightCard>
    </Screen>
  );
}

type SaveProgressProps = NativeStackScreenProps<RootStackParamList, 'SaveProgress'>;

/**
 * Post-onboarding sign-up prompt, shown right after the paywall unlocks.
 * Env-gated like sign-in: when Supabase keys are absent (or the user is already
 * signed in) it forwards straight to Home so nothing half-built is ever shown.
 */
export function SaveProgressScreen({ navigation }: SaveProgressProps) {
  const toHome = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

  useEffect(() => {
    if (!syncEnabled) {
      toHome();
      return;
    }
    // Already signed in: nothing to offer. Ignore the answer if the user has moved on meanwhile.
    let active = true;
    currentEmail().then((email) => {
      if (active && email && navigation.isFocused()) toHome();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!syncEnabled) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={sp.iconWrap}>
          <Ionicons name="cloud-done-outline" size={54} color={colors.blue} />
        </View>
        <Eyebrow style={{ textAlign: 'center', marginTop: 24 }}>One last thing</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>Back up your progress</H1>
        <Lede style={{ textAlign: 'center' }}>
          Create a free account so your plan, meals, and streaks survive a lost or new phone. One email, a 6-digit
          code — no password.
        </Lede>
      </View>
      <GButton title="Create account" onPress={() => navigation.navigate('SignIn')} />
      <GhostButton title="Skip for now — you can do this later in Settings" onPress={toHome} />
    </Screen>
  );
}

const sp = StyleSheet.create({
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

const s = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    fontFamily: font.regular,
    marginTop: 22,
  },
});
