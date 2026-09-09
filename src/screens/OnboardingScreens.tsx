import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
        <Text style={{ color: colors.text2, fontSize: 12.5, fontFamily: font.semibold, textAlign: 'center', marginTop: 3 }}>
          of GLP-1 weight loss{'\n'}can be muscle
        </Text>
      </View>
      <Text style={s.slideTitle}>
        The scale says you're losing. <Text style={{ color: colors.blue }}>Losing what?</Text>
      </Text>
      <Text style={s.slideSub}>
        Keep makes sure the weight you lose on Ozempic, Zepbound, or Mounjaro is fat — not muscle.
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
                sub="Scan any meal and hit your daily protein floor — the #1 lever that protects muscle."
              />
            ) : (
              <IconSlide
                icon="flame"
                tint={colors.flame}
                bg={colors.flameSoft}
                title="Streaks that survive"
                accent="shot day."
                sub="Appetite dips after your injection. Your streak doesn't break for it — protection shouldn't punish you."
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
        <GhostButton title="I already have an account" onPress={() => navigation.navigate('SignIn')} />
      </FadeSlideIn>
    </Screen>
  );
}

/* ---------- Quiz steps ---------- */

const MEDS: Array<[string, string]> = [
  ['Zepbound', 'tirzepatide'],
  ['Ozempic', 'semaglutide'],
  ['Mounjaro', 'tirzepatide'],
  ['Wegovy', 'semaglutide'],
  ['Compounded / other', 'semaglutide, tirzepatide or other'],
];

export function QuizMedScreen({ navigation }: P<'QuizMed'>) {
  const setProfile = useStore((st) => st.setProfile);
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
            onPress={() => {
              setProfile({ med: name === 'Compounded / other' ? 'your GLP-1' : name });
              track('quiz_step', { step: 1, med: name });
              navigation.navigate('QuizShot');
            }}
          />
        </FadeSlideIn>
      ))}
    </Screen>
  );
}

export function QuizShotScreen({ navigation }: P<'QuizShot'>) {
  const profile = useStore((st) => st.profile);
  const setProfile = useStore((st) => st.setProfile);
  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <ProgressDots step={2} />
      <Eyebrow>Step 2 of 5</Eyebrow>
      <H1>Which day do you take your shot?</H1>
      <Lede>Appetite dips hardest for ~48 hours after. Keep adjusts your targets on those days.</Lede>
      <FadeSlideIn delay={100}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 26 }}>
          {DAY_LABELS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setProfile({ shotDay: i })}
              style={[s.chip, profile.shotDay === i && { borderColor: colors.blue, backgroundColor: colors.blueSoft }]}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.semibold }}>{d}</Text>
            </Pressable>
          ))}
        </View>
      </FadeSlideIn>
      <View style={{ marginTop: 'auto' }}>
        <GButton
          title="Continue"
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
      <Lede>Your muscle-protection number is calculated from body weight — not a calorie budget.</Lede>
      <View style={s.unitRow}>
        {(['lb', 'kg'] as const).map((u) => (
          <Pressable key={u} onPress={() => setProfile({ unit: u })} style={[s.unitBtn, unit === u && s.unitBtnSel]}>
            <Text style={{ color: unit === u ? '#fff' : colors.text2, fontFamily: font.bold, fontSize: 14 }}>{u}</Text>
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
  ['Not currently', "we'll start you with two 20-min sessions"],
  ['1–2× a week', 'solid base — protein floor does the rest'],
  ['3+× a week', 'great — your muscle is already fighting back'],
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
  useEffect(() => {
    const iv = setInterval(() => {
      setLine((l) => {
        if (l + 1 >= COMPUTE_LINES.length) {
          clearInterval(iv);
          navigation.replace('Reveal');
          return l;
        }
        return l + 1;
      });
    }, 850);
    return () => clearInterval(iv);
  }, [navigation]);

  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 22, fontFamily: font.heavy, textAlign: 'center' }}>
        Building your muscle-protection plan
      </Text>
      <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.regular, marginTop: 12 }}>
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
          <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.semibold, marginTop: 8 }}>
            Protein · every day
          </Text>
        </Card>
      </FadeSlideIn>
      <FadeSlideIn delay={260}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={s.factV}>{Math.round(floor / 3)}g</Text>
            <Text style={s.factK}>per meal, 3 meals — realistic on a suppressed appetite</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14 }}>
            <Text style={s.factV}>{profile.med}</Text>
            <Text style={s.factK}>targets tuned to your medication & shot day</Text>
          </Card>
        </View>
      </FadeSlideIn>
      <FadeSlideIn delay={420}>
        <View style={s.warnNote}>
          <Text style={{ color: colors.text2, fontSize: 13, fontFamily: font.regular, lineHeight: 20 }}>
            <Text style={{ color: colors.amber, fontFamily: font.bold }}>Why it matters: </Text>
            clinical studies show up to 40% of weight lost on GLP-1s can be lean mass. Hitting your protein floor is the
            #1 lever to keep it fat-only.
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
  const unit = profile.unit;
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
      <FadeSlideIn delay={100}>
        <View style={{ marginTop: 24 }}>
          <ProjectionChart riskLabel={`−${riskDisp} ${unit} muscle`} safeLabel={`−${safeDisp} ${unit} muscle`} />
        </View>
      </FadeSlideIn>
      <FadeSlideIn delay={280}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Card style={s.statChip}>
            <Text style={s.statV}>
              −{lossDisp} {unit}
            </Text>
            <Text style={s.statK}>est. 12-week loss on your medication</Text>
          </Card>
          <Card style={s.statChip}>
            <Text style={[s.statV, { color: colors.amber }]}>
              {riskDisp} {unit}
            </Text>
            <Text style={s.statK}>muscle at risk without protection</Text>
          </Card>
          <Card style={s.statChip}>
            <Text style={[s.statV, { color: colors.blue }]}>
              &lt;{safeDisp} {unit}
            </Text>
            <Text style={s.statK}>at your protein floor</Text>
          </Card>
        </View>
        <GButton title="Protect my 12 weeks" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 24 }} />
      </FadeSlideIn>
    </Screen>
  );
}

const s = StyleSheet.create({
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
    fontSize: 15,
    fontFamily: font.regular,
    lineHeight: 23,
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
  scaleLabel: { color: colors.text2, fontSize: 11.5, fontFamily: font.regular },
  factV: { color: colors.text, fontSize: 20, fontFamily: font.heavy, letterSpacing: -0.4 },
  factK: { color: colors.text2, fontSize: 11, fontFamily: font.regular, marginTop: 3, lineHeight: 15 },
  warnNote: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,180,84,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,84,0.25)',
  },
  statChip: { flex: 1, padding: 12, alignItems: 'center' },
  statV: { color: colors.text, fontSize: 20, fontFamily: font.heavy, letterSpacing: -0.4 },
  statK: { color: colors.text2, fontSize: 10.5, fontFamily: font.regular, marginTop: 3, textAlign: 'center', lineHeight: 14 },
});
