import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, GhostButton, Eyebrow, H1, Lede, BackButton, InsightCard } from '../components/ui';
import { useStore } from '../store';
import { syncEnabled, sendCode, verifyCode, pullState, pushState } from '../lib/sync';
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
  const setEntitled = useStore((st) => st.setEntitled);

  if (!syncEnabled) {
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <Eyebrow style={{ marginTop: 14 }}>Accounts</Eyebrow>
        <H1>No account needed yet</H1>
        <Lede>
          Keep stores your data privately on this device. Cloud backup and sign-in switch on once the backend keys are
          configured.
        </Lede>
        <GButton title="Take the quiz instead" onPress={() => navigation.navigate('QuizMed')} style={{ marginTop: 24 }} />
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
      if (remote && remote.profile) {
        hydrate(remote as Parameters<typeof hydrate>[0]);
        const p = remote.profile as { onboarded?: boolean };
        if (p.onboarded) {
          setEntitled(true); // restored user; RevenueCat re-validates real entitlement on launch
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          return;
        }
      } else {
        const s = useStore.getState();
        await pushState({
          profile: s.profile,
          mealsByDate: s.mealsByDate,
          liftDates: s.liftDates,
          weighIns: s.weighIns,
        });
      }
      navigation.navigate(useStore.getState().profile.onboarded ? 'Home' : 'QuizMed');
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
