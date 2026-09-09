import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, Eyebrow, H1, BackButton } from '../components/ui';
import { useStore, floorG } from '../store';
import { DAY_FULL } from '../lib/dates';
import { formatWeight } from '../lib/units';
import { syncEnabled, currentEmail, signOut, deleteRemoteData } from '../lib/sync';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const state = useStore();
  const resetAll = useStore((st) => st.resetAll);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    currentEmail().then(setEmail);
  }, []);

  const rows: Array<[string, string]> = [
    ['Medication', `${state.profile.med} · ${DAY_FULL[state.profile.shotDay]}`],
    ['Weight', formatWeight(state.profile.weightLb, state.profile.unit)],
    ['Protein floor', `${floorG(state.profile.weightLb)}g / day`],
  ];

  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: 14 }} />
      <Eyebrow>Settings</Eyebrow>
      <H1 style={{ fontSize: 24 }}>Your plan</H1>

      <Text style={s.groupTitle}>Profile</Text>
      <View style={s.group}>
        {rows.map(([k, v], i) => (
          <View key={k} style={[s.row, i > 0 && { borderTopWidth: 0 }]}>
            <Text style={s.rowKey}>{k}</Text>
            <Text style={s.rowVal}>{v}</Text>
          </View>
        ))}
      </View>

      <Text style={s.groupTitle}>Account</Text>
      <View style={s.group}>
        {!syncEnabled ? (
          <View style={s.row}>
            <Text style={s.rowKey}>Cloud backup</Text>
            <Text style={s.rowVal}>Coming soon</Text>
          </View>
        ) : email ? (
          <>
            <View style={s.row}>
              <Text style={s.rowKey}>Signed in</Text>
              <Text style={s.rowVal}>{email}</Text>
            </View>
            <Pressable
              style={[s.row, { borderTopWidth: 0 }]}
              onPress={async () => {
                await signOut();
                setEmail(null);
              }}
            >
              <Text style={s.rowKey}>Sign out</Text>
            </Pressable>
            <Pressable
              style={[s.row, { borderTopWidth: 0 }]}
              onPress={() =>
                Alert.alert('Delete cloud backup?', 'Removes your backed-up data from our servers. Data on this phone stays.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete backup',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteRemoteData();
                      await signOut();
                      setEmail(null);
                    },
                  },
                ])
              }
            >
              <Text style={[s.rowKey, { color: '#FF6B6B' }]}>Delete cloud backup</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={s.row} onPress={() => navigation.navigate('SignIn')}>
            <Text style={s.rowKey}>Sign in to back up your data</Text>
            <Text style={s.rowVal}>›</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.groupTitle}>Subscription</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Text style={s.rowKey}>Keep Pro</Text>
          <Text style={s.rowVal}>{state.entitled ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <Text style={s.groupTitle}>Data</Text>
      <View style={s.group}>
        <Pressable
          style={s.row}
          onPress={() =>
            Alert.alert('Start over?', 'This erases your plan and all logged data on this device.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase everything',
                style: 'destructive',
                onPress: () => {
                  resetAll();
                  navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                },
              },
            ])
          }
        >
          <Text style={[s.rowKey, { color: '#FF6B6B' }]}>Reset app</Text>
        </Pressable>
      </View>

      <Text style={s.disc}>
        Keep provides general nutrition tracking and is not medical advice. Protein targets reflect published clinical
        guidance (1.2–1.6 g/kg). Always follow your prescriber's instructions for medication and diet.
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  groupTitle: { color: colors.text, fontSize: 13, fontFamily: font.bold, marginTop: 22, marginBottom: 9 },
  group: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowKey: { color: colors.text, fontSize: 14.5, fontFamily: font.semibold },
  rowVal: { color: colors.text2, fontSize: 13, fontFamily: font.regular },
  disc: { color: colors.text2, opacity: 0.7, fontSize: 11.5, fontFamily: font.regular, lineHeight: 19, marginTop: 22 },
});
