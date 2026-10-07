import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Logo, useNotebook } from '@/notebook';

/** A closed cloth-bound volume sitting on the desk. */
export function ClosedCover({ width = 220, opening = 0 }: { width?: number; opening?: number }) {
  const { m } = useNotebook();
  const h = width * 1.32;
  const cloth = m.scheme === 'day' ? '#2A3358' : '#1A2033';
  const open = useSharedValue(opening);
  useEffect(() => {
    open.value = withTiming(opening, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [open, opening]);
  const style = useAnimatedStyle(() => ({
    transformOrigin: 'left',
    transform: [{ perspective: 1200 }, { rotateY: `${open.value * -52}deg` }],
  }));

  return (
    <Animated.View accessible accessibilityLabel="Praxzis notebook" style={[{ width, height: h }, style]}>
      <Svg width={width} height={h} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="cloth" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity={0.28} />
            <Stop offset="0.08" stopColor="#fff" stopOpacity={0.08} />
            <Stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        <Rect x={10} y={8} width={width - 10} height={h - 10} rx={3} fill={m.shadow} fillOpacity={0.18} />
        <Rect x={6} y={0} width={width - 6} height={h - 4} rx={3} fill={cloth} />
        <Rect x={6} y={0} width={width - 6} height={h - 4} rx={3} fill="url(#cloth)" />
        <Rect x={0} y={0} width={10} height={h - 4} fill="#1A2238" />
        <Rect x={2} y={0} width={2} height={h - 4} fill="#C9B27A" fillOpacity={0.85} />
        <Rect x={24} y={h * 0.72} width={width - 44} height={1.2} fill="#C9B27A" fillOpacity={0.55} />
      </Svg>
      <View style={{ position: 'absolute', left: 18, right: 8, top: h * 0.22, alignItems: 'center' }}>
        <Logo width={Math.min(150, width * 0.68)} ink="#F4EBDA" accent={m.turquoise} />
      </View>
    </Animated.View>
  );
}
