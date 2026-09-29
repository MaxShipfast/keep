import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../theme';
import {
  Screen,
  GButton,
  GhostButton,
  Eyebrow,
  H1,
  Lede,
  ProgressDots,
  OptionCard,
  Card,
  BackButton,
} from '../components/ui';
import { FadeSlideIn, useCountUp } from '../components/anim';
import { ProjectionChart } from '../components/ProjectionChart';
import { floorG, useStore } from '../store';
import { DAY_LABELS } from '../lib/dates';
import { weightAmount } from '../lib/units';
import { track } from '../lib/analytics';
import { syncEnabled } from '../lib/sync';
import type { RootStackParamList } from '../nav';

type P<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/* ---------- Welcome: benefits carousel ---------- */

const SLIDE_W = Dimensions.get('window').width - 48;

function StatRingSlide() {
  return (
    <View style={{ width: SLIDE_W, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={230} height={230} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="wg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.blueLight} />
              <Stop offset="1" stopColor={colors.blue} />
            </SvgGradient>
          </Defs>
          <Circle cx={115} cy={115} r={106} stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" />
          <Circle
            cx={115}
            cy={115}
            r={106}
            stroke="url(#wg)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="666"
            strokeDashoffset="400"
            fill="none"
            transform="rotate(-90 115 115)"
          />
        </Svg>
        <Text style={{ color: colors.text, fontSize: 44, fontFamily: font.heavy, letterSpacing: -1 }}>40%</Text>
        <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.semibold, textAlign: 'center', marginTop: 3 }}>
          of GLP-1 weight loss{'\n'}can be muscle
        </Text>
      </View>
      <Text style={s.slideTitle}>
        The scale says you're losing. <Text style={{ color: colors.blue }}>Losing what?</Text>
      </Text>
      <Text style={s.slideSub}>
        Keep helps you protect your muscle on Ozempic, Zepbound, or Mounjaro, so more of what you lose is fat.
      </Text>
    </View>
  );
}

function IconSlide({
  icon,
  tint,
  bg,
  title,
  accent,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  title: string;
  accent: string;
  sub: string;
}) {
  return (
    <View style={{ width: SLIDE_W, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[s.slideIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={72} color={tint} />
      </View>
      <Text style={s.slideTitle}>
        {title} <Text style={{ color: tint }}>{accent}</Text>
      </Text>
      <Text style={s.slideSub}>{sub}</Text>
    </View>
  );
}

export function WelcomeScreen({ navigation }: P<'Welcome'>) {
  const [page, setPage] = useState(0);
  const slides = [0, 1, 2];
  return (
    <Screen>
      <FadeSlideIn>
        <Text style={s.logo}>
          Keep<Text style={{ color: colors.blue }}>.</Text>
        </Text>
      </FadeSlideIn>
      <FadeSlideIn delay={120} style={{ flex: 1 }}>
        <FlatList
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => String(i)}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SLIDE_W))}
          renderItem={({ item }) =>
            item === 0 ? (
              <StatRingSlide />
            ) : item === 1 ? (
              <IconSlide
                icon="scan"
                tint={colors.blue}
                bg={colors.blueSoft}
                title="Point your camera."
                accent="Protein counted."
                sub="Scan any meal and hit your daily protein floor, a key habit for keeping muscle while you lose weight."
              />
            ) : (
              <IconSlide
                icon="flame"
                tint={colors.flame}
                bg={colors.flameSoft}
                title="Streaks that survive"
                accent="shot day."
                sub="Appetite dips after your injection, so your streak never breaks on shot day."
              />
            )
          }
        />
      </FadeSlideIn>
      <View style={{ flexDirection: 'row', gap: 7, alignSelf: 'center', marginBottom: 20 }}>
        {slides.map((i) => (
          <View
            key={i}
            style={{
              width: i === page ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === page ? colors.blue : colors.surface2,
            }}
          />
        ))}
      </View>
      <FadeSlideIn delay={240}>
        <GButton title="Get started" onPress={() => navigation.navigate('QuizMed')} />
        {/* No accounts exist while cloud backup is switched off, so there is nothing to sign in to. */}
        {syncEnabled ? (
          <GhostButton title="I already have an account" onPress={() => navigation.navigate('SignIn', { source: 'welcome' })} />
        ) : null}
      </FadeSlideIn>
    </Screen>
  );
}

/* ---------- Quiz steps ---------- */

const OTHER_MED = 'Something else';

const MEDS: Array<[string, string]> = [
  ['Zepbound', 'tirzepatide'],
  ['Ozempic', 'semaglutide'],
  ['Mounjaro', 'tirzepatide'],
  ['Wegovy', 'semaglutide'],
  [OTHER_MED, 'compounded, a pill, or another GLP-1'],
];

export function QuizMedScreen({ navigation }: P<'QuizMed'>) {
  const setProfile = useStore((st) => st.setProfile);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState('');
  const next = (med: string, tracked: string) => {
    setProfile({ med });
    // The typed name stays on the phone; analytics only learns that "other" was picked.
    track('quiz_step', { step: 1, med: tracked });
    navigation.navigate('QuizShot');
  };
  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={1} />
      <Eyebrow>Step 1 of 5</Eyebrow>
      <H1>Which medication are you on?</H1>
      {MEDS.map(([name, sub], i) => (
        <FadeSlideIn key={name} delay={i * 60}>
          <OptionCard
            title={name}
            sub={sub}
            selected={name === OTHER_MED && otherOpen}
            onPress={() => (name === OTHER_MED ? setOtherOpen(true) : next(name, name))}
          />
        </FadeSlideIn>
      ))}
      {otherOpen ? (
        <FadeSlideIn>
          <Text style={s.inputLabel}>What are you taking?</Text>
          <TextInput
            value={otherName}
            onChangeText={setOtherName}
            placeholder="e.g. compounded semaglutide"
            placeholderTextColor={colors.text3}
            autoFocus
            autoCapitalize="none"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={() => next(otherName.trim() || 'your GLP-1', 'other')}
            style={s.input}
          />
          <GButton title="Continue" onPress={() => next(otherName.trim() || 'your GLP-1', 'other')} style={{ marginTop: 12 }} />
        </FadeSlideIn>
      ) : null}
    </Screen>
  );
}

export function QuizShotScreen({ navigation }: P<'QuizShot'>) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  // Nothing is pre-selected: the stored default must not show as an answer the user never gave.
  const [picked, setPicked] = useState(false);
  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={2} />
      <Eyebrow>Step 2 of 5</Eyebrow>
      <H1>Which day do you take your shot?</H1>
      <Lede>Appetite dips hardest for about 48 hours after. Keep plans around it: your streak is safe on shot day, with tips for the low-appetite days.</Lede>
      <FadeSlideIn delay={100}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 26 }}>
          {DAY_LABELS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => {
                setProfile({ shotDay: i });
                setPicked(true);
              }}
              style={[
                s.chip,
                picked && profile.shotDay === i && { borderColor: colors.blue, backgroundColor: colors.blueSoft },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.semibold }}>{d}</Text>
            </Pressable>
          ))}
        </View>
      </FadeSlideIn>
      <View style={{ marginTop: 'auto' }}>
        <GButton
          title={picked ? 'Continue' : 'Pick your shot day'}
          disabled={!picked}
          onPress={() => {
            track('quiz_step', { step: 2 });
            navigation.navigate('QuizWeight');
          }}
        />
      </View>
    </Screen>
  );
}

export function QuizWeightScreen({ navigation }: P<'QuizWeight'>) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  const unit = profile.unit;
  const shown = weightAmount(profile.weightLb, unit);

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={3} />
      <Eyebrow>Step 3 of 5</Eyebrow>
      <H1>Your current weight</H1>
      <Lede>Your muscle-protection number comes from your body weight, not a calorie budget.</Lede>
      <View style={s.unitRow}>
        {(['lb', 'kg'] as const).map((u) => (
          <Pressable key={u} onPress={() => setProfile({ unit: u })} style={[s.unitBtn, unit === u && s.unitBtnSel]}>
            <Text style={{ color: unit === u ? '#fff' : colors.text2, fontFamily: font.bold, fontSize: 15 }}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.weightBig}>
        {shown}
        <Text style={{ fontSize: 19, color: colors.text2 }}> {unit}</Text>
      </Text>
      <Slider
        minimumValue={unit === 'lb' ? 90 : 40}
        maximumValue={unit === 'lb' ? 400 : 180}
        step={unit === 'lb' ? 5 : 1}
        value={shown}
        onValueChange={(v: number) => setProfile({ weightLb: unit === 'lb' ? v : Math.round(v / 0.4536) })}
        minimumTrackTintColor={colors.blue}
        maximumTrackTintColor={colors.surface2}
        thumbTintColor={colors.blue}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.scaleLabel}>{unit === 'lb' ? '90 lb' : '40 kg'}</Text>
        <Text style={s.scaleLabel}>{unit === 'lb' ? '400 lb' : '180 kg'}</Text>
      </View>
      <View style={{ marginTop: 'auto' }}>
        <GButton
          title="Continue"
          onPress={() => {
            track('quiz_step', { step: 3, weightLb: profile.weightLb, unit });
            navigation.navigate('QuizTrain');
          }}
        />
      </View>
    </Screen>
  );
}

const TRAINS: Array<[string, string]> = [
  ['Not currently', 'Even two short sessions a week make a real difference.'],
  ['1-2 times a week', 'Solid base. Your protein floor does the rest.'],
  ['3+ times a week', 'Great. Your muscle is already fighting back.'],
];

export function QuizTrainScreen({ navigation }: P<'QuizTrain'>) {
  const setProfile = useStore((st) => st.setProfile);
  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={4} />
      <Eyebrow>Step 4 of 5</Eyebrow>
      <H1>How often do you strength train?</H1>
      <Lede>Protein protects muscle. Resistance keeps it. Both feed your Muscle Guard score.</Lede>
      {TRAINS.map(([name, sub], i) => (
        <FadeSlideIn key={name} delay={i * 60}>
          <OptionCard
            title={name}
            sub={sub}
            onPress={() => {
              setProfile({ train: name });
              track('quiz_step', { step: 4 });
              navigation.navigate('QuizGoal');
            }}
          />
        </FadeSlideIn>
      ))}
    </Screen>
  );
}

const GOALS: Array<[string, string]> = [
  ['Avoid the "skinny-fat" look', 'lose fat, keep shape and strength'],
  ['Protect my metabolism', 'muscle is what burns calories at rest'],
  ['Keep the weight off after', 'lean mass is your insurance against regain'],
];

export function QuizGoalScreen({ navigation }: P<'QuizGoal'>) {
  const setProfile = useStore((st) => st.setProfile);
  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={5} />
      <Eyebrow>Step 5 of 5</Eyebrow>
      <H1>What matters most to you?</H1>
      {GOALS.map(([name, sub], i) => (
        <FadeSlideIn key={name} delay={i * 60}>
          <OptionCard
            title={name}
            sub={sub}
            onPress={() => {
              setProfile({ goal: name });
              track('quiz_step', { step: 5 });
              navigation.navigate('Computing');
            }}
          />
        </FadeSlideIn>
      ))}
    </Screen>
  );
}

/* ---------- Computing ---------- */

const COMPUTE_LINES = [
  'Analyzing your medication profile…',
  'Estimating lean-mass risk at your weight…',
  'Setting your daily protein floor…',
];

export function ComputingScreen({ navigation }: P<'Computing'>) {
  const [line, setLine] = useState(0);
  // One timer per step. Navigation happens here, never inside a state updater: React may run
  // updaters during render, and navigating from there triggers "Cannot update a component".
  useEffect(() => {
    const t = setTimeout(() => {
      if (line + 1 >= COMPUTE_LINES.length) navigation.replace(syncEnabled ? 'SavePlan' : 'Reveal');
      else setLine(line + 1);
    }, 850);
    return () => clearTimeout(t);
  }, [line, navigation]);

  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 22, fontFamily: font.heavy, textAlign: 'center' }}>
        Building your muscle-protection plan
      </Text>
      <Text style={{ color: colors.text2, fontSize: 15, fontFamily: font.regular, marginTop: 12 }}>
        {COMPUTE_LINES[line]}
      </Text>
    </Screen>
  );
}

/* ---------- Reveal ---------- */

export function RevealScreen({ navigation }: P<'Reveal'>) {
  const profile = useStore((st) => st.profile);
  const floor = floorG(profile.weightLb);
  const shownFloor = useCountUp(floor);
  return (
    <Screen scroll>
      <Eyebrow>Your plan</Eyebrow>
      <H1>Your muscle-protection number</H1>
      <FadeSlideIn delay={80}>
        <Card style={{ alignItems: 'center', paddingVertical: 30, marginTop: 28 }}>
          <Text style={{ color: colors.blue, fontSize: 76, fontFamily: font.heavy, letterSpacing: -2, lineHeight: 80 }}>
            {shownFloor}
            <Text style={{ fontSize: 26 }}>g</Text>
          </Text>
          <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.semibold, marginTop: 8 }}>
            Protein · every day
          </Text>
        </Card>
      </FadeSlideIn>
      <FadeSlideIn delay={260}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={s.factV}>{Math.round(floor / 3)}g</Text>
            <Text style={s.factK}>per meal over 3 meals, realistic on a smaller appetite</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={[s.factV, profile.med.length > 12 && { fontSize: 16, lineHeight: 20 }]} numberOfLines={2}>
              {profile.med}
            </Text>
            <Text style={s.factK}>your shot day is built into the plan</Text>
          </Card>
        </View>
      </FadeSlideIn>
      <FadeSlideIn delay={420}>
        <View style={s.warnNote}>
          <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.regular, lineHeight: 22 }}>
            <Text style={{ color: colors.amber, fontFamily: font.bold }}>Why it matters: </Text>
            clinical studies show up to 40% of weight lost on GLP-1s can be lean mass. Hitting your protein floor,
            alongside strength training, is one of the best-supported ways to hold on to muscle.
          </Text>
        </View>
        <GButton title="See my 12-week projection" onPress={() => navigation.navigate('Projection')} style={{ marginTop: 24 }} />
      </FadeSlideIn>
    </Screen>
  );
}

/* ---------- Projection ---------- */

export function ProjectionScreen({ navigation }: P<'Projection'>) {
  const profile = useStore((st) => st.profile);
  const entitled = useStore((st) => st.entitled);
  const setProfile = useStore((st) => st.setProfile);
  const unit = profile.unit;
  const onContinue = () => {
    // Someone who already subscribes (e.g. after "Reset app") skips the paywall.
    if (entitled) {
      setProfile({ onboarded: true });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      navigation.navigate('Paywall');
    }
  };
  const { lossDisp, riskDisp, safeDisp } = useMemo(() => {
    const lossLb = Math.round(profile.weightLb * 0.08);
    const riskLb = Math.max(4, Math.round(lossLb * 0.38));
    const safeLb = Math.max(1, Math.round(lossLb * 0.1));
    const conv = (lb: number) => Math.max(1, weightAmount(lb, unit));
    return { lossDisp: conv(lossLb), riskDisp: conv(riskLb), safeDisp: conv(safeLb) };
  }, [profile.weightLb, unit]);

  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} />
      <Eyebrow style={{ marginTop: 14 }}>Your next 12 weeks</Eyebrow>
      <H1>
        Same {lossDisp} {unit} loss. Very different bodies.
      </H1>
      <Lede>Most of what you lose should be fat. Your protein floor is how you tip the split your way.</Lede>
      <FadeSlideIn delay={100}>
        <View style={{ marginTop: 20 }}>
          <ProjectionChart loss={lossDisp} riskMuscle={riskDisp} safeMuscle={safeDisp} unit={unit} />
        </View>
      </FadeSlideIn>
      <FadeSlideIn delay={280}>
        <Text style={s.disclaimer}>
          Illustrative estimate based on average results reported in GLP-1 clinical trials, not a medical prediction.
          Your results will vary; talk to your prescriber about your goals.
        </Text>
        <GButton title={entitled ? 'Go to my plan' : 'Protect my 12 weeks'} onPress={onContinue} style={{ marginTop: 18 }} />
      </FadeSlideIn>
    </Screen>
  );
}

const s = StyleSheet.create({
  inputLabel: { color: colors.text, fontSize: 16, fontFamily: font.bold, marginTop: 18 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 17,
    fontFamily: font.regular,
    marginTop: 10,
  },
  logo: { color: colors.text, fontSize: 21, fontFamily: font.heavy, textAlign: 'center', marginTop: 12 },
  slideTitle: {
    color: colors.text,
    fontSize: 30,
    fontFamily: font.heavy,
    letterSpacing: -0.7,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 34,
    paddingHorizontal: 8,
  },
  slideSub: {
    color: colors.text2,
    fontSize: 16,
    fontFamily: font.regular,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  slideIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unitRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 4,
    width: 150,
    marginTop: 28,
  },
  unitBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  unitBtnSel: { backgroundColor: colors.blue },
  weightBig: {
    color: colors.text,
    fontSize: 64,
    fontFamily: font.heavy,
    letterSpacing: -2,
    textAlign: 'center',
    marginVertical: 22,
  },
  scaleLabel: { color: colors.text2, fontSize: 13, fontFamily: font.regular },
  factV: { color: colors.text, fontSize: 20, fontFamily: font.heavy, letterSpacing: -0.4 },
  factK: { color: colors.text2, fontSize: 13, fontFamily: font.regular, marginTop: 3, lineHeight: 18 },
  warnNote: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,180,84,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,84,0.25)',
  },
  disclaimer: {
    color: colors.text3,
    fontSize: 13,
    fontFamily: font.regular,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
});
