import type { Cluster, Highlight, Link } from '@/data/notebook';
import { hash } from '@/notebook/seed';

const TENSION: [string, string][] = [
  ['models', 'self'],
  ['models', 'character'],
];

function unit(n: number): number {
  return (n % 1000) / 1000;
}

/**
 * Themes that actually repeat in marked text. Positions are stable per label
 * so the spread does not reshuffle when a new highlight is added.
 */
export function deriveMind(highlights: Highlight[] | null | undefined): { clusters: Cluster[]; links: Link[] } {
  const byTheme = new Map<string, Highlight[]>();
  for (const h of highlights ?? []) {
    for (const t of h.themes) {
      const key = t.trim().toLowerCase();
      if (!key) continue;
      const list = byTheme.get(key) ?? [];
      list.push(h);
      byTheme.set(key, list);
    }
  }

  const clusters: Cluster[] = [...byTheme.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([label, hs]) => {
      const n = hs.length;
      const weight: 1 | 2 | 3 = n >= 3 ? 3 : n === 2 ? 2 : 1;
      const hx = hash(`mx:${label}`);
      const hy = hash(`my:${label}`);
      const note = n === 1 ? '1 passage' : `${n} passages`;
      return {
        id: label,
        label,
        x: 0.08 + unit(hx) * 0.82,
        y: 0.1 + unit(hy) * 0.82,
        weight,
        note,
        highlights: hs.map((h) => h.id),
      };
    });

  const links: Link[] = [];
  const seen = new Set<string>();
  for (const a of clusters) {
    for (const b of clusters) {
      if (a.id >= b.id) continue;
      const share = a.highlights.some((id) => b.highlights.includes(id));
      const tense = TENSION.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id));
      if (!share && !tense) continue;
      const key = `${a.id}|${b.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        from: a.id,
        to: b.id,
        kind: tense ? 'tension' : 'supports',
        note: tense ? 'these disagree' : undefined,
      });
    }
  }
  return { clusters, links };
}
