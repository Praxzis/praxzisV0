import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icon, type IconName } from './controls';
import { Ink } from './marks';
import { fonts } from './materials';
import { PAGE_MAX } from './page';
import { rng } from './seed';
import { underline } from './strokes';
import { useNotebook } from './theme';
import { Print } from './type';

const ICONS: Record<string, IconName> = { index: 'today', library: 'library', mind: 'mind', council: 'council', ideas: 'ideas' };

function tabPath(w: number, h: number, seed: string): string {
  const r = rng(`tab:${seed}`);
  const s = 7 + r.range(-1, 1);
  const rad = 6;
  return `M0 ${h} L${s} ${rad + 1} Q${s + 1} 1 ${s + rad} ${r.range(0, 0.8)} L${w - s - rad} ${r.range(0, 0.8)} Q${w - s - 1} 1 ${w - s} ${rad + 1} L${w} ${h} Z`;
}

function Tab({ label, icon, active, onPress, seed, index }: { label: string; icon: IconName; active: boolean; onPress: () => void; seed: string; index: number }) {
  const { m } = useNotebook();
  const [w, setW] = useState(0);
  const h = 62;
  const lifted = useAnimatedStyle(() => ({ transform: [{ translateY: withSpring(active ? 0 : 7, { damping: 18, stiffness: 220 }) }] }), [active]);
  const tone = active ? m.paper.ivory : index % 2 ? m.paper.cream : m.paper.kraft;
  const fg = active ? m.navy : m.graphite;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flex: 1, height: h, marginHorizontal: -3, zIndex: active ? 2 : 1 }}
    >
      <Animated.View style={[{ flex: 1, alignItems: 'center', paddingTop: 9 }, lifted]}>
        {w > 0 && (
          <Svg width={w} height={h + 8} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Path d={tabPath(w, h + 8, seed)} fill={m.shadow} fillOpacity={0.09 * m.shadowStrength} transform="translate(0.5 -1)" />
            <Path d={tabPath(w, h + 8, seed)} fill={tone} />
          </Svg>
        )}
        <Icon name={icon} size={22} color={fg} strokeWidth={active ? 1.8 : 1.5} />
        <Print variant="meta" style={{ color: fg, marginTop: 3, fontFamily: active ? fonts.uiStrong : fonts.uiMedium, fontSize: 11.5 }}>
          {label}
        </Print>
        {active && w > 0 && <Ink key={seed} strokes={underline(30, 6, seed)} w={30} h={6} color={m.turquoise} width={1.6} style={{ marginTop: 1 }} />}
      </Animated.View>
    </Pressable>
  );
}

/** Paper index tabs along the bottom edge of the notebook. */
export function PaperTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { m } = useNotebook();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ backgroundColor: m.desk, paddingBottom: Math.max(insets.bottom - 14, 0) }}>
      <View style={{ flexDirection: 'row', width: '100%', maxWidth: PAGE_MAX + 30, alignSelf: 'center', paddingHorizontal: 12, overflow: 'hidden' }}>
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const active = state.index === i;
          return (
            <Tab
              key={route.key}
              index={i}
              seed={route.name}
              label={label}
              icon={ICONS[route.name] ?? 'today'}
              active={active}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
