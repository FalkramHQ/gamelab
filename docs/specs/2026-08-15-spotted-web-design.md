# SPOTTED! Digital Playtest Edition — design

**Date:** 2026-08-15 · **Status:** implemented · **App:** `games/spotted/web/`

## Purpose

A browser version of SPOTTED! so the designer and playtesters can feel the game
before committing to a physical print run. Human vs 1–4 computer biologists.
Deployed as a static site on Vercel; no backend.

## Architecture

- `src/game/` — pure TypeScript port of `sim/engine.py` + `sim/agents.py` +
  `sim/data.py` (no DOM). Card content imported at build time from the CSVs in
  `games/spotted/cards/` (single source of truth with the physical game).
- `src/ui/` — React components (setup, table, hand, pad, modals).
- Verified by `src/game/engine.test.ts` (vitest, 14 tests) + browser playthrough.

## Rules fidelity checklist (all ported exactly)

- Setup: 1 secret Specimen each; 6-card hand from the 80-card deck; hand limit 7.
- Turn: draw 1 (discard reshuffles when empty), then exactly one action:
  Ask / Special / Identify / Discard.
- Specials: Double Probe, Misdirect (private answer), Eavesdrop (private reveal),
  Cross-Examine, Wild Probe — with correct information visibility.
- Scoring: correct = 2 + max(0, 4 − q); wrong = −3 (min 0) and public.
- Specimen replacement + q reset + epoch increment on correct ID.
- Win at 10 (Duel 8, Kids 6) with equal-turn finish; tiebreak most correct IDs
  then seat order; first-player marker rotates every round.
- Kids Mode toggle: flat +2, free wrong guesses.
- Information honesty: the UI only ever shows public facts plus the human's own
  private intel; bot private answers render as "answer hidden".

## Players & bots

- 2–5 players (human always seat 0), bots: Sharp = InfoGainAgent (threshold 0.5,
  uses specials), Casual = RandomAgent.

## UX decisions

- **Manual deduction pad** (user choice): the player crosses out / circles trait
  values by hand, like pen & paper. Public facts (q counter, failed guesses) are
  shown automatically because everyone at a real table hears them.
- In-game reference card overlay (port of `art/REFERENCE_CARD.html`).
- Creature art: the 25 provided JPEGs, downscaled to 640px (`public/creatures/`).
- Question/special cards rendered in CSS with the Arcane/Valorant palette from
  `art/PROMPTS.md`.

## Verification

- 14/14 vitest rule tests (scoring, penalty floor, q visibility, kids mode,
  hand limit, reshuffle, equal-turn finish, bot skill ≥ 70% vs random, smoke).
- Browser playthrough: ask/special/identify/discard flows, pad marking,
  game-over — zero console errors.

## Deploy

Vercel static deploy of `games/spotted/web/` (framework: Vite).
