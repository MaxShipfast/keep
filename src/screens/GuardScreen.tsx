import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, Eyebrow, Card, InsightCard, BackButton } from '../components/ui';
import { weightAmount, kgToLb } from '../lib/units';
import {
  useStore,
  guardScore,
  hitDaysLast7,
  liftsLast7,
  weeklyLossPct,
  dayHit,
} from '../store';
import { DAY_LABELS, currentWeekDates, dateKey } from '../lib/dates';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Guard'>;

export function GuardScreen({ navigation }: Props) {
  const state = useStore();
  const logLift = useStore((st) => st.logLift);
  const logWeighIn = useStore((st) => st.logWeighIn);
  const unit = state.profile.unit;
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighVal, setWeighVal] = useState(String(weightAmount(state.profile.weightLb, unit)));

  const score = guardScore(state);
  const hit7 = hitDaysLast7(state);
  const lifts = liftsLast7(state);
  const pace = weeklyLossPct(state);
  const liftedToday = Boolean(state.liftDates[dateKey()]);

  const proteinPts = Math.round((hit7 / 7) * 60);
  const liftPts = Math.round((Math.min(lifts, 3) / 3) * 25);
  const pacePts = score - proteinPts - liftPts;

  const week = currentWeekDates();
  const today = new Date();
  const weekendMisses = week.filter(
    (d) => d <= today && !dayHit(state, d) && [5, 6].includes((d.getDay() + 6) % 7)
  ).length;

  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: 14 }} />
      <Eyebrow>Muscle Guard score</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
        <Text style={{ color: colors.green, fontSize: 46, fontFamily: font.heavy, letterSpacing: -1.5 }}>{score}</Text>
        <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.regular }}>this week</Text>
      </View>

      <Text style={s.sechead}>How it's built</Text>
      <View style={{ gap: 7 }}>
        <BreakdownRow
          icon="nutrition"
          title="Protein floor · 60% of score"
          pts={`${proteinPts}/60`}
          frac={proteinPts / 60}
          note={`Hit ${hit7} of 7 days this week`}
        />
        <BreakdownRow
          icon="barbell"
          title="Strength training · 25%"
          pts={`${liftPts}/25`}
          frac={liftPts / 25}
          note={`${lifts} of 3 target sessions this week`}
          action={liftedToday ? '✓ Logged today' : '+ Log lift'}
          actionDone={liftedToday}
          onAction={() => {
            if (liftedToday) return;
            logLift();
            track('lift_logged');
          }}
        />
        <BreakdownRow
          icon="speedometer"
          title="Loss pace · 15%"
          pts={`${Math.max(0, pacePts)}/15`}
          frac={Math.max(0, pacePts) / 15}
          note={
            pace === null
              ? 'Add a weekly weigh-in to track pace'
              : `${pace > 0 ? '−' : '+'}${Math.abs(pace).toFixed(1)}%/week · ${pace <= 1.25 ? 'safe zone' : 'faster than safe — muscle risk rises'}`
          }
          action={weighOpen ? undefined : '+ Weigh-in'}
          onAction={() => setWeighOpen(true)}
        />
      </View>

      {weighOpen ? (
        <Card style={{ marginTop: 8, gap: 10 }}>
          <TextInput
            value={weighVal}
            onChangeText={setWeighVal}
            keyboardType="decimal-pad"
            style={s.input}
            placeholder={`Weight in ${unit}`}
            placeholderTextColor={colors.text3}
          />
          <Pressable
            style={s.miniCta}
            onPress={() => {
              const raw = parseFloat(weighVal);
              const v = unit === 'kg' ? kgToLb(raw) : raw;
              if (!raw || v < 60 || v > 600) {
                Alert.alert('Check the number', `Enter your weight in ${unit === 'kg' ? 'kilograms' : 'pounds'}.`);
                return;
              }
              logWeighIn(Math.round(v * 10) / 10);
              track('weighin_logged');
              setWeighOpen(false);
            }}
          >
            <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 14 }}>Save weigh-in</Text>
          </Pressable>
        </Card>
      ) : null}

      <Text style={s.sechead}>This week's pattern</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {week.map((d, i) => {
          const past = d <= today;
          const hit = past && dayHit(state, d);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={[
                  s.pday,
                  hit && { backgroundColor: 'rgba(61,220,151,0.16)', borderColor: 'rgba(61,220,151,0.55)' },
                  !past && { opacity: 0.35 },
                ]}
              />
              <Text style={{ color: colors.text2, fontSize: 10, fontFamily: font.semibold, marginTop: 5 }}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      <InsightCard style={{ marginTop: 10 }}>
        <Text style={{ color: colors.text, fontFamily: font.bold }}>Your pattern: </Text>
        {weekendMisses > 0
          ? 'your misses cluster on weekends. A Saturday-morning protein shake is the single biggest lever on next week\'s score.'
          : hit7 >= 5
            ? 'strong week. Consistency is what actually protects muscle — keep the floor streak alive.'
            : 'log meals daily so Keep can spot your miss pattern and tell you exactly what to fix.'}
      </InsightCard>
    </Screen>
  );
}

function BreakdownRow({
  icon,
  title,
  pts,
  frac,
  note,
  action,
  actionDone,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  pts: string;
  frac: number;
  note: string;
  action?: string;
  actionDone?: boolean;
  onAction?: () => void;
}) {
  return (
    <Card style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
          <Ionicons name={icon} size={14} color={colors.blueLight} />
          <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bold }}>{title}</Text>
        </View>
        <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.bold }}>{pts}</Text>
      </View>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%` }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <Text style={{ color: colors.text2, fontSize: 11, fontFamily: font.regular, flex: 1 }}>{note}</Text>
        {action && onAction ? (
          <Pressable onPress={onAction} style={[s.miniBtn, actionDone && s.miniBtnDone]}>
            <Text
              style={{
                color: actionDone ? colors.green : colors.blue,
                fontSize: 11.5,
                fontFamily: font.bold,
              }}
            >
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  sechead: { color: colors.text, fontSize: 13.5, fontFamily: font.bold, marginTop: 14, marginBottom: 7 },
  bar: { marginTop: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.blue },
  miniBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: 'rgba(61,123,255,0.35)',
  },
  miniBtnDone: { backgroundColor: 'rgba(61,220,151,0.1)', borderColor: 'rgba(61,220,151,0.35)' },
  pday: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    fontFamily: font.regular,
  },
  miniCta: { backgroundColor: colors.blue, borderRadius: 12, padding: 13, alignItems: 'center' },
});
