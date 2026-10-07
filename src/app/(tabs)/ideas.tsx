import { useState } from 'react';
import { View } from 'react-native';

import { StickyNote } from '@/components/sticky-note';
import { CrossedOut, Divider, Doodle, Hand, InkButton, LinedField, NotebookPage, PageHeading, Print, Row, Section, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';
import type { Idea } from '@/data/notebook';

const OUTCOME_LABEL = { tried: 'Tried', skipped: 'Let go', unsure: 'Not sure yet' } as const;

function PastIdea({ idea }: { idea: Idea }) {
  const { m } = useNotebook();
  const { bookById } = useStore();
  const text = (
    <Hand seed={idea.id} size="note" tone={idea.outcome === 'skipped' ? 'graphite' : 'ink'}>
      {idea.text}
    </Hand>
  );
  return (
    <View accessible accessibilityLabel={`Week of ${idea.week}: ${idea.text}. ${idea.outcome ? OUTCOME_LABEL[idea.outcome] : ''}. ${idea.reflection ?? ''}`} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 30, alignItems: 'center', paddingTop: 4 }}>
        {idea.outcome === 'tried' && <Doodle kind="check" seed={`c-${idea.id}`} size={24} color={m.turquoise} />}
        {idea.outcome === 'skipped' && <Doodle kind="cross" seed={`x-${idea.id}`} size={18} color={m.graphiteSoft} width={1.3} />}
        {idea.outcome === 'unsure' && <Doodle kind="question" seed={`q-${idea.id}`} size={24} color={m.graphite} />}
      </View>
      <View style={{ flex: 1 }}>
        <Print variant="meta" tone="pencil">
          Week of {idea.week}
          {idea.from?.length ? ` · ${idea.from.map((f) => bookById(f)?.title).filter(Boolean).join(', ')}` : ''}
        </Print>
        {idea.outcome === 'skipped' ? <CrossedOut seed={`co-${idea.id}`}>{text}</CrossedOut> : text}
        {idea.reflection && (
          <Hand seed={`${idea.id}-r`} size="small" tone="graphite" slant={-0.8} style={{ marginTop: 2, marginLeft: 10 }}>
            {`→ ${idea.reflection}`}
          </Hand>
        )}
      </View>
    </View>
  );
}

export default function Ideas() {
  const { currentIdea, pastIdeas, bookById, markIdea } = useStore();
  const [entry, setEntry] = useState('');
  const tried = pastIdeas.filter((i) => i.outcome === 'tried').length;

  return (
    <NotebookPage seed="ideas" ruled>
      <PageHeading
        label="Ideas"
        title="One idea a week"
        seed="ideas-title"
        aside={pastIdeas.length ? `${tried} of the last ${pastIdeas.length} actually tried` : 'the first week is still open'}
      />

      {currentIdea ? (
        <StickyNote seed={currentIdea.id} style={{ marginHorizontal: 10, marginTop: 6 }}>
          <Print variant="label">{currentIdea.week}</Print>
          <Hand seed={currentIdea.id} size="statement" tone="ink" write style={{ marginTop: 6 }}>
            {currentIdea.text}
          </Hand>
          {!!currentIdea.from?.length && (
            <Print variant="meta" style={{ marginTop: 10 }}>
              Drawn from {currentIdea.from.map((f) => bookById(f)?.title).filter(Boolean).join(' and ')}
            </Print>
          )}
        </StickyNote>
      ) : (
        <View>
          <Hand seed="no-idea" size="large" tone="ink">
            The week is still open.
          </Hand>
          <Print variant="body" tone="graphite" style={{ marginTop: 8 }}>
            Mark a few passages and one sentence you can try will land here.
          </Print>
        </View>
      )}

      {currentIdea && (
        <Section label="How did it go?">
          {currentIdea.outcome ? null : currentIdea.deferred && !entry ? (
            <Hand seed="deferred" size="note" tone="turquoise">Saved for later this week.</Hand>
          ) : null}
          <LinedField label="Write how this week’s idea went" placeholder="A line or two is plenty…" value={entry} onChangeText={setEntry} multiline />
          <Row gap={10} style={{ marginTop: 14, flexWrap: 'wrap' }}>
            <InkButton
              label="Keep this note"
              disabled={!entry.trim()}
              onPress={() => {
                markIdea('tried', entry.trim());
                setEntry('');
              }}
              seed="keep-idea"
            />
            <InkButton label="Let it go" kind="secondary" onPress={() => markIdea('skipped', entry.trim() || undefined)} seed="skip-idea" />
          </Row>
        </Section>
      )}

      <Section label="Earlier weeks">
        {pastIdeas.map((idea, i) => (
          <View key={idea.id}>
            {i > 0 && <Divider seed={`id-${idea.id}`} style={{ marginVertical: 10, opacity: 0.5 }} />}
            <PastIdea idea={idea} />
          </View>
        ))}
        {!pastIdeas.length && (
          <Hand seed="no-past" size="small" tone="graphite">
            Weeks you try will collect underneath, like older pages.
          </Hand>
        )}
      </Section>
    </NotebookPage>
  );
}
