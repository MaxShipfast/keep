import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { Screen, Eyebrow, H1, BackButton } from '../components/ui';
import { useStore, floorG } from '../store';
import { DAY_FULL } from '../lib/dates';
import { formatWeight } from '../lib/units';
import { syncEnabled, currentEmail, signOut, deleteAccount } from '../lib/sync';
import { reminderPermission, enableReminders, disableReminders } from '../lib/reminders';
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
              <Text style={s.rowVal} numberOfLines={1}>
                {/* Apple's relay address means nothing to the user. */}
                {email.endsWith('@privaterelay.appleid.com') ? 'with Apple' : email}
              </Text>
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
                Alert.alert(
                  'Delete your account?',
                  'This permanently deletes your account and the backup of your plan, meals and weigh-ins from our servers. Data on this phone stays. Your subscription is billed by Apple: cancel it separately in Settings > Subscriptions.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete account',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteAccount();
                          setEmail(null);
                          Alert.alert('Account deleted', 'Your account and backup are gone from our servers.');
                        } catch (e: any) {
                          Alert.alert("Couldn't delete the account", e?.message ?? 'Check your connection and try again.');
                        }
                      },
                    },
                  ]
                )
              }
            >
              <Text style={[s.rowKey, { color: '#FF6B6B' }]}>Delete account</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={s.row} onPress={() => navigation.navigate('SignIn', { source: 'settings' })}>
            <Text style={s.rowKey}>Sign in to back up your data</Text>
            <Text style={s.rowVal}>›</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.groupTitle}>Reminders</Text>
      <View style={s.group}>
        <View style={s.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.rowKey}>Daily protein reminders</Text>
            <Text style={s.rowHint}>Lunch and evening checks, shot-day tips, and your Sunday score</Text>
          </View>
          <Switch
            value={state.remindersOn}
            trackColor={{ true: colors.blue, false: colors.surface2 }}
            onValueChange={async (on) => {
              if (!on) {
                await disableReminders();
                return;
              }
              if ((await reminderPermission()) === 'denied') {
                Alert.alert('Notifications are off for Keep', 'Turn them on in Settings to get reminders.', [
                  { text: 'Not now', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]);
                return;
              }
              await enableReminders();
            }}
          />
        </View>
      </View>

      <Text style={s.groupTitle}>Subscription</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Text style={s.rowKey}>Keep Pro</Text>
          <Text style={s.rowVal}>{state.entitled ? 'Active' : 'Inactive'}</Text>
        </View>
        <LinkRow title="Manage or cancel subscription" url={MANAGE_SUBSCRIPTIONS_URL} />
      </View>

      <Text style={s.groupTitle}>Legal</Text>
      <View style={s.group}>
        <LinkRow title="Privacy Policy" url={PRIVACY_URL} first />
        <LinkRow title="Terms of Use" url={TERMS_URL} />
      </View>

      <Text style={s.groupTitle}>Data</Text>
      <View style={s.group}>
        <Pressable
          style={s.row}
          onPress={() =>
            Alert.alert('Start over?', 'This erases your plan and all logged data on this device. Your subscription stays active.', [
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
        guidance (1.2 to 1.6 g/kg). Always follow your prescriber's instructions for medication and diet.
      </Text>
    </Screen>
  );
}

const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PRIVACY_URL = 'https://keep-scan.shipfastvc.workers.dev/privacy';
const TERMS_URL = 'https://keep-scan.shipfastvc.workers.dev/terms';

function LinkRow({ title, url, first }: { title: string; url: string; first?: boolean }) {
  return (
    <Pressable
      style={[s.row, !first && { borderTopWidth: 0 }]}
      accessibilityRole="link"
      onPress={() => Linking.openURL(url).catch(() => Alert.alert("Couldn't open the link", url))}
    >
      <Text style={s.rowKey}>{title}</Text>
      <Ionicons name="open-outline" size={15} color={colors.text3} />
    </Pressable>
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
  rowKey: { color: colors.text, fontSize: 15, fontFamily: font.semibold },
  rowHint: { color: colors.text2, fontSize: 13, fontFamily: font.regular, marginTop: 3, lineHeight: 18 },
  rowVal: { color: colors.text2, fontSize: 13, fontFamily: font.regular },
  disc: { color: colors.text2, opacity: 0.7, fontSize: 11.5, fontFamily: font.regular, lineHeight: 19, marginTop: 22 },
});
