import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DogEar, Ribbon } from '@/components/dog-ear';
import { HighlightEntry } from '@/components/highlight-entry';
import { BackLink, Divider, Hand, InkButton, NotebookPage, Print, Section, Underlined, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

/** The cover swinging open from the spine, briefly. */
function useBookOpening(enabled: boolean) {
  const p = useSharedValue(enabled ? 0 : 1);
  useEffect(() => {
    if (enabled) p.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [enabled, p]);
  return useAnimatedStyle(() => ({
    flex: 1,
    opacity: 0.2 + p.value * 0.8,
    transformOrigin: 'left',
    transform: [{ perspective: 1400 }, { rotateY: `${(1 - p.value) * -12}deg` }, { translateX: (1 - p.value) * -14 }],
  }));
}

export default function BookPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { m, reduceMotion } = useNotebook();
  const { bookById, highlightsFor, bookmarks, toggleBookmark } = useStore();
  const book = bookById(id);
  const opening = useBookOpening(!reduceMotion);

  if (!book) {
    return (
      <NotebookPage seed="missing">
        <BackLink label="Library" onPress={() => router.back()} />
        <Hand seed="missing" size="large" tone="graphite">This page seems to have been torn out.</Hand>
      </NotebookPage>
    );
  }

  const hs = highlightsFor(book.id);
  const cloth = m.cloth[book.cloth % m.cloth.length];
  const marked = bookmarks.includes(book.id);

  return (
    <Animated.View style={opening}>
      <NotebookPage seed={`book-${book.id}`} pageNumber={book.page}>
        {book.status === 'reading' && <Ribbon color={m.turquoise} />}
        <DogEar folded={marked} onToggle={() => toggleBookmark(book.id)} />

        <BackLink label="Library" onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))} />

        <View style={{ marginTop: 10, flexDirection: 'row', gap: 14 }}>
          <View style={{ width: 6, borderRadius: 1, backgroundColor: cloth }} />
          <View style={{ flex: 1 }}>
            <Print variant="label">{book.status === 'reading' ? 'Reading now' : book.status === 'finished' ? 'Finished' : 'Someday'}</Print>
            <Print variant="display" accessibilityRole="header" style={{ marginTop: 6 }}>{book.title}</Print>
            <Print variant="body" tone="graphite" style={{ marginTop: 2 }}>
              {book.author}{book.year ? `, ${book.year}` : ''}
            </Print>
            <Print variant="meta" tone="pencil" style={{ marginTop: 6 }}>
              {book.started !== '—' ? `Started ${book.started} · ` : ''}
              {hs.length} {hs.length === 1 ? 'passage' : 'passages'} marked
            </Print>
          </View>
        </View>

        <Section label="Why I picked it up">
          {book.why ? (
            <Hand seed={`${book.id}-why`} size="note" write>
              {book.why}
            </Hand>
          ) : (
            <Hand seed={`${book.id}-nowhy`} size="note" tone="graphite">
              No reason written yet.
            </Hand>
          )}
        </Section>

        {book.principle && (
          <Section label="What I’m keeping">
            <Underlined seed={`${book.id}-p`} double draw delay={500} color={m.turquoise}>
              <Hand seed={`${book.id}-principle`} size="statement" tone="navy" slant={-1.2}>
                {book.principle}
              </Hand>
            </Underlined>
          </Section>
        )}

        <Section
          label="Marked passages"
          right={<InkButton label="Mark a line" kind="quiet" icon="plus" onPress={() => router.push({ pathname: '/mark', params: { bookId: book.id } })} />}
        >
          {hs.length ? (
            hs.map((h, i) => (
              <View key={h.id}>
                {i > 0 && <Divider seed={`bd-${h.id}`} style={{ marginVertical: 14, opacity: 0.55 }} />}
                <HighlightEntry h={h} showBook={false} draw delay={350 + i * 250} />
              </View>
            ))
          ) : (
            <Hand seed="no-hl" size="note" tone="graphite">
              Nothing marked yet. The first passage you underline will land here.
            </Hand>
          )}
        </Section>
      </NotebookPage>
    </Animated.View>
  );
}
