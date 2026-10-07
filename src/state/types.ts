import type { CouncilSession } from '@/core/council';
import type { AuthKind } from '@/lib/auth';
import type { Book, BookStatus, Cluster, Highlight, Idea, Link, Mark } from '@/data/notebook';

export type { Book, BookStatus, Cluster, Highlight, Idea, Link, Mark };
export type { AuthKind };

export type Session = {
  kind: AuthKind;
  name: string;
  email?: string;
  userId?: string;
};

export type Appearance = 'system' | 'day' | 'night';
export type Handwriting = 'natural' | 'steady';
export type PaperChoice = 'cream' | 'bright' | 'foxed';
export type InkWell = 'navy' | 'graphite' | 'turquoise';
export type IdeaCadence = 'monday' | 'sunday' | 'whenever';
export type CouncilManner = 'strict' | 'warm';
export type CouncilMaterial = 'book' | 'council' | 'world';
export type DateVoice = 'long' | 'short';
export type ShelfOrder = 'newest' | 'title' | 'author';
export type WeekStart = 'monday' | 'sunday';

export type Note = { id: string; date: string; text: string };

export type Prefs = {
  paper: PaperChoice;
  inkWell: InkWell;
  haptics: boolean;
  stillInk: boolean;
  ideaCadence: IdeaCadence;
  councilManner: CouncilManner;
  councilMaterial: CouncilMaterial;
  dateVoice: DateVoice;
  shelfOrder: ShelfOrder;
  weekStart: WeekStart;
  syncCloud: boolean;
  showEmail: boolean;
  marginNotes: boolean;
  keepCoverWarm: boolean;
  useAi: boolean;
  acceptedTermsAt?: string;
};

export const defaultPrefs: Prefs = {
  paper: 'cream',
  inkWell: 'navy',
  haptics: true,
  stillInk: false,
  ideaCadence: 'monday',
  councilManner: 'strict',
  councilMaterial: 'council',
  dateVoice: 'long',
  shelfOrder: 'newest',
  weekStart: 'monday',
  syncCloud: true,
  showEmail: true,
  marginNotes: true,
  keepCoverWarm: true,
  useAi: true,
};

export function migratePrefs(partial?: Partial<Prefs> & { councilMaterial?: string }): Prefs {
  const raw = { ...defaultPrefs, ...partial };
  const prior = String(partial?.councilMaterial ?? raw.councilMaterial);
  raw.councilMaterial = prior === 'book' || prior === 'world' || prior === 'council' ? prior : 'council';
  return raw;
}

export type Persisted = {
  session: Session | null;
  appearance: Appearance;
  handwriting: Handwriting;
  books: Book[];
  highlights: Highlight[];
  notes: Note[];
  ideas: Idea[];
  sittingQuestion: string;
  council: CouncilSession | null;
  bookmarks: string[];
  seeded: boolean;
  ownerName: string;
  prefs: Prefs;
  syncedAt?: string;
};
