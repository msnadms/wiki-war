# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # start dev server
npm run build        # production build
npm run preview      # preview production build
npm run check        # TypeScript type-check (svelte-check)
npm run check:watch  # type-check in watch mode
```

There is no test suite.

## Architecture

This is a **SvelteKit + TypeScript** app (Svelte 5 runes) using **Firebase** for auth and Firestore for persistence. It's a card battle game where random Wikipedia articles become collectible cards with stats derived from Wikipedia page-view data.

### Data model

`src/lib/wikipedia.model.ts` defines the shared types: `WikiCard`, `Stats`, `Rarity`, and `CardCategory`. Everything in the system is typed against these.

### Card generation pipeline (server-only)

1. `src/lib/server/wikipedia.ts` — fetches a random Wikipedia article, then calls the Wikimedia pageviews API for the past 6 years. Player cards: HP is derived from total views, ATK from recent monthly average (boosted if trending up), DEF from the first-half average. Boss stats are NOT article-derived — `scaleBossStats` scales them to the drawn team (HP ≈ 4.5 team attack-rounds, ATK ≈ avg card HP / 2.75, heal ≈ 20% of a team round, each with ±15% noise) so every daily fight is challenging but winnable. Constants were tuned by Monte Carlo sim against sampled real random-article stats: all-attack wins ~57%, intent-aware blocking ~79%.
2. `src/lib/server/classifier.ts` — keyword-matches the article description to assign a `CardCategory` (people, geography, science, etc.).

### Battle logic

`src/lib/battle-engine.ts` is the **shared** pure combat module (no Svelte/DOM imports). It defines:
- `TypeCounters` — the 8-category counter table (multipliers 1.5× or 2×)
- `handleAttack` — applies damage (optionally enrage-multiplied) after block absorption
- `calcBossAction` — deterministic pattern from a hash of boss stats (telegraphed to the player)
- `calcBlockAmount` — block grants 2.5× DEF so reacting to the boss telegraph beats mindless attacking
- `enrageMultiplier` — boss damage ramps +25%/turn after boss turn 10 to prevent stalemates

This file is imported by both the client state module and the server endpoint, ensuring the same math runs on both sides.

### Client-side battle state

`src/lib/battle.svelte.ts` manages mutable game state using Svelte 5 `$state` runes (module-level singletons). It:
- Tracks `pendingAction`, registered cards, boss card, and the full move `sequence`
- Applies moves locally for immediate UI feedback
- After every player has moved, POSTs the round's `MoveRecord[]` to `/home` for server validation
- Restores server-authoritative state from the response

### Server-side validation

`src/routes/home/+server.ts` (POST handler) re-runs the full round inside a Firestore transaction:
- Reads `users/{uid}/daily/{date}` for the stored cards + `BattleState`
- Validates every submitted move (correct player, alive, no duplicates, valid action)
- Applies player moves then boss turn using the same `battle-engine.ts` functions
- Writes updated `BattleState` back; on win/loss writes earned cards to `users/{uid}/cards`

### Daily card system

`src/routes/home/+page.server.ts` (`refresh` form action) checks `users/{uid}/daily/{date}` first. If it exists, returns stored cards (with any mid-battle `BattleState`). Otherwise fetches 3 player cards + 1 boss from Wikipedia and writes them to that document.

### Firebase setup

- Client SDK: `src/lib/firebase.ts` (app init), `src/lib/auth.svelte.ts` (Google sign-in, `authState` reactive singleton), `src/lib/database.ts` (reads user card collection with a simple dirty-flag cache)
- Server SDK: `src/lib/server/firebase-admin.ts` (Admin SDK for server routes/actions)

All server endpoints verify the Firebase ID token from the `Authorization: Bearer <token>` header (or `token` form field) before touching Firestore.

### Svelte 5 patterns

State is managed with `$state`/`$derived` runes. Module-level `$state` in `.svelte.ts` files acts as a global singleton — this is intentional for the battle module and auth state. The `Card.svelte` component registers itself with the battle module via `registerCard`/`setBoss` in `onMount`.
