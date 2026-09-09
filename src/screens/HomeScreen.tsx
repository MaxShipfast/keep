import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font, gradients } from '../theme';
import { Card } from '../components/ui';
import { ProteinRing } from '../components/ProteinRing';
import {
  useStore,
  floorG,
  todayProtein,
  guardScore,
  hitDaysLast7,
  liftsLast7,
  currentStreak,
} from '../store';
import { DAY_FULL, weekdayMon0 } from '../lib/dates';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const state = useStore();
  const floor = floorG(state.profile.weightLb);
  const protein = todayProtein(state);
  const score = guardScore(state);
  const streak = currentStreak(state);
  const isShotDay = weekdayMon0() === state.profile.shotDay;
  const todayMeals = state.mealsByDate[new Date().toISOString().slice(0, 10)] ?? [];
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const toBronze = Math.max(0, 7 - streak);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.semibold }}>Today</Text>
            <Text style={{ color: colors.text, fontSize: 22, fontFamily: font.heavy, letterSpacing: -0.4, marginTop: 2 }}>
              {dateLabel}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Settings')} style={s.avatar}>
            <Ionicons name="settings-outline" size={17} color={colors.text2} />
          </Pressable>
        </View>

        {isShotDay ? (
          <View style={s.shotBanner}>
            <View style={s.shotDot} />
            <Text style={{ color: colors.text2, fontSize: 12.5, fontFamily: font.regular, flex: 1, lineHeight: 19 }}>
              <Text style={{ color: colors.text, fontFamily: font.bold }}>Shot day. </Text>
              Appetite will dip for ~48h — small, protein-dense portions beat big meals. Your streak is safe today.
            </Text>
          </View>
        ) : null}

        <ProteinRing current={protein} floor={floor} />

        <Pressable onPress={() => navigation.navigate('Guard')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={s.scoreBadge}>
              <Ionicons name="shield-checkmark" size={16} color={colors.green} />
              <Text style={{ color: colors.green, fontSize: 26, fontFamily: font.heavy, letterSpacing: -1 }}>
                {score}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: font.bold }}>Muscle Guard score</Text>
              <Text style={{ color: colors.text2, fontSize: 12, fontFamily: font.regular, marginTop: 1 }}>
                Floor hit {hitDaysLast7(state)} of 7 days · {liftsLast7(state)} lifts this week
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.text3} />
          </Card>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Streaks')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}>
            <View style={s.flameBadge}>
              <Ionicons name="flame" size={26} color={colors.flame} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: font.bold }}>
                {streak}-day streak
              </Text>
              <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.regular, marginTop: 2 }}>
                {toBronze > 0 ? `${toBronze} more days to your Bronze Shield` : 'Bronze Shield earned'} · shot-day
                grace is on
              </Text>
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${Math.min(100, (streak / 7) * 100)}%` }]} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.text3} />
          </Card>
        </Pressable>

        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.bold }}>Today's meals</Text>
            <Text style={{ color: colors.text2, fontSize: 12, fontFamily: font.regular }}>
              {todayMeals.length} logged
            </Text>
          </View>
          {todayMeals.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.regular, textAlign: 'center' }}>
                Nothing logged yet — scan your first meal to start filling the ring.
              </Text>
            </Card>
          ) : (
            todayMeals.map((m) => (
              <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.semibold }}>{m.name}</Text>
                  <Text style={{ color: colors.text2, fontSize: 12, fontFamily: font.regular, marginTop: 1 }}>
                    {new Date(m.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {m.source}
                  </Text>
                </View>
                <Text style={{ color: colors.blue, fontSize: 15, fontFamily: font.heavy }}>+{m.proteinG}g</Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <LinearGradient
        colors={['rgba(10,14,21,0)', 'rgba(10,14,21,0.92)']}
        style={s.fade}
        pointerEvents="none"
      />
      <Pressable onPress={() => navigation.navigate('Scan')} style={s.fabWrap}>
        <LinearGradient colors={gradients.cta} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.fab}>
          <Ionicons name="scan" size={17} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: font.heavy }}>Scan a meal</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: 'rgba(61,123,255,0.3)',
  },
  shotDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  scoreBadge: { alignItems: 'center', gap: 2 },
  flameBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { marginTop: 8, height: 5, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: colors.flame },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 },
  fabWrap: { position: 'absolute', bottom: 34, alignSelf: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 100,
    shadowColor: colors.blue,
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
