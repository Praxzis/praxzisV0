import { googleBooksKey, hasGoogleBooks } from '@/lib/env';

export type CatalogBook = {
  key: string;
  title: string;
  author: string;
  year: string;
  cover?: string;
  isbn?: string;
};

type OpenDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
};

type GoogleItem = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

function fromOpen(doc: OpenDoc): CatalogBook | null {
  const title = doc.title?.trim();
  if (!title) return null;
  return {
    key: doc.key || `ol-${title}`,
    title,
    author: doc.author_name?.[0] ?? 'Unknown',
    year: doc.first_publish_year ? String(doc.first_publish_year) : '',
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
    isbn: doc.isbn?.[0],
  };
}

function fromGoogle(item: GoogleItem): CatalogBook | null {
  const info = item.volumeInfo;
  const title = info?.title?.trim();
  if (!title || !item.id) return null;
  const isbn = info?.industryIdentifiers?.find((x) => x.type === 'ISBN_13' || x.type === 'ISBN_10')?.identifier;
  return {
    key: `gb-${item.id}`,
    title,
    author: info?.authors?.[0] ?? 'Unknown',
    year: info?.publishedDate?.slice(0, 4) ?? '',
    cover: info?.imageLinks?.thumbnail?.replace('http://', 'https://') ?? info?.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
    isbn,
  };
}

async function openLibrary(q: string, signal: AbortSignal): Promise<CatalogBook[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('open-library');
  const json = (await res.json()) as { docs?: OpenDoc[] };
  return (json.docs ?? []).map(fromOpen).filter((b): b is CatalogBook => !!b);
}

async function googleBooks(q: string, signal: AbortSignal): Promise<CatalogBook[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books&key=${googleBooksKey}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('google-books');
  const json = (await res.json()) as { items?: GoogleItem[] };
  return (json.items ?? []).map(fromGoogle).filter((b): b is CatalogBook => !!b);
}

function titlesClose(a: string, b: string) {
  const x = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const y = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!x || !y) return false;
  return x.includes(y.slice(0, 16)) || y.includes(x.slice(0, 16));
}

/** Find a real catalogue row for a known title, so recommendations can carry a cover and year. */
export async function matchCatalog(title: string, author: string, signal: AbortSignal): Promise<CatalogBook | null> {
  const q = [title.trim(), author.trim()].filter(Boolean).join(' ');
  if (q.length < 2) return null;
  const rows = await searchCatalog(q, signal);
  return rows.find((row) => titlesClose(row.title, title)) ?? null;
}

/** Live catalogue search. Open Library first; Google Books if a key is present and Open Library is thin. */
export async function searchCatalog(query: string, signal: AbortSignal): Promise<CatalogBook[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const open = await openLibrary(q, signal);
    if (open.length >= 3 || !hasGoogleBooks) return open;
    const extra = await googleBooks(q, signal);
    const seen = new Set(open.map((b) => b.title.toLowerCase()));
    return [...open, ...extra.filter((b) => !seen.has(b.title.toLowerCase()))].slice(0, 8);
  } catch {
    if (!hasGoogleBooks) return [];
    try {
      return await googleBooks(q, signal);
    } catch {
      return [];
    }
  }
}
