/**
 * Placeholder notebook contents so every screen can be designed against
 * realistic material. Public-domain books only. Replace with the real store.
 */

export type BookStatus = 'reading' | 'finished' | 'someday';

export type Book = {
  id: string;
  title: string;
  author: string;
  year: string;
  status: BookStatus;
  cloth: number;
  /** Relative spine height on the shelf, 0..1. */
  spine: number;
  started: string;
  why: string;
  principle?: string;
  page: number;
  isbn?: string;
  cover?: string;
};

export type Mark = 'marker' | 'underline' | 'circle';

export type Highlight = {
  id: string;
  bookId: string;
  text: string;
  where: string;
  mark: Mark;
  note?: string;
  /** A word in the passage the reader circled. */
  circled?: string;
  saved: string;
  themes: string[];
};

export const books: Book[] = [
  {
    id: 'meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    year: 'c. 180',
    status: 'reading',
    cloth: 0,
    spine: 0.78,
    started: '12 Sep',
    why: 'Picked it up after a bad week at work. Wanted something older than my problems.',
    principle: 'Spend the morning on what is up to me.',
    page: 12,
  },
  {
    id: 'letters',
    title: 'Letters from a Stoic',
    author: 'Seneca',
    year: 'c. 65',
    status: 'reading',
    cloth: 2,
    spine: 0.92,
    started: '20 Sep',
    why: 'Marcus keeps sounding like him. Going to the source.',
    principle: 'Guard my hours like money.',
    page: 18,
  },
  {
    id: 'walden',
    title: 'Walden',
    author: 'Henry David Thoreau',
    year: '1854',
    status: 'finished',
    cloth: 1,
    spine: 0.84,
    started: 'Aug',
    why: 'Summer book. Read most of it on the porch.',
    principle: 'Cost = the amount of life I exchange for it.',
    page: 24,
  },
  {
    id: 'self-reliance',
    title: 'Self-Reliance',
    author: 'Ralph Waldo Emerson',
    year: '1841',
    status: 'finished',
    cloth: 3,
    spine: 0.58,
    started: 'Jul',
    why: 'Short. Annoyingly convincing.',
    principle: 'Trust the thought before it is borrowed.',
    page: 31,
  },
  {
    id: 'essays',
    title: 'Essays',
    author: 'Michel de Montaigne',
    year: '1580',
    status: 'someday',
    cloth: 5,
    spine: 1,
    started: '—',
    why: 'Everyone I like quotes him.',
    page: 38,
  },
  {
    id: 'franklin',
    title: 'Autobiography',
    author: 'Benjamin Franklin',
    year: '1791',
    status: 'someday',
    cloth: 6,
    spine: 0.7,
    started: '—',
    why: 'For the thirteen virtues chart.',
    page: 40,
  },
];

export const highlights: Highlight[] = [
  {
    id: 'm1',
    bookId: 'meditations',
    text: 'Things do not touch the soul, for they are external and remain immovable; but our perturbations come only from the opinion which is within.',
    where: 'Book IV',
    mark: 'marker',
    note: 'This is the whole book, isn’t it?',
    circled: 'opinion',
    saved: '2 days ago',
    themes: ['control', 'attention'],
  },
  {
    id: 'm2',
    bookId: 'meditations',
    text: 'In the morning when thou risest unwillingly, let this thought be present — I am rising to the work of a human being.',
    where: 'Book V',
    mark: 'underline',
    note: 'Read on a Monday. Helped.',
    saved: 'last week',
    themes: ['work', 'mornings'],
  },
  {
    id: 's1',
    bookId: 'letters',
    text: 'Hold every hour in your grasp. Lay hold of today’s task, and you will not need to depend so much upon tomorrow’s.',
    where: 'Letter I',
    mark: 'marker',
    note: 'Time as the only thing that is actually mine.',
    circled: 'hour',
    saved: 'yesterday',
    themes: ['time', 'attention'],
  },
  {
    id: 's2',
    bookId: 'letters',
    text: 'Cherish some man of high character, and keep him ever before your eyes, living as if he were watching you.',
    where: 'Letter XI',
    mark: 'underline',
    note: 'Who would that be for me?',
    saved: '4 days ago',
    themes: ['models', 'character'],
  },
  {
    id: 'w1',
    bookId: 'walden',
    text: 'The cost of a thing is the amount of what I will call life which is required to be exchanged for it, immediately or in the long run.',
    where: 'Economy',
    mark: 'marker',
    note: 'Use this before buying anything over $100.',
    circled: 'life',
    saved: 'Aug',
    themes: ['time', 'enough'],
  },
  {
    id: 'w2',
    bookId: 'walden',
    text: 'Our life is frittered away by detail. Simplify, simplify.',
    where: 'Where I Lived',
    mark: 'underline',
    saved: 'Aug',
    themes: ['enough', 'attention'],
  },
  {
    id: 'e1',
    bookId: 'self-reliance',
    text: 'Insist on yourself; never imitate.',
    where: '¶ 42',
    mark: 'marker',
    note: 'Seneca says the opposite?',
    saved: 'Jul',
    themes: ['models', 'character'],
  },
  {
    id: 'e2',
    bookId: 'self-reliance',
    text: 'To believe your own thought, to believe that what is true for you in your private heart is true for all men — that is genius.',
    where: '¶ 1',
    mark: 'underline',
    saved: 'Jul',
    themes: ['character'],
  },
];

export const notes = [
  { id: 'n1', date: 'Sun 4 Oct', text: 'Noticed I only read Stoics when work is going badly. Is that a pattern or a crutch?' },
  { id: 'n2', date: 'Thu 1 Oct', text: 'Tried the “is this up to me?” question in the 1:1. Calmer. Still annoyed.' },
  { id: 'n3', date: 'Mon 28 Sep', text: 'Three books in a row about time. I think I’m asking for something.' },
];

export const question = 'What would I stop doing if I really believed my hours were limited?';

export type Idea = {
  id: string;
  week: string;
  text: string;
  from: string[];
  outcome?: 'tried' | 'skipped' | 'unsure';
  deferred?: boolean;
  reflection?: string;
};

export const currentIdea: Idea = {
  id: 'i-now',
  week: 'Week of 5 Oct',
  text: 'Before reacting, ask once: is this up to me?',
  from: ['meditations', 'letters'],
};

export const pastIdeas: Idea[] = [
  { id: 'i1', week: '28 Sep', text: 'Price one purchase in hours of life, not dollars.', from: ['walden'], outcome: 'tried', reflection: 'Didn’t buy the headphones. Felt oddly good.' },
  { id: 'i2', week: '21 Sep', text: 'Write the day’s one task before opening email.', from: ['letters'], outcome: 'tried', reflection: 'Worked 3 of 5 days.' },
  { id: 'i3', week: '14 Sep', text: 'Choose one person to imagine watching you work.', from: ['letters'], outcome: 'skipped', reflection: 'Felt performative. Emerson would hate it.' },
  { id: 'i4', week: '7 Sep', text: 'Say no to one meeting that doesn’t need you.', from: ['walden', 'letters'], outcome: 'unsure' },
];

/** The Reading Mind: clusters of thought on a two-page spread. Positions are 0..1 of the spread. */
export type Cluster = { id: string; label: string; x: number; y: number; weight: 1 | 2 | 3; note: string; highlights: string[] };
export type Link = { from: string; to: string; kind: 'supports' | 'tension'; note?: string };

export const clusters: Cluster[] = [
  { id: 'time', label: 'time', x: 0.16, y: 0.16, weight: 3, note: 'the most underlined word this year', highlights: ['s1', 'w1'] },
  { id: 'control', label: 'what is up to me', x: 0.3, y: 0.56, weight: 3, note: 'Marcus, again and again', highlights: ['m1'] },
  { id: 'enough', label: 'enough', x: 0.05, y: 0.94, weight: 1, note: 'Thoreau’s word', highlights: ['w1', 'w2'] },
  { id: 'attention', label: 'attention', x: 0.6, y: 0.12, weight: 2, note: 'shows up in 3 books', highlights: ['m1', 's1', 'w2'] },
  { id: 'models', label: 'living by a model', x: 0.62, y: 0.6, weight: 2, note: 'Seneca', highlights: ['s2'] },
  { id: 'self', label: 'trusting myself', x: 0.88, y: 0.94, weight: 2, note: 'Emerson', highlights: ['e1', 'e2'] },
  { id: 'mornings', label: 'mornings', x: 0.9, y: 0.36, weight: 1, note: 'only one passage — yet', highlights: ['m2'] },
];

export const links: Link[] = [
  { from: 'time', to: 'attention', kind: 'supports' },
  { from: 'control', to: 'time', kind: 'supports' },
  { from: 'enough', to: 'time', kind: 'supports' },
  { from: 'attention', to: 'mornings', kind: 'supports' },
  { from: 'models', to: 'self', kind: 'tension', note: 'these two don’t quite agree' },
];

export const council = {
  question: 'Should I take the new role, even though it means less time for my own work?',
  asked: 'Sat 3 Oct',
  voices: [
    { highlightId: 's1', stance: 'Your hours are the only thing you truly own.' },
    { highlightId: 'w1', stance: 'Count the cost in life, not salary.' },
    { highlightId: 's2', stance: 'Picture someone you admire. What would they choose?' },
    { highlightId: 'e1', stance: 'Don’t take it because it’s what someone like you is supposed to do.' },
  ],
  synthesis:
    'Across your highlights, the strongest thread is that time is the real currency. Seneca and Thoreau would both ask what the role costs in hours you can’t get back. Where they part is on whose judgement to trust: Seneca would borrow a model’s, Emerson would insist on yours.',
  marginNote: 'Who would that be for me?',
  tension: { a: 's2', b: 'e1', note: 'These two ideas don’t quite agree.' },
  followUp: 'What would the role have to give back for the hours to be worth it?',
};

export const bookById = (id: string) => books.find((b) => b.id === id);
export const highlightById = (id: string) => highlights.find((h) => h.id === id);
export const highlightsFor = (bookId: string) => highlights.filter((h) => h.bookId === bookId);
