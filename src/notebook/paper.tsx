import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { PaperTone } from './materials';
import { rng, tilt as seededTilt } from './seed';
import { roughRect } from './strokes';
import { useNotebook } from './theme';

const GRAIN = require('@/assets/paper/grain.png');
const GRAIN_SIZE = 320;

type Edge = 'cut' | 'deckle' | 'torn';

export type SheetProps = {
  children?: ReactNode;
  /** Identity of this sheet — two sheets with different seeds never look identical. */
  seed: string;
  tone?: PaperTone;
  edge?: Edge;
  /** 0 = flat on the page, 1 = resting, 2 = loose sheet, 3 = lifted. */
  lift?: 0 | 1 | 2 | 3;
  /** Degrees. `true` picks a small seeded tilt. Never used on controls. */
  tilt?: number | boolean;
  ruled?: boolean | number;
  margin?: boolean;
  crease?: boolean;
  /** Fiber and grain. Off by default so pages stay instant and do not trip the SVG renderer. */
  simple?: boolean;
  /** Slide into place on mount. */
  enter?: boolean;
  enterDelay?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

function SheetSurface({ w, h, seed, tone, edge, lift, ruled, margin, crease }: { w: number; h: number; seed: string; tone: PaperTone; edge: Edge; lift: number; ruled: number; margin: boolean; crease: boolean }) {
  const { m } = useNotebook();
  const uid = `${seed}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'sheet';
  const base = m.paper[tone] ?? m.paper.ivory;
  const ready = !!w && !!h && Number.isFinite(w) && Number.isFinite(h);

  const geo = useMemo(() => {
    const r = rng(`sheet:${seed}`);
    const jitter = edge === 'deckle' ? 1.3 : edge === 'torn' ? 2.2 : 0.45;
    const outline = roughRect(w, h, seed, jitter, edge === 'torn' ? 9 : 22);
    const blotches = Array.from({ length: 1 }, () => ({
      cx: r.range(0.1, 0.9) * w,
      cy: r.range(0.05, 0.95) * h,
      rx: r.range(0.35, 0.8) * w,
      ry: r.range(0.2, 0.55) * Math.max(h, w),
      dark: r.chance(0.55),
      o: r.range(0.035, 0.08),
    }));
    const creaseLine = crease
      ? { x1: r.range(-0.1, 0.3) * w, y1: r.range(0.1, 0.5) * h, x2: r.range(0.7, 1.1) * w, y2: r.range(0.4, 0.9) * h }
      : null;
    const grainOffset = { x: -Math.floor(r.range(0, GRAIN_SIZE)), y: -Math.floor(r.range(0, GRAIN_SIZE)) };
    return { outline, blotches, creaseLine, grainOffset };
  }, [crease, edge, h, seed, w]);

  if (!ready) return null;

  const shadowLayers =
    lift === 0
      ? []
      : [
          { dx: 0, dy: 0.6, o: 0.1 },
          { dx: 0.3, dy: 1.6 + lift * 0.6, o: 0.06 },
          { dx: 0.6, dy: 3 + lift * 2, o: 0.035 },
          ...(lift >= 2 ? [{ dx: 1, dy: 6 + lift * 3, o: 0.02 }] : []),
        ];
  const pad = 24;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      <Svg width={w + pad * 2} height={h + pad * 2} style={{ position: 'absolute', left: -pad, top: -pad }}>
        <Defs>
          {geo.blotches.map((b, i) => (
            <RadialGradient key={i} id={`b${uid}${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.dark ? m.paperShade : m.paperGlow} stopOpacity={b.o * (m.scheme === 'night' ? 1.4 : 1)} />
              <Stop offset="1" stopColor={b.dark ? m.paperShade : m.paperGlow} stopOpacity={0} />
            </RadialGradient>
          ))}
          <RadialGradient id={`v${uid}`} cx="50%" cy="45%" r="75%">
            <Stop offset="0.6" stopColor={m.paperShade} stopOpacity={0} />
            <Stop offset="1" stopColor={m.paperShade} stopOpacity={m.scheme === 'night' ? 0.35 : 0.12} />
          </RadialGradient>
        </Defs>
        {shadowLayers.map((s, i) => (
          <Path key={i} d={geo.outline} fill={m.shadow} fillOpacity={s.o * m.shadowStrength} transform={`translate(${pad + s.dx} ${pad + s.dy})`} />
        ))}
        <Path d={geo.outline} fill={base} transform={`translate(${pad} ${pad})`} />
      </Svg>

      {m.grainOpacity > 0.04 && (
        <View style={{ position: 'absolute', left: 1.5, top: 1.5, right: 1.5, bottom: 1.5, overflow: 'hidden' }}>
          <Image
            source={GRAIN}
            resizeMode="repeat"
            style={{
              position: 'absolute',
              left: geo.grainOffset.x,
              top: geo.grainOffset.y,
              width: w + GRAIN_SIZE,
              height: h + GRAIN_SIZE,
              opacity: m.grainOpacity,
            }}
          />
        </View>
      )}

      <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
        {geo.blotches.map((b, i) => (
          <Ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={`url(#b${uid}${i})`} />
        ))}
        <Rect x={0} y={0} width={w} height={h} fill={`url(#v${uid})`} />
        {ruled > 0 &&
          Array.from({ length: Math.floor((h - 70) / ruled) }, (_, i) => (
            <Line key={i} x1={0} x2={w} y1={70 + i * ruled} y2={70 + i * ruled + ((i * 37) % 5) * 0.06} stroke={m.rule} strokeWidth={1} />
          ))}
        {margin && <Line x1={44} x2={44.6} y1={0} y2={h} stroke={m.margin} strokeWidth={1} />}
        {geo.creaseLine && (
          <>
            <Line {...geo.creaseLine} stroke={m.paperShade} strokeOpacity={m.scheme === 'night' ? 0.3 : 0.09} strokeWidth={1} />
            <Line
              x1={geo.creaseLine.x1}
              y1={geo.creaseLine.y1 + 1}
              x2={geo.creaseLine.x2}
              y2={geo.creaseLine.y2 + 1}
              stroke={m.paperGlow}
              strokeOpacity={m.scheme === 'night' ? 0.08 : 0.5}
              strokeWidth={1}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

/** A physical sheet of paper. The primary container in Praxzis — use it instead of cards. */
export function Sheet({ children, seed, tone = 'ivory', edge = 'cut', lift = 1, tilt = 0, ruled = false, margin = false, crease = false, simple = true, enter = false, enterDelay = 0, style, contentStyle }: SheetProps) {
  const { m, reduceMotion } = useNotebook();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
  };
  const deg = tilt === true ? seededTilt(seed, 1.2) : tilt === false ? 0 : tilt;
  const ruleGap = ruled === true ? 30 : ruled === false ? 0 : ruled;
  const paper = m.paper[tone];
  const body = (
    <View
      onLayout={simple ? undefined : onLayout}
      style={[
        {
          transform: deg ? [{ rotate: `${deg}deg` }] : undefined,
          backgroundColor: paper,
          shadowColor: lift ? m.shadow : undefined,
          shadowOpacity: lift ? 0.08 * m.shadowStrength : 0,
          shadowRadius: lift ? 3 + lift : 0,
          shadowOffset: lift ? { width: 0, height: 1 + lift } : undefined,
        },
        style,
      ]}
    >
      {!simple && size && <SheetSurface w={size.w} h={size.h} seed={seed} tone={tone} edge={edge} lift={lift} ruled={ruleGap} margin={margin} crease={crease} />}
      <View style={contentStyle}>{children}</View>
    </View>
  );
  if (!enter || reduceMotion) return body;
  return <SlideIntoPlace delay={enterDelay}>{body}</SlideIntoPlace>;
}

/** A sheet being set down: a short slide and settle, never a flourish. */
export function SlideIntoPlace({ children, delay = 0, distance = 14 }: { children: ReactNode; delay?: number; distance?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * distance }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A strip of translucent tape holding a note to the page. */
export function Tape({ seed, width = 64, style }: { seed: string; width?: number; style?: StyleProp<ViewStyle> }) {
  const { m } = useNotebook();
  const r = rng(`tape:${seed}`);
  const h = 20;
  const w = width;
  const d = `M0 0 L${w} 0 L${w - 2} ${h * 0.25} L${w} ${h * 0.5} L${w - 2} ${h * 0.75} L${w} ${h} L0 ${h} L2 ${h * 0.75} L0 ${h * 0.5} L2 ${h * 0.25} Z`;
  return (
    <View pointerEvents="none" style={[{ width, height: h, transform: [{ rotate: `${r.range(-6, 6)}deg` }] }, style]}>
      <Svg width={width} height={h}>
        <Path d={d} fill={m.tape} />
      </Svg>
    </View>
  );
}

/** Small stack of page edges peeking out under a sheet: the rest of the notebook. */
export function PageStack({ seed, count = 2 }: { seed: string; count?: number }) {
  const { m } = useNotebook();
  const r = rng(`stack:${seed}`);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 2 + i,
            right: -(2 + i * 2.5),
            top: 4 + i * 2,
            bottom: -(2 + i * 2.5),
            backgroundColor: m.pageEdge,
            borderRadius: 1,
            opacity: 1 - i * 0.18,
            transform: [{ rotate: `${r.range(-0.25, 0.35)}deg` }],
            shadowColor: m.shadow,
            shadowOpacity: 0.08 * m.shadowStrength,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
          }}
        />
      ))}
    </>
  );
}

/** Spiral binding along the left edge of a page. */
export function Binding({ height, seed }: { height: number; seed: string }) {
  const { m } = useNotebook();
  const gap = 22;
  const rings = Math.max(0, Math.min(18, Math.floor((height - 30) / gap)));
  const r = rng(`bind:${seed}`);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -7, top: 20, width: 24, height }}>
      <Svg width={24} height={height}>
        {Array.from({ length: rings }, (_, i) => {
          const y = i * gap + 4 + r.range(-0.3, 0.3);
          return (
            <Fragment key={i}>
              {/* Punched hole, then the wire coming over the edge into it. */}
              <Circle cx={15.5} cy={y + 5} r={2.4} fill={m.desk} stroke={m.paperShade} strokeOpacity={0.3} strokeWidth={0.5} />
              <Path d={`M15.5 ${y + 5} C 13 ${y - 2.5}, 3 ${y - 2.5}, 1.5 ${y + 6}`} fill="none" stroke={m.binding} strokeWidth={1.9} strokeLinecap="round" />
              <Path d={`M4.5 ${y + 0.6} C 7 ${y - 0.8}, 10.5 ${y - 0.6}, 13 ${y + 1.2}`} fill="none" stroke={m.bindingHighlight} strokeWidth={0.7} strokeLinecap="round" />
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
