import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, GhostButton, Eyebrow, H1 } from '../components/ui';
import { useStore } from '../store';
import { getPlans, purchase, restore, purchasesAreMock, describeError, type Plan } from '../lib/purchases';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  const setEntitled = useStore((st) => st.setEntitled);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan['id']>('yearly');
  const [busy, setBusy] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await getPlans();
      setPlans(loaded);
      setSelected((cur) => (loaded.some((p) => p.id === cur) ? cur : loaded[0].id));
    } catch (e) {
      setPlans([]);
      setLoadError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    track('paywall_view');
    loadPlans();
  }, [loadPlans]);

  const unlock = () => {
    setEntitled(true);
    setProfile({ onboarded: true });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const plan = plans.find((p) => p.id === selected) ?? plans[0];

  const onBuy = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      const outcome = await purchase(plan);
      if (outcome === 'entitled') {
        track('trial_start', { plan: plan.id, trial: plan.trialDays > 0, mock: purchasesAreMock() });
        unlock();
      } else if (outcome === 'not_entitled') {
        Alert.alert(
          'Purchase not recognised',
          'The App Store confirmed the purchase but access was not granted. Tap "Restore purchase" below. If that fails, email info@shipfast.agency.'
        );
      }
      // 'cancelled': the user closed the App Store sheet — nothing to show.
    } catch (e) {
      Alert.alert('Purchase failed', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await restore()) unlock();
      else Alert.alert('Nothing to restore', 'No active Keep Pro subscription was found for this Apple ID.');
    } catch (e) {
      Alert.alert('Restore failed', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const trialDays = plan?.trialDays ?? 0;
  const periodShort = plan?.id === 'yearly' ? 'yr' : 'wk';
  const periodLong = plan?.id === 'yearly' ? 'year' : 'week';
  const cta = busy
    ? 'One moment…'
    : !plan
      ? 'Loading plans…'
      : trialDays > 0
        ? `Start ${trialDays}-day free trial`
        : `Continue — ${plan.periodPrice}/${periodLong}`;

  return (
    <Screen scroll>
      <Eyebrow>Keep Pro</Eyebrow>
      <H1>Lose fat on {profile.med}. Keep the muscle.</H1>
      <View style={{ marginTop: 18, gap: 11 }}>
        <Feature icon="scan" title="Unlimited photo protein scans" sub="Point your camera at any meal — protein counted in seconds" />
        <Feature icon="flame" title="Muscle Guard score & streaks" sub="One weekly number that tells you if your loss is fat or muscle" />
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ paddingVertical: 28 }} />
        ) : loadError ? (
          <View style={s.errorBox}>
            <Text style={s.errorTitle}>Couldn't load plans</Text>
            <Text style={s.errorText}>{loadError}</Text>
            <GhostButton title="Try again" onPress={loadPlans} />
          </View>
        ) : (
          plans.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[s.plan, selected === p.id && { borderColor: colors.blue, backgroundColor: colors.blueSoft }]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.bold }}>{p.title}</Text>
                  {p.badge ? (
                    <View style={s.badge}>
                      <Text style={{ color: '#08101F', fontSize: 10.5, fontFamily: font.heavy }}>{p.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: colors.text2, fontSize: 12.5, fontFamily: font.regular, marginTop: 2 }}>{p.sub}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.heavy }}>{p.price}</Text>
                <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.semibold }}>{p.priceNote}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {plan ? (
        <View style={{ marginTop: 12 }}>
          <TimelineRow now title="Today — full access" sub="Scan meals, get your floor, start your streak" />
          {trialDays > 0 ? (
            <>
              {trialDays > 1 ? (
                <TimelineRow title={`Day ${trialDays - 1} — we remind you`} sub="A heads-up before anything is charged" />
              ) : null}
              <TimelineRow
                title={`Day ${trialDays} — trial ends`}
                sub={`${plan.periodPrice}/${periodShort}, or cancel in two taps. Keep nothing you don't love`}
              />
            </>
          ) : (
            <TimelineRow
              title={`Billed ${plan.periodPrice} per ${periodLong}`}
              sub="Cancel anytime in Settings — access continues to the end of the period"
            />
          )}
        </View>
      ) : null}

      <GButton title={cta} onPress={onBuy} disabled={busy || loading || !plan} style={{ marginTop: 20 }} />
      <Pressable onPress={onRestore} disabled={busy}>
        <Text style={s.fineprint}>
          {trialDays > 0 ? `No charge before day ${trialDays} · ` : ''}Cancel anytime in Settings · Restore purchase
        </Text>
      </Pressable>
    </Screen>
  );
}

function Feature({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={s.check}>
        <Ionicons name={icon} size={13} color={colors.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14.5, fontFamily: font.bold }}>{title}</Text>
        <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.regular, marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

function TimelineRow({ title, sub, now }: { title: string; sub: string; now?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 4 }}>
      <View style={[s.dot, now && { backgroundColor: colors.blue }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bold }}>{title}</Text>
        <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.regular, marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  badge: { backgroundColor: colors.blue, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface2, marginTop: 2 },
  errorBox: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,180,84,0.45)',
  },
  errorTitle: { color: colors.text, fontSize: 14.5, fontFamily: font.bold },
  errorText: { color: colors.text2, fontSize: 12.5, fontFamily: font.regular, marginTop: 4, lineHeight: 18 },
  fineprint: {
    color: colors.text2,
    opacity: 0.75,
    fontSize: 11,
    fontFamily: font.regular,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
});
