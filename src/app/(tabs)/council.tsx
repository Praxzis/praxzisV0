import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Arrow, Choice, Hand, IconButton, InkButton, LinedField, PAGE_MAX, Print, Row, Sheet, Underlined, fonts, useNotebook, type PaperTone } from '@/notebook';
import { useStore } from '@/state/store';
import type { CouncilMaterial } from '@/state/types';
import type { WorldVoice } from '@/core/council';

const TONES: PaperTone[] = ['cream', 'bright', 'ivory', 'cream'];

function DeskVoice({ index, highlightId, noteId, stance, support }: { index: number; highlightId?: string; noteId?: string; stance: string; support?: string }) {
  const { m } = useNotebook();
  const { highlightById, bookById, notes } = useStore();
  const h = highlightId ? highlightById(highlightId) : undefined;
  const book = h ? bookById(h.bookId) : undefined;
  const note = noteId ? notes.find((n) => n.id === noteId) : undefined;
  const left = index % 2 === 0;

  if (note) {
    return (
      <View style={{ marginLeft: left ? 0 : 28, marginRight: left ? 28 : 0 }}>
        <Sheet seed={`voice-note-${note.id}`} tone={TONES[index % TONES.length]} lift={2} contentStyle={{ padding: 16 }}>
          <Print variant="label">Your note · {note.date}</Print>
          <Print variant="quote" style={{ marginTop: 6, fontSize: 16.5, lineHeight: 25 }}>
            “{note.text}”
          </Print>
          <Print variant="body" tone="navy" style={{ marginTop: 8, fontFamily: fonts.serifItalic, fontSize: 16 }}>
            {stance}
          </Print>
          {!!support && (
            <Print variant="meta" tone="pencil" style={{ marginTop: 8 }}>
              {support}
            </Print>
          )}
        </Sheet>
      </View>
    );
  }

  if (!h || !book) return null;
  return (
    <View style={{ marginLeft: left ? 0 : 28, marginRight: left ? 28 : 0 }}>
      <View style={{ position: 'absolute', top: -8, left: left ? 20 : undefined, right: left ? undefined : 20, width: 56, height: 14, backgroundColor: m.cloth[book.cloth % m.cloth.length], borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9 }} />
      <Sheet seed={`voice-${h.id}`} tone={TONES[index % TONES.length]} lift={2} contentStyle={{ padding: 16 }}>
        <Print variant="label">{book.title}</Print>
        <Print variant="quote" style={{ marginTop: 6, fontSize: 16.5, lineHeight: 25 }}>
          “{h.text}”
        </Print>
        <Print variant="body" tone="navy" style={{ marginTop: 8, fontFamily: fonts.serifItalic, fontSize: 16 }}>
          {stance}
        </Print>
        <Print variant="meta" tone="pencil" style={{ marginTop: 8 }}>
          {support || [book.author, h.where].filter(Boolean).join(' · ')}
        </Print>
      </Sheet>
    </View>
  );
}

function WorldCard({ index, voice, onShelf, onBring }: { index: number; voice: WorldVoice; onShelf: boolean; onBring: () => void }) {
  const { m } = useNotebook();
  const left = index % 2 === 0;
  let cloth = 0;
  for (let i = 0; i < voice.title.length; i += 1) cloth = (cloth + voice.title.charCodeAt(i) * (i + 1)) % m.cloth.length;
  return (
    <View style={{ marginLeft: left ? 0 : 28, marginRight: left ? 28 : 0 }}>
      <View style={{ position: 'absolute', top: -8, left: left ? 20 : undefined, right: left ? undefined : 20, width: 56, height: 14, backgroundColor: m.cloth[cloth], borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9 }} />
      <Sheet seed={`world-${voice.id}`} tone={TONES[index % TONES.length]} lift={2} contentStyle={{ padding: 16 }}>
        <Print variant="label">{voice.title}</Print>
        <Print variant="meta" style={{ marginTop: 2 }}>
          {voice.author}
          {voice.year ? ` · ${voice.year}` : ''}
        </Print>
        <Print variant="body" tone="navy" style={{ marginTop: 10, fontFamily: fonts.serifItalic, fontSize: 16 }}>
          {voice.stance}
        </Print>
        <Print variant="meta" tone="graphite" style={{ marginTop: 8 }}>
          {voice.why}
        </Print>
        <InkButton kind="quiet" label={onShelf ? 'On the shelf' : 'Add to shelf'} disabled={onShelf} onPress={onBring} seed={`bring-${voice.id}`} style={{ marginTop: 8 }} />
      </Sheet>
    </View>
  );
}

export default function Council() {
  const { m } = useNotebook();
  const insets = useSafeAreaInsets();
  const { council, askCouncil, highlights, notes, books, addBook, councilBusy, prefs, setPrefs, pendingCouncil, setPendingCouncil } = useStore();
  const [ask, setAsk] = useState('');
  const [taken, setTaken] = useState('');
  const material = prefs.councilMaterial;
  if (pendingCouncil && pendingCouncil !== taken) {
    setTaken(pendingCouncil);
    setAsk(pendingCouncil);
  }
  const shelf = useMemo(() => books.filter((b) => b.status === 'reading' || b.status === 'finished'), [books]);
  const [bookId, setBookId] = useState(shelf[0]?.id ?? books[0]?.id ?? '');
  const used = council?.material === 'world' ? 'world' : council?.material === 'book' ? 'book' : council ? 'council' : material;
  const tension = council?.tension;
  const deskVoices = council?.voices ?? [];
  const worldVoices = council?.worldVoices ?? [];
  const clarifying = council?.clarifying?.length ? council.clarifying : council?.followUp ? [council.followUp] : [];

  const send = () => {
    const q = ask.trim();
    if (!q) return;
    askCouncil(q, material, material === 'book' ? bookId || undefined : undefined);
    setAsk('');
    setTaken('');
    setPendingCouncil('');
  };

  const alreadyOnShelf = (title: string) => books.some((b) => b.title.toLowerCase() === title.toLowerCase());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: m.deskDeep }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center' }}>
          <Print variant="label" accessibilityRole="header" style={{ marginLeft: 4 }}>
            Council
          </Print>
          <Hand seed="council-errata" size="small" tone="turquoise" slant={-1.6} style={{ marginTop: 6, marginLeft: 4, marginRight: 12 }}>
            Errata: the council can misread a page. Check the line. The decision stays yours.
          </Hand>

          {council ? (
            <Sheet seed="council-q" tone="bright" lift={2} ruled={30} margin tilt={-0.4} style={{ marginTop: 10 }} contentStyle={{ paddingLeft: 56, paddingRight: 18, paddingTop: 18, paddingBottom: 22 }}>
              <Print variant="meta" tone="pencil">
                {council.asked}
                {used === 'world' ? ' · other books' : used === 'book' ? ' · one book' : ' · a council of books'}
              </Print>
              <Hand seed={council.question} size="large" tone="ink" style={{ marginTop: 4 }}>
                {council.question}
              </Hand>
            </Sheet>
          ) : (
            <Sheet seed="council-empty" tone="bright" lift={2} ruled={30} margin style={{ marginTop: 10 }} contentStyle={{ paddingLeft: 56, paddingRight: 18, paddingTop: 18, paddingBottom: 22 }}>
              <Hand seed="c-empty" size="large" tone="ink">
                Describe a real choice. The pages that belong to it will sit across from you.
              </Hand>
              <Print variant="meta" tone="pencil" style={{ marginTop: 10 }}>
                {material === 'world'
                  ? 'Other books: a short list that speaks to this choice.'
                  : material === 'book'
                    ? 'One book: the most relevant lines from a single volume.'
                    : highlights.length || notes.length
                      ? 'A council: the most relevant ideas from the books you are reading or have read.'
                      : 'Mark a line first, or ask other books to recommend a starting place.'}
              </Print>
            </Sheet>
          )}

          {council && (
            <>
              <Print variant="meta" tone="graphite" style={{ marginTop: 26, marginBottom: 16, marginLeft: 4 }}>
                {used === 'world'
                  ? worldVoices.length
                    ? `${worldVoices.length} book${worldVoices.length === 1 ? '' : 's'} for this choice`
                    : 'No book answered'
                  : deskVoices.length
                    ? `${deskVoices.length} perspective${deskVoices.length === 1 ? '' : 's'}`
                    : 'No page answered'}
              </Print>

              {used === 'world'
                ? worldVoices.map((v, i) => {
                    const next = worldVoices[i + 1];
                    const tensionBelow = tension && next && ((v.id === tension.a && next.id === tension.b) || (v.id === tension.b && next.id === tension.a));
                    return (
                      <View key={v.id}>
                        <WorldCard
                          index={i}
                          voice={v}
                          onShelf={alreadyOnShelf(v.title)}
                          onBring={() => {
                            if (alreadyOnShelf(v.title)) return;
                            addBook({
                              title: v.title,
                              author: v.author,
                              year: v.year,
                              status: 'someday',
                              why: v.why,
                              isbn: v.isbn,
                              cover: v.cover,
                            });
                          }}
                        />
                        {next ? (
                          tensionBelow ? (
                            <View style={{ height: 72, justifyContent: 'center' }}>
                              <View pointerEvents="none" style={{ position: 'absolute', left: 30, top: -12, width: 60, height: 86, zIndex: 2 }}>
                                <Arrow from={{ x: 6, y: 0 }} to={{ x: 38, y: 78 }} seed="council-tension" color={m.turquoise} curve={-0.3} width={1.6} />
                              </View>
                              <Hand seed="council-tension-note" size="note" tone="turquoise" slant={-2} style={{ marginLeft: 96 }}>
                                {tension.note}
                              </Hand>
                            </View>
                          ) : (
                            <View style={{ height: 14 }} />
                          )
                        ) : null}
                      </View>
                    );
                  })
                : deskVoices.map((v, i) => {
                    const next = deskVoices[i + 1];
                    const id = v.highlightId ?? v.noteId ?? String(i);
                    const nextId = next?.highlightId ?? next?.noteId;
                    const tensionBelow = tension && next && nextId && ((id === tension.a && nextId === tension.b) || (id === tension.b && nextId === tension.a));
                    return (
                      <View key={id}>
                        <DeskVoice index={i} highlightId={v.highlightId} noteId={v.noteId} stance={v.stance} support={v.support} />
                        {next ? (
                          tensionBelow ? (
                            <View style={{ height: 72, justifyContent: 'center' }}>
                              <View pointerEvents="none" style={{ position: 'absolute', left: 30, top: -12, width: 60, height: 86, zIndex: 2 }}>
                                <Arrow from={{ x: 6, y: 0 }} to={{ x: 38, y: 78 }} seed="council-tension" color={m.turquoise} curve={-0.3} width={1.6} />
                              </View>
                              <Hand seed="council-tension-note" size="note" tone="turquoise" slant={-2} style={{ marginLeft: 96 }}>
                                {tension.note}
                              </Hand>
                            </View>
                          ) : (
                            <View style={{ height: 14 }} />
                          )
                        ) : null}
                      </View>
                    );
                  })}

              {!!council.synthesis && (
                <Sheet seed="council-synthesis" tone="ivory" lift={1} style={{ marginTop: 28 }} contentStyle={{ padding: 20 }}>
                  <Print variant="label">{used === 'world' ? 'How they sit together' : 'How the pages sit together'}</Print>
                  <Print variant="body" style={{ marginTop: 8 }}>{council.synthesis}</Print>
                </Sheet>
              )}

              {!!clarifying.length && (
                <View style={{ marginTop: 26, marginLeft: 4 }}>
                  <Print variant="label">To sharpen this</Print>
                  {clarifying.map((q) => (
                    <Underlined key={q} seed={q} color={m.graphiteSoft} style={{ marginTop: 10 }}>
                      <Hand seed={q} size="note" tone="ink">
                        {q}
                      </Hand>
                    </Underlined>
                  ))}
                </View>
              )}

              {!!council.nextStep && (
                <Sheet seed="council-next" tone="cream" lift={1} style={{ marginTop: 26 }} contentStyle={{ padding: 20 }}>
                  <Print variant="label">Do this next</Print>
                  <Hand seed={council.nextStep} size="large" tone="navy" style={{ marginTop: 8 }}>
                    {council.nextStep}
                  </Hand>
                </Sheet>
              )}

              <Print variant="meta" tone="pencil" style={{ marginTop: 22, marginLeft: 4, marginRight: 8 }}>
                A reading is not a verdict. If a voice feels off, go back to the marked line.
              </Print>
            </>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6, backgroundColor: m.deskDeep }}>
        <Sheet seed="council-compose" tone="bright" lift={2} simple style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center' }} contentStyle={{ paddingLeft: 16, paddingRight: 4, paddingTop: 10, paddingBottom: 4 }}>
          <Choice<CouncilMaterial>
            label="Who sits at the table"
            value={material}
            onChange={(v) => setPrefs({ councilMaterial: v })}
            options={[
              { value: 'book', label: 'One book' },
              { value: 'council', label: 'A council' },
              { value: 'world', label: 'Other books' },
            ]}
          />
          {material === 'book' && shelf.length > 0 && (
            <Choice<string>
              label="Which book"
              value={bookId || shelf[0].id}
              onChange={setBookId}
              options={shelf.map((b) => ({ value: b.id, label: b.title }))}
            />
          )}
          <Row gap={4} style={{ alignItems: 'flex-start', marginTop: material === 'book' && shelf.length ? 4 : 8 }}>
            <LinedField
              label="The choice"
              placeholder={councilBusy ? 'Gathering the pages…' : 'The choice you are actually facing'}
              value={ask}
              onChangeText={setAsk}
              style={{ flex: 1 }}
              multiline
              blurOnSubmit={false}
              scrollEnabled
              editable={!councilBusy}
            />
            <IconButton icon="send" label="Ask" color={ask.trim() && !councilBusy ? m.turquoise : m.graphiteSoft} onPress={send} />
          </Row>
          <Print variant="meta" tone="pencil" style={{ marginTop: 2, marginBottom: 6, marginLeft: 2 }}>
            Not advice. A gathering of pages — and pages can be wrong.
          </Print>
        </Sheet>
      </View>
    </KeyboardAvoidingView>
  );
}
