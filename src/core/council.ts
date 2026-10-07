import type { Book, Highlight } from '@/data/notebook';
import { matchCatalog, searchCatalog } from '@/core/catalog';
import { completeJson, hasAi } from '@/lib/ai';
import type { CouncilManner, CouncilMaterial, Note } from '@/state/types';
import { nid, shortDate } from './ids';

export type Voice = { highlightId?: string; noteId?: string; stance: string; support?: string };
export type WorldVoice = {
  id: string;
  title: string;
  author: string;
  year?: string;
  why: string;
  stance: string;
  cover?: string;
  isbn?: string;
};
export type Tension = { a: string; b: string; note: string };
export type CouncilSession = {
  question: string;
  asked: string;
  material: CouncilMaterial;
  voices: Voice[];
  worldVoices?: WorldVoice[];
  synthesis: string;
  marginNote?: string;
  tension?: Tension;
  followUp: string;
  clarifying?: string[];
  nextStep?: string;
  bookId?: string;
  thin: boolean;
  lit?: boolean;
};

type DeskMatter = {
  highlights: Highlight[];
  books: Book[];
  notes: Note[];
  sittingQuestion?: string;
  bookId?: string;
};

const STOP = new Set(
  'a an the and or but if of to in for on with from by as is it this that be are was were been being at not no so my your our their what would should could will i me you we they how why when where who whom whose which than then also into about over after before'.split(
    ' ',
  ),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9’'\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function overlap(q: string[], text: string): number {
  const bag = tokens(text);
  if (!bag.length || !q.length) return 0;
  let n = 0;
  for (const w of q) if (bag.includes(w)) n += 1;
  return n;
}

function deskBooks(books: Book[]) {
  return books.filter((b) => b.status === 'reading' || b.status === 'finished');
}

function scoreHighlight(q: string[], h: Highlight): number {
  return overlap(q, `${h.text} ${h.note ?? ''} ${h.themes.join(' ')} ${h.where}`) + h.themes.length * 0.15;
}

function stanceFromHighlight(h: Highlight): string {
  if (h.note) return h.note.replace(/\?$/, '').trim();
  if (h.themes.includes('time')) return 'This is the passage you keep returning to when the subject is time.';
  if (h.themes.includes('control')) return 'You marked this as a reminder of what is actually yours to hold.';
  if (h.themes.includes('enough')) return 'You saved this as a measure of cost.';
  return 'You marked this. It is one of the voices that still speaks.';
}

/**
 * Answers from marked passages, notes, and the books being read or already read.
 * If the desk is too thin, it says so rather than inventing agreement.
 */
export function conveneDesk(question: string, matter: DeskMatter, manner: CouncilManner = 'strict', material: CouncilMaterial = 'council'): CouncilSession {
  const asked = shortDate();
  const q = tokens(question);
  const onDesk = deskBooks(matter.books);
  const pool = matter.bookId ? matter.highlights.filter((h) => h.bookId === matter.bookId) : matter.highlights;
  const ranked = pool
    .map((h) => ({ h, s: q.length ? scoreHighlight(q, h) : 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, material === 'book' ? 3 : 4)
    .map((x) => x.h);
  const rankedNotes = matter.notes
    .map((n) => ({ n, s: q.length ? overlap(q, n.text) : 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.n);

  if (!pool.length && !matter.notes.length && !onDesk.length) {
    return {
      question,
      asked,
      material,
      bookId: matter.bookId,
      voices: [],
      synthesis: 'There is nothing on the desk yet for this choice. Bring a book in and mark a line, then ask again.',
      followUp: 'Which line in the book would you trust to sit across from this choice?',
      clarifying: ['Which line in the book would you trust to sit across from this choice?'],
      nextStep: 'Open the book you are actually reading and mark one sentence that belongs to this choice.',
      thin: true,
    };
  }

  if (!ranked.length && !rankedNotes.length) {
    const recent = pool.slice(0, 2);
    const recentNotes = matter.notes.slice(0, 1);
    const voices: Voice[] = [
      ...recent.map((h) => ({ highlightId: h.id, stance: stanceFromHighlight(h), support: h.where ? `Marked at ${h.where}` : 'A line you marked.' })),
      ...recentNotes.map((n) => ({ noteId: n.id, stance: 'This is what you wrote lately. It is not an answer to this choice — only what has been on the desk.', support: `A note from ${n.date}` })),
    ];
    return {
      question,
      asked,
      material,
      bookId: matter.bookId,
      voices,
      synthesis: 'None of the marked lines share words with this choice. What sits below is only what you have been living with. It is not counsel yet.',
      followUp: 'What part of the choice have you not written down?',
      clarifying: ['What part of the choice have you not written down?', 'Is there a line you have not marked that this is really about?'],
      nextStep: 'Write the choice in one sentence, then mark the line that argues with it.',
      thin: true,
    };
  }

  const voices: Voice[] = [
    ...ranked.map((h) => ({
      highlightId: h.id,
      stance: stanceFromHighlight(h),
      support: [h.where || undefined, h.themes[0] ? `theme: ${h.themes[0]}` : undefined].filter(Boolean).join(' · ') || 'A line you marked.',
    })),
    ...rankedNotes.map((n) => ({ noteId: n.id, stance: 'You wrote this in your own hand. It belongs at the table with the books.', support: `A note from ${n.date}` })),
  ];
  const titles = [
    ...new Set(
      ranked
        .map((h) => onDesk.find((b) => b.id === h.bookId)?.title ?? matter.books.find((b) => b.id === h.bookId)?.title)
        .filter(Boolean),
    ),
  ] as string[];
  const themes = [...new Set(ranked.flatMap((h) => h.themes))];
  const sitting = matter.sittingQuestion?.trim();

  let tension: Tension | undefined;
  const models = ranked.find((h) => h.themes.includes('models'));
  const self = ranked.find((h) => h.themes.includes('self') || h.themes.includes('character'));
  if (models && self && models.id !== self.id) {
    tension = { a: models.id, b: self.id, note: 'These two ideas don’t quite agree.' };
  }

  const margin = ranked.map((h) => h.note).find(Boolean) ?? rankedNotes[0]?.text;
  const from = titles.length ? titles.join(' and ') : onDesk.map((b) => b.title).slice(0, 2).join(' and ') || 'your notes';
  const thread = themes[0] ?? (rankedNotes.length ? 'what you keep writing down' : 'attention');
  const synthesis = tension
    ? manner === 'warm'
      ? `From ${from}, sitting with your own notes: ${themes.slice(0, 3).join(', ') || thread}. They do not quite agree, and that disagreement is the useful part.${sitting ? ` You have already been sitting with: ${sitting}` : ''}`
      : `Drawn from ${from}. The shared thread is ${themes.slice(0, 3).join(', ') || thread}. Where they part is on whose judgement to trust.${sitting ? ` That sits next to the question you left on the desk: ${sitting}` : ''}`
    : manner === 'warm'
      ? `From ${from}. What you keep underlining and writing is ${thread}. These are your pages talking among themselves — they will not decide, but they will not let the question stay polite.`
      : `Drawn from ${from}. The strongest thread is ${thread}. These passages and notes do not decide for you; they are what still speaks when you ask this.`;

  const followUp = themes.includes('time')
    ? 'What would have to be given back for the hours to be worth it?'
    : rankedNotes.length
      ? 'If you had to keep one sentence — a marked line or a note of yours — which one changes what you do tomorrow?'
      : 'Which of these pages would you keep if you could only keep one?';

  const nextStep = themes.includes('time')
    ? 'Protect one hour today for the side of this choice you keep postponing.'
    : `Do the smaller next act that ${from} would not let you delay.`;
  const clarifying = [
    followUp,
    sitting ? `Does “${sitting}” change if you take that step?` : 'What would you have to give up for the other side to win?',
  ];

  return { question, asked, material, bookId: matter.bookId, voices, synthesis, marginNote: margin, tension, followUp, clarifying, nextStep, thin: false };
}

const WORLD_SHELF: { title: string; author: string; year: string; themes: string[]; why: string; stance: string }[] = [
  { title: 'Meditations', author: 'Marcus Aurelius', year: 'c. 180', themes: ['time', 'control', 'duty', 'anger', 'work', 'self'], why: 'A private notebook on what is actually yours to hold.', stance: 'Do the work that is in front of you. The rest is weather.' },
  { title: 'Letters from a Stoic', author: 'Seneca', year: 'c. 65', themes: ['time', 'enough', 'friend', 'death', 'busy'], why: 'Letters that price a life in hours, not intentions.', stance: 'You are not short of time. You are generous with it toward the wrong things.' },
  { title: 'On the Shortness of Life', author: 'Seneca', year: 'c. 49', themes: ['time', 'life', 'busy', 'age'], why: 'The briefest case that a life is long enough if it is not wasted.', stance: 'Stop postponing the life you claim to want.' },
  { title: 'Walden', author: 'Henry David Thoreau', year: '1854', themes: ['enough', 'time', 'simple', 'cost', 'nature'], why: 'An experiment in what a day is worth when you stop buying it back.', stance: 'The cost of a thing is the amount of life you exchange for it.' },
  { title: 'The Essays', author: 'Michel de Montaigne', year: '1580', themes: ['self', 'doubt', 'know', 'fear'], why: 'A mind thinking in public, without pretending to be finished.', stance: 'I do not understand myself yet. That is the work, not the obstacle.' },
  { title: 'Man’s Search for Meaning', author: 'Viktor Frankl', year: '1946', themes: ['meaning', 'suffer', 'purpose', 'pain', 'hope'], why: 'A book that will not let suffering stay meaningless, or comfort stay cheap.', stance: 'You cannot always choose the pain. You can choose the task it is for.' },
  { title: 'The Death of Ivan Ilyich', author: 'Leo Tolstoy', year: '1886', themes: ['death', 'life', 'enough', 'work', 'honest'], why: 'A short novel about a life that looked correct until it had to be lived.', stance: 'The question is not whether you succeeded. It is whether you were alive in it.' },
  { title: 'A Room of One’s Own', author: 'Virginia Woolf', year: '1929', themes: ['work', 'freedom', 'write', 'money', 'woman'], why: 'The conditions a mind needs, named without romance.', stance: 'A thought needs a door that closes and a little money of its own.' },
  { title: 'Tao Te Ching', author: 'Laozi', year: 'c. 400 BCE', themes: ['control', 'enough', 'force', 'simple', 'lead'], why: 'A short book against forcing what will not be forced.', stance: 'The more you grip, the more the thing leaves.' },
  { title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', year: '1880', themes: ['faith', 'guilt', 'freedom', 'love', 'father'], why: 'A long argument among brothers about God, guilt, and what love costs.', stance: 'If God is gone, everything is permitted — and that is not freedom.' },
  { title: 'Nicomachean Ethics', author: 'Aristotle', year: 'c. 350 BCE', themes: ['virtue', 'habit', 'good', 'friend', 'practice'], why: 'Character as something you build by repetition, not mood.', stance: 'We become just by doing just acts. Wanting it is not the same as practicing it.' },
  { title: 'The Prophet', author: 'Kahlil Gibran', year: '1923', themes: ['love', 'work', 'give', 'leave'], why: 'Short counsel on love and work that still refuses to be sweet.', stance: 'Work is love made visible — or it is only a way to hide from both.' },
  { title: 'The Myth of Sisyphus', author: 'Albert Camus', year: '1942', themes: ['meaning', 'absurd', 'hope', 'work'], why: 'A clear look at a life that will not explain itself.', stance: 'The struggle itself toward the heights is enough to fill a heart.' },
  { title: 'Letters to a Young Poet', author: 'Rainer Maria Rilke', year: '1929', themes: ['write', 'alone', 'patience', 'self', 'art'], why: 'Advice that asks you to live the question instead of borrowing an answer.', stance: 'Be patient toward all that is unsolved in your heart.' },
  { title: 'The Fire Next Time', author: 'James Baldwin', year: '1963', themes: ['love', 'justice', 'fear', 'country', 'honest'], why: 'A letter that will not let love stay sentimental, or a country stay innocent.', stance: 'Love takes off the masks we fear we cannot live without.' },
];

function conveneWorldFallback(question: string, books: Book[], manner: CouncilManner): CouncilSession {
  const asked = shortDate();
  const q = tokens(question);
  const owned = new Set(books.map((b) => b.title.toLowerCase()));
  const ranked = WORLD_SHELF.map((b) => ({
    b,
    s: overlap(q, `${b.title} ${b.author} ${b.themes.join(' ')} ${b.why} ${b.stance}`),
  }))
    .filter((x) => x.s > 0 && !owned.has(x.b.title.toLowerCase()))
    .sort((a, c) => c.s - a.s)
    .slice(0, 3)
    .map((x) => x.b);

  const pick = ranked.length ? ranked : WORLD_SHELF.filter((b) => !owned.has(b.title.toLowerCase())).slice(0, 3);
  const worldVoices: WorldVoice[] = pick.map((b) => ({
    id: nid('w'),
    title: b.title,
    author: b.author,
    year: b.year,
    why: b.why,
    stance: b.stance,
  }));

  if (!q.length) {
    return {
      question,
      asked,
      material: 'world',
      voices: [],
      worldVoices,
      synthesis: 'Ask something specific. The wider shelf can name books, but it needs a question with a point.',
      followUp: 'What do you want a book to change — a decision, a fear, or a habit?',
      clarifying: ['What do you want a book to change — a decision, a fear, or a habit?'],
      nextStep: 'Write the choice in one sentence, then ask again.',
      thin: true,
    };
  }

  const titles = worldVoices.map((v) => v.title).join(', ');
  return {
    question,
    asked,
    material: 'world',
    voices: [],
    worldVoices,
    synthesis:
      manner === 'warm'
        ? `The wider shelf offers ${titles}. These are not your pages. They are books that have sat with questions like this one. Open one and see if it earns a place on your desk.`
        : `From the wider shelf: ${titles}. None of these are on your desk yet. They are recommendations, not verdicts — the useful next step is to open one and mark a line.`,
    followUp: 'Which of these would you trust enough to open this week?',
    clarifying: ['Which of these would you trust enough to open this week?'],
    nextStep: `Open ${worldVoices[0]?.title ?? 'one of these'} and mark the first sentence that argues with your choice.`,
    thin: false,
  };
}

async function enrichWorldVoices(voices: WorldVoice[]): Promise<WorldVoice[]> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 9000);
  try {
    return await Promise.all(
      voices.map(async (voice) => {
        try {
          const hit = await matchCatalog(voice.title, voice.author, control.signal);
          if (!hit) return voice;
          return {
            ...voice,
            year: voice.year || hit.year,
            cover: hit.cover,
            isbn: hit.isbn,
          };
        } catch {
          return voice;
        }
      }),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function conveneWorldFromCatalog(question: string, books: Book[]): Promise<WorldVoice[]> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 8000);
  try {
    const rows = await searchCatalog(question, control.signal);
    const owned = new Set(books.map((b) => b.title.toLowerCase()));
    return rows
      .filter((row) => !owned.has(row.title.toLowerCase()))
      .slice(0, 3)
      .map((row) => ({
        id: nid('w'),
        title: row.title,
        author: row.author,
        year: row.year,
        cover: row.cover,
        isbn: row.isbn,
        why: 'The catalogue offered this spine for the words in your question.',
        stance: 'Open it and see whether it earns a mark. A title is not yet a voice.',
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

type AiDesk = {
  voices?: { highlightId?: string; noteId?: string; stance?: string; support?: string }[];
  synthesis?: string;
  followUp?: string;
  clarifying?: string[];
  nextStep?: string;
  tensionNote?: string;
};

type AiWorld = {
  voices?: { title?: string; author?: string; year?: string; why?: string; stance?: string }[];
  synthesis?: string;
  followUp?: string;
  clarifying?: string[];
  nextStep?: string;
  tensionNote?: string;
  tension?: { a?: string; b?: string };
};

const DESK_SYSTEM = `You are the council in Praxzis. A person has brought a real choice. You retrieve the most relevant marked passages from their books, explain each perspective with traceable support, ask clarifying questions, name tensions, and turn the counsel into one practical next step.

Rules:
- Never invent a book, author, quote, or fact. The passage text is already given; cite it, do not rewrite it as if new.
- Each stance speaks FROM that passage TO this choice. Add support: why this line is the evidence (location, theme, or the reader's own margin).
- If several books are present, let them disagree. If one book is present, let its passages disagree with each other.
- Clarifying: two short questions that sharpen the choice. Not rhetorical decoration.
- Next step: one concrete act they can do in the next day. Not a mantra.
- Synthesis: three to six sentences that put the perspectives together and name the tension.
- Strict: spare and exact. Warm: intimate, still grounded.
- Do not flatter. Do not soothe. Keep the reader as “you”.`;

const WORLD_SYSTEM = `You are the council in Praxzis, asked for books the reader does not own. A person has brought a real choice. Recommend three real, published books that would counsel that choice.

Rules:
- Only real titles and authors. Never invent a book, a year, or a quotation.
- Prefer enduring, specific works over generic self-help.
- Do not recommend a book already on their shelf.
- For each book: why it belongs with THIS choice, and the stance it would take — described, not quoted.
- Clarifying: two short questions. Next step: one concrete act (usually: open one book and mark a line).
- Synthesis: three to five sentences.
- Keep the reader as “you”.`;

async function lightDesk(
  base: CouncilSession,
  question: string,
  matter: DeskMatter,
  manner: CouncilManner,
): Promise<CouncilSession> {
  const onDesk = deskBooks(matter.books);
  const pages = base.voices
    .map((v) => {
      if (v.highlightId) {
        const h = matter.highlights.find((x) => x.id === v.highlightId);
        const book = h ? matter.books.find((b) => b.id === h.bookId) : undefined;
        if (!h || !book) return '';
        return `highlight id=${h.id}\nbook=${book.title} — ${book.author} (${book.status})\npassage=${h.text}\nmargin=${h.note ?? ''}\nthemes=${h.themes.join(', ')}`;
      }
      if (v.noteId) {
        const n = matter.notes.find((x) => x.id === v.noteId);
        if (!n) return '';
        return `note id=${n.id}\ndate=${n.date}\ntext=${n.text}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  const shelf = onDesk
    .map((b) => `${b.title} — ${b.author} (${b.status})${b.why ? `; why: ${b.why}` : ''}${b.principle ? `; principle: ${b.principle}` : ''}`)
    .join('\n');
  const extraNotes = matter.notes
    .filter((n) => !base.voices.some((v) => v.noteId === n.id))
    .slice(0, 4)
    .map((n) => `${n.date}: ${n.text}`)
    .join('\n');

  const lit = await completeJson<AiDesk>(
    DESK_SYSTEM,
    `Manner: ${manner}\nScope: ${base.material === 'book' ? 'one book' : 'a council of books'}\nChoice: ${question}\nSitting question: ${matter.sittingQuestion?.trim() || '(none)'}\n\nBooks:\n${shelf || '(none)'}\n\nOther notes:\n${extraNotes || '(none)'}\n\nRetrieved passages:\n${pages}`,
    { timeoutMs: 24000, temperature: 0.5 },
  );
  if (!lit) return base;

  const voices = base.voices.map((v) => {
    const next = lit.voices?.find((x) => (v.highlightId && x.highlightId === v.highlightId) || (v.noteId && x.noteId === v.noteId));
    if (!next) return v;
    return {
      ...v,
      stance: next.stance?.trim() || v.stance,
      support: next.support?.trim() || v.support,
    };
  });
  const clarifying = (lit.clarifying?.map((c) => c.trim()).filter(Boolean) ?? []).slice(0, 3);
  return {
    ...base,
    voices,
    synthesis: lit.synthesis?.trim() || base.synthesis,
    followUp: lit.followUp?.trim() || clarifying[0] || base.followUp,
    clarifying: clarifying.length ? clarifying : base.clarifying,
    nextStep: lit.nextStep?.trim() || base.nextStep,
    tension: base.tension ? { ...base.tension, note: lit.tensionNote?.trim() || base.tension.note } : base.tension,
    lit: true,
  };
}

async function lightWorld(
  question: string,
  books: Book[],
  notes: Note[],
  manner: CouncilManner,
  fallback: CouncilSession,
): Promise<CouncilSession> {
  const shelf = books.map((b) => `${b.title} — ${b.author} (${b.status})`).join('\n');
  const noteLine = notes.slice(0, 4).map((n) => n.text).join(' | ');
  const lit = await completeJson<AiWorld>(
    WORLD_SYSTEM,
    `Manner: ${manner}\nChoice: ${question}\n\nAlready on the shelf (do not recommend these):\n${shelf || '(empty)'}\n\nNotes, for tone only:\n${noteLine || '(none)'}`,
    { timeoutMs: 22000, temperature: 0.4 },
  );
  if (!lit?.voices?.length) return fallback;

  const owned = new Set(books.map((b) => b.title.toLowerCase()));
  const raw = lit.voices
    .filter((v) => v.title?.trim() && v.author?.trim() && !owned.has(v.title.trim().toLowerCase()))
    .slice(0, 4)
    .map((v) => ({
      id: nid('w'),
      title: v.title!.trim(),
      author: v.author!.trim(),
      year: v.year?.trim() || undefined,
      why: v.why?.trim() || 'This book knows the weather of this question.',
      stance: v.stance?.trim() || 'Open it and see whether it earns a place on the desk.',
    }));
  if (!raw.length) return fallback;

  const worldVoices = await enrichWorldVoices(raw);
  const ids = new Map(worldVoices.map((v) => [v.title.toLowerCase(), v.id]));
  const a = lit.tension?.a ? ids.get(lit.tension.a.toLowerCase()) : undefined;
  const b = lit.tension?.b ? ids.get(lit.tension.b.toLowerCase()) : undefined;
  const tension = a && b && a !== b ? { a, b, note: lit.tensionNote?.trim() || 'These two books would not give the same counsel.' } : undefined;

  return {
    question,
    asked: shortDate(),
    material: 'world',
    voices: [],
    worldVoices,
    synthesis: lit.synthesis?.trim() || fallback.synthesis,
    followUp: lit.followUp?.trim() || fallback.followUp,
    clarifying: lit.clarifying?.map((c) => c.trim()).filter(Boolean).slice(0, 3) || fallback.clarifying,
    nextStep: lit.nextStep?.trim() || fallback.nextStep,
    tension,
    thin: false,
    lit: true,
  };
}

export async function conveneWithAi(
  question: string,
  highlights: Highlight[],
  books: Book[],
  manner: CouncilManner = 'strict',
  allowAi = true,
  material: CouncilMaterial = 'council',
  notes: Note[] = [],
  sittingQuestion = '',
  bookId?: string,
): Promise<CouncilSession> {
  const matter: DeskMatter = { highlights, books, notes, sittingQuestion, bookId: material === 'book' ? bookId : undefined };

  if (material === 'world') {
    const fallback = conveneWorldFallback(question, books, manner);
    if (!allowAi || !hasAi) {
      const fromCatalog = await conveneWorldFromCatalog(question, books);
      if (fromCatalog.length) {
        const merged = [...fromCatalog, ...(fallback.worldVoices ?? [])]
          .filter((v, i, all) => all.findIndex((x) => x.title.toLowerCase() === v.title.toLowerCase()) === i)
          .slice(0, 3);
        return { ...fallback, worldVoices: merged, thin: false };
      }
      return fallback;
    }
    return lightWorld(question, books, notes, manner, fallback);
  }

  const base = conveneDesk(question, matter, manner, material);
  if (!allowAi || !hasAi || base.thin || !base.voices.length) return base;
  return lightDesk(base, question, matter, manner);
}
