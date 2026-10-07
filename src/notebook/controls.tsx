import * as Haptics from 'expo-haptics';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, TextInput, View, type LayoutChangeEvent, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { fonts, TOUCH } from './materials';
import { roughRect } from './strokes';
import { useNotebook } from './theme';
import { Print } from './type';

function tap(enabled = true) {
  if (enabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/* ----------------------------------------------------------------- Icons */

export type IconName = 'today' | 'library' | 'mind' | 'council' | 'ideas' | 'settings' | 'back' | 'search' | 'send' | 'plus' | 'bookmark' | 'camera';

export function Icon({ name, size = 24, color, strokeWidth = 1.6 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const { m } = useNotebook();
  const c = color ?? m.ink;
  const p = { stroke: c, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, ReactNode> = {
    today: (
      <>
        <Path d="M5 3.5h11.5l2.5 2.5v14.5H5z" {...p} />
        <Path d="M8 9.5h8M8 13h8M8 16.5h5" {...p} />
      </>
    ),
    library: (
      <>
        <Path d="M4 20.5h16" {...p} />
        <Path d="M5.5 20V6h3v14M9.5 20V4h3v16" {...p} />
        <Path d="M14.2 19.6l-.4-13.5 3-.6 2.2 13.4z" {...p} />
      </>
    ),
    mind: (
      <>
        <Circle cx={6} cy={7} r={2.4} {...p} />
        <Circle cx={17.5} cy={6} r={2} {...p} />
        <Circle cx={12} cy={17} r={2.8} {...p} />
        <Path d="M8.2 8.2l2.4 6.4M15.9 7.6l-2.6 7M8.4 6.8l7.1-.6" {...p} />
      </>
    ),
    council: (
      <>
        <Path d="M3.5 7.5l8-2.5 2.7 12.5-8 2.3z" {...p} />
        <Path d="M12.5 5.2l7.5 1.6-2.4 12.7-3.6-.8" {...p} />
        <Path d="M7 10.5l3.5-1M7.8 13.8l3.5-1" {...p} />
      </>
    ),
    ideas: (
      <>
        <Path d="M5 4.5h14v11l-4 4H5z" {...p} />
        <Path d="M15 19.5v-4h4" {...p} />
        <Path d="M8.5 9h7M8.5 12.5h4.5" {...p} />
      </>
    ),
    settings: (
      <>
        <Circle cx={12} cy={12} r={3} {...p} />
        <Path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" {...p} />
      </>
    ),
    back: <Path d="M14.5 5.5L8 12l6.5 6.5" {...p} />,
    search: (
      <>
        <Circle cx={10.5} cy={10.5} r={6} {...p} />
        <Path d="M15 15l5 5" {...p} />
      </>
    ),
    send: <Path d="M4 12h14M13 6.5l5.5 5.5-5.5 5.5" {...p} />,
    plus: <Path d="M12 5v14M5 12h14" {...p} />,
    bookmark: <Path d="M7 3.5h10v17l-5-4-5 4z" {...p} />,
    camera: (
      <>
        <Path d="M3.6 8.2h3.6l1.5-2.5h6.6l1.5 2.5H20.4v10.6H3.6z" {...p} />
        <Circle cx={12} cy={13.3} r={3.5} {...p} />
        <Circle cx={12} cy={13.3} r={1.3} {...p} />
        <Path d="M17.8 8.2V6.6h-2.1" {...p} />
      </>
    ),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </Svg>
  );
}

/* --------------------------------------------------------------- Buttons */

type ButtonKind = 'primary' | 'secondary' | 'quiet';

/**
 * Buttons stay unmistakably buttons. Primary is an ink stamp, secondary an
 * inked outline, quiet a printed link with a drawn underline.
 */
export function InkButton({
  label,
  onPress,
  kind = 'primary',
  icon,
  seed,
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  seed?: string;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { m, haptics } = useNotebook();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
  };
  const outline = useMemo(() => (size ? roughRect(size.w, size.h, seed ?? label, 0.7, 18) : ''), [label, seed, size]);
  const fg = kind === 'primary' ? m.onNavy : m.navy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap(haptics);
        onPress?.();
      }}
      hitSlop={kind === 'quiet' ? 10 : 4}
      onLayout={onLayout}
      style={({ pressed }) => [
        {
          minHeight: kind === 'quiet' ? 32 : TOUCH + 4,
          paddingHorizontal: kind === 'quiet' ? 2 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ translateY: pressed ? 1 : 0 }],
        },
        style,
      ]}
    >
      {size && kind !== 'quiet' && (
        <Svg width={size.w} height={size.h} style={{ position: 'absolute', left: 0, top: 0 }}>
          {kind === 'primary' ? (
            <Path d={outline} fill={m.navy} />
          ) : (
            <Path d={outline} fill="none" stroke={m.navy} strokeWidth={1.4} strokeOpacity={0.85} />
          )}
        </Svg>
      )}
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Print variant="uiStrong" style={{ color: fg, textDecorationLine: kind === 'quiet' ? 'underline' : 'none', textDecorationColor: m.turquoise }}>
        {label}
      </Print>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { m, haptics } = useNotebook();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        tap(haptics);
        onPress?.();
      }}
      style={({ pressed }) => [
        { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: TOUCH / 2, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Icon name={icon} color={color ?? m.navy} />
    </Pressable>
  );
}

/** Back to the previous page — printed, predictable, always top-left. */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { m } = useNotebook();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, paddingRight: 12, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="back" size={20} color={m.navy} />
      <Print variant="uiStrong" tone="navy">{label}</Print>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- Field */

/**
 * Writing on a ruled line. What the person types is set in their hand;
 * the placeholder is printed so it reads as a prompt, not a thought.
 */
export function LinedField({ label, style, multiline, script = true, ...rest }: TextInputProps & { label: string; script?: boolean; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const [focused, setFocused] = useState(false);
  const typed = !!rest.value;
  const hand = script && typed;
  return (
    <View style={style}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={m.graphiteSoft}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
        style={{
          minHeight: multiline ? 84 : TOUCH + 4,
          maxHeight: multiline ? 168 : undefined,
          paddingVertical: 8,
          paddingHorizontal: 2,
          color: m.ink,
          fontFamily: hand ? fonts.hand : fonts.ui,
          fontSize: hand ? 23 : 15.5,
          lineHeight: multiline ? 30 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
        }}
      />
      <View style={{ height: focused ? 2 : 1, backgroundColor: focused ? m.turquoise : m.graphiteSoft, opacity: focused ? 1 : 0.5 }} />
    </View>
  );
}

/* ------------------------------------------------------------- Segmented */

export function Choice<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { m, haptics } = useNotebook();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              tap(haptics);
              onChange(o.value);
            }}
            style={({ pressed }) => ({
              minHeight: TOUCH,
              paddingHorizontal: 16,
              justifyContent: 'center',
              borderWidth: 1.2,
              borderColor: on ? m.navy : m.rule,
              backgroundColor: on ? m.navy : 'transparent',
              borderRadius: 3,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Print variant="uiStrong" style={{ color: on ? m.onNavy : m.ink }}>{o.label}</Print>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Logo */

const LOGO_INK = require('@/assets/brand/logo-ink.png');
const LOGO_ACCENT = require('@/assets/brand/logo-accent.png');
const LOGO_RATIO = 432 / 450;

/** The supplied Praxzis mark, printed onto the page in this notebook's inks. */
export function Logo({ width = 120, ink, accent }: { width?: number; ink?: string; accent?: string }) {
  const { m } = useNotebook();
  const h = width * LOGO_RATIO;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Praxzis" style={{ width, height: h }}>
      <Image source={LOGO_INK} tintColor={ink ?? m.navy} style={{ position: 'absolute', width, height: h, opacity: 0.94 }} resizeMode="contain" />
      <Image source={LOGO_ACCENT} tintColor={accent ?? m.turquoise} style={{ position: 'absolute', width, height: h }} resizeMode="contain" />
    </View>
  );
}
