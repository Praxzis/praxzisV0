import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { relativeSaved } from '@/core/ids';
import type { Highlight } from '@/data/notebook';
import { Hand, Passage, Print, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

export function HighlightEntry({ h, showBook = true, draw = false, delay = 0 }: { h: Highlight; showBook?: boolean; draw?: boolean; delay?: number }) {
  const { m } = useNotebook();
  const { bookById } = useStore();
  const book = bookById(h.bookId);
  const saved = h.saved.includes('T') || /^\d{4}-/.test(h.saved) ? relativeSaved(h.saved) : h.saved;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Highlight from ${book?.title}. ${h.text}`}
      accessibilityHint="Opens the passage and where else it shows up"
      onPress={() => router.push(`/highlight/${h.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', gap: 10 })}
    >
      <View style={{ width: 40, paddingTop: 5 }}>
        <Print variant="meta" tone="pencil" style={{ fontSize: 11, textAlign: 'right' }} numberOfLines={2}>
          {h.where}
        </Print>
      </View>
      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: m.margin, paddingLeft: 12 }}>
        <Passage text={h.text} seed={h.id} mark={h.mark === 'circle' ? 'none' : h.mark} circle={h.circled} draw={draw} delay={delay} size={17.5} />
        {showBook && book && (
          <Print variant="meta" style={{ marginTop: 6 }}>
            {book.title} · {book.author} · {saved}
          </Print>
        )}
        {h.note && (
          <Hand seed={`${h.id}-note`} size="small" tone="turquoise" slant={-1} style={{ marginTop: 6 }}>
            {`— ${h.note}`}
          </Hand>
        )}
      </View>
    </Pressable>
  );
}
