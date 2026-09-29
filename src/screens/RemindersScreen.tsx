import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, GButton, GhostButton, Eyebrow, H1, Lede } from '../components/ui';
import { useStore, floorG } from '../store';
import { DAY_FULL } from '../lib/dates';
import { reminderPermission, enableReminders } from '../lib/reminders';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Reminders'>;

/**
 * Explains exactly which reminders Keep sends before iOS shows its one-time permission prompt.
 * Shown once after purchase; if the question was already answered it forwards straight to Home.
 */
export function RemindersScreen({ navigation }: Props) {
  const profile = useStore((st) => st.profile);
  const trialEndsAt = useStore((st) => st.trialEndsAt);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const toHome = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

  useEffect(() => {
    reminderPermission().then((p) => {
      if (!mounted.current) return;
      if (p === 'granted') {
        useStore.getState().setRemindersOn(true);
        toHome();
      } else if (p === 'denied') {
        toHome();
      } else {
        setReady(true);
      }
    });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  const floor = floorG(profile.weightLb);
  const rows: Array<[keyof typeof Ionicons.glyphMap, string, string]> = [
    ['restaurant-outline', 'Lunch protein check', `12:30 pm · aim for about ${Math.round(floor / 3)}g`],
    ['flame-outline', 'Evening floor check', "7:30 pm · only if you're short, with the grams left"],
    ['medkit-outline', 'Shot-day tips', `${DAY_FULL[profile.shotDay]} mornings, when appetite dips`],
    ['shield-checkmark-outline', 'Weekly Muscle Guard score', 'Sunday evenings'],
  ];
  if (trialEndsAt) rows.push(['calendar-outline', 'Trial reminder', 'The day before your free trial ends']);

  const onEnable = async () => {
    if (busy) return;
    setBusy(true);
    const granted = await enableReminders().catch(() => false);
    track('reminders_prompt', { granted });
    if (mounted.current) toHome();
  };

  return (
    <Screen scroll>
      <View style={st.iconWrap}>
        <Ionicons name="notifications-outline" size={46} color={colors.blue} />
      </View>
      <Eyebrow style={{ textAlign: 'center', marginTop: 20 }}>Stay on track</Eyebrow>
      <H1 style={{ textAlign: 'center' }}>Nudges that protect your streak</H1>
      <Lede style={{ textAlign: 'center' }}>At most two a day, built around your plan. They stop once you hit your floor.</Lede>
      <View style={st.list}>
        {rows.map(([icon, title, sub]) => (
          <View key={title} style={st.row}>
            <View style={st.rowIcon}>
              <Ionicons name={icon} size={20} color={colors.blueLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{title}</Text>
              <Text style={st.rowSub}>{sub}</Text>
            </View>
          </View>
        ))}
      </View>
      <GButton title={busy ? 'One moment…' : 'Turn on reminders'} onPress={onEnable} disabled={busy} style={{ marginTop: 24 }} />
      <GhostButton
        title="Not now"
        onPress={() => {
          track('reminders_prompt', { granted: false, skipped: true });
          toHome();
        }}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  list: { marginTop: 22, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16.5, fontFamily: font.bold },
  rowSub: { color: colors.text2, fontSize: 15, fontFamily: font.regular, marginTop: 2, lineHeight: 21 },
});
