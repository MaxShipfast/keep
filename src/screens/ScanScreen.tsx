import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import { GButton, GhostButton } from '../components/ui';
import { useStore, floorG, todayProtein } from '../store';
import { scanMeal, scanIsMock, isNotFood, type ScanResult } from '../lib/scan';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export function ScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualG, setManualG] = useState('');

  const state = useStore();
  const logMeal = useStore((st) => st.logMeal);
  const floor = floorG(state.profile.weightLb);
  const current = todayProtein(state);

  const capture = async () => {
    if (busy || !camRef.current) return;
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('No image captured');
      const base64 = await prepareForUpload(photo.uri, photo.width, photo.height);
      const r = await scanMeal(base64);
      if (isNotFood(r)) {
        Alert.alert("Couldn't find food", 'Get closer so the plate fills the frame, or type the meal instead.');
        return;
      }
      setResult(r);
      track('scan_complete', { protein: r.proteinG, mock: scanIsMock });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Try again, or log the meal manually.');
    } finally {
      setBusy(false);
    }
  };

  const log = (name: string, proteinG: number, extra?: Partial<ScanResult>) => {
    logMeal({
      name,
      proteinG,
      calories: extra?.calories,
      carbsG: extra?.carbsG,
      source: manual ? 'manual' : 'scan',
    });
    track('meal_logged', { protein: proteinG, source: manual ? 'manual' : 'scan' });
    navigation.goBack();
  };

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <View style={[s.root, { padding: 24, justifyContent: 'center' }]}>
        <Text style={s.title}>Camera access</Text>
        <Text style={s.sub}>Keep uses the camera for one thing: pointing it at food to count protein.</Text>
        <GButton title="Allow camera" onPress={requestPermission} style={{ marginTop: 20 }} />
        <GhostButton title="Type the meal instead" onPress={() => setManual(true)} />
        {manual ? <ManualEntry {...{ manualName, setManualName, manualG, setManualG, log }} /> : null}
        <GhostButton title="Close" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const after = result ? current + result.proteinG : current;

  return (
    <View style={s.root}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
      <Pressable onPress={() => navigation.goBack()} style={s.close}>
        <Ionicons name="close" size={18} color={colors.text2} />
      </Pressable>

      {!result ? (
        <View style={s.bottomBar}>
          {scanIsMock ? <Text style={s.mockNote}>Demo mode — backend key not configured yet</Text> : null}
          {busy ? <Text style={s.mockNote}>Counting protein…</Text> : null}
          {manual ? (
            <ManualEntry {...{ manualName, setManualName, manualG, setManualG, log }} />
          ) : (
            <>
              <Pressable onPress={capture} style={s.shutter} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <View style={s.shutterInner} />}
              </Pressable>
              <GhostButton title="Type it instead" onPress={() => setManual(true)} />
            </>
          )}
        </View>
      ) : (
        <View style={s.sheet}>
          <View style={s.grab} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontFamily: font.heavy }}>{result.food}</Text>
              <Text style={{ color: colors.text2, fontSize: 12.5, fontFamily: font.regular, marginTop: 3 }}>
                Est. portion: {result.portion} · log what you actually finished
              </Text>
            </View>
            <View style={s.conf}>
              <Text style={{ color: colors.green, fontSize: 11, fontFamily: font.bold }}>
                {result.confidence === 'high' ? 'High confidence' : 'Best estimate'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Macro v={`${result.proteinG}g`} k="Protein" hi />
            <Macro v={`${result.calories}`} k="Calories" />
            <Macro v={`${result.carbsG}g`} k="Carbs" />
          </View>
          <View style={s.verdict}>
            <Text style={{ color: colors.text2, fontSize: 13.5, fontFamily: font.regular, lineHeight: 20 }}>
              <Text style={{ color: colors.text, fontFamily: font.bold }}>
                {after >= floor ? 'Floor hit. ' : 'Good pick. '}
              </Text>
              This takes you to {after}/{floor}g
              {after >= floor
                ? " — today's muscle is protected."
                : ' — one protein-dense snack later keeps the floor safe.'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <GhostButton title="Retake" onPress={() => setResult(null)} style={{ flex: 1 }} />
            <GButton
              title={`Log ${result.proteinG}g protein`}
              onPress={() => log(result.food, result.proteinG, result)}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Longest side of the photo sent to the backend. Plenty for a portion estimate, and keeps the
 * upload around 100–250 KB instead of the 1–3 MB a raw iPhone capture produces (which made every
 * scan a 20–60 s wait and pushed the request past the fetch timeout on slow connections).
 */
const MAX_UPLOAD_SIDE = 1024;

/** Downscales and re-encodes a capture, returning raw base64 JPEG (no data-URI prefix). */
async function prepareForUpload(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_UPLOAD_SIDE) {
    ctx.resize(width >= height ? { width: MAX_UPLOAD_SIDE, height: null } : { width: null, height: MAX_UPLOAD_SIDE });
  }
  const image = await ctx.renderAsync();
  try {
    const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    if (!out.base64) throw new Error('Could not encode the photo');
    return out.base64;
  } finally {
    image.release();
  }
}

function ManualEntry({
  manualName,
  setManualName,
  manualG,
  setManualG,
  log,
}: {
  manualName: string;
  setManualName: (v: string) => void;
  manualG: string;
  setManualG: (v: string) => void;
  log: (name: string, g: number) => void;
}) {
  return (
    <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
      <TextInput
        placeholder="What did you eat?"
        placeholderTextColor={colors.text3}
        value={manualName}
        onChangeText={setManualName}
        style={s.input}
      />
      <TextInput
        placeholder="Protein grams (e.g. 25)"
        placeholderTextColor={colors.text3}
        value={manualG}
        onChangeText={setManualG}
        keyboardType="number-pad"
        style={s.input}
      />
      <GButton
        title="Log it"
        onPress={() => {
          const g = parseInt(manualG, 10);
          if (!manualName || !g) return;
          log(manualName, g);
        }}
      />
    </View>
  );
}

function Macro({ v, k, hi }: { v: string; k: string; hi?: boolean }) {
  return (
    <View style={s.macro}>
      <Text style={{ color: hi ? colors.blue : colors.text, fontSize: 21, fontFamily: font.heavy }}>{v}</Text>
      <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.semibold, marginTop: 3 }}>{k}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070B' },
  title: { color: colors.text, fontSize: 24, fontFamily: font.heavy },
  sub: { color: colors.text2, fontSize: 14, fontFamily: font.regular, marginTop: 8, lineHeight: 21 },
  close: {
    position: 'absolute',
    top: 62,
    right: 20,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: { position: 'absolute', bottom: 40, left: 24, right: 24, alignItems: 'center', gap: 6 },
  mockNote: { color: colors.text2, fontSize: 11, fontFamily: font.regular, opacity: 0.8 },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
    padding: 22,
    paddingBottom: 34,
  },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginBottom: 18 },
  conf: {
    borderWidth: 1,
    borderColor: 'rgba(61,220,151,0.35)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },
  macro: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center' },
  verdict: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: 'rgba(61,123,255,0.3)',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    fontFamily: font.regular,
  },
});
