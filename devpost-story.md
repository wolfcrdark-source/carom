## Inspiration

Reddit's brief asked for a bite-sized daily game with a clear result card and community hooks, not a generic arcade clone and not a game about Snoo. A lot of existing Devvit daily games are word or grid puzzles, so we wanted a spatial, one-verb game people could talk about in the comments ("today's table is evil", "pocketed in 1"). The design reuses lessons from our earlier arcade work — juice, a scripted first table, a ghost of your best path, and a peak-end result card — in a format that fits a Reddit post.

## What it does

Each UTC day, every player gets the same table. The cue ball always launches straight up. You place exactly one brass bumper, tap Launch, and try to bank the ball into the pocket in as few shots as possible. Par is usually 2 or 3.

A first visit starts on a short guided table instead of a wall of instructions. Pocketing the ball opens a single result card with your shots, par, streak, today's Redis leaderboard (keyed by Reddit username), and a one-tap "Copy result" string for the comments:

```
CAROM · 18 Nov 2026
2 / par 3
●●○
streak 4
```

A moderator can post today's table from the subreddit menu. A scheduled job at 00:05 UTC also creates that day's post if one does not already exist. Practice tables never count toward the daily score or the streak.

## How we built it

CAROM is a Devvit Web interactive post, scaffolded from Reddit's official bare / hello-world template. The client is TypeScript and Canvas 2D, with a small deterministic physics engine that the daily generator also uses, so every published table has at least one known solution. The server stores scores in a Redis sorted set (fewest shots ranks first) and keeps streaks on the username. The compact splash opens the full game in expanded mode. The same client runs locally for development and playtesting, without a Reddit login.

## Challenges we ran into

Fitting a complete puzzle, result card, and leaderboard into a small post viewport took several layout passes. Making one-bumper bank shots feel fair meant tightening the physics and requiring the generator to prove a table is solvable before it ships. Getting the app onto Reddit also depends on a developer-account terms page that the CLI cannot complete by itself, which delayed the first private upload.

## Accomplishments that we're proud of

A complete daily loop you can learn in a few seconds, with a distinct ink-and-brass look, juiced hits, a shareable result, and a backend ready for streaks and a leaderboard. Thirty days of generated tables all solved in tests, and the fixture table pockets reliably in a local Playwright playtest and in the demo video.

## What's next

- Wire Journey events once the app exists and that beta is available
- A slightly richer end card (closest-approach ghost on a miss, comment CTA) without adding a second screen
- After the hackathon, consider publishing so other communities can install it

## AI assistance (honest disclosure)

An AI assistant (Grok Bot) helped research the official rules, scaffold the Devvit project, write the physics, generator, UI, server, tests, README, and this submission draft, and record the local demo video. Game direction, constraints (stay on the free plan, do not publish before the hackathon ends, do not post on social media without approval), and the decision to enter were Anush's. The work was reviewed, playtested, and iterated so the result would not look like generic "AI slop": custom art and audio are procedural, the typography and palette are specific, and tables are solvability-checked.
