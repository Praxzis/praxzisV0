import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { capturePassagePhoto, transcribePassagePhoto } from '@/lib/passage-photo';
import { BackLink, Choice, Hand, IconButton, InkButton, LinedField, NotebookPage, Print, Section } from '@/notebook';
import { useStore } from '@/state/store';
import type { Mark } from '@/data/notebook';

const PHOTO_STATUS = {
  reading: 'Reading the line…',
  canceled: null,
  denied: 'The camera is closed. Open it in Settings, or type the line.',
  empty: 'The page would not give up the line. Try a closer crop, or type it.',
  unavailable: 'The page would not give up the line. Try a closer crop, or type it.',
  'no-camera': 'The camera is not in this copy of Praxzis yet. Open the rebuilt app, or type the line.',
  'no-desk': 'The desk cannot read the page yet. Add the AI key, or type the line.',
} as const;

export default function MarkPassage() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const { bookById, addHighlight, books } = useStore();
  const book = bookId ? bookById(bookId) : books[0];
  const [text, setText] = useState('');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [themes, setThemes] = useState('');
  const [mark, setMark] = useState<Mark>('marker');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  if (!book) {
    return (
      <NotebookPage seed="mark-empty">
        <BackLink label="Library" onPress={() => router.replace('/library')} />
        <Hand seed="mark-none" size="large" tone="graphite">
          Bring a book in first. Then there is a page to mark.
        </Hand>
      </NotebookPage>
    );
  }

  return (
    <NotebookPage seed={`mark-${book.id}`} binding={false}>
      <BackLink label={book.title} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/book/${book.id}`))} />
      <Hand seed="mark-h" size="title" tone="navy" slant={-1} write style={{ marginTop: 8 }}>
        A line that stayed
      </Hand>
      <Print variant="meta" style={{ marginTop: 4 }}>
        {book.title} · {book.author}
      </Print>

      <Section
        label="The passage"
        right={
          <IconButton
            icon="camera"
            label="Photograph the line"
            disabled={photoBusy}
            style={{ width: 36, height: 36, marginVertical: -6 }}
            onPress={async () => {
              setPhotoBusy(true);
              setPhotoNote(null);
              const captured = await capturePassagePhoto();
              if (!captured.ok) {
                setPhotoBusy(false);
                setPhotoNote(PHOTO_STATUS[captured.reason]);
                return;
              }
              setPhotoNote(PHOTO_STATUS.reading);
              const result = await transcribePassagePhoto(captured.base64, captured.mime);
              setPhotoBusy(false);
              if (result.ok) {
                setText(result.text);
                setPhotoNote(null);
                return;
              }
              setPhotoNote(PHOTO_STATUS[result.reason]);
            }}
          />
        }
      >
        <LinedField
          label="The passage"
          placeholder="Copy the sentence as it is printed, or photograph it…"
          value={text}
          onChangeText={setText}
          multiline
          script={false}
        />
        {photoNote ? (
          <Print variant="meta" style={{ marginTop: 8 }}>
            {photoNote}
          </Print>
        ) : null}
      </Section>
      <LinedField label="Where in the book" placeholder="Chapter, letter, page…" value={where} onChangeText={setWhere} script={false} style={{ marginTop: 8 }} />

      <Section label="How I marked it">
        <Choice<Mark>
          label="How I marked it"
          value={mark}
          onChange={setMark}
          options={[
            { value: 'marker', label: 'Highlighter' },
            { value: 'underline', label: 'Underline' },
            { value: 'circle', label: 'Circle' },
          ]}
        />
      </Section>

      <Section label="My note">
        <LinedField label="My note" placeholder="What it is doing on this page…" value={note} onChangeText={setNote} multiline />
      </Section>
      <LinedField
        label="Themes"
        placeholder="Themes, separated by commas — time, enough…"
        value={themes}
        onChangeText={setThemes}
        script={false}
        style={{ marginTop: 8 }}
      />

      <View style={{ marginTop: 24 }}>
        <InkButton
          label="Keep this mark"
          disabled={!text.trim()}
          onPress={() => {
            const id = addHighlight({
              bookId: book.id,
              text,
              where,
              mark,
              note,
              themes: themes.split(/[,/]/),
            });
            router.replace(`/highlight/${id}`);
          }}
          seed="keep-mark"
        />
      </View>
    </NotebookPage>
  );
}
