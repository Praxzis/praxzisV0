import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { relativeSaved } from '@/core/ids';
import { Arrow, BackLink, Circled, Hand, NotebookPage, Passage, Print, Section, Sheet, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

export default function HighlightPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { m } = useNotebook();
  const { highlightById, bookById, highlights, council } = useStore();
  const h = highlightById(id);

  if (!h) {
    return (
      <NotebookPage seed="missing-h">
        <BackLink label="Back" onPress={() => router.back()} />
        <Hand seed="missing-h" size="large" tone="graphite">Couldn’t find that passage.</Hand>
      </NotebookPage>
    );
  }

  const book = bookById(h.bookId);
  const tension = council?.tension;
  const tensionWith = tension ? (h.id === tension.a ? tension.b : h.id === tension.b ? tension.a : null) : null;
  const opposite = tensionWith ? highlightById(tensionWith) : undefined;
  const related = highlights.filter((x) => x.id !== h.id && x.id !== tensionWith && x.themes.some((t) => h.themes.includes(t))).slice(0, 3);
  const saved = h.saved.includes('T') || /^\d{4}-/.test(h.saved) ? relativeSaved(h.saved) : h.saved;

  return (
    <NotebookPage seed={`hl-${h.id}`} pageNumber={(book?.page ?? 1) + 1}>
      <BackLink label={book?.title ?? 'Library'} onPress={() => (router.canGoBack() ? router.back() : router.replace(book ? `/book/${book.id}` : '/library'))} />

      <View style={{ marginTop: 14 }}>
        <Print variant="label">{h.where} · marked {saved}</Print>
        <Passage text={h.text} seed={`big-${h.id}`} mark={h.mark === 'circle' ? 'none' : h.mark} circle={h.circled} draw delay={150} size={22} style={{ marginTop: 10 }} />
        {book && (
          <Print variant="meta" style={{ marginTop: 8 }}>
            {book.title} · {book.author}
          </Print>
        )}
      </View>

      {h.note && (
        <Section label="My note">
          <Hand seed={`${h.id}-n`} size="large" tone="ink" write delay={500}>
            {h.note}
          </Hand>
        </Section>
      )}

      {h.themes.length > 0 && (
        <Section label="Themes">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {h.themes.map((t, i) => (
              <Circled key={t} seed={`${h.id}-${t}`} pad={9} draw delay={700 + i * 200} color={m.graphite} width={1.1}>
                <Hand seed={t} size="note" tone="navy">{t}</Hand>
              </Circled>
            ))}
          </View>
        </Section>
      )}

      {opposite && (
        <Section label="Disagrees with">
          <View>
            <Sheet seed={`opp-${opposite.id}`} tone="cream" lift={2} tilt={1.4} contentStyle={{ padding: 16 }} style={{ marginLeft: 26 }} enter enterDelay={300}>
              <Passage text={opposite.text} seed={`opp-${opposite.id}`} mark="none" size={17} />
              <Print variant="meta" style={{ marginTop: 6 }}>{bookById(opposite.bookId)?.title}</Print>
            </Sheet>
            <View pointerEvents="none" style={{ position: 'absolute', left: -4, top: 0, width: 40, height: 50 }}>
              <Arrow from={{ x: 6, y: 2 }} to={{ x: 28, y: 32 }} seed="tension-hl" color={m.turquoise} curve={0.35} draw delay={800} />
            </View>
            <Hand seed="tension-note" size="note" tone="turquoise" slant={-2} write delay={1100} style={{ marginTop: 12, marginLeft: 8 }}>
              {tension?.note ?? 'These two ideas don’t quite agree.'}
            </Hand>
          </View>
        </Section>
      )}

      {related.length > 0 && (
        <Section label="Where else this shows up">
          {related.map((r, i) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`${bookById(r.bookId)?.title}: ${r.text}`}
              onPress={() => router.push(`/highlight/${r.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Sheet
                seed={`rel-${r.id}`}
                tone={i % 2 ? 'bright' : 'cream'}
                lift={1}
                tilt
                enter
                enterDelay={200 + i * 120}
                style={{ marginBottom: 14, marginRight: i % 2 ? 0 : 12, marginLeft: i % 2 ? 12 : 0 }}
                contentStyle={{ padding: 14 }}
              >
                <Passage text={r.text} seed={`rel-${r.id}`} mark="none" size={16.5} />
                <Print variant="meta" style={{ marginTop: 6 }}>
                  {bookById(r.bookId)?.title} · shares “{r.themes.find((t) => h.themes.includes(t))}”
                </Print>
              </Sheet>
            </Pressable>
          ))}
        </Section>
      )}
    </NotebookPage>
  );
}
