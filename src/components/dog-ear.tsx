import * as Haptics from 'expo-haptics';
import { Platform, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { TOUCH, useNotebook } from '@/notebook';

const SIZE = 34;

/** The page corner. Folding it bookmarks the page. */
export function DogEar({ folded, onToggle }: { folded: boolean; onToggle: () => void }) {
  const { m } = useNotebook();
  const fold = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(folded ? 1 : 0.32, { damping: 16, stiffness: 240 }) }] }), [folded]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: folded }}
      accessibilityLabel="Bookmark this page"
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onToggle();
      }}
      style={{ position: 'absolute', top: -22, right: -22, width: TOUCH + 12, height: TOUCH + 12, alignItems: 'flex-end', zIndex: 3 }}
    >
      <Animated.View style={[{ width: SIZE, height: SIZE, transformOrigin: 'top right' }, fold]}>
        <Svg width={SIZE} height={SIZE}>
          {/* Desk showing through where the corner lifted. */}
          <Path d={`M0 0 L${SIZE} 0 L${SIZE} ${SIZE} Z`} fill={m.desk} />
          <Path d={`M0 0 L${SIZE} ${SIZE} L2 ${SIZE - 1} Z`} fill={m.shadow} fillOpacity={0.12 * m.shadowStrength} transform="translate(1.5 1.5)" />
          <Path d={`M0 0 L${SIZE} ${SIZE} L0 ${SIZE} Z`} fill={m.pageEdge} />
          <Path d={`M0 0 L${SIZE} ${SIZE}`} stroke={m.paperShade} strokeOpacity={0.25} strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

export function Ribbon({ color, height = 110 }: { color: string; height?: number }) {
  const w = 14;
  return (
    <Svg pointerEvents="none" width={w} height={height} style={{ position: 'absolute', top: -22, right: 60 }}>
      <Path d={`M0 0 H${w} V${height} L${w / 2} ${height - 8} L0 ${height} Z`} fill={color} fillOpacity={0.88} />
      <Path d={`M3 0 V${height - 4}`} stroke="#fff" strokeOpacity={0.12} strokeWidth={1} />
    </Svg>
  );
}
