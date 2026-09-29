import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, GhostButton, Eyebrow, H1, Lede, BackButton, InsightCard } from '../components/ui';
import { useStore } from '../store';
import {
  syncEnabled,
  emailSignInEnabled,
  googleSignInEnabled,
  appleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  sendCode,
  verifyCode,
  completeSignIn,
  currentUser,
  marketingOptInDefault,
  type SignupSource,
} from '../lib/sync';
import { track } from '../lib/analytics';
import { designCapture } from '../lib/designCapture';
import type { RootStackParamList } from '../nav';

/* ---------- shared pieces ---------- */

/** Resolves once: whether this phone can show Sign in with Apple. null while checking. */
function useAppleAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    appleSignInAvailable().then((v) => active && setAvailable(v || designCapture));
    return () => {
      active = false;
    };
  }, []);
  return available;
}

/**
 * Apple's own button (App Review expects it for Sign in with Apple). It can't show a spinner, so a
 * status line replaces it while the account is being set up.
 */
function AppleButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  if (busy) {
    return (
      <View style={[a.appleBusy]}>
        <ActivityIndicator color={colors.text} />
        <Text style={a.appleBusyText}>Saving your plan…</Text>
      </View>
    );
  }
  if (Platform.OS === 'web') {
    // Design-capture stand-in: Apple's button only exists on iOS.
    return (
      <Pressable onPress={onPress} style={[a.apple, a.appleWeb]}>
        <Ionicons name="logo-apple" size={20} color="#000" />
        <Text style={a.appleWebText}>Continue with Apple</Text>
      </Pressable>
    );
  }
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={16}
      style={a.apple}
      onPress={onPress}
    />
  );
}

function ConsentRow({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={a.consent}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <Ionicons name={value ? 'checkbox' : 'square-outline'} size={18} color={value ? colors.blue : colors.text3} />
      <Text style={a.consentText}>Email me protein tips and offers. Unsubscribe anytime.</Text>
    </Pressable>
  );
}

/**
 * Runs Apple sign-in end to end. Returns true when signed in, false when the user backed out.
 * Errors are shown here so every screen reports them the same way.
 */
async function appleFlow(source: SignupSource, marketingOptIn: boolean): Promise<boolean> {
  try {
    const res = await signInWithApple();
    if (!res) return false;
    await completeSignIn({ source, marketingOptIn, firstName: res.firstName });
    track('sign_in', { method: 'apple', source });
    return true;
  } catch (e: any) {
    Alert.alert("Couldn't sign in", e?.message ?? 'Try again in a moment.');
    return false;
  }
}

/** Google's "G" mark in its official colours, as its sign-in branding requires. */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <Path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <Path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </Svg>
  );
}

function GoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [a.google, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      <GoogleG />
      <Text style={a.googleText}>Continue with Google</Text>
    </Pressable>
  );
}

async function googleFlow(source: SignupSource, marketingOptIn: boolean): Promise<boolean> {
  try {
    const res = await signInWithGoogle();
    if (!res) return false;
    await completeSignIn({ source, marketingOptIn, firstName: res.firstName });
    track('sign_in', { method: 'google', source });
    return true;
  } catch (e: any) {
    Alert.alert("Couldn't sign in", e?.message ?? 'Try again in a moment.');
    return false;
  }
}

/* ---------- Save your plan (after the plan is built, before it's revealed) ---------- */

type SavePlanProps = NativeStackScreenProps<RootStackParamList, 'SavePlan'>;

/**
 * The account ask sits at peak intent: the quiz is done and the plan is one tap away. Capturing the
 * account before the paywall is what makes "you left your plan behind" emails possible. "Not now"
 * stays, because App Review requires the app to work without an account.
 */
export function SavePlanScreen({ navigation }: SavePlanProps) {
  const apple = useAppleAvailable();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [optIn, setOptIn] = useState(marketingOptInDefault);
  const mounted = useRef(true);
  const toReveal = () => navigation.replace('Reveal');

  useEffect(() => {
    let active = true;
    currentUser().then((u) => active && setSignedIn(Boolean(u)));
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  const nothingToOffer =
    !syncEnabled || signedIn === true || (apple === false && !emailSignInEnabled && !googleSignInEnabled);
  useEffect(() => {
    // Signed in already: leave at once. Otherwise wait until both checks have answered.
    if (nothingToOffer && (!syncEnabled || signedIn === true || (signedIn !== null && apple !== null))) toReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nothingToOffer, signedIn, apple]);

  if (!syncEnabled || apple === null || signedIn === null || nothingToOffer) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  const run = (flow: typeof appleFlow) => async () => {
    if (busy) return;
    setBusy(true);
    const ok = await flow('save_plan', optIn);
    if (!mounted.current) return;
    setBusy(false);
    if (ok) toReveal();
  };
  const onApple = run(appleFlow);
  const onGoogle = run(googleFlow);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={a.iconWrap}>
          <Ionicons name="shield-checkmark" size={52} color={colors.blue} />
        </View>
        <Eyebrow style={{ textAlign: 'center', marginTop: 24 }}>Your plan is ready</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>Save your plan</H1>
        <Lede style={{ textAlign: 'center' }}>
          Keep your protein floor, meals and streak backed up, and bring them to any new phone.
        </Lede>
      </View>
      {apple ? <AppleButton busy={busy} onPress={onApple} /> : null}
      {googleSignInEnabled && !busy ? (
        <View style={{ marginTop: 10 }}>
          <GoogleButton onPress={onGoogle} />
        </View>
      ) : null}
      {emailSignInEnabled && !busy ? (
        <GhostButton
          title="Use email instead"
          onPress={() => navigation.navigate('SignIn', { source: 'save_plan', next: 'Reveal', marketingOptIn: optIn })}
        />
      ) : null}
      <ConsentRow value={optIn} onChange={setOptIn} />
      {!busy ? <GhostButton title="Not now" onPress={toReveal} /> : null}
    </Screen>
  );
}

/* ---------- Sign in (Welcome "I already have an account", Settings, email fallback) ---------- */

type SignInProps = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export function SignInScreen({ navigation, route }: SignInProps) {
  const source: SignupSource = route.params?.source ?? 'settings';
  const apple = useAppleAvailable();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [optIn, setOptIn] = useState(route.params?.marketingOptIn ?? marketingOptInDefault());
  const showConsent = route.params?.marketingOptIn === undefined;

  const finish = () => {
    const next = route.params?.next;
    if (next) {
      navigation.reset({ index: 0, routes: [{ name: next }] });
      return;
    }
    // Access is decided by the App Store subscription on this Apple ID, never by the backup.
    const st = useStore.getState();
    const to = !st.profile.onboarded ? 'QuizMed' : st.entitled ? 'Home' : 'Paywall';
    navigation.reset({ index: 0, routes: [{ name: to }] });
  };

  // Apple is the only door while email is off: show nothing until we know whether it exists.
  if (syncEnabled && apple === null && !emailSignInEnabled && !googleSignInEnabled) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  if (!syncEnabled || (apple === false && !emailSignInEnabled && !googleSignInEnabled)) {
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

  const run = (flow: typeof appleFlow) => async () => {
    if (busy) return;
    setBusy(true);
    const ok = await flow(source, optIn);
    setBusy(false);
    if (ok) finish();
  };
  const onApple = run(appleFlow);
  const onGoogle = run(googleFlow);

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
      await completeSignIn({ source, marketingOptIn: optIn });
      track('sign_in', { method: 'email', source });
      finish();
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
          <H1>Back up your plan</H1>
          <Lede>New or returning, it's the same door. Your plan, meals and streak restore on any phone.</Lede>
          {apple ? (
            <View style={{ marginTop: 24 }}>
              <AppleButton busy={busy} onPress={onApple} />
            </View>
          ) : null}
          {googleSignInEnabled && !busy ? (
            <View style={{ marginTop: apple ? 10 : 24 }}>
              <GoogleButton onPress={onGoogle} />
            </View>
          ) : null}
          {emailSignInEnabled ? (
            <>
              {apple || googleSignInEnabled ? <Text style={a.or}>or use email</Text> : null}
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
              <GButton title={busy ? 'Sending…' : 'Email me a code'} onPress={onSend} disabled={busy} style={{ marginTop: 14 }} />
            </>
          ) : null}
          {showConsent ? <ConsentRow value={optIn} onChange={setOptIn} /> : null}
        </>
      ) : (
        <>
          <H1>Enter the 6-digit code</H1>
          <Lede>Sent to {email.trim()}. It can take a minute, so check spam if it's shy.</Lede>
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
        your plan and meals sync to your account only. Delete your account anytime in Settings.
      </InsightCard>
    </Screen>
  );
}

/* ---------- Back up your progress (after purchase, for anyone who skipped "Save your plan") ---------- */

type SaveProgressProps = NativeStackScreenProps<RootStackParamList, 'SaveProgress'>;

export function SaveProgressScreen({ navigation }: SaveProgressProps) {
  const apple = useAppleAvailable();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [optIn, setOptIn] = useState(marketingOptInDefault);
  const mounted = useRef(true);
  // Next stop after purchase is the reminders ask, which forwards to Home once answered.
  const toHome = () => navigation.reset({ index: 0, routes: [{ name: 'Reminders' }] });

  useEffect(() => {
    let active = true;
    currentUser().then((u) => active && setSignedIn(Boolean(u)));
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  const nothingToOffer =
    !syncEnabled || signedIn === true || (apple === false && !emailSignInEnabled && !googleSignInEnabled);
  useEffect(() => {
    if (nothingToOffer && (!syncEnabled || signedIn === true || (signedIn !== null && apple !== null))) toHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nothingToOffer, signedIn, apple]);

  if (!syncEnabled || apple === null || signedIn === null || nothingToOffer) {
    return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  }

  const run = (flow: typeof appleFlow) => async () => {
    if (busy) return;
    setBusy(true);
    const ok = await flow('after_purchase', optIn);
    if (!mounted.current) return;
    setBusy(false);
    if (ok) toHome();
  };
  const onApple = run(appleFlow);
  const onGoogle = run(googleFlow);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={a.iconWrap}>
          <Ionicons name="cloud-done-outline" size={52} color={colors.blue} />
        </View>
        <Eyebrow style={{ textAlign: 'center', marginTop: 24 }}>One last thing</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>Back up your progress</H1>
        <Lede style={{ textAlign: 'center' }}>
          Your plan, meals and streak survive a lost or new phone. It takes one tap.
        </Lede>
      </View>
      {apple ? <AppleButton busy={busy} onPress={onApple} /> : null}
      {googleSignInEnabled && !busy ? (
        <View style={{ marginTop: 10 }}>
          <GoogleButton onPress={onGoogle} />
        </View>
      ) : null}
      {emailSignInEnabled && !busy ? (
        <GhostButton
          title="Use email instead"
          onPress={() => navigation.navigate('SignIn', { source: 'after_purchase', next: 'Reminders', marketingOptIn: optIn })}
        />
      ) : null}
      <ConsentRow value={optIn} onChange={setOptIn} />
      {!busy ? <GhostButton title="Skip for now" onPress={toHome} /> : null}
    </Screen>
  );
}

const a = StyleSheet.create({
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  apple: { width: '100%', height: 54 },
  appleWeb: { borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  appleWebText: { color: '#000000', fontSize: 17, fontFamily: font.semibold },
  google: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { color: '#1F1F1F', fontSize: 17, fontFamily: font.semibold },
  appleBusy: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleBusyText: { color: colors.text, fontSize: 16, fontFamily: font.bold },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 2 },
  consentText: { color: colors.text2, fontSize: 14, fontFamily: font.regular, flex: 1, lineHeight: 20 },
  or: { color: colors.text3, fontSize: 14, fontFamily: font.semibold, textAlign: 'center', marginTop: 18 },
});

const s = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    fontFamily: font.regular,
    marginTop: 22,
  },
});
