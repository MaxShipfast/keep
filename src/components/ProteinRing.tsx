import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProteinRing({
  current,
  floor,
  size = 225,
}: {
  current: number;
  floor: number;
  size?: number;
}) {
  const stroke = 15;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const frac = Math.min(1, floor > 0 ? current / floor : 0);
  const done = frac >= 1;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: frac, duration: 800, useNativeDriver: false }).start();
  }, [frac, anim]);

  const dashOffset = anim.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });
  const left = Math.max(0, floor - current);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', marginVertical: 16 }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.blueLight} />
            <Stop offset="1" stopColor={colors.blue} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={done ? colors.green : 'url(#rg)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${C}`}
          strokeDashoffset={dashOffset as unknown as number}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 46, fontFamily: font.heavy, letterSpacing: -1.5 }}>
          {current}
          <Text style={{ fontSize: 19, color: colors.text2, fontFamily: font.bold }}>/{floor}g</Text>
        </Text>
        <Text style={{ color: colors.text2, fontSize: 12.5, fontFamily: font.semibold, marginTop: 6 }}>
          Protein floor
        </Text>
        <Text
          style={{
            color: done ? colors.green : colors.blue,
            fontSize: 12.5,
            fontFamily: font.bold,
            marginTop: 4,
          }}
        >
          {done ? 'Floor hit — protected' : `${left}g to go`}
        </Text>
      </View>
    </View>
  );
}
