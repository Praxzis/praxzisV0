import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { HighlightEntry } from '@/components/highlight-entry';
import { StickyNote } from '@/components/sticky-note';
import { todayHeading } from '@/core/ids';
import { Hand, IconButton, InkButton, LinedField, NotebookPage, Print, Row, Section, Sheet, Underlined, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

export default function Today() {
  const { m } = useNotebook();
  const {
    session,
    currentIdea,
    bookById,
    books,
    highlights,
    notes,
    sittingQuestion,
    setSittingQuestion,
    markIdea,
    addNote,
    removeNote,
    prefs,
    setPendingCouncil,
  } = useStore();
  const [draftQ, setDraftQ] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [openNote, setOpenNote] = useState<string | null>(null);

  const latest = highlights[0];
  const reading = books.find((b) => b.status === 'reading');
  const sources = currentIdea?.from?.map((id) => bookById(id)?.title).filter(Boolean).join(' & ');
  const glance = [
    session?.name,
    books.length ? `${books.length} book${books.length === 1 ? '' : 's'}` : null,
    highlights.length ? `${highlights.length} marked` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const blank = !reading && !currentIdea && !latest && !sittingQuestion && notes.length === 0 && books.length === 0;

  const askCouncil = (question: string) => {
    setPendingCouncil(question);
    router.push('/(tabs)/council');
  };

  return (
    <NotebookPage seed="today">
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Print variant="label" accessibilityRole="header">
          Today
        </Print>
        <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </Row>

      <Hand seed={todayHeading(undefined, prefs.dateVoice)} size="title" tone="navy" slant={-1} style={{ marginTop: 4 }}>
        {todayHeading(undefined, prefs.dateVoice)}
      </Hand>
      {!!glance && (
        <Print variant="meta" tone="pencil" style={{ marginTop: 6 }}>
          {glance}
        </Print>
      )}

      {blank && (
        <Sheet seed="today-blank" tone="ivory" lift={1} simple style={{ marginTop: 22 }} contentStyle={{ padding: 18 }}>
          <Hand seed="today-blank" size="large" tone="ink">
            The page is still blank.
          </Hand>
          <Print variant="body" tone="graphite" style={{ marginTop: 8 }}>
            Bring a book. Mark a line that stays. Sit with a question when the day asks one.
          </Print>
          <Row gap={10} style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <InkButton label="Add a book" onPress={() => router.push('/book/new')} seed="today-add" />
            <InkButton label="Mark a line" kind="secondary" onPress={() => router.push('/mark')} seed="today-mark" />
          </Row>
        </Sheet>
      )}

      {reading && (
        <Section label="Reading now">
          <Sheet seed="today-reading" tone="cream" lift={1} simple contentStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 5, borderRadius: 1, backgroundColor: m.cloth[reading.cloth % m.cloth.length] }} />
              <View style={{ flex: 1 }}>
                <Print variant="heading" tone="ink" style={{ fontSize: 20 }}>
                  {reading.title}
                </Print>
                <Print variant="meta" tone="pencil" style={{ marginTop: 2 }}>
                  {reading.author}
                  {reading.year ? ` · ${reading.year}` : ''}
                </Print>
                <Row gap={10} style={{ marginTop: 14, flexWrap: 'wrap' }}>
                  <InkButton
                    label="Continue"
                    kind="secondary"
                    onPress={() => router.push(`/book/${reading.id}`)}
                    seed="today-continue"
                  />
                  <InkButton
                    label="Mark a line"
                    kind="quiet"
                    onPress={() => router.push({ pathname: '/mark', params: { bookId: reading.id } })}
                  />
                </Row>
              </View>
            </View>
          </Sheet>
        </Section>
      )}

      {!reading && books.length > 0 && (
        <Section label="Reading now">
          <Hand seed="today-no-open" size="note" tone="graphite">
            Nothing is open on the desk.
          </Hand>
          <InkButton label="Open the shelf" kind="quiet" onPress={() => router.push('/(tabs)/library')} style={{ marginTop: 4 }} />
        </Section>
      )}

      {currentIdea && (
        <Section label="This week" right={<InkButton label="The week" kind="quiet" onPress={() => router.push('/(tabs)/ideas')} />}>
          <StickyNote seed={currentIdea.id} style={{ marginRight: 10, marginLeft: 2 }}>
            <Hand seed={currentIdea.id} size="large">
              {currentIdea.text}
            </Hand>
            {!!sources && (
              <Print variant="meta" style={{ marginTop: 10 }}>
                From {sources}
              </Print>
            )}
            <Row gap={10} style={{ marginTop: 16, flexWrap: 'wrap' }}>
              {currentIdea.deferred ? (
                <Hand seed="o-later" size="note" tone="turquoise">
                  Later this week
                </Hand>
              ) : (
                <>
                  <InkButton label="I tried it" onPress={() => markIdea('tried')} seed="tried" />
                  <InkButton label="Not yet" kind="secondary" onPress={() => markIdea('later')} seed="later" />
                </>
              )}
            </Row>
          </StickyNote>
        </Section>
      )}

      <Section label="Sitting with">
        {sittingQuestion ? (
          <View>
            <Underlined seed="question" draw delay={400} color={m.turquoise}>
              <Hand seed={sittingQuestion} size="large" tone="ink">
                {sittingQuestion}
              </Hand>
            </Underlined>
            <Row gap={10} style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <InkButton label="Ask the council" onPress={() => askCouncil(sittingQuestion)} seed="ask-sit" />
              <InkButton label="Write another" kind="quiet" onPress={() => setSittingQuestion('')} />
            </Row>
          </View>
        ) : (
          <>
            <LinedField
              label="A question to sit with"
              placeholder="The question the day is actually asking"
              value={draftQ}
              onChangeText={setDraftQ}
              multiline
            />
            <Row gap={10} style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <InkButton
                label="Keep this"
                disabled={!draftQ.trim()}
                onPress={() => {
                  setSittingQuestion(draftQ.trim());
                  setDraftQ('');
                }}
                seed="keep-q"
              />
              <InkButton
                label="Ask the council"
                kind="quiet"
                disabled={!draftQ.trim()}
                onPress={() => {
                  const q = draftQ.trim();
                  setSittingQuestion(q);
                  setDraftQ('');
                  askCouncil(q);
                }}
              />
            </Row>
          </>
        )}
      </Section>

      {latest && (
        <Section label="Last marked" right={<InkButton label="All lines" kind="quiet" onPress={() => router.push('/(tabs)/mind')} />}>
          <HighlightEntry h={latest} />
        </Section>
      )}

      <Section label="On this page">
        {notes.map((n, i) => {
          const open = openNote === n.id;
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.date}. ${n.text}`}
              accessibilityHint={open ? 'Hides the option to remove this note' : 'Shows the option to remove this note'}
              onPress={() => setOpenNote(open ? null : n.id)}
              style={({ pressed }) => ({
                marginTop: i === 0 ? 0 : 14,
                paddingBottom: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Print variant="meta" tone="pencil">
                {n.date}
              </Print>
              <Hand seed={n.id} size="note" style={{ marginTop: 2 }}>
                {n.text}
              </Hand>
              {open && (
                <InkButton
                  label="Cross this out"
                  kind="quiet"
                  onPress={() => {
                    removeNote(n.id);
                    setOpenNote(null);
                  }}
                  style={{ marginTop: 4 }}
                />
              )}
            </Pressable>
          );
        })}
        <LinedField
          label="A note for this page"
          placeholder={notes.length ? 'Another line' : 'The first line on this page'}
          value={draftNote}
          onChangeText={setDraftNote}
          style={{ marginTop: notes.length ? 16 : 0 }}
        />
        <InkButton
          label="Write it down"
          disabled={!draftNote.trim()}
          onPress={() => {
            addNote(draftNote);
            setDraftNote('');
          }}
          kind="secondary"
          seed="add-note"
          style={{ marginTop: 12 }}
        />
      </Section>
    </NotebookPage>
  );
}
