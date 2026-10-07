import { getSupabase } from '@/lib/supabase';

import type { Persisted } from './types';

export type CloudNotebook = {
  books: Persisted['books'];
  highlights: Persisted['highlights'];
  notes: Persisted['notes'];
  ideas: Persisted['ideas'];
  sittingQuestion: string;
  council: Persisted['council'];
  bookmarks: string[];
  seeded: boolean;
  ownerName: string;
  appearance: Persisted['appearance'];
  handwriting: Persisted['handwriting'];
  prefs: Persisted['prefs'];
};

export function toCloud(state: Persisted): CloudNotebook {
  return {
    books: state.books,
    highlights: state.highlights,
    notes: state.notes,
    ideas: state.ideas,
    sittingQuestion: state.sittingQuestion,
    council: state.council,
    bookmarks: state.bookmarks,
    seeded: state.seeded,
    ownerName: state.ownerName,
    appearance: state.appearance,
    handwriting: state.handwriting,
    prefs: state.prefs,
  };
}

function weight(n: CloudNotebook) {
  return n.books.length + n.highlights.length + n.notes.length + n.ideas.length;
}

export async function pullNotebook(userId: string): Promise<CloudNotebook | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.from('notebooks').select('payload').eq('user_id', userId).maybeSingle();
  if (error || !data?.payload) return null;
  return data.payload as CloudNotebook;
}

export async function pushNotebook(userId: string, state: Persisted) {
  const db = getSupabase();
  if (!db) return;
  await db.from('notebooks').upsert({
    user_id: userId,
    payload: toCloud(state),
    updated_at: new Date().toISOString(),
  });
}

export async function upsertProfile(session: { userId?: string; name: string; email?: string; kind: string }) {
  const db = getSupabase();
  if (!db || !session.userId || session.userId === 'dev-praxzis') return;
  await db.from('profiles').upsert({
    id: session.userId,
    display_name: session.name,
    email: session.email ?? null,
    provider: session.kind,
    updated_at: new Date().toISOString(),
  });
}

export function shouldTakeRemote(local: CloudNotebook, remote: CloudNotebook) {
  return weight(remote) > weight(local);
}
