import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BookSpine, Shelf } from '@/components/book-spine';
import { Hand, InkButton, LinedField, NotebookPage, PageHeading, Print, Section, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';
import type { BookStatus } from '@/data/notebook';

const GROUPS: { status: BookStatus; title: string }[] = [
  { status: 'reading', title: 'Reading now' },
  { status: 'finished', title: 'Finished' },
  { status: 'someday', title: 'Someday' },
];

function IndexRow({ id, title, author, page, count }: { id: string; title: string; author: string; page: number; count: number }) {
  const { m } = useNotebook();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${author}, ${count} highlights, page ${page}`}
      onPress={() => router.push(`/book/${id}`)}
      style={({ pressed }) => ({ minHeight: 52, paddingVertical: 6, opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 })}
    >
      <View style={{ flexShrink: 1 }}>
        <Print variant="heading" tone="ink" style={{ fontSize: 19 }}>{title}</Print>
        <Print variant="meta" tone="pencil">
          {author}
          {count ? ` · ${count} marked` : ''}
        </Print>
      </View>
      <View style={{ flex: 1, minWidth: 16, borderBottomWidth: 1.5, borderStyle: 'dotted', borderColor: m.graphiteSoft, marginBottom: 7, opacity: 0.7 }} />
      <Print variant="body" tone="graphite" style={{ fontSize: 16, marginBottom: 1 }}>{page}</Print>
    </Pressable>
  );
}

export default function Library() {
  const { books, highlightsFor, prefs } = useStore();
  const [q, setQ] = useState('');
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = s ? books.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(s)) : [...books];
    if (prefs.shelfOrder === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));
    if (prefs.shelfOrder === 'author') rows.sort((a, b) => a.author.localeCompare(b.author));
    return rows;
  }, [books, prefs.shelfOrder, q]);
  const marked = books.reduce((n, b) => n + highlightsFor(b.id).length, 0);
  const aside =
    books.length === 0
      ? 'the shelf is waiting'
      : `${books.length} book${books.length === 1 ? '' : 's'}, ${marked} passage${marked === 1 ? '' : 's'} that stuck`;

  return (
    <NotebookPage seed="library">
      <PageHeading label="Library" title="My shelf" seed="library-title" aside={aside} right={<InkButton label="Add a book" icon="plus" kind="quiet" onPress={() => router.push('/book/new')} />} />

      {books.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
          <Shelf>
            {books.map((b) => (
              <BookSpine key={b.id} book={b} />
            ))}
          </Shelf>
        </ScrollView>
      )}

      {books.length > 0 && (
        <LinedField label="Search your library" placeholder="Search titles and authors…" value={q} onChangeText={setQ} style={{ marginTop: 22 }} returnKeyType="search" script={false} />
      )}

      <Section label="Index">
        {GROUPS.map((g) => {
          const rows = found.filter((b) => b.status === g.status);
          if (!rows.length) return null;
          return (
            <View key={g.status} style={{ marginBottom: 18 }}>
              <Hand seed={`grp-${g.status}`} size="large" tone="navy" slant={-0.6}>{g.title}</Hand>
              {rows.map((b) => (
                <IndexRow key={b.id} id={b.id} title={b.title} author={b.author} page={b.page} count={highlightsFor(b.id).length} />
              ))}
            </View>
          );
        })}
        {!books.length && (
          <View>
            <Hand seed="lib-empty" size="large" tone="ink">
              The shelf is waiting.
            </Hand>
            <Print variant="body" tone="graphite" style={{ marginTop: 8 }}>
              The first spine you add will change how the whole notebook feels.
            </Print>
            <InkButton label="Add a book" onPress={() => router.push('/book/new')} seed="lib-add" style={{ marginTop: 16 }} />
          </View>
        )}
        {!!books.length && !found.length && (
          <Hand seed="lib-miss" size="note" tone="graphite">
            Nothing on this shelf by that name — yet.
          </Hand>
        )}
      </Section>
    </NotebookPage>
  );
}
