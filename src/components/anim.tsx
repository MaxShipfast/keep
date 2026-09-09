import React, { useEffect, useRef, useState } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

/** Fades + slides children in on mount. Stagger entrances with `delay`. */
export function FadeSlideIn({
  children,
  delay = 0,
  from = 22,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, delay, friction: 9, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [opacity, translate, delay]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>{children}</Animated.View>
  );
}

/** Counts a displayed number up from 0 on mount. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const anim = new Animated.Value(0);
    const sub = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(sub);
  }, [target, duration]);
  return value;
}
