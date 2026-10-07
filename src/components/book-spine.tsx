import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Rect, Stop } from 'react-native-svg';

import type { Book } from '@/data/notebook';
import { fonts, rng, useNotebook } from '@/notebook';

const SHELF_H = 168;

/** A cloth-bound spine standing on the shelf. Tapping opens the book's page. */
export function BookSpine({ book }: { book: Book }) {
  const { m } = useNotebook();
  const r = rng(`spine:${book.id}`);
  const h = Math.round(110 + book.spine * 52);
  const w = Math.round(r.range(36, 48));
  const lean = book.status === 'someday' ? r.range(-2.5, 2.5) : r.range(-0.6, 0.6);
  const cloth = m.cloth[book.cloth % m.cloth.length];
  const gid = `g${book.id.replace(/[^a-z]/g, '')}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title} by ${book.author}`}
      accessibilityHint="Opens this book's page"
      onPress={() => router.push(`/book/${book.id}`)}
      style={({ pressed }) => ({
        width: w,
        height: SHELF_H,
        justifyContent: 'flex-end',
        transform: [{ translateY: pressed ? -6 : 0 }],
      })}
    >
      <View style={{ width: w, height: h, transform: [{ rotate: `${lean}deg` }], transformOrigin: 'bottom' }}>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0" stopColor="#000" stopOpacity={0.22} />
              <Stop offset="0.18" stopColor="#fff" stopOpacity={0.08} />
              <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.26} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} rx={2} fill={cloth} />
          <Rect x={0} y={0} width={w} height={h} rx={2} fill={`url(#${gid})`} />
          <Line x1={3} x2={w - 3} y1={14} y2={14} stroke="#E9DDBF" strokeOpacity={0.5} strokeWidth={1} />
          <Line x1={3} x2={w - 3} y1={h - 16} y2={h - 16} stroke="#E9DDBF" strokeOpacity={0.5} strokeWidth={1} />
        </Svg>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            position: 'absolute',
            width: h - 40,
            height: 18,
            left: (w - (h - 40)) / 2,
            top: (h - 18) / 2,
            transform: [{ rotate: '-90deg' }],
            textAlign: 'center',
            fontFamily: fonts.serifMedium,
            fontSize: book.title.length > 14 ? 11.5 : 13,
            lineHeight: 18,
            color: '#EFE5CC',
            letterSpacing: 0.3,
          }}
        >
          {book.title}
        </Text>
      </View>
    </Pressable>
  );
}

export function Shelf({ children }: { children: React.ReactNode }) {
  const { m } = useNotebook();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingHorizontal: 6, height: SHELF_H }}>{children}</View>
      <View style={{ height: 2, backgroundColor: m.graphite, opacity: 0.55, borderRadius: 1, marginTop: -1 }} />
      <View style={{ height: 6, marginHorizontal: 4, backgroundColor: m.shadow, opacity: 0.06 * m.shadowStrength, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
    </View>
  );
}
