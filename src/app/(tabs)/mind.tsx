import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Cluster } from '@/data/notebook';
import { Arrow, Doodle, Hand, InkButton, Passage, Print, Row, Sheet, SlideIntoPlace, Tape, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

const HAND_SIZE = { 1: 'note', 2: 'large', 3: 'statement' } as const;

function Gutter({ x, h }: { x: number; h: number }) {
  const { m } = useNotebook();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 10,
        top: 0,
        width: 20,
        height: h,
        backgroundColor: m.shadow,
        opacity: 0.06 * m.shadowStrength,
      }}
    />
  );
}

export default function Mind() {
  const { m } = useNotebook();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { bookById, highlightById, clusters, links, highlights, books, setSittingQuestion } = useStore();
  const [open, setOpen] = useState<Cluster | null>(null);

  const pageW = Math.min(Math.max(width - 36, 330), 460);
  const W = pageW * 2;
  const H = Math.max(height - insets.top - 120, 520);
  const pos = (c: Cluster) => ({ x: 70 + c.x * (W - 150), y: 150 + c.y * (H - 250) });
  const byId = Object.fromEntries(clusters.map((c) => [c.id, c]));

  // Arrows leave from the edge of a theme's box (label + note) so they never run through writing.
  const edge = (c: Cluster, toward: { x: number; y: number }) => {
    const p = pos(c);
    const center = { x: p.x, y: p.y + 6 };
    const hw = Math.min(88, 34 + c.label.length * (c.weight === 3 ? 7 : 5.5));
    const hh = 46;
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    const t = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
    const d = Math.hypot(dx, dy) || 1;
    return { x: center.x + dx * t + (dx / d) * 6, y: center.y + dy * t + (dy / d) * 6 };
  };

  return (
    <View style={{ flex: 1, backgroundColor: m.desk, paddingTop: insets.top + 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: W, height: H }}>
            <View style={{ flexDirection: 'row', position: 'absolute', inset: 0 }}>
              <Sheet seed="mind-left" tone="ivory" lift={1} simple style={{ width: pageW, height: H }} />
              <Sheet seed="mind-right" tone="ivory" lift={1} simple style={{ width: pageW, height: H }} />
            </View>
            <Gutter x={pageW} h={H} />

            <View style={{ position: 'absolute', left: 26, top: 20, right: pageW + 20 }}>
              <Print variant="label" accessibilityRole="header">My Mind</Print>
              <Hand seed="mind-title" size="title" tone="navy" slant={-1}>What the reading keeps saying</Hand>
              <Print variant="meta" tone="pencil" style={{ marginTop: 4 }}>
                {highlights.length
                  ? `${highlights.length} marked line${highlights.length === 1 ? '' : 's'}${books.length ? ` · ${books.length} book${books.length === 1 ? '' : 's'}` : ''}`
                  : 'Themes gather here as you mark lines'}
              </Print>
            </View>

            {links.map((l, i) => {
              const ca = byId[l.from];
              const cb = byId[l.to];
              if (!ca || !cb) return null;
              const tension = l.kind === 'tension';
              const from = edge(ca, pos(cb));
              const to = edge(cb, pos(ca));
              return (
                <View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
                  <Arrow from={from} to={to} seed={`link-${i}`} curve={tension ? -0.22 : 0.08} color={tension ? m.turquoise : m.graphiteSoft} width={tension ? 1.6 : 1.1} />
                  {l.note && (
                    <Hand seed={`ln-${i}`} size="small" tone="turquoise" slant={-6} style={{ position: 'absolute', left: (from.x + to.x) / 2 - 150, top: (from.y + to.y) / 2 + 2, width: 130 }}>
                      {l.note}
                    </Hand>
                  )}
                </View>
              );
            })}

            {clusters.length === 0 && (
              <Hand seed="mind-empty" size="large" tone="graphite" style={{ position: 'absolute', left: 40, top: 180, width: pageW - 80 }}>
                Mark a few lines. The themes will take their places on this spread.
              </Hand>
            )}

            {clusters.map((c, i) => {
              const p = pos(c);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Theme: ${c.label}. ${c.note}. ${c.highlights.length} ${c.highlights.length === 1 ? 'passage' : 'passages'}.`}
                  accessibilityHint="Shows the passages behind this theme"
                  onPress={() => setOpen(c)}
                  style={({ pressed }) => ({ position: 'absolute', left: p.x - 90, top: p.y - 34, width: 180, alignItems: 'center', opacity: pressed ? 0.65 : 1 })}
                >
                  <View
                    style={{
                      alignSelf: 'center',
                      paddingHorizontal: c.weight === 3 ? 12 : 9,
                      paddingVertical: c.weight === 3 ? 8 : 6,
                      borderWidth: c.weight === 3 ? 1.5 : 1.1,
                      borderColor: c.weight === 3 ? m.turquoise : m.graphite,
                      borderRadius: 80,
                    }}
                  >
                    <Hand seed={c.id} size={HAND_SIZE[c.weight]} tone="navy" align="center">
                      {c.label}
                    </Hand>
                  </View>
                  <Hand seed={`${c.id}-note`} size="small" tone="graphite" align="center" style={{ marginTop: -2 }}>
                    {c.note}
                  </Hand>
                  {c.weight === 3 && <Doodle kind="star" seed={`st-${c.id}`} size={16} color={m.turquoise} width={1.2} style={{ position: 'absolute', right: 18, top: -6 }} />}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {open && (
        <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, alignItems: 'center' }}>
          <SlideIntoPlace key={open.id} distance={24}>
          <View style={{ paddingTop: 10, width: Math.min(width - 28, 520) }}>
            <Sheet seed={`open-${open.id}`} tone="sticky" lift={3} edge="deckle" tilt={-0.6} contentStyle={{ padding: 18 }}>
              <Print variant="label">Behind “{open.label}”</Print>
              <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
                {open.highlights.map((hid) => {
                  const h = highlightById(hid);
                  if (!h) return null;
                  return (
                    <View key={hid} style={{ marginBottom: 12 }}>
                      <Passage text={h.text} seed={`mind-${hid}`} mark={h.mark === 'underline' ? 'underline' : 'marker'} size={16} />
                      <Print variant="meta" style={{ marginTop: 3 }}>{bookById(h.bookId)?.title}</Print>
                    </View>
                  );
                })}
              </ScrollView>
              <Row gap={10} style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <InkButton label="Done" kind="secondary" onPress={() => setOpen(null)} />
                <InkButton
                  label="Sit with this"
                  kind="quiet"
                  onPress={() => {
                    setSittingQuestion(open.note || open.label);
                    setOpen(null);
                    router.push('/(tabs)');
                  }}
                />
              </Row>
            </Sheet>
            <Tape seed={`t-${open.id}`} style={{ position: 'absolute', top: 0, alignSelf: 'center' }} />
          </View>
          </SlideIntoPlace>
        </View>
      )}
    </View>
  );
}
