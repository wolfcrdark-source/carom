# CAROM

A daily bank-shot puzzle for [Reddit's Game of the Day Hackathon](https://redditgameofday2026.devpost.com/).

Each UTC day, everyone on Reddit gets the same table. The cue ball always launches straight up. You place **one brass bumper**, then Launch, and try to bank the ball into the pocket in as few shots as possible. Par is usually 2 or 3.

When you pocket the ball, a result card gives you a one-tap "Copy result" string for the comments, your streak, and today's leaderboard (fewest shots, stored in Redis and keyed by Reddit username). A first visit gets a short guided table instead of a wall of instructions.

This app is a Devvit Web interactive post, based on Reddit's official [bare template](https://github.com/reddit/devvit-template-hello-world). The game client is also playable locally without a Reddit login.

## How to play

1. Open the CAROM post and tap **Play**.
2. Drag the brass bumper onto the table. The ball always shoots straight up, so the bumper is how you change its path.
3. Tap **Launch** (or press Space).
4. If you miss, the ball resets, the shot count goes up, and you can nudge the bumper and try again.
5. Pocket it in as few shots as you can. Copy your result into the comments, or come back tomorrow for a new table.

Practice tables do not count toward the daily score or your streak.

## Reddit features

- The same seeded table for every player on a given UTC date
- Redis leaderboard and streaks, keyed by Reddit username
- A moderator menu action, **Post today's CAROM**, plus a scheduled job at 00:05 UTC that creates the daily post if one does not already exist
- A compact splash in the feed and a full game view in expanded mode
- Shareable result text, for example:

```
CAROM · 18 Nov 2026
2 / par 3
●●○
streak 4
```

## Play locally

Node 24+ is required.

```bash
npm install
npm run preview
```

Then open http://127.0.0.1:4173/game.html (or `/splash.html` for the compact post view).

Useful query flags on `game.html`:

- `?date=2026-11-18` — a specific daily table
- `?date=fixture-easy` — a known-solvable test table
- `?tutorial=1` — the first-run guided table
- `?skipTutorial=1` — jump straight to today

## Devvit

The app should stay **private** until after the hackathon. Upload and playtest only; do not publish for Reddit app review yet.

```bash
npx devvit login          # browser OAuth; use --copy-paste if localhost is blocked
npm run build
npx devvit upload         # private listing only
npm run playtest          # install on a <200-member test subreddit
```

## Commands

- `npm run preview`: build the client and serve `public/` locally
- `npm run build`: build client and server
- `npm run test:unit`: physics, generator, and score API tests
- `npm run e2e`: Playwright pass against the local client
- `npm run playtest [r/sub]`: watch, upload, and install on Reddit

## Docs

- [design.md](./design.md) — game design
- [rules.md](./rules.md) — hackathon rules, prizes, deadline, eligibility
- [devpost.md](./devpost.md) — draft Devpost submission text
