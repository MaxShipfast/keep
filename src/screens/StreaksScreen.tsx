import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, Eyebrow, Card, InsightCard, BackButton } from '../components/ui';
import { useStore, currentStreak, bestStreak, hitRatePct, dayHit } from '../store';
import { weekdayMon0 } from '../lib/dates';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Streaks'>;

const SHIELD_TINTS: Record<string, string> = {
  Bronze: colors.bronze,
  Silver: colors.silver,
  Gold: colors.gold,
};

export function StreaksScreen({ navigation }: Props) {
  const state = useStore();
  const streak = currentStreak(state);
  const best = bestStreak(state);
  const rate = hitRatePct(state);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = weekdayMon0(new Date(year, month, 1));

  const cells: Array<{ day?: number; hit?: boolean; grace?: boolean; today?: boolean }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({});
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const isPastOrToday = d <= now;
    cells.push({
      day,
      hit: isPastOrToday && dayHit(state, d),
      grace: weekdayMon0(d) === state.profile.shotDay,
      today: day === now.getDate(),
    });
  }

  const shields = [
    { name: 'Bronze', days: 7 },
    { name: 'Silver', days: 30 },
    { name: 'Gold', days: 90 },
  ];

  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: 14 }} />
      <Eyebrow>Streaks &amp; shields</Eyebrow>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingVertical: 18 }}>
        <View style={s.flameHero}>
          <Ionicons name="flame" size={38} color={colors.flame} />
        </View>
        <View>
          <Text style={{ color: colors.text, fontSize: 44, fontFamily: font.heavy, letterSpacing: -1, lineHeight: 48 }}>
            {streak} <Text style={{ fontSize: 15, color: colors.text2, fontFamily: font.bold }}>days</Text>
          </Text>
          <Text style={{ color: colors.text2, fontSize: 12, fontFamily: font.regular, marginTop: 4 }}>
            Current floor streak · best {best} · floor hit {rate}% of days
          </Text>
        </View>
      </Card>

      <Text style={s.sechead}>Shields</Text>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {shields.map((sh) => {
          const unlocked = best >= sh.days;
          const isNext = !unlocked && shields.find((x) => best < x.days)?.name === sh.name;
          const tint = unlocked || isNext ? SHIELD_TINTS[sh.name] : colors.text3;
          return (
            <Card key={sh.name} style={[s.shieldCard, !unlocked && !isNext && { opacity: 0.45 }]}>
              <Ionicons name={unlocked ? 'shield-checkmark' : 'shield-outline'} size={26} color={tint} />
              <Text style={{ color: colors.text, fontSize: 12, fontFamily: font.bold, marginTop: 6 }}>{sh.name}</Text>
              <Text style={{ color: colors.text2, fontSize: 10, fontFamily: font.regular, marginTop: 2 }}>
                {sh.days}-day streak
              </Text>
              {isNext ? (
                <View style={s.track}>
                  <View style={[s.trackFill, { width: `${Math.min(100, (streak / sh.days) * 100)}%` }]} />
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      <Text style={s.sechead}>{monthName}</Text>
      <Card>
        <View style={s.grid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={`h${i}`} style={s.dw}>
              {d}
            </Text>
          ))}
          {cells.map((c, i) => (
            <View
              key={i}
              style={[
                s.dcell,
                c.hit && { backgroundColor: 'rgba(61,123,255,0.16)' },
                c.grace && !c.hit && c.day ? s.grace : null,
                c.today && { borderWidth: 1.5, borderColor: colors.blue },
              ]}
            >
              {c.day ? (
                <Text
                  style={{
                    color: c.hit || c.today ? colors.text : colors.text2,
                    fontSize: 11,
                    fontFamily: c.hit || c.today ? font.bold : font.regular,
                  }}
                >
                  {c.day}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <LegendDot color="rgba(61,123,255,0.35)" label="Floor hit" />
          <LegendDot dashed label="Shot-day grace" />
        </View>
      </Card>

      <InsightCard style={{ marginTop: 12 }}>
        <Text style={{ color: colors.text, fontFamily: font.bold }}>Shot-day grace: </Text>
        on your injection day, appetite craters — so your streak never breaks on a shot day. Protection shouldn't punish
        you for taking your medication.
      </InsightCard>
    </Screen>
  );
}

function LegendDot({ color, dashed, label }: { color?: string; dashed?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={[
          { width: 10, height: 10, borderRadius: 3 },
          color ? { backgroundColor: color } : null,
          dashed ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(61,123,255,0.7)' } : null,
        ]}
      />
      <Text style={{ color: colors.text2, fontSize: 10.5, fontFamily: font.regular }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sechead: { color: colors.text, fontSize: 13.5, fontFamily: font.bold, marginTop: 14, marginBottom: 7 },
  flameHero: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  track: { marginTop: 7, height: 4, borderRadius: 2, backgroundColor: colors.surface2, overflow: 'hidden', alignSelf: 'stretch' },
  trackFill: { height: '100%', backgroundColor: colors.flame },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dw: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.text2,
    fontSize: 9.5,
    fontFamily: font.bold,
    paddingBottom: 4,
  },
  dcell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  grace: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(61,123,255,0.6)' },
});
