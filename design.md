# CAROM — design for Reddit Game of the Day 2026

Working title: **CAROM**. Devvit app slug (provisional): `carom` (may need a suffix at upload if the name is taken; 3–16 lowercase letters, digits, or hyphens).

Built for [Reddit's Game of the Day Hackathon](https://redditgameofday2026.devpost.com/) (due 9 Dec 2026, 7:30 am IST). Not a port of existing IP, so we are aiming at Best Daily Game / Honorable Mention, not Best Ported Daily Game.

## Why this game

The brief wants a bite-sized daily loop, fresh content, a clear result card, and community hooks — not a generic arcade clone and not a game about Snoo. Existing official examples are mostly word or grid puzzles (Hot and Cold, Syllo, Pocket Grids, Color Puzzle). A **spatial, one-verb bank-shot puzzle** is easy to learn, visually distinct in a Reddit post, and gives people something worth commenting on ("today's table is evil", "pocketed in 1").

Lessons reused from SHIFTSIDE and `/workspace/mindblown/research.md`: one verb with depth, juice and hit-stop, a scripted first table, a ghost of your best path, a peak-end result card, near-miss language, and no dark monetization.

## The pitch (3–4 sentences)

Each UTC day, every player gets the same table: a cue ball that always launches straight up, a pocket, a few ink-dark pins, and **exactly one bumper** to place. The skill is kissing that bumper at the right glancing angle so the ball banks into the pocket in as few shots as possible (par is usually 2 or 3). A result card, a copy-for-comments glyph line, a streak, and — once Devvit accounts exist — a Redis leaderboard plus a scheduled daily post make it feel native to Reddit. The look is ink, brass and cream, not Reddit orange, and the first visit is a single guided table instead of a wall of instructions.

## One verb

**Place the bumper, then launch.** Launch direction is fixed (straight toward the top of the table) so the only decision is where the bumper sits. After a miss the ball resets to the cue, the bumper can be nudged, and the shot count goes up. Daily scoring is your best completed run that UTC day (fewest shots; ties broken later by closest first-shot approach or time).

Practice tables (random extra seeds) never count toward the daily or the streak.

## Daily content

- The table is generated from a seed of the **UTC date** (`YYYY-MM-DD`). The UI labels it "18 Nov · UTC" so the shared puzzle is obvious.
- A generator places the cue, pocket and pins, then searches for at least one bumper position that pockets in a physics sim. If it cannot find one, it falls back to a known-solvable layout. Gift days (a clear or near-straight path) are rare and marked par 1–2.
- Par is 1, 2 or 3 based on how tight the witness solution is.
- A scheduled daily post (once the server is wired up) can drop at 00:05 UTC with the date, par, and a "Play today's table" interactive post. Same post is the community thread for that day.

## Community / Reddit-y (planned vs now)

Now, in the local client:

- Shareable result card and a one-tap "Copy result" string for comments, for example:

  ```
  CAROM · 18 Nov 2026
  2 / par 3
  ●●○
  streak 4
  ```
- Local streak and best-of-day in `localStorage`.
- Ghost trail of your best pocketed path on that date.

Once a Reddit account and playtest sub exist (not done in this pass):

- Redis sorted set per date for a top-N leaderboard (fewest shots).
- Submit-score API from the result card; username comes from the Devvit context.
- Menu action + `onAppInstall` already exist in the bare template to create a post; extend them to title "CAROM — 18 Nov" and use the game entrypoint.
- Optional comment prompt and subreddit subscribe CTA on the result card (one end screen only, as the brief asks).
- Flair for Daily / Guide / Near-miss once the home sub exists.
- Devvit Journeys events later (start, bumper_placed, launch, pocket, miss, share, streak) — Journeys is a recommended judging bonus and appears to be a gated beta; apply after the app exists.
- Do **not** theme the game around Snoo, karma, or "being a redditor". The community layer is the Reddit-y part.

## Onboarding and UX (judging checklist)

- Splash (compact Reddit post): name, one-line hook, date, par, streak if any, a Play button that expands to the game. No Snoo, no setup wizard.
- First visit: a scripted easy table with a ghost bumper and the line "Drag the bumper onto the glow, then Launch." After that, today's table loads.
- During play the chrome is just the name, date, shot count, par, mute, and Launch. No secondary menus.
- End state is a single result card: pocketed or missed-and-retired, shots vs par, streak, ghost, Copy result, Play a practice table, Back to today.
- Contrast and type are designed for a small post viewport (logical 390×640, scales to the webview). Touch-first, also works with mouse and Space to launch.

## Juice and fairness (from the research)

- Ball trail, brass sparks on hits, a short hit-stop and a chime when it drops, a small shake, WebAudio ticks (mute-able, no external assets).
- Near-miss: if the ball passes within a tight radius of the pocket without dropping, the result / toast says "SO CLOSE" and the closest approach is drawn.
- Kind first table; generated tables are solvability-checked.
- Peak-end: the pocket moment is the spectacle; retry or "try a practice table" is one tap.
- No ads, no fake timers, no paywalls, no streak-guilt dark patterns. A broken streak is reported plainly.

## Visual identity

Night-ink table, walnut rails, cream ball, brass bumper, gold pocket ring, ochre pin posts. Title in a serif (Palatino / Georgia), UI in a clean system sans. This is deliberate craft, not a default Phaser/React starter look, and not "Reddit orange + Snoo".

## Technical plan

- Client: TypeScript + Canvas 2D in the official **bare / hello-world** Devvit Web template (`src/client`, `src/server`, `src/shared`). Phaser and React starters were cloned for reference but are heavier than this game needs.
- Physics is a small deterministic circle/segment engine shared with the generator, so today's table can be verified.
- The client is fully playable **without** a Devvit login or backend (localStorage + optional API). Server score/leaderboard routes come after `devvit login`.
- All art and audio are procedural. No third-party assets, no brand IP.
- Local preview: `npm run preview`, then Playwright against system Chrome.
- Upload path later (do not run until accounts exist): `npx devvit login`, `npm run deploy` (`devvit upload` only — **do not** `npm run publish` / launch until the hackathon ends), `npm run playtest`, then a public <200-member demo sub or dr-admin-approve.

## What "done" looks like for the cup

A self-explanatory public demo post, a private uploaded app listing, a README that teaches the game in a few lines, a result that is worth pasting into the comments, and a daily table that feels fair and distinct for two weeks of calendars. Optional: a sub-one-minute silent video of a pocket, and a public GitHub repo under the existing `wolfcrdark-source` account if Anush wants it.
