import { useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import * as S from './strokes';
import { useNotebook } from './theme';

const APath = Animated.createAnimatedComponent(Path);

type InkProps = {
  color?: string;
  width?: number;
  /** Draw the stroke on, as if being written. */
  draw?: boolean;
  delay?: number;
  duration?: number;
};

function DrawnStroke({ s, color, width, draw, delay, duration, offset }: { s: S.Stroke; offset: boolean } & Required<InkProps>) {
  const progress = useSharedValue(draw ? 0 : 1);
  useEffect(() => {
    if (!draw) return;
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, draw, duration, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: s.length * (1 - progress.value) }));
  const w = (s.width ?? 1) * width * (offset ? 0.5 : 1);
  return (
    <APath
      d={s.d}
      stroke={color}
      strokeWidth={w}
      strokeOpacity={(s.opacity ?? 1) * (offset ? 0.35 : 0.92)}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={`${s.length} ${s.length}`}
      animatedProps={animatedProps}
      transform={offset ? 'translate(0.45 0.3)' : undefined}
    />
  );
}

/** Renders pen strokes. A thinner offset pass gives the ink a little pooling/pressure. */
export function Ink({
  strokes,
  w,
  h,
  color,
  width = 1.7,
  draw = false,
  delay = 0,
  duration = 520,
  style,
}: InkProps & { strokes: S.Stroke[]; w: number; h: number; style?: StyleProp<ViewStyle> }) {
  const { m, reduceMotion } = useNotebook();
  const c = color ?? m.ink;
  const animate = draw && !reduceMotion;
  const per = duration / Math.max(1, strokes.length);
  return (
    <View pointerEvents="none" style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} style={{ overflow: 'visible' }}>
        {strokes.map((s, i) => (
          <DrawnStroke key={`a${i}`} s={s} color={c} width={width} draw={animate} delay={delay + i * per} duration={per} offset={false} />
        ))}
        {strokes.map((s, i) => (
          <DrawnStroke key={`b${i}`} s={s} color={c} width={width} draw={animate} delay={delay + i * per} duration={per} offset />
        ))}
      </Svg>
    </View>
  );
}

function useSize() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
  };
  return [size, onLayout] as const;
}

/** Underlines whatever it wraps, measured to fit. */
export function Underlined({
  children,
  seed,
  double,
  style,
  ...ink
}: InkProps & { children: ReactNode; seed: string; double?: boolean; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const [size, onLayout] = useSize();
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <View onLayout={onLayout}>{children}</View>
      {size && (
        <Ink
          strokes={S.underline(size.w, 8, seed, double)}
          w={size.w}
          h={8}
          color={ink.color ?? m.turquoise}
          {...ink}
          style={{ position: 'absolute', left: 0, bottom: -4 }}
        />
      )}
    </View>
  );
}

/** Circles whatever it wraps — for a concept the reader keeps returning to. */
export function Circled({
  children,
  seed,
  pad = 8,
  inline = false,
  style,
  ...ink
}: InkProps & { children: ReactNode; seed: string; pad?: number; inline?: boolean; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const [size, onLayout] = useSize();
  return (
    <View style={[{ alignSelf: 'flex-start', padding: inline ? 0 : pad }, style]}>
      <View onLayout={onLayout}>{children}</View>
      {size && (
        <Ink
          strokes={S.circle(size.w + pad * 2, size.h + pad * 2, seed)}
          w={size.w + pad * 2}
          h={size.h + pad * 2}
          color={ink.color ?? m.turquoise}
          width={ink.width ?? 1.4}
          {...ink}
          style={{ position: 'absolute', left: inline ? -pad : 0, top: inline ? -pad : 0 }}
        />
      )}
    </View>
  );
}

type Glyph = 'check' | 'cross' | 'star' | 'question';

export function Doodle({ kind, size = 22, seed, style, ...ink }: InkProps & { kind: Glyph; size?: number; seed: string; style?: StyleProp<ViewStyle> }) {
  const strokes =
    kind === 'check'
      ? S.check(size, seed)
      : kind === 'star'
        ? S.star(size, seed)
        : kind === 'question'
          ? S.question(size, seed)
          : [...S.crossOut(size, size, seed), ...S.crossOut(size, size, `${seed}2`)];
  return <Ink strokes={strokes} w={size} h={size} style={style} {...ink} />;
}

export function Divider({ seed, style, ...ink }: InkProps & { seed: string; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const [size, onLayout] = useSize();
  return (
    <View onLayout={onLayout} style={[{ height: 12, alignSelf: 'stretch' }, style]}>
      {size && <Ink strokes={S.divider(size.w, seed)} w={size.w} h={12} color={ink.color ?? m.graphiteSoft} width={ink.width ?? 1.1} {...ink} />}
    </View>
  );
}

/** Strikes through a line of text, as when an idea didn't survive the week. */
export function CrossedOut({ children, seed, style, ...ink }: InkProps & { children: ReactNode; seed: string; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const [size, onLayout] = useSize();
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <View onLayout={onLayout}>{children}</View>
      {size && (
        <Ink
          strokes={S.crossOut(size.w, size.h, seed)}
          w={size.w}
          h={size.h}
          color={ink.color ?? m.graphite}
          width={ink.width ?? 1.4}
          {...ink}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
      )}
    </View>
  );
}

export function Bracket({ height, seed, side = 'left', style, ...ink }: InkProps & { height: number; seed: string; side?: 'left' | 'right'; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  return <Ink strokes={S.bracket(height, seed, side)} w={8} h={height} color={ink.color ?? m.graphite} width={ink.width ?? 1.3} style={style} {...ink} />;
}

export function Arrow({
  from,
  to,
  seed,
  curve,
  style,
  ...ink
}: InkProps & { from: S.Pt; to: S.Pt; seed: string; curve?: number; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const minX = Math.min(from.x, to.x) - 16;
  const minY = Math.min(from.y, to.y) - 16;
  const w = Math.abs(to.x - from.x) + 32;
  const h = Math.abs(to.y - from.y) + 32;
  const strokes = S.arrow({ x: from.x - minX, y: from.y - minY }, { x: to.x - minX, y: to.y - minY }, seed, curve);
  return (
    <Ink
      strokes={strokes}
      w={w}
      h={h}
      color={ink.color ?? m.graphite}
      width={ink.width ?? 1.3}
      {...ink}
      style={[{ position: 'absolute', left: minX, top: minY }, style]}
    />
  );
}
