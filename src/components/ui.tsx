import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, gradients, radius } from '../theme';

/** Round back button shown at the top of every non-root screen. */
export function BackButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.text2} />
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ padding: 24, paddingBottom: 48 }, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 24 }, style]}>{children}</View>
  );
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>{inner}</SafeAreaView>;
}

export function GButton({
  title,
  onPress,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed || disabled ? 0.85 : 1 }, style]}>
      <LinearGradient colors={gradients.cta} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.cta}>
        <Text style={s.ctaText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, style }: { title: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ghost, { opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={s.ghostText}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, style]}>{children}</Text>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}

export function Lede({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.lede, style]}>{children}</Text>;
}

export function ProgressDots({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.progressBar, i < step && { backgroundColor: colors.blue }]} />
      ))}
    </View>
  );
}

export function OptionCard({
  title,
  sub,
  selected,
  onPress,
}: {
  title: string;
  sub?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.opt,
        selected && { borderColor: colors.blue, backgroundColor: colors.blueSoft },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.optTitle}>{title}</Text>
        {sub ? <Text style={s.optSub}>{sub}</Text> : null}
      </View>
      <View style={[s.tick, selected && { borderColor: colors.blue, backgroundColor: colors.blue }]}>
        {selected ? <View style={s.tickInner} /> : null}
      </View>
    </Pressable>
  );
}

export function InsightCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.insight, style]}>
      <Text style={s.insightText}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cta: {
    padding: 17,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontFamily: font.bold },
  ghost: { padding: 12, alignItems: 'center' },
  ghostText: { color: colors.text2, fontSize: 14, fontFamily: font.semibold },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 16,
  },
  eyebrow: { color: colors.blue, fontSize: 13, fontFamily: font.bold },
  h1: { color: colors.text, fontSize: 30, fontFamily: font.heavy, letterSpacing: -0.5, lineHeight: 36, marginTop: 10 },
  lede: { color: colors.text2, fontSize: 15, fontFamily: font.regular, lineHeight: 23, marginTop: 12 },
  progressRow: { flexDirection: 'row', gap: 5, marginBottom: 26, marginTop: 8 },
  progressBar: { height: 3, flex: 1, borderRadius: 2, backgroundColor: colors.surface2 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
  },
  optTitle: { color: colors.text, fontSize: 15.5, fontFamily: font.semibold },
  optSub: { color: colors.text2, fontSize: 12.5, fontFamily: font.regular, marginTop: 3 },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  insight: {
    backgroundColor: colors.blueSoft,
    borderColor: 'rgba(61,123,255,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  insightText: { color: colors.text2, fontSize: 12.5, fontFamily: font.regular, lineHeight: 19 },
});
