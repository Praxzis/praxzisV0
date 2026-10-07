import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Circled } from './marks';
import { fonts } from './materials';
import { rng } from './seed';
import { useNotebook } from './theme';

/* ------------------------------------------------------------------ Print */

type PrintVariant =
  | 'display' // editorial headline, serif
  | 'title' // page / book title, serif
  | 'heading' // section heading, serif
  | 'body' // reading text, serif
  | 'quote' // printed book passage, serif italic-free
  | 'label' // small caps-like system label, sans
  | 'ui' // controls and dense info, sans
  | 'uiStrong'
  | 'meta'; // tiny metadata, sans

const printStyles: Record<PrintVariant, TextStyle> = {
  display: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.serifMedium, fontSize: 27, lineHeight: 31, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.serifMedium, fontSize: 20, lineHeight: 25 },
  body: { fontFamily: fonts.serif, fontSize: 17.5, lineHeight: 26 },
  quote: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28 },
  label: { fontFamily: fonts.uiStrong, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  ui: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  uiStrong: { fontFamily: fonts.uiStrong, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: fonts.uiMedium, fontSize: 12.5, lineHeight: 17 },
};

type Tone = 'ink' | 'navy' | 'graphite' | 'pencil' | 'turquoise' | 'onNavy';

function useTone(tone: Tone, fallback: Tone): string {
  const { m } = useNotebook();
  const t = tone ?? fallback;
  return t === 'ink'
    ? m.ink
    : t === 'navy'
      ? m.navy
      : t === 'graphite'
        ? m.graphite
        : t === 'pencil'
          ? m.graphiteSoft
          : t === 'turquoise'
            ? m.turquoiseInk
            : m.onNavy;
}

/** Printed, digital type: navigation, system text, book metadata. Always crisp. */
export function Print({
  variant = 'body',
  tone,
  style,
  ...rest
}: TextProps & { variant?: PrintVariant; tone?: Tone; style?: StyleProp<TextStyle> }) {
  const fallback: Tone = variant === 'label' || variant === 'meta' ? 'graphite' : variant === 'body' || variant === 'quote' || variant === 'ui' ? 'ink' : 'navy';
  const color = useTone(tone ?? fallback, fallback);
  return <Text maxFontSizeMultiplier={1.6} {...rest} style={[printStyles[variant], { color }, style]} />;
}

/* ------------------------------------------------------------------- Hand */

type HandSize = 'note' | 'small' | 'large' | 'statement' | 'title';
const handSizes: Record<HandSize, { size: number; line: number }> = {
  small: { size: 19, line: 23 },
  note: { size: 23, line: 28 },
  large: { size: 28, line: 33 },
  statement: { size: 34, line: 39 },
  title: { size: 42, line: 46 },
};

type HandProps = {
  children: string;
  /** Stable identity for this piece of writing; drives its imperfections. */
  seed?: string;
  size?: HandSize;
  tone?: Tone;
  /** Write the words in, one after another. */
  write?: boolean;
  delay?: number;
  /** Rotate the whole note slightly, as if written at an angle. */
  slant?: number;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Ink bleeding very slightly into the fibres. */
function inkBleed(scheme: 'day' | 'night'): TextStyle {
  const color = scheme === 'day' ? 'rgba(34,38,58,0.22)' : 'rgba(236,228,211,0.18)';
  if (Platform.OS === 'web') return { textShadow: `0 0 0.8px ${color}` } as TextStyle;
  return { textShadowColor: color, textShadowRadius: 0.8, textShadowOffset: { width: 0, height: 0 } };
}

type Word = { text: string; dy: number; rot: number; ls: number; op: number; font: string; br: boolean };

function layoutWords(text: string, seed: string, wobble: number): Word[] {
  const r = rng(`hand:${seed}`);
  const out: Word[] = [];
  // Baseline drifts gently across a line instead of jumping per word.
  let drift = 0;
  const lines = String(text ?? '').split('\n');
  lines.forEach((line, li) => {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((w, wi) => {
      drift = drift * 0.6 + r.range(-0.9, 0.9);
      const press = r.next();
      out.push({
        text: w,
        dy: drift * wobble,
        rot: r.range(-1.1, 1.1) * wobble,
        ls: r.range(-0.25, 0.35) * wobble,
        op: 0.86 + r.next() * 0.14 * (wobble > 0.5 ? 1 : 0.3) + (wobble > 0.5 ? 0 : 0.1),
        font: press > 0.86 && wobble > 0.5 ? fonts.handStrong : press < 0.12 && wobble > 0.5 ? fonts.handRegular : fonts.hand,
        br: wi === words.length - 1 && li < lines.length - 1,
      });
    });
  });
  return out;
}

/**
 * Handwriting — reserved for what belongs to the person: notes, reflections,
 * principles, questions, annotations. Exposed to assistive tech as one string.
 */
export function Hand({ children, seed, size = 'note', tone = 'ink', write = false, delay = 0, slant = 0, align = 'left', style, textStyle, numberOfLines }: HandProps) {
  const { m, wobble, reduceMotion } = useNotebook();
  const text = children == null ? '' : String(children);
  const color = useTone(tone, 'ink');
  const animate = write && !reduceMotion && !numberOfLines && !!text;
  const words = useMemo(
    () => (animate ? layoutWords(text, seed ?? text, wobble) : []),
    [animate, text, seed, wobble],
  );
  const { size: fontSize, line } = handSizes[size];
  const step = Math.min(70, 1100 / Math.max(words.length, 1));

  if (!animate) {
    return (
      <View style={style}>
        <Text
          numberOfLines={numberOfLines}
          maxFontSizeMultiplier={1.5}
          style={[
            { fontFamily: fonts.hand, fontSize, lineHeight: line, color, textAlign: align, transform: slant ? [{ rotate: `${slant}deg` }] : undefined },
            inkBleed(m.scheme),
            textStyle,
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start' },
        slant ? { transform: [{ rotate: `${slant}deg` }] } : null,
        style,
      ]}
    >
      {words.map((w, i) => {
        const node = (
          <Text
            maxFontSizeMultiplier={1.5}
            style={[
              {
                fontFamily: w.font,
                fontSize,
                lineHeight: line,
                color,
                opacity: w.op,
                letterSpacing: w.ls,
                transform: [{ translateY: w.dy }, { rotate: `${w.rot}deg` }],
              },
              inkBleed(m.scheme),
              textStyle,
            ]}
          >
            {w.text}{' '}
          </Text>
        );
        return (
          <Fragment key={i}>
            {animate ? (
              <Animated.View entering={FadeIn.delay(delay + i * step).duration(260)}>{node}</Animated.View>
            ) : (
              <View>{node}</View>
            )}
            {w.br && <View style={{ width: '100%', height: 0 }} />}
          </Fragment>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- Passage */

type MarkStyle = 'marker' | 'underline' | 'none';

function MarkPiece({ index, total, progress, kind, seed, color, line }: { index: number; total: number; progress: SharedValue<number>; kind: MarkStyle; seed: number; color: string; line: number }) {
  const r = rng(seed);
  const top = kind === 'marker' ? line * 0.2 + r.range(-1, 1) : line - 5 + Math.sin(index * 0.5) * 0.8;
  const height = kind === 'marker' ? line * 0.66 + r.range(-1, 1.5) : 1.5;
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, progress.value * total - index));
    return { transform: [{ scaleX: local }], opacity: local > 0 ? 1 : 0 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: -1, right: 0, top, height, backgroundColor: color, borderRadius: kind === 'marker' ? 2 : 1, transformOrigin: 'left' },
        style,
      ]}
    />
  );
}

/**
 * A printed passage the reader marked. The highlighter/underline is laid down
 * word by word, so it wraps with the text and can be drawn across it.
 */
export function Passage({
  text,
  seed,
  mark = 'marker',
  draw = false,
  delay = 0,
  size = 18,
  circle,
  style,
}: {
  text: string;
  seed: string;
  mark?: MarkStyle;
  draw?: boolean;
  delay?: number;
  size?: number;
  /** A word the reader circled inside the passage. */
  circle?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { m, reduceMotion } = useNotebook();
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const animate = draw && !reduceMotion;
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(delay, withTiming(1, { duration: Math.min(1400, 240 + words.length * 28), easing: Easing.inOut(Easing.quad) }));
  }, [animate, delay, progress, words.length]);
  const line = Math.round(size * 1.55);
  const color = mark === 'underline' ? m.turquoise : m.marker;
  if (!animate) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={`Highlighted: ${text}`} style={style}>
        <Text
          maxFontSizeMultiplier={1.6}
          style={{
            fontFamily: fonts.serif,
            fontSize: size,
            lineHeight: line,
            color: m.ink,
            backgroundColor: mark === 'marker' ? color : undefined,
            textDecorationLine: mark === 'underline' ? 'underline' : 'none',
            textDecorationColor: mark === 'underline' ? color : undefined,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`Highlighted: ${text}`} style={[{ flexDirection: 'row', flexWrap: 'wrap' }, style]}>
      {words.map((w, i) => {
        const word = (
          <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: line, color: m.ink }}>
            {w}{' '}
          </Text>
        );
        const circled = circle && w.toLowerCase().replace(/[^a-z’']/g, '') === circle.toLowerCase();
        return (
          <View key={i}>
            {mark !== 'none' && <MarkPiece index={i} total={words.length} progress={progress} kind={mark} seed={i * 7919 + seed.length} color={color} line={line} />}
            {circled ? (
              <Circled seed={`${seed}-c`} inline pad={5} draw={draw} delay={delay + 900} duration={480} color={m.turquoise} width={1.3}>
                {word}
              </Circled>
            ) : (
              word
            )}
          </View>
        );
      })}
    </View>
  );
}

/** A handwritten note in the margin, with a small printed reference beside it. */
export function MarginNote({ children, seed, tone = 'turquoise', style }: { children: string; seed: string; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  return <Hand seed={seed} size="small" tone={tone} slant={-1.5} style={style}>{children}</Hand>;
}

export function Spacer({ h = 16 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}
