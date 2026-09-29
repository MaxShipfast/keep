import React from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, LinearGradient, Rect, Stop, Text as SvgText, G } from 'react-native-svg';
import { colors, font } from '../theme';
import { Card } from './ui';

/**
 * "What the same weight loss is made of": two equal-height columns split into fat (blue, the good
 * kind of loss) and muscle (amber). Equal heights carry the message that the scale shows the same
 * number either way.
 */
export function ProjectionChart({
  loss,
  riskMuscle,
  safeMuscle,
  unit,
}: {
  loss: number;
  riskMuscle: number;
  safeMuscle: number;
  unit: string;
}) {
  const W = 320;
  const H = 276;
  const base = 214;
  const colH = 164;
  const colW = 124;
  const cols = [
    { x: 22, muscle: riskMuscle, label: ['Without a', 'protein plan'], muscleText: `${riskMuscle} ${unit} muscle` },
    { x: 174, muscle: safeMuscle, label: ['At your', 'protein floor'], muscleText: `<${safeMuscle} ${unit} muscle` },
  ];

  return (
    <Card style={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontFamily: font.bold, paddingHorizontal: 6 }}>
        What your {loss} {unit} is made of
      </Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7FA6FF" />
            <Stop offset="1" stopColor="#3D6EF7" />
          </LinearGradient>
          <LinearGradient id="muscle" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFC56E" />
            <Stop offset="1" stopColor="#F29A2E" />
          </LinearGradient>
          {cols.map((c, i) => (
            <ClipPath key={i} id={`col${i}`}>
              <Rect x={c.x} y={base - colH} width={colW} height={colH} rx={16} />
            </ClipPath>
          ))}
        </Defs>
        {cols.map((c, i) => {
          const muscleH = Math.max(22, (c.muscle / loss) * colH);
          const fatH = colH - muscleH;
          const fat = loss - c.muscle;
          const cx = c.x + colW / 2;
          return (
            <G key={i}>
              <SvgText x={cx} y={base - colH - 12} fill={colors.text} fontSize={18} fontFamily={font.heavy} textAnchor="middle">
                {`−${loss} ${unit}`}
              </SvgText>
              <G clipPath={`url(#col${i})`}>
                <Rect x={c.x} y={base - colH} width={colW} height={fatH} fill="url(#fat)" />
                <Rect x={c.x} y={base - muscleH} width={colW} height={muscleH} fill="url(#muscle)" />
                <Rect x={c.x} y={base - muscleH} width={colW} height={1.5} fill="rgba(10,14,21,0.35)" />
              </G>
              <SvgText x={cx} y={base - muscleH - fatH / 2 + 5} fill="#FFFFFF" fontSize={14.5} fontFamily={font.bold} textAnchor="middle">
                {`${i === 1 ? '~' : ''}${fat} ${unit} fat`}
              </SvgText>
              <SvgText x={cx} y={base - muscleH / 2 + 5} fill="#3A2408" fontSize={i === 0 ? 14.5 : 12} fontFamily={font.bold} textAnchor="middle">
                {c.muscleText}
              </SvgText>
              {c.label.map((line, li) => (
                <SvgText key={li} x={cx} y={base + 22 + li * 17} fill={colors.text2} fontSize={13} fontFamily={font.semibold} textAnchor="middle">
                  {line}
                </SvgText>
              ))}
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', gap: 18, paddingHorizontal: 6 }}>
        <Legend color="#5C8CFF" label="Fat lost" />
        <Legend color="#F5A93F" label="Muscle lost" />
      </View>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.regular }}>{label}</Text>
    </View>
  );
}

/** Compact horizontal version for the paywall: one bar per scenario, split into fat and muscle. */
export function CompositionBars({
  loss,
  riskMuscle,
  safeMuscle,
  unit,
}: {
  loss: number;
  riskMuscle: number;
  safeMuscle: number;
  unit: string;
}) {
  const rows = [
    { label: 'Without a protein plan', muscle: riskMuscle, muscleText: `${riskMuscle} ${unit}` },
    { label: 'With Keep', muscle: safeMuscle, muscleText: `<${safeMuscle}` },
  ];
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r) => {
        const muscleFrac = Math.max(0.1, r.muscle / loss);
        return (
          <View key={r.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.semibold }}>{r.label}</Text>
              <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.regular }}>
                −{loss} {unit} total
              </Text>
            </View>
            <View style={{ flexDirection: 'row', height: 34, borderRadius: 10, overflow: 'hidden' }}>
              <View style={{ flex: 1 - muscleFrac, backgroundColor: '#4F7FFF', justifyContent: 'center', paddingLeft: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: font.bold }} numberOfLines={1}>
                  {loss - r.muscle} {unit} fat
                </Text>
              </View>
              <View style={{ flex: muscleFrac, backgroundColor: '#F5A93F', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#3A2408', fontSize: 13, fontFamily: font.bold }} numberOfLines={1}>
                  {r.muscleText}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <Legend color="#5C8CFF" label="Fat lost" />
        <Legend color="#F5A93F" label="Muscle lost" />
      </View>
    </View>
  );
}
