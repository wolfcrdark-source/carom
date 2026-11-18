# Devpost submission draft — CAROM

Event: [Reddit's Game of the Day Hackathon](https://redditgameofday2026.devpost.com/)
Deadline: 8 Dec 2026, 6:00 pm PST (9 Dec 2026, 7:30 am IST)

Status as of 19 Nov 2026, 12:03 am IST (Asia/Calcutta): u/CTDaRk_Wolf has accepted developer terms, and CAROM was privately uploaded as app `carom-daily` version 0.0.1 (`VersionVisibility.PRIVATE`). It is installed on the auto-created playtest subreddit r/carom_daily_dev. Do **not** publish or launch the app for Reddit review until after the hackathon. The demo post URL still needs to be confirmed in a logged-in browser, and the subreddit is almost certainly still private (standard for a Devvit playtest community).

Do not publish / launch the app for Reddit review until after the hackathon.

## Project name

CAROM

## Tagline

Place one bumper. Bank the daily shot. How few can you take?

(Optional shorter: A daily bank-shot puzzle for Reddit.)

## Built with

- Devvit Web (Reddit Developer Platform, interactive posts)
- TypeScript
- HTML Canvas
- Redis (per-day leaderboard and streaks)
- Node.js / esbuild
- Playwright (local playtests and the demo video)

## Links

- App listing: https://developers.reddit.com/apps/carom-daily (private v0.0.1, owner u/CTDaRk_Wolf, 1 install)
- Demo subreddit: https://www.reddit.com/r/carom_daily_dev (auto-created playtest sub; carom-daily v0.0.1 and Devvit Admin Helper App v0.0.6 are installed). Visibility not confirmable from this network (unauthenticated Reddit API is blocked); treat it as **private** until Community settings are checked. Judges need it public and under 200 members, or [dr-admin-approve](https://developers.reddit.com/apps/dr-admin-approve) installed. A CLI install of `dr-admin-approve` was denied: "You do not have permission to install this app version."
- Demo post: _pending logged-in confirmation_. `onAppInstall` is wired to create a post titled **CAROM — 18 Nov** (UTC date 2026-11-18), but that handler does not log the URL. `devvit logs r/carom_daily_dev` only showed that the `daily-post` cron was scheduled at 18 Nov 2026, 11:59 pm IST. The scheduler itself runs at 00:05 UTC and would log the URL then. In the sub, look for that title first; if it is missing, use the moderator menu action **Post today's CAROM**.
- Repository: https://github.com/wolfcrdark-source/carom
- Video: /workspace/reddit-hack/video/carom.mp4 (12.8 s, silent, under the 1-minute optional-video limit). Upload to YouTube or Vimeo and paste the public link here before submitting.

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

- Confirm today's demo post in r/carom_daily_dev, make the sub public (<200 members) or install dr-admin-approve in the browser, then paste the listing / sub / post URLs into the Devpost project. Do not publish the app.
- Wire Journey events once the app exists and that beta is available
- A slightly richer end card (closest-approach ghost on a miss, comment CTA) without adding a second screen
- After the hackathon, consider publishing so other communities can install it

## AI assistance (honest disclosure)

An AI assistant (Grok Bot) helped research the official rules, scaffold the Devvit project, write the physics, generator, UI, server, tests, README, and this submission draft, and record the local demo video. Game direction, constraints (stay on the free plan, do not publish before the hackathon ends, do not post on social media without approval), and the decision to enter were Anush's. The work was reviewed, playtested, and iterated so the result would not look like generic "AI slop": custom art and audio are procedural, the typography and palette are specific, and tables are solvability-checked.

## Submission checklist

- [x] Devpost account joined to the hackathon
- [x] u/CTDaRk_Wolf accepted developer terms
- [x] `npx devvit upload` of private v0.0.1 — do not publish
- [ ] Confirm the demo post, then make r/carom_daily_dev public (<200 members) or install dr-admin-approve in the browser
- [ ] App listing URL, demo subreddit URL, and demo post URL pasted into Devpost
- [x] README.md in the app root (done in this repo)
- [ ] Optional: upload the <1 min video to YouTube/Vimeo and add the link
- [x] Optional: public repo URL (https://github.com/wolfcrdark-source/carom)
- [ ] Optional: developer satisfaction survey (Feedback awards)
