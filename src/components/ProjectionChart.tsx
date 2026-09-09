import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, font } from '../theme';
import { Card } from './ui';

export function ProjectionChart({ riskLabel, safeLabel }: { riskLabel: string; safeLabel: string }) {
  const W = 330;
  const H = 175;
  const x0 = 34;
  const x1 = 310;
  const yTop = 32;
  const yBottom = 128;
  const yWith = yTop + (yBottom - yTop) / 3;
  const mx = (x0 + x1) / 2;
  const path = (yEnd: number) => `M${x0} ${yTop} Q${mx} ${yTop + (yEnd - yTop) * 0.35} ${x1} ${yEnd}`;

  return (
    <Card style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={x0} y1={18} x2={x0} y2={140} stroke="rgba(255,255,255,0.08)" />
        <Line x1={x0} y1={140} x2={318} y2={140} stroke="rgba(255,255,255,0.08)" />
        <Line x1={x0} y1={79} x2={318} y2={79} stroke="rgba(255,255,255,0.045)" />
        <SvgText x={38} y={153} fill={colors.text3} fontSize={9.5}>Now</SvgText>
        <SvgText x={176} y={153} fill={colors.text3} fontSize={9.5} textAnchor="middle">Week 6</SvgText>
        <SvgText x={316} y={153} fill={colors.text3} fontSize={9.5} textAnchor="end">Week 12</SvgText>
        <SvgText x={40} y={26} fill={colors.text3} fontSize={9.5}>Muscle kept</SvgText>
        <Path d={path(yBottom)} stroke={colors.amber} strokeWidth={2.5} strokeDasharray="6 6" fill="none" strokeLinecap="round" />
        <Path d={path(yWith)} stroke={colors.blue} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Circle cx={x1} cy={yWith} r={4.5} fill={colors.blue} />
        <Circle cx={x1} cy={yBottom} r={4} fill={colors.amber} />
        <SvgText x={x1 - 10} y={yWith - 9} fill={colors.blue} fontSize={10.5} fontWeight="bold" textAnchor="end">
          {safeLabel}
        </SvgText>
        <SvgText x={x1 - 10} y={yBottom - 9} fill={colors.amber} fontSize={10.5} fontWeight="bold" textAnchor="end">
          {riskLabel}
        </SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: colors.blue }} />
          <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.regular }}>Hitting your protein floor</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, borderTopWidth: 2.5, borderStyle: 'dashed', borderColor: colors.amber }} />
          <Text style={{ color: colors.text2, fontSize: 11.5, fontFamily: font.regular }}>Without protection</Text>
        </View>
      </View>
    </Card>
  );
}
