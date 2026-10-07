# Praxzis

A premium digital knowledge system disguised as a living notebook.

```bash
npm install
npm start        # i = iOS, a = Android, w = web
npm run lint
npx tsc --noEmit
```

The notebook is local-first (`src/state/store.tsx`) and copies itself to Supabase when you sign the flyleaf.

## Auth and the cloud desk

1. Copy `.env.example` to `.env.local` and fill in the values I will give you.
2. In the Supabase SQL editor, run `supabase/schema.sql`.
3. Authentication → Providers: enable Email (turn off Confirm email while developing), Google, and Apple.
4. Authentication → URL Configuration → Redirect URLs must include `praxzis://auth/callback` (native) and `http://localhost:8081/auth/callback` (web).
5. Google sign-in on a phone must be tested in a Praxzis development build (`npm run run:android`), not Expo Go.
6. Apple provider Client IDs: `com.praxzis.app`. Add `host.exp.Exponent` only if you still test Apple inside Expo Go.
7. Google: Web client ID + secret in Supabase. The Android client (`com.praxzis.app`) stays in Google Cloud; do not point the mobile redirect at a Supabase URL.

Until those keys are in, the house copy still opens:

`praxzisapp@gmail.com` / `BillionDollars2026@10`

Book titles autocomplete from Open Library as you type. Add `EXPO_PUBLIC_GOOGLE_BOOKS_KEY` later if you want Google Books as a second catalogue.

## The desk light (AI)

Add `EXPO_PUBLIC_AI_API_KEY` (or `EXPO_PUBLIC_OPENAI_API_KEY`) to `.env` / `.env.local` when you are ready. Optional: `EXPO_PUBLIC_AI_MODEL` (default `gpt-4o-mini`) and `EXPO_PUBLIC_AI_BASE_URL` for an OpenAI-compatible proxy.

The council still answers only from marked passages. The weekly idea still comes from those pages. If the key is missing, both stay on the local extractive desk.

## The notebook design system — `src/notebook`

Rule of thumb: **the system is printed, the thoughts are handwritten.**

| Layer | Use | Component |
| --- | --- | --- |
| Paper | Primary container — use instead of cards | `Sheet`, `NotebookPage`, `PageStack`, `Binding`, `Tape` |
| Ink (handwriting) | The person's notes, reflections, principles, questions, annotations | `Hand`, `MarginNote` |
| Print | Navigation, controls, metadata, book text, system insight | `Print`, `Passage` |
| Pen marks | Underlines, circles, arrows, brackets, checks, cross-outs, stars | `Underlined`, `Circled`, `Arrow`, `Bracket`, `Doodle`, `CrossedOut`, `Divider` |
| Controls | Always crisp and obvious, 44pt+ targets | `InkButton`, `IconButton`, `BackLink`, `LinedField`, `Choice`, `PaperTabBar` |

- **Controlled imperfection.** Every tilt, wobble, baseline drift, and page tone comes from a seed (`seed.ts`), so a given page always looks the same. Controls are never rotated or jittered.
- **Materials** (`materials.ts`): paper → ink → graphite → navy (Praxzis) → turquoise (discovery/active) → shadow → binding. `day` and `night` are separate palettes; night is a dark notebook, not an inversion.
- **Motion** is short and physical. Sheets slide into place, ink is drawn on, highlighter is swept across words, and a book opens from its spine. All of it is skipped when the device has Reduce Motion on.
- **Accessibility.** Handwritten blocks are exposed to screen readers as one string. Settings → Handwriting → *Steady* removes handwriting variation for easier reading.

Fonts: Caveat (hand), EB Garamond (editorial print, matches the logo), Inter (interface).

## Brand assets

`scripts/build-assets.py` separates the supplied logo (`assets/brand-source-logo.png`) into navy and turquoise ink layers so it prints onto either notebook, and generates the seamless paper grain:

```bash
python3 scripts/build-assets.py assets/brand-source-logo.png
```
