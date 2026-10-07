import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { conveneWithAi } from '@/core/council';
import { nid, shortDate, slug } from '@/core/ids';
import { weeklyIdea, weeklyIdeaWithAi } from '@/core/ideas';
import { deriveMind } from '@/core/mind';
import { hasAi } from '@/lib/ai';
import {
  books as seedBooks,
  currentIdea as seedIdea,
  highlights as seedHighlights,
  notes as seedNotes,
  pastIdeas as seedPast,
  question as seedQuestion,
} from '@/data/notebook';
import * as Linking from 'expo-linking';

import { listenAuth, restoreRemoteSession, sessionFromUrl, signOutRemote, type AuthSession } from '@/lib/auth';
import { hash } from '@/notebook/seed';

import { pullNotebook, pushNotebook, shouldTakeRemote, toCloud, upsertProfile } from './sync';
import {
  defaultPrefs,
  migratePrefs,
  type Appearance,
  type Book,
  type BookStatus,
  type Cluster,
  type CouncilMaterial,
  type Highlight,
  type Handwriting,
  type Idea,
  type Link,
  type Mark,
  type Note,
  type Persisted,
  type Prefs,
  type Session,
} from './types';

export type { Appearance, Handwriting, Note, Prefs, Session };
export type { Book, BookStatus, Highlight, Idea, Link, Mark } from './types';

const KEY = 'praxzis.notebook.v1';

const empty: Persisted = {
  session: null,
  appearance: 'system',
  handwriting: 'natural',
  books: [],
  highlights: [],
  notes: [],
  ideas: [],
  sittingQuestion: '',
  council: null,
  bookmarks: [],
  seeded: false,
  ownerName: '',
  prefs: defaultPrefs,
};

function withSample(): Pick<Persisted, 'books' | 'highlights' | 'notes' | 'ideas' | 'sittingQuestion' | 'seeded'> {
  return {
    books: seedBooks,
    highlights: seedHighlights,
    notes: seedNotes,
    ideas: [seedIdea, ...seedPast],
    sittingQuestion: seedQuestion,
    seeded: true,
  };
}

function hydrate(parsed?: Partial<Persisted> | null, session?: Session | null): Persisted {
  return {
    ...empty,
    ...parsed,
    session: session ?? null,
    books: parsed?.books ?? [],
    highlights: parsed?.highlights ?? [],
    notes: parsed?.notes ?? [],
    ideas: parsed?.ideas ?? [],
    bookmarks: parsed?.bookmarks ?? [],
    sittingQuestion: parsed?.sittingQuestion ?? '',
    prefs: migratePrefs(parsed?.prefs),
    ownerName: parsed?.ownerName || session?.name || '',
  };
}

function migrateSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as { kind?: string; name?: string; email?: string; userId?: string };
  if (!s.name) return null;
  if (s.kind === 'named') {
    return { kind: s.email ? 'email' : 'device', name: s.name, email: s.email, userId: s.userId };
  }
  if (s.kind === 'device' || s.kind === 'email' || s.kind === 'google' || s.kind === 'apple') {
    return { kind: s.kind, name: s.name, email: s.email, userId: s.userId };
  }
  return null;
}

type Store = Persisted & {
  ready: boolean;
  councilBusy: boolean;
  pendingCouncil: string;
  setPendingCouncil: (q: string) => void;
  currentIdea: Idea | null;
  pastIdeas: Idea[];
  clusters: Cluster[];
  links: Link[];
  bookById: (id: string) => Book | undefined;
  highlightById: (id: string) => Highlight | undefined;
  highlightsFor: (bookId: string) => Highlight[];
  beginDevice: (name: string, sample: boolean) => void;
  reopen: () => void;
  establish: (session: AuthSession, sample?: boolean) => Promise<void>;
  signIn: (name: string, email?: string, sample?: boolean) => void;
  signOut: () => void;
  setAppearance: (a: Appearance) => void;
  setHandwriting: (h: Handwriting) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  rename: (name: string) => void;
  addBook: (input: { title: string; author: string; year?: string; status: BookStatus; why: string; isbn?: string; cover?: string }) => string;
  addHighlight: (input: { bookId: string; text: string; where: string; mark: Mark; note?: string; themes: string[] }) => string;
  addNote: (text: string) => void;
  removeNote: (id: string) => void;
  setSittingQuestion: (q: string) => void;
  markIdea: (outcome: 'tried' | 'skipped' | 'unsure' | 'later', reflection?: string) => void;
  askCouncil: (question: string, material?: CouncilMaterial, bookId?: string) => Promise<void>;
  toggleBookmark: (bookId: string) => void;
  setBookStatus: (id: string, status: BookStatus) => void;
  loadSample: () => void;
  emptyShelf: () => void;
  burnCopy: () => void;
  exportText: () => string;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [ready, setReady] = useState(false);
  const [councilBusy, setCouncilBusy] = useState(false);
  const [pendingCouncil, setPendingCouncil] = useState('');
  const skip = useRef(true);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let live = true;
    Promise.all([
      AsyncStorage.getItem(KEY)
        .then((raw) => (raw ? (JSON.parse(raw) as Partial<Persisted>) : null))
        .catch(() => null),
      restoreRemoteSession().catch(() => null),
    ])
      .then(([parsed, remote]) => {
        if (!live) return;
        const localSession = migrateSession(parsed?.session);
        const session = remote ?? localSession;
        setState(hydrate(parsed, session));
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    const handle = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(stateRef.current)).catch(() => {});
    }, 280);
    return () => clearTimeout(handle);
  }, [ready, state]);

  useEffect(() => {
    if (!ready) return;
    const session = state.session;
    if (!session?.userId || session.userId === 'dev-praxzis' || !state.prefs?.syncCloud) return;
    const handle = setTimeout(() => {
      pushNotebook(session.userId!, stateRef.current)
        .then(() => setState((s) => ({ ...s, syncedAt: new Date().toISOString() })))
        .catch(() => {});
    }, 900);
    return () => clearTimeout(handle);
  }, [ready, state.books, state.highlights, state.notes, state.ideas, state.prefs, state.sittingQuestion, state.session?.userId, state.session, state.prefs.syncCloud]);

  const patch = useCallback((fn: (s: Persisted) => Persisted) => setState(fn), []);

  const currentIdea = (state.ideas ?? []).find((i) => !i.outcome) ?? null;
  const pastIdeas = (state.ideas ?? []).filter((i) => i.outcome);
  const mind = useMemo(() => deriveMind(state.highlights ?? []), [state.highlights]);

  const applySession = useCallback(
    async (session: AuthSession, sample?: boolean) => {
      let next: Persisted = {
        ...stateRef.current,
        session,
        ownerName: session.name || stateRef.current.ownerName,
        ...(sample && !stateRef.current.seeded ? withSample() : null),
        ideas:
          sample && !stateRef.current.seeded
            ? withSample().ideas
            : stateRef.current.ideas.length
              ? stateRef.current.ideas
              : [weeklyIdea(stateRef.current.highlights, stateRef.current.books, stateRef.current.ideas)],
      };
      if (session.userId && session.userId !== 'dev-praxzis') {
        await upsertProfile(session);
        const remote = await pullNotebook(session.userId);
        if (remote && shouldTakeRemote(toCloud(next), remote)) {
          next = {
            ...hydrate(remote, session),
            session,
            ownerName: session.name || remote.ownerName || next.ownerName,
            syncedAt: next.syncedAt,
          };
        } else {
          await pushNotebook(session.userId, next);
        }
        next = { ...next, syncedAt: new Date().toISOString() };
      }
      setState(next);
    },
    [],
  );

  useEffect(() => {
    if (!ready) return;
    return listenAuth((remote, event) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && remote) {
        const current = stateRef.current.session;
        if (current?.userId === remote.userId) {
          setState((s) => ({ ...s, session: { ...s.session!, ...remote }, ownerName: remote.name || s.ownerName }));
          return;
        }
        if (!current || current.kind === 'device') void applySession(remote);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setState((s) => (s.session?.kind === 'device' ? s : { ...s, session: null }));
      }
    });
  }, [applySession, ready]);

  useEffect(() => {
    if (!ready) return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('callback') && !url.includes('code=')) return;
      void sessionFromUrl(url).then((result) => {
        if (result.ok && 'session' in result) void applySession(result.session);
      });
    });
    return () => sub.remove();
  }, [applySession, ready]);

  const value = useMemo<Store>(() => {
    const bookById = (id: string) => state.books.find((b) => b.id === id);
    const highlightById = (id: string) => state.highlights.find((h) => h.id === id);
    const highlightsFor = (bookId: string) => state.highlights.filter((h) => h.bookId === bookId);

    return {
      ...state,
      ready,
      councilBusy,
      pendingCouncil,
      setPendingCouncil,
      currentIdea,
      pastIdeas,
      clusters: mind.clusters,
      links: mind.links,
      bookById,
      highlightById,
      highlightsFor,
      beginDevice: (name, sample) =>
        patch((s) => ({
          ...s,
          ownerName: name.trim() || s.ownerName || 'Reader',
          session: { kind: 'device', name: name.trim() || s.ownerName || 'Reader' },
          ...(sample && !s.seeded ? withSample() : null),
          ideas: sample && !s.seeded ? withSample().ideas : s.ideas.length ? s.ideas : [weeklyIdea(s.highlights, s.books, s.ideas)],
        })),
      reopen: () =>
        patch((s) => ({
          ...s,
          session: s.session ?? { kind: 'device', name: s.ownerName || 'Reader' },
        })),
      establish: applySession,
      signIn: (name, email, sample) => {
        void applySession({ kind: email ? 'email' : 'device', name: name.trim(), email: email?.trim() || undefined }, sample);
      },
      signOut: () => {
        void signOutRemote();
        patch((s) => ({ ...s, session: null, ownerName: s.prefs.keepCoverWarm ? s.ownerName : '' }));
      },
      setAppearance: (appearance) => patch((s) => ({ ...s, appearance })),
      setHandwriting: (handwriting) => patch((s) => ({ ...s, handwriting })),
      setPrefs: (next) => patch((s) => ({ ...s, prefs: { ...s.prefs, ...next } })),
      rename: (name) =>
        patch((s) => {
          const next = name.trim();
          if (!next) return s;
          return {
            ...s,
            ownerName: next,
            session: s.session ? { ...s.session, name: next } : s.session,
          };
        }),
      addBook: (input) => {
        const id = slug(input.title);
        const unique = state.books.some((b) => b.id === id) ? nid('book') : id;
        const maxPage = state.books.reduce((n, b) => Math.max(n, b.page), 10);
        const book: Book = {
          id: unique,
          title: input.title.trim(),
          author: input.author.trim(),
          year: input.year?.trim() || '',
          status: input.status,
          cloth: hash(input.title) % 8,
          spine: 0.55 + (hash(`${input.title}:s`) % 45) / 100,
          started: input.status === 'someday' ? '—' : shortDate(),
          why: input.why.trim(),
          page: maxPage + 2,
          isbn: input.isbn,
          cover: input.cover,
        };
        patch((s) => ({ ...s, books: [book, ...s.books] }));
        return unique;
      },
      addHighlight: (input) => {
        const id = nid('h');
        const h: Highlight = {
          id,
          bookId: input.bookId,
          text: input.text.trim(),
          where: input.where.trim() || 'unpaged',
          mark: input.mark,
          note: input.note?.trim() || undefined,
          saved: new Date().toISOString(),
          themes: input.themes.map((t) => t.trim().toLowerCase()).filter(Boolean),
        };
        patch((s) => ({ ...s, highlights: [h, ...s.highlights] }));
        return id;
      },
      addNote: (text) => {
        const note: Note = { id: nid('n'), date: shortDate(), text: text.trim() };
        patch((s) => ({ ...s, notes: [note, ...s.notes] }));
      },
      removeNote: (id) => patch((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),
      setSittingQuestion: (sittingQuestion) => patch((s) => ({ ...s, sittingQuestion })),
      markIdea: (outcome, reflection) => {
        const open = stateRef.current.ideas.find((i) => !i.outcome);
        if (!open) return;
        if (outcome === 'later') {
          patch((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === open.id ? { ...i, deferred: true } : i)) }));
          return;
        }
        const next: Idea = { ...open, outcome, reflection, deferred: false };
        const rest = stateRef.current.ideas.filter((i) => i.id !== open.id);
        const allowAi = hasAi && stateRef.current.prefs.useAi;
        const fresh = weeklyIdea(stateRef.current.highlights, stateRef.current.books, [next, ...rest]);
        patch((s) => ({ ...s, ideas: [fresh, next, ...s.ideas.filter((i) => i.id !== open.id)] }));
        if (!allowAi) return;
        void weeklyIdeaWithAi(stateRef.current.highlights, stateRef.current.books, [next, ...rest], true).then((lit) => {
          if (lit.text === fresh.text) return;
          patch((s) => ({
            ...s,
            ideas: s.ideas.map((i) => (i.id === fresh.id && !i.outcome ? { ...i, text: lit.text, from: lit.from } : i)),
          }));
        });
      },
      askCouncil: async (question, material, bookId) => {
        const q = question.trim();
        if (!q) return;
        const snap = stateRef.current;
        const used = material ?? snap.prefs.councilMaterial;
        setCouncilBusy(true);
        try {
          const session = await conveneWithAi(
            q,
            snap.highlights,
            snap.books,
            snap.prefs.councilManner,
            snap.prefs.useAi,
            used,
            snap.notes,
            snap.sittingQuestion,
            bookId,
          );
          patch((s) => ({ ...s, council: session, prefs: { ...s.prefs, councilMaterial: used } }));
        } finally {
          setCouncilBusy(false);
        }
      },
      toggleBookmark: (bookId) =>
        patch((s) => ({
          ...s,
          bookmarks: s.bookmarks.includes(bookId) ? s.bookmarks.filter((id) => id !== bookId) : [...s.bookmarks, bookId],
        })),
      setBookStatus: (id, status) =>
        patch((s) => ({
          ...s,
          books: s.books.map((b) => (b.id === id ? { ...b, status, started: b.started === '—' && status !== 'someday' ? shortDate() : b.started } : b)),
        })),
      loadSample: () =>
        patch((s) => (s.seeded ? s : { ...s, ...withSample() })),
      emptyShelf: () =>
        patch((s) => ({ ...s, books: [], highlights: [], bookmarks: [], council: null, seeded: false })),
      burnCopy: () => {
        void signOutRemote();
        void AsyncStorage.removeItem(KEY);
        setState(empty);
      },
      exportText: () => {
        const lines = [
          `Praxzis · ${state.ownerName || state.session?.name || 'Reader'}`,
          state.sittingQuestion ? `Sitting with: ${state.sittingQuestion}` : '',
          '',
          'Shelf',
          ...state.books.map((b) => `• ${b.title} — ${b.author}${b.year ? ` (${b.year})` : ''}`),
          '',
          'Marked',
          ...state.highlights.map((h) => {
            const book = state.books.find((b) => b.id === h.bookId)?.title ?? h.bookId;
            return `“${h.text}” — ${book}${h.note ? `\n    ${h.note}` : ''}`;
          }),
          '',
          'Pages',
          ...state.notes.map((n) => `${n.date}  ${n.text}`),
          '',
          'Ideas',
          ...state.ideas.map((i) => `• ${i.text}${i.outcome ? ` (${i.outcome})` : ''}`),
        ];
        return lines.filter((l, i) => l !== '' || lines[i + 1] !== '').join('\n');
      },
    };
  }, [applySession, councilBusy, currentIdea, mind.clusters, mind.links, pastIdeas, patch, pendingCouncil, ready, state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
