import type { Book, Highlight, Idea } from '@/data/notebook';
import { completeJson, hasAi } from '@/lib/ai';
import { nid, weekOf } from './ids';

const TEMPLATES: { theme: string; text: string }[] = [
  { theme: 'time', text: 'Guard one hour today as if it were the only thing I own.' },
  { theme: 'control', text: 'Before reacting, ask once: is this up to me?' },
  { theme: 'enough', text: 'Price one choice in hours of life, not money.' },
  { theme: 'attention', text: 'Do the day’s one task before opening anything else.' },
  { theme: 'models', text: 'Name one person I would not mind watching me work.' },
  { theme: 'character', text: 'Trust the thought before it is borrowed.' },
  { theme: 'mornings', text: 'Rise as if the work of a human being were already waiting.' },
];

export function weeklyIdea(highlights: Highlight[], books: Book[], existing: Idea[]): Idea {
  const counts = new Map<string, { n: number; bookIds: string[] }>();
  for (const h of highlights) {
    for (const t of h.themes) {
      const cur = counts.get(t) ?? { n: 0, bookIds: [] };
      cur.n += 1;
      if (!cur.bookIds.includes(h.bookId)) cur.bookIds.push(h.bookId);
      counts.set(t, cur);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
  const used = new Set(existing.map((i) => i.text));
  for (const [theme, info] of ranked) {
    const tmpl = TEMPLATES.find((t) => t.theme === theme);
    if (tmpl && !used.has(tmpl.text)) {
      return { id: nid('idea'), week: weekOf(), text: tmpl.text, from: info.bookIds.slice(0, 2) };
    }
  }
  const first = books[0];
  return {
    id: nid('idea'),
    week: weekOf(),
    text: first ? `Carry one sentence from ${first.title} into the week.` : 'Mark one line this week and sit with it.',
    from: first ? [first.id] : [],
  };
}

/** Local idea first, then a grounded rewrite when the desk has a key. */
export async function weeklyIdeaWithAi(highlights: Highlight[], books: Book[], existing: Idea[], allowAi = true): Promise<Idea> {
  const base = weeklyIdea(highlights, books, existing);
  if (!allowAi || !hasAi || !highlights.length) return base;

  const themes = [...new Set(highlights.flatMap((h) => h.themes))].slice(0, 8).join(', ');
  const lines = highlights.slice(0, 8).map((h) => {
    const book = books.find((b) => b.id === h.bookId)?.title ?? '';
    return `“${h.text}” — ${book}`;
  });
  const used = existing.map((i) => i.text).slice(0, 8);

  const lit = await completeJson<{ text?: string }>(
    'You write one weekly practice for a reader, drawn only from their marked passages. One sentence, imperative, no quotes, no book titles in the sentence, no invented sources.',
    `Themes: ${themes || 'attention'}\nAlready used:\n${used.join('\n') || '(none)'}\nPassages:\n${lines.join('\n')}`,
  );
  const text = lit?.text?.trim();
  if (!text || text.length > 140 || used.includes(text)) return base;
  return { ...base, text };
}
