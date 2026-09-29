import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { GButton, GhostButton, Eyebrow, H1 } from '../components/ui';
import { CompositionBars } from '../components/ProjectionChart';
import {
  FeatureRow,
  ScanVisual,
  RingVisual,
  ScoreVisual,
  StreakVisual,
  ReminderVisual,
} from '../components/FeatureVisuals';
import { useStore, floorG, projectionLb } from '../store';
import { DAY_FULL } from '../lib/dates';
import { weightAmount } from '../lib/units';
import {
  getPlans,
  purchase,
  restore,
  purchasesAreMock,
  describeError,
  type Plan,
  type StoreErrorMessage,
} from '../lib/purchases';
import { markPaywallSeen, syncEnabled } from '../lib/sync';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const TERMS_URL = 'https://keep-scan.shipfastvc.workers.dev/terms';
const PRIVACY_URL = 'https://keep-scan.shipfastvc.workers.dev/privacy';

/** "Thu, Oct 1" for today plus n days. */
function shortDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => Alert.alert("Couldn't open the link", url));
}

export function PaywallScreen({ navigation }: Props) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  const setEntitled = useStore((st) => st.setEntitled);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<StoreErrorMessage | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<Plan['id']>('yearly');
  const [busy, setBusy] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setShowDetails(false);
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
    markPaywallSeen().catch(() => {});
    loadPlans();
  }, [loadPlans]);

  const unlock = () => {
    setEntitled(true);
    setProfile({ onboarded: true });
    // The optional-account prompt only exists when cloud backup is switched on.
    navigation.reset({ index: 0, routes: [{ name: syncEnabled ? 'SaveProgress' : 'Reminders' }] });
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
          'Purchase not recognized',
          'The App Store confirmed your purchase but Keep Pro didn\'t unlock. Tap "Restore purchase" below. If that doesn\'t work, email info@shipfast.agency and we\'ll sort it out.'
        );
      }
      // 'cancelled': the user closed the App Store sheet — nothing to show.
    } catch (e) {
      Alert.alert('Purchase failed', describeError(e).friendly);
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
      Alert.alert('Restore failed', describeError(e).friendly);
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
      ? loading
        ? 'Loading plans…'
        : 'Plans unavailable'
      : trialDays > 0
        ? `Start ${trialDays}-day free trial`
        : `Continue for ${plan.periodPrice}/${periodLong}`;

  const insets = useSafeAreaInsets();
  const floor = floorG(profile.weightLb);
  const unit = profile.unit;
  const proj = projectionLb(profile.weightLb);
  const conv = (lb: number) => Math.max(1, weightAmount(lb, unit));

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
          <Eyebrow>Your plan is ready</Eyebrow>
          <H1 style={{ fontSize: 31, lineHeight: 37 }}>Protect your muscle on {profile.med}</H1>

          <View style={s.recap}>
            <RingVisual current={floor} floor={floor} />
            <View style={{ flex: 1 }}>
              <Text style={s.recapBig}>{floor}g protein a day</Text>
              <Text style={s.recapSub}>
                About {Math.round(floor / 3)}g per meal. {DAY_FULL[profile.shotDay]} is your shot day, and it never breaks
                your streak.
              </Text>
            </View>
          </View>

          <Text style={s.section}>Aim to lose fat, not muscle</Text>
          <CompositionBars loss={conv(proj.loss)} lean={conv(proj.lean)} unit={unit} />
          <Text style={s.disclaimer}>
            Typical split from the STEP 1 trial (62% fat, 38% lean mass). An aim, not a prediction; results vary.
          </Text>

          <Text style={s.section}>Everything in Keep Pro</Text>
          <View style={{ gap: 16 }}>
            <FeatureRow
              visual={<ScanVisual />}
              title="Snap any meal"
              sub="AI counts the protein, calories and carbs in seconds. Or type it in."
            />
            <FeatureRow
              visual={<RingVisual />}
              title="Your daily protein floor"
              sub={`${floor}g from your weight, with the grams left always in view`}
            />
            <FeatureRow
              visual={<ScoreVisual />}
              title="Muscle Guard score"
              sub="One weekly number for protein, strength training and pace"
            />
            <FeatureRow
              visual={<StreakVisual />}
              title="Fire streaks"
              sub="Earn Bronze, Silver and Gold. Shot day never breaks a streak."
            />
            <FeatureRow
              visual={<ReminderVisual />}
              title="Smart reminders"
              sub="One evening check when you're short, and a heads-up before any charge"
            />
          </View>

          <Text style={s.section}>Choose your plan</Text>
          <View style={{ gap: 10 }}>
            {loading ? (
              <ActivityIndicator color={colors.blue} style={{ paddingVertical: 28 }} />
            ) : loadError ? (
              <View style={s.errorBox}>
                <Text style={s.errorTitle}>Plans didn't load</Text>
                <Text style={s.errorText}>{loadError.friendly}</Text>
                {showDetails ? <Text style={s.errorDetail}>{loadError.technical}</Text> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <GhostButton title="Try again" onPress={loadPlans} />
                  <Pressable onPress={() => setShowDetails((v) => !v)} hitSlop={8}>
                    <Text style={s.detailsToggle}>{showDetails ? 'Hide details' : 'Show details'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              plans.map((p) => {
                const on = selected === p.id;
                const per = p.id === 'yearly' ? 'yr' : 'wk';
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[s.plan, on && { borderColor: colors.blue, backgroundColor: colors.blueSoft }]}
                  >
                    <View style={[s.radio, on && { borderColor: colors.blue }]}>{on ? <View style={s.radioDot} /> : null}</View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.planTitle}>{p.title}</Text>
                        {p.badge ? (
                          <View style={s.badge}>
                            <Text style={s.badgeText}>{p.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={s.planSub}>
                        {p.id === 'yearly'
                          ? `${p.trialDays > 0 ? `${p.trialDays}-day free trial · ` : ''}just ${p.price} a week`
                          : 'Billed weekly · cancel anytime'}
                      </Text>
                    </View>
                    {/* Apple: the amount billed must be the most prominent price. */}
                    <Text style={s.planPrice}>
                      {p.periodPrice}
                      <Text style={s.planPer}>/{per}</Text>
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {plan ? (
            <>
              <Text style={s.section}>{trialDays > 0 ? 'How your free trial works' : 'How billing works'}</Text>
              <View style={s.timeline}>
                <TimelineRow now title={`Today, ${shortDate(0)}`} sub="Full access to everything above. No charge today." />
                {trialDays > 0 ? (
                  <>
                    {trialDays > 1 ? (
                      <TimelineRow
                        title={shortDate(trialDays - 1)}
                        sub="We remind you, if reminders are on. Cancel at least a day before your trial ends and you're never charged."
                      />
                    ) : null}
                    <TimelineRow
                      title={shortDate(trialDays)}
                      sub={`Your trial ends and ${plan.periodPrice} per ${periodLong} starts, renewing until you cancel.`}
                      last
                    />
                  </>
                ) : (
                  <TimelineRow
                    title={`${plan.periodPrice} per ${periodLong}`}
                    sub="Renews automatically until you cancel. Access continues to the end of the period."
                    last
                  />
                )}
              </View>
            </>
          ) : null}

          <Text style={s.fineprint}>
            Payment is charged to your Apple ID{trialDays > 0 ? ' when the free trial ends' : ''}. Cancel anytime in your
            iPhone's Settings, under your name, then Subscriptions.
          </Text>
          <View style={s.linkRow}>
            <Pressable onPress={onRestore} disabled={busy} hitSlop={8}>
              <Text style={s.legalLink}>Restore purchase</Text>
            </Pressable>
            <Pressable onPress={() => openLink(TERMS_URL)} hitSlop={8}>
              <Text style={s.legalLink}>Terms of Use</Text>
            </Pressable>
            <Pressable onPress={() => openLink(PRIVACY_URL)} hitSlop={8}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GButton title={cta} onPress={onBuy} disabled={busy || loading || !plan} />
        {plan ? (
          <Text style={s.footerNote}>
            {trialDays > 0
              ? `No payment now. ${plan.periodPrice}/${periodShort} after ${trialDays} days. Cancel anytime.`
              : `${plan.periodPrice}/${periodShort}. Cancel anytime.`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TimelineRow({ title, sub, now, last }: { title: string; sub: string; now?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={[s.dot, now && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
          {now ? <Ionicons name="lock-open" size={11} color="#fff" /> : null}
        </View>
        {!last ? <View style={s.line} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontFamily: font.bold }}>{title}</Text>
        <Text style={{ color: colors.text2, fontSize: 14.5, fontFamily: font.regular, marginTop: 2, lineHeight: 20 }}>{sub}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  recapBig: { color: colors.text, fontSize: 19, fontFamily: font.heavy },
  recapSub: { color: colors.text2, fontSize: 14.5, fontFamily: font.regular, marginTop: 3, lineHeight: 20 },
  section: { color: colors.text, fontSize: 20, fontFamily: font.heavy, marginTop: 30, marginBottom: 14 },
  disclaimer: { color: colors.text3, fontSize: 12.5, fontFamily: font.regular, marginTop: 10, lineHeight: 17 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  planTitle: { color: colors.text, fontSize: 17.5, fontFamily: font.bold },
  planSub: { color: colors.text2, fontSize: 14, fontFamily: font.regular, marginTop: 3 },
  planPrice: { color: colors.text, fontSize: 19, fontFamily: font.heavy },
  planPer: { color: colors.text2, fontSize: 14, fontFamily: font.semibold },
  badge: { backgroundColor: colors.blue, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#08101F', fontSize: 12.5, fontFamily: font.heavy },
  timeline: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  line: { width: 2, flex: 1, backgroundColor: colors.lineStrong, marginVertical: 3 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(10,14,21,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerNote: { color: colors.text2, fontSize: 13, fontFamily: font.regular, textAlign: 'center', marginTop: 8 },
  errorBox: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,180,84,0.45)',
  },
  errorTitle: { color: colors.text, fontSize: 15.5, fontFamily: font.bold },
  errorText: { color: colors.text2, fontSize: 14, fontFamily: font.regular, marginTop: 4, lineHeight: 20 },
  errorDetail: {
    color: colors.text3,
    fontSize: 13,
    fontFamily: font.regular,
    marginTop: 8,
    lineHeight: 18,
  },
  detailsToggle: { color: colors.text3, fontSize: 13.5, fontFamily: font.semibold, paddingRight: 4 },
  fineprint: {
    color: colors.text2,
    opacity: 0.75,
    fontSize: 13,
    fontFamily: font.regular,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 8 },
  legalLink: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: font.semibold,
    textDecorationLine: 'underline',
  },
});
