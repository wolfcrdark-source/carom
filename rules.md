# Reddit Game of the Day Hackathon — rules summary

Read and checked on 18 Nov 2026 (Asia/Calcutta). This is a working summary for the team, not a substitute for the official rules.

## Official sources

- Overview: https://redditgameofday2026.devpost.com/
- Official Rules: https://redditgameofday2026.devpost.com/rules
- Resources: https://redditgameofday2026.devpost.com/resources
- Schedule: https://redditgameofday2026.devpost.com/details/dates
- Devvit quickstart: https://developers.reddit.com/docs/quickstart
- Devvit CLI: https://developers.reddit.com/docs/guides/tools/devvit_cli
- Playtest: https://developers.reddit.com/docs/guides/tools/playtest
- Template library: https://developers.reddit.com/docs/examples/template-library
- Devvit Rules: https://developers.reddit.com/docs/next/devvit_rules
- Community games playbook: https://developers.reddit.com/docs/guides/best-practices/community_games
- Admin-join helper app (for private demo subs): https://developers.reddit.com/apps/dr-admin-approve
- Official Phaser starter: https://github.com/reddit/devvit-template-phaser
- Official bare / hello-world starter (this repo is based on it): https://github.com/reddit/devvit-template-hello-world
- Support: devvit-support@reddit.com (hackathon); support@devpost.com (Devpost)

## Deadline (convert to IST)

Official close: **Tuesday, 8 Dec 2026, 6:00 pm Pacific Time (PST, UTC-8)**.

That is **Wednesday, 9 Dec 2026, 7:30 am Asia/Calcutta (IST)**.

Aim to have the Devpost submission, app listing, public demo post, and README locked **before 8 Dec 2026, 11:00 pm IST**, so there is time to fix a broken demo link.

Other official times (all converted from the rules, Pacific Time):

| Period                       | Official                                          | Asia/Calcutta (IST)                                |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Submission / feedback window | 11 Nov 2026, 12:00 pm PT – 8 Dec 2026, 6:00 pm PT | 12 Nov 2026, 1:30 am IST – 9 Dec 2026, 7:30 am IST |
| Judging                      | 9 Dec 2026, 12:00 am PT – 16 Dec 2026, 6:00 pm PT | 9 Dec 2026, 1:30 pm IST – 17 Dec 2026, 7:30 am IST |
| Winners announced            | on or around 17 Dec 2026, 3:00 pm PT              | on or around 18 Dec 2026, 4:30 am IST              |

The hackathon is already open (it started 11 Nov). There were 1,647 registered participants when the overview was read on 18 Nov 2026.

## Eligibility (India)

Anush in India **is eligible**, as long as he is the age of majority where he lives (18 in India).

The official rules open the event to individuals over the age of majority, teams of those individuals, and organizations. The listed exclusions are residents of / organizations domiciled in places where US or local law bars participation or prize receipt, **including but not limited to Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, Syria, and other OFAC-designated countries**. India is not on that list.

Also excluded: Reddit/Devpost promotion entities, their employees and household/immediate family, judges and their employers, affiliates, and anyone whose entry would be a conflict of interest. No purchase is required.

An individual may enter alone and/or as part of a team. We should enter as an individual unless a teammate is added later.

If a prize is won, winners may have to complete an affidavit and tax forms (US residents W-9; **non-US residents may need a W-8BEN**), within 10 business days of the forms being sent. Prizes are paid within 60 days of completed forms, by mail or electronic transfer. Winners are responsible for FX/wire fees and for taxes in their jurisdiction; the sponsor may withhold amounts required by law.

## Prizes ($35,000 USD total)

From the official rules §8 and the overview:

| Prize                  | Amount  | Qty | Notes                                                                                                                                                                                                      |
| ---------------------- | ------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Best Daily Game        | $15,000 | 1   | All eligible game submissions                                                                                                                                                                              |
| Best Ported Daily Game | $6,000  | 1   | For a daily game that ports the entrant's **own** existing IP / other-platform game. Must be disclosed as a port on the submission. We are building a new game, so we are **not** aiming at this category. |
| Honorable Mentions     | $1,000  | 10  | All eligible game submissions                                                                                                                                                                              |
| Devvit Helpers         | $500    | 6   | Awarded to people who help others on the Devvit Discord and r/devvit during the submission window. Individual, not a project prize.                                                                        |
| Feedback Award         | $200    | 5   | Requires the developer satisfaction survey (one form per entrant). Individual, not a project prize.                                                                                                        |

Important: **a project can win only one prize.** Feedback-only entrants cannot win the game prizes. Multiple unique submissions are allowed, but each must be substantially different.

## What counts as a daily game

A bite-sized experience with enough variety and replayability that people come back. Easy to learn, a satisfying daily loop, and integrated into Reddit (comments, flair, scheduled posts, streaks, snoovatars, Devvit Journeys, and so on are bonus points — but "Reddit-y" does **not** mean making a game about Snoo, karma, or Reddit itself).

Examples named on the overview: r/hotandcold, r/colorpuzzlegame, r/syllo, r/pocketgrids.

Must be built with **Devvit Web** (React, Phaser, three.js, Godot, GameMaker, Unity, or similar) as an **Interactive Post**. Games that are not actually running on Reddit cannot place.

They want: intuitive onboarding, visual craft, calibrated daily content, focused gameplay, a clear end-state / re-engagement card, and Journey event instrumentation.

They do **not** want: obvious AI slop, on-the-nose Reddit theming, over-used ideas (space shooters, popular-game clones, simple platformers, collaborative storytelling, trivia) unless the take is extremely distinctive, or last-minute ports that never actually run on Devvit.

## AI-generated work

**Allowed.** The overview says: "Did you use AI? Fantastic! But it shouldn't be obvious the moment we open your app." Fit the UI in the viewport, give it a unique identity, make it accessible, and think about human players. There is no separate "disclose AI" checkbox called out in the official rules, but the submission must still be the entrant's original work product and must not infringe anyone else's rights. Third-party help (including tools) is allowed if Anush owns the resulting work.

## Required deliverables (Devpost submission)

Devpost registration is **required**: click "Join Hackathon" on the event site and create or log in to a free Devpost account. A Submission is only complete once the required fields on "Enter a Submission" are filled during the submission window.

Required:

1. A **Project** built on Reddit's Developer Platform that meets the project requirements (Devvit Web interactive post, daily-game loop).
2. A **text description** of features and functionality (in English).
3. An **app listing** URL of the form `https://developers.reddit.com/apps/{app-name}`, created by **uploading** the app (`devvit upload` / `npm run deploy`). The app may remain **private**.
4. A detailed **README.md in the root of the app** describing the game and how to play.
5. A **demo post**: link to (a) a test subreddit and (b) a public post running the game. The subreddit should be **public**, OR install [dr-admin-approve](https://developers.reddit.com/apps/dr-admin-approve) so Reddit admins can join automatically. The rules also say the working project should be in a **public subreddit with fewer than 200 members**, free to play, and stay available through the end of judging.

Optional:

- Demo **video**, under 1 minute, on YouTube / Vimeo / Facebook Video / Youku. Judges are not required to watch past one minute. Recommended for us, but not mandatory.
- Public source **repository** URL. Optional (unlike GitHub Game Off).
- Developer satisfaction **survey**, to qualify for the Feedback awards.

**Do not publish / submit the app for Reddit app review** for this event. The overview is explicit: wait until after the hackathon. Upload + playtest is enough; keep the app private.

Projects must be new, or significantly updated after the submission window opened. Previous Reddit hackathon winners are ineligible. Third-party APIs/SDKs need proper licenses.

## Judging

A Reddit-selected panel. Stage one is a pass/fail theme + platform-fit screen. Stage two scores four equally weighted criteria:

1. Delightful UX
2. Polish (close to publishable, compliant with Devvit Rules, understandable from the demo posts)
3. Reddit-y (own identity, community-minded, fresh — not "a game about Reddit")
4. Daily Content (recurring challenges and intrigue; does not have to be strictly daily, but should use fresh content well)

Judges may score from the demo link alone; they are not required to test the project and may rely on the description, images, and video.

## Accounts and sign-in (do not create these until the user approves)

See the end of this file and the parent report. No accounts were created and no logins were performed while writing this.

## Devvit practical constraints (from current docs, CLI 0.15.4)

- Node.js **24.18.0+** (quickstart). This box has Node 24.22.1. Templates require `>=24.0.0`.
- A Reddit account with a **verified email**, then a Devvit developer account at https://developers.reddit.com (tied to that Reddit account).
- CLI login is **browser OAuth**, not a device-code flow: `npx devvit login` opens reddit.com; the user clicks Allow; the token is stored at `~/.devvit/token`. Use `npx devvit login --copy-paste` if the localhost callback is unavailable. Confirm with `npx devvit whoami`.
- The current recommended create flow is https://developers.reddit.com/new (pick a template, including Phaser / React / Unity / GameMaker / hello world), then paste the success-page command / init code: `npx devvit init [code]`.
- `devvit playtest` installs to a test subreddit with **fewer than 200 subscribers** that you moderate. If none is set, a **private** playtest subreddit is auto-created (you are made moderator, the app is pre-installed, Reddit admins can join). For the Devpost demo, prefer a **public** <200-member sub, or install dr-admin-approve.
- `devvit upload` creates a private app listing. `devvit publish` / `npm run launch` sends it for app review — **do not do that** before the hackathon ends.
- Official docs do not state a minimum karma or account-age requirement for Devvit. Developer accounts do require a verified email. Some brand-new accounts have reported `access_denied` after `devvit login`; prefer an established Reddit account with a verified email rather than a brand-new one.

## What we have not done yet

No Devpost join, no Reddit/Devvit account, no `devvit login`, no upload, no subreddit, no public post, no payment, no social post.
