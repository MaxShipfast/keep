import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors, font } from '../theme';

/** Small, real-looking previews of Keep's features, used on the paywall and in onboarding. */

const TILE = 68;

export function ScanVisual() {
  return (
    <View style={v.tile}>
      <Image source={require('../../assets/meal-poke.jpg')} style={v.photo} />
      <View style={v.photoChip}>
        <Text style={v.photoChipText}>32g</Text>
      </View>
    </View>
  );
}

export function RingVisual({ current = 96, floor = 128 }: { current?: number; floor?: number }) {
  const size = TILE - 8;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, current / floor);
  return (
    <View style={[v.tile, v.center]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.blue}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - frac)}
        />
      </Svg>
      <Text style={v.ringText}>{current}</Text>
    </View>
  );
}

export function ScoreVisual({ score = 83 }: { score?: number }) {
  return (
    <View style={[v.tile, v.center]}>
      <Ionicons name="shield-checkmark" size={20} color={colors.green} />
      <Text style={[v.big, { color: colors.green }]}>{score}</Text>
    </View>
  );
}

export function StreakVisual({ days = 12 }: { days?: number }) {
  return (
    <View style={[v.tile, v.center, { backgroundColor: colors.flameSoft }]}>
      <Ionicons name="flame" size={22} color={colors.flame} />
      <Text style={[v.big, { color: colors.flame }]}>{days}</Text>
    </View>
  );
}

export function ReminderVisual() {
  return (
    <View style={[v.tile, v.center]}>
      <Ionicons name="notifications" size={22} color={colors.blueLight} />
      <Text style={v.small}>7:30 pm</Text>
    </View>
  );
}

/** A feature row: preview tile, a bold title, and one plain-English line. */
export function FeatureRow({ visual, title, sub }: { visual: React.ReactNode; title: string; sub: string }) {
  return (
    <View style={v.row}>
      {visual}
      <View style={{ flex: 1 }}>
        <Text style={v.rowTitle}>{title}</Text>
        <Text style={v.rowSub}>{sub}</Text>
      </View>
    </View>
  );
}

const v = StyleSheet.create({
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  photo: { width: TILE, height: TILE },
  photoChip: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(10,14,21,0.82)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  photoChipText: { color: colors.blueLight, fontSize: 13, fontFamily: font.heavy },
  ringText: { position: 'absolute', color: colors.text, fontSize: 16, fontFamily: font.heavy },
  big: { fontSize: 19, fontFamily: font.heavy, marginTop: 1 },
  small: { color: colors.text2, fontSize: 11.5, fontFamily: font.bold, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowTitle: { color: colors.text, fontSize: 17, fontFamily: font.bold },
  rowSub: { color: colors.text2, fontSize: 14.5, fontFamily: font.regular, marginTop: 2, lineHeight: 20 },
});
