import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, Eyebrow, H1 } from '../components/ui';
import { useStore } from '../store';
import { getPlans, purchase, restore, purchasesAreMock, type Plan } from '../lib/purchases';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  const setEntitled = useStore((st) => st.setEntitled);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<'yearly' | 'weekly'>('yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('paywall_view');
    getPlans().then(setPlans);
  }, []);

  const onBuy = async () => {
    const plan = plans.find((p) => p.id === selected);
    if (!plan || busy) return;
    setBusy(true);
    try {
      const ok = await purchase(plan);
      if (ok) {
        track('trial_start', { plan: plan.id, mock: purchasesAreMock });
        setEntitled(true);
        setProfile({ onboarded: true });
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    const ok = await restore();
    if (ok) {
      setEntitled(true);
      setProfile({ onboarded: true });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      Alert.alert('Nothing to restore', 'No previous purchase was found for this Apple ID.');
    }
  };

  const cta = selected === 'yearly' ? 'Start 3-day free trial' : 'Continue — $6.99/week';

  return (
    <Screen scroll>
      <Eyebrow>Keep Pro</Eyebrow>
      <H1>Lose fat on {profile.med}. Keep the muscle.</H1>
      <View style={{ marginTop: 18, gap: 11 }}>
        <Feature icon="scan" title="Unlimited photo protein scans" sub="Point your camera at any meal — protein counted in seconds" />
        <Feature icon="flame" title="Muscle Guard score & streaks" sub="One weekly number that tells you if your loss is fat or muscle" />
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        {plans.map((p) => (
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
        ))}
      </View>

      <View style={{ marginTop: 12 }}>
        <TimelineRow now title="Today — full access" sub="Scan meals, get your floor, start your streak" />
        <TimelineRow title="Day 2 — we remind you" sub="A heads-up before anything is charged" />
        <TimelineRow title="Day 3 — trial ends" sub="$49.99/yr, or cancel in two taps. Keep nothing you don't love" />
      </View>

      <GButton title={busy ? 'One moment…' : cta} onPress={onBuy} disabled={busy} style={{ marginTop: 20 }} />
      <Pressable onPress={onRestore}>
        <Text style={s.fineprint}>No charge before day 3 · Cancel anytime in Settings · Restore purchase</Text>
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
