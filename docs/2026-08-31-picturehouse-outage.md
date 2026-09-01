# Incident: Cinema tab down, 31 Aug – 1 Sep 2026

**Status:** resolved 1 Sep 2026, 09:13 UTC
**Impact:** `https://pichouse-ssr.pages.dev/` served a page whose only content was
`Failed to load movies: [GET] "/api/movies": 500 … status code 502` for ~21 hours.
The Trailers, Box Office and About tabs were unaffected — they render from
different sources and built fine.

## One-line summary

Picturehouse's gateway timed out on the 3.5 MB listings feed. Nothing in the
pipeline was set up to survive that, so a ~90-second upstream hiccup replaced a
working site with an error page — and the daily job that would have repaired it
the next morning never fired.

## Timeline (UTC)

| When | What |
|---|---|
| 15–26 Aug | smart-deploy fires on time daily, 06:32–06:52. Site healthy. |
| 27 Aug 17:17 | Run fires ~11h late. First sign of schedule drift. |
| 28 Aug 18:10 | ~12h late. |
| 29 Aug 12:15 | ~6h late. |
| 30 Aug 11:13 | ~5h late. Build healthy: 300 movies fetched in 5.2s, 12 rendered. **Last good deploy.** |
| 31 Aug 12:38 | Run fires ~6.5h late. Fingerprint curl fails → `New data hash: error`. Old logic reads that as "deploy anyway". |
| 31 Aug 12:41:43 | Build's Picturehouse fetch hangs ~60s → `504`. |
| 31 Aug 12:42:35 | Second prerender attempt hangs ~52s → `502`. |
| 31 Aug 12:42:36 | `nuxt generate` exits **0** regardless. Step summary records `Movies found: 0`. Broken page deploys over the working one. Run is green. |
| 1 Sep ~06:37 | **No scheduled run.** Recovery window missed. |
| 1 Sep 09:00 | Investigation starts. Endpoint confirmed healthy from a laptop; failure reproduced only in the Actions logs. |
| 1 Sep 09:11 | `b829ed1` pushed — timeout + retry, build guard. |
| 1 Sep 09:13 | Deploy green. **Site restored**: 312 movies fetched in 3.4s, 19 with Screen 1 showtimes, 16 rendered. |
| 1 Sep 09:16 | `f203e59` — workflow no longer deploys on a failed fetch. |
| 1 Sep 09:25 | `b4b19e4` — cron moved off the top of the hour. |

## What was NOT the cause

Worth recording, because it was the first hypothesis and it was wrong.

- **The API routes did not change.** `POST /api/get-movies-ajax` still answers
  `200` with 311 movies and 45 Screen 1 showtimes across cinemas 029 + 022.
- **Query-string vs POST-body parameters make no difference.** Both forms return
  byte-identical 3.5 MB responses. The endpoint ignores `cinema_id` on this route
  and always returns all 25 cinemas.
- **`COOKIE` is not required.** A valid cookie, a stale one, a bogus one and no
  `Cookie` header at all all return `200`. Same for `User-Agent` and
  `X-Requested-With`. The secret is still set and validated, but this endpoint
  does not check it.
- **Not billing.** Repo is public; Actions minutes are unlimited.
- **Not the 60-day auto-disable.** The workflow was `active` throughout and the
  keepalive step ran every time.

## Root cause

Four faults, only the first outside our control.

1. **The request is marginal by design.** `get-movies-ajax?start_date=show_all_dates`
   returns every showtime at all 25 Picturehouse cinemas — 3.5 MB, 311 films — when
   the site needs 45 showtimes at 2 of them. Healthy, it takes 4–12s. That sits close
   to whatever limit their gateway applies, so any slowdown on their side tips it over.
2. **No timeout, no retry.** `picturehouseApi.js` was the only API client without a
   timeout; `boxOfficeApi.js` and `youtubeApi.js` both had one. A single blip was fatal
   rather than survivable.
3. **`nuxt generate` exits 0 on a failed fetch**, because `pages/index.vue` catches the
   error and renders its error container. A build that fetched nothing looked like a
   successful build.
4. **The workflow deployed *because* the fetch failed.** The branch read
   `⚠️ Failed to fetch data, deploying anyway`. So the outage did not merely fail to
   refresh the site — it actively triggered the build that broke it.

And why it stayed broken: **the 1 Sep scheduled run never fired.** Under the old
logic it would have self-healed — 31 Aug wrote the literal string `error` into the
hash cache, so a healthy fetch on 1 Sep would have produced a differing hash,
deployed, and fixed the site unattended. There was simply no run.

GitHub's `schedule` event is best-effort: it queues on a shared pool, slips under
load, and is dropped when the queue is deep. `0 6 * * *` put the job in the most
contended minute available. The drift pattern above matches that signature.

## Fixes shipped

| Commit | Change |
|---|---|
| `b829ed1` | `picturehouseApi.js`: 30s timeout, 3 attempts, 2s/4s backoff. Retries 5xx and timeouts only — a 4xx just burns another timeout. New `scripts/verify-build.js` fails the build if the generated Cinema tab is empty or errored; wired into `npm run generate`. 6 new tests. |
| `f203e59` | `smart-deploy.yml`: a failed fingerprint fetch now holds the current deploy. `error` is never written to the hash file (two failures in a row would otherwise compare equal and read as "no changes"). `--max-time 30 --retry 2` on the curl. New `skip_reason` output so the summary distinguishes a quiet day from an outage. |
| `b4b19e4` | Cron `0 6 * * *` → `37 6 * * *`. Docs updated. |

Net effect: an upstream blip now produces a **red run and a stale-but-working
site**, instead of a green run and a broken one.

## Open items for next session

- **Watch the schedule.** Next run due ~06:37 UTC daily. If it lands within an hour,
  the contention theory holds. If days keep slipping or going missing, the top of the
  hour was not the problem — escalate to an external trigger (Cloudflare Worker cron
  calling `workflow_dispatch`), which is guaranteed delivery rather than best-effort.
  Another cron minute will not help.
- **Watch for `⚠ [Picturehouse] Attempt 1/3 failed` in build logs.** That is the
  signal that the endpoint really is marginal and worth replacing. Absent that, leave
  it alone.
- **`scheduled-movies-ajax` is the cheaper endpoint, deliberately not adopted.**
  `cinema_id=029` genuinely filters: 465 KB and ~1.7s for both cinemas versus 3.5 MB
  and 4–12s, same 45 showtimes. Decided against for now because it drops three fields:
  - `RunTime` — recoverable from the TMDb details call already being made.
  - `Rating` — the BBFC certificate; TMDb only has it via a separate release-dates
    lookup, so recovering it costs an API call per film.
  - `filter_class_names` — used at `movies.js:132` for the `findLatest` TMDb heuristic
    and read with `?.`, so it would silently evaluate to `false` for every film. No
    error, no failing test, just quietly worse matching on repertory titles. This is
    the reason to be careful, not the size saving.
- **`verify:build` only asserts page 1 of the Cinema tab** (10 of 16 films, because of
  pagination). It checks "at least one listing", which is the right assertion for
  catching a total failure — it would not catch a partial one.
- **Unrelated, local only:** `npm run lint` fails on `.remember/tmp/last-ndc.ts`, a
  Remember-plugin scratch file. It is git-ignored so CI never sees it, but it blocks a
  local `npm run generate` until ESLint is told to ignore `.remember/`.
