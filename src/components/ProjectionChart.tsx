import React from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, LinearGradient, Rect, Stop, Text as SvgText, G } from 'react-native-svg';
import { colors, font } from '../theme';
import { Card } from './ui';

/** Share of the "aim" bar drawn as lean mass: a visual cue only, never labelled as a number. */
const AIM_LEAN_FRAC = 0.16;

/**
 * "What your weight loss could be made of": the typical split reported in the STEP 1 trial next to
 * the user's aim. The aim column carries no number on purpose (no study predicts Keep's effect).
 */
export function ProjectionChart({ loss, lean, unit }: { loss: number; lean: number; unit: string }) {
  const W = 320;
  const H = 276;
  const base = 214;
  const colH = 164;
  const colW = 124;
  const cols = [
    { x: 22, leanH: Math.max(22, (lean / loss) * colH), label: ['Typical on', 'a GLP-1'] },
    { x: 174, leanH: colH * AIM_LEAN_FRAC, label: ['Your aim', 'with Keep'] },
  ];

  return (
    <Card style={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontFamily: font.bold, paddingHorizontal: 6 }}>
        What your {loss} {unit} could be made of
      </Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7FA6FF" />
            <Stop offset="1" stopColor="#3D6EF7" />
          </LinearGradient>
          <LinearGradient id="lean" x1="0" y1="0" x2="0" y2="1">
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
          const fatH = colH - c.leanH;
          const cx = c.x + colW / 2;
          return (
            <G key={i}>
              <SvgText x={cx} y={base - colH - 12} fill={colors.text} fontSize={18} fontFamily={font.heavy} textAnchor="middle">
                {`−${loss} ${unit}`}
              </SvgText>
              <G clipPath={`url(#col${i})`}>
                <Rect x={c.x} y={base - colH} width={colW} height={fatH} fill="url(#fat)" />
                <Rect x={c.x} y={base - c.leanH} width={colW} height={c.leanH} fill="url(#lean)" />
                <Rect x={c.x} y={base - c.leanH} width={colW} height={1.5} fill="rgba(10,14,21,0.35)" />
              </G>
              <SvgText x={cx} y={base - c.leanH - fatH / 2 + 5} fill="#FFFFFF" fontSize={14.5} fontFamily={font.bold} textAnchor="middle">
                {i === 0 ? `${loss - lean} ${unit} fat` : 'More of it fat'}
              </SvgText>
              <SvgText x={cx} y={base - c.leanH / 2 + 5} fill="#3A2408" fontSize={i === 0 ? 14 : 12} fontFamily={font.bold} textAnchor="middle">
                {i === 0 ? `${lean} ${unit} lean mass` : 'Less lean mass'}
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
        <Legend color="#5C8CFF" label="Fat" />
        <Legend color="#F5A93F" label="Lean mass, incl. muscle" />
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

/** Compact horizontal version for the paywall. */
export function CompositionBars({ loss, lean, unit }: { loss: number; lean: number; unit: string }) {
  const rows = [
    { label: 'Typical on a GLP-1', leanFrac: lean / loss, fatText: `${loss - lean} ${unit} fat`, leanText: `${lean} ${unit}` },
    { label: 'Your aim with Keep', leanFrac: AIM_LEAN_FRAC, fatText: 'Keep more of it fat', leanText: '' },
  ];
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.semibold }}>{r.label}</Text>
            <Text style={{ color: colors.text2, fontSize: 14, fontFamily: font.regular }}>
              −{loss} {unit} total
            </Text>
          </View>
          <View style={{ flexDirection: 'row', height: 34, borderRadius: 10, overflow: 'hidden' }}>
            <View style={{ flex: 1 - r.leanFrac, backgroundColor: '#4F7FFF', justifyContent: 'center', paddingLeft: 10 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: font.bold }} numberOfLines={1}>
                {r.fatText}
              </Text>
            </View>
            <View style={{ flex: r.leanFrac, backgroundColor: '#F5A93F', justifyContent: 'center', alignItems: 'center' }}>
              {r.leanText ? (
                <Text style={{ color: '#3A2408', fontSize: 13, fontFamily: font.bold }} numberOfLines={1}>
                  {r.leanText}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <Legend color="#5C8CFF" label="Fat" />
        <Legend color="#F5A93F" label="Lean mass, incl. muscle" />
      </View>
    </View>
  );
}
