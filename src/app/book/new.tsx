import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { BookSuggest } from '@/components/book-suggest';
import { searchCatalog, type CatalogBook } from '@/core/catalog';
import { BackLink, Choice, Hand, InkButton, LinedField, NotebookPage, Print, Section } from '@/notebook';
import { useStore } from '@/state/store';
import type { BookStatus } from '@/data/notebook';

export default function NewBook() {
  const { addBook } = useStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [why, setWhy] = useState('');
  const [status, setStatus] = useState<BookStatus>('reading');
  const [hits, setHits] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<CatalogBook | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (picked) return;
    const q = title.trim();
    if (q.length < 2) return;
    const n = ++seq.current;
    const control = new AbortController();
    const wait = setTimeout(() => {
      setLoading(true);
      searchCatalog(q, control.signal)
        .then((rows) => {
          if (seq.current === n) setHits(rows);
        })
        .catch(() => {
          if (seq.current === n) setHits([]);
        })
        .finally(() => {
          if (seq.current === n) setLoading(false);
        });
    }, 280);
    return () => {
      clearTimeout(wait);
      control.abort();
    };
  }, [picked, title]);

  const pick = (book: CatalogBook) => {
    setTitle(book.title);
    setAuthor(book.author);
    setYear(book.year);
    setHits([]);
    setPicked(book);
  };

  return (
    <NotebookPage seed="new-book" binding={false}>
      <BackLink label="Library" onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))} />
      <Hand seed="nb-title" size="title" tone="navy" slant={-1} write style={{ marginTop: 8 }}>
        A new spine
      </Hand>
      <Print variant="ui" tone="graphite" style={{ marginTop: 6 }}>
        Start the title. The world’s shelves will lean in. Pick one, or keep writing your own.
      </Print>

      <LinedField
        label="Title"
        placeholder="Title"
        value={title}
        onChangeText={(t) => {
          setPicked(null);
          setTitle(t);
          if (t.trim().length < 2) {
            setHits([]);
            setLoading(false);
          }
        }}
        script={false}
        style={{ marginTop: 22 }}
        autoCorrect={false}
      />
      <BookSuggest hits={hits} loading={loading} query={title} onPick={pick} />

      <LinedField label="Author" placeholder="Author" value={author} onChangeText={setAuthor} script={false} style={{ marginTop: 8 }} />
      <LinedField label="Year" placeholder="Year, if you know it" value={year} onChangeText={setYear} script={false} keyboardType="numbers-and-punctuation" style={{ marginTop: 8 }} />

      <Section label="On the shelf">
        <Choice<BookStatus>
          label="On the shelf"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'reading', label: 'Reading now' },
            { value: 'finished', label: 'Finished' },
            { value: 'someday', label: 'Someday' },
          ]}
        />
      </Section>

      <Section label="Why I picked it up">
        <LinedField label="Why I picked it up" placeholder="A sentence is plenty…" value={why} onChangeText={setWhy} multiline />
      </Section>

      <InkButton
        label="Set it on the shelf"
        disabled={!title.trim() || !author.trim()}
        onPress={() => {
          const id = addBook({ title, author, year, status, why, isbn: picked?.isbn, cover: picked?.cover });
          router.replace(`/book/${id}`);
        }}
        seed="add-book"
        style={{ marginTop: 24 }}
      />
    </NotebookPage>
  );
}
