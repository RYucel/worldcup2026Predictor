# [2026 World Cup Open Source Companion ⚽](https://26worldcup.github.io)

Clean and complete 2026 FIFA World Cup companion: schedule, groups, bracket, squads, venues, weather, and where to watch, in 23 languages.

**[Click me to use 2026 World Cup Open Source Companion now!](https://26worldcup.github.io)** ([26worldcup.github.io](https://26worldcup.github.io))

Faster, simpler, easier way to look things up than FIFA&#46;com, Google or Wikipedia: every fact about the tournament is one or two taps away, in your language and your time zone, with nothing you don't need (no ads, no news feeds, no videos, no cookie banners, no sign-in).

> **Unofficial, fan-made, not-for-profit, open-source project**, hosted on GitHub Pages. Not affiliated with, endorsed by, or connected to FIFA, any national football association, team, player, or broadcaster. Code and curated data are MIT-licensed (see [LICENSE](LICENSE)); third-party data terms are inventoried in [COPYRIGHT](COPYRIGHT).

## Features

### Tournament

- **All 104 matches** with kick-off times, stadiums, group/stage chips, and semi-live scores
- **Schedule** filterable by team(s), stage, and venue; filters live in the URL, so views are shareable
- **Group tables** computed with the official FIFA tiebreakers, plus the ranking of third-placed teams (top 8 of 12 advance) with qualification colour-coding
- **Knockout bracket** as a centre-converging tree that fills in automatically as teams qualify, with no horizontal scrolling; reflows to a round-by-round list on phones
- **Match pages**: venue facts, kick-off weather forecast (typical-climate fallback for far-off dates), full referee crew, starting line-ups drawn on an SVG pitch with formations, goal timeline, and TV channels for your country

### Teams & players

- **48 team pages**: live FIFA ranking, coach, group table, full fixtures, training base camp (with map + Google Maps links), official website, and Wikipedia links
- **Official 26-player squads**: numbers, positions, ages, caps, goals, clubs; every player links to their English Wikipedia article
- **Favorites**: star the teams you follow and filter the home page and schedule to them

### Venues & maps

- **Real-geography map** of all 16 stadiums (Natural Earth data, Lambert conformal conic projection) with capacity, roof type, time zone, and June/July climate for every venue
- **Team base camps** plotted on the same map as flag pins (collision-free layout), with a team filter that highlights only the cities where a selected team plays

### Watching

- **Broadcast guide for 32 countries/regions** with free-to-air channels highlighted; your country is auto-detected from the device time zone (changeable in Settings)
- **Golden-boot table** and tournament stats, updated throughout the competition

### Experience

- **23 languages** (see below) with automatic detection and full right-to-left support for Arabic and Persian
- **Time zones**: match times default to *your* clock; switch to stadium-local time or any fixed zone (the host-anchor default is America/New_York)
- **PWA**: installable on desktop and mobile, works fully offline after the first visit (everything except live score refreshes)
- **Penalty shootout minigame**: pick any of the 48 teams and play a best-of-five shootout; takers are drawn from the real squads, and you choose where to shoot and where to dive
- **Calendar export**: download an `.ics` file of your teams' matches
- **Light & dark themes**, automatic by default
- **Self-contained**: flags, fonts, map data, and all tournament data are served locally; the app makes **zero third-party requests** at runtime

## Languages

**23 languages**, covering the languages of all participating teams plus some popular ones:

English · Français · Español · Português (Portugal) · Português (Brasil) · Deutsch · Nederlands · Čeština · Hrvatski · Svenska · Norsk · العربية · فارسی · Türkçe · Oʻzbekcha · 日本語 · 한국어 · 简体中文 · 繁體中文 · Italiano · Bahasa Indonesia · Русский · Українська

Team, stadium, and referee names are additionally served in FIFA's own localisation for 12 of these languages; the rest fall back to English names while the interface stays translated. The language can be switched any time from the header; dictionaries load on demand.

## Compatibility

- **Screens**: responsive from small phones (360 px) to large desktops; bottom tab bar on mobile, full navigation on desktop
- **Browsers**: current Chrome, Edge, Firefox, and Safari (desktop and iOS)
- **Install**: as a PWA from the browser menu on Android, iOS ("Add to Home Screen"), and desktop Chrome/Edge
- **Accessibility**: keyboard-navigable controls, visible focus states, WCAG AA contrast in both themes, `prefers-reduced-motion` respected

## Data: fresh after every match

All data comes from free, authoritative sources, with no API keys anywhere:

| Source | Provides |
|---|---|
| FIFA public API | fixtures, scores, line-ups, referees, localized names, world ranking |
| Wikipedia | official 26-player squads (numbers, caps, goals, clubs, coaches) |
| Open-Meteo | hourly stadium weather forecasts and base-camp geocoding |
| Hand-curated files | venues, broadcasters, base camps, climate normals, team colours |

**Automatic updates** (GitHub Actions, included in this repo):

- **every 15 minutes while matches are being played** (plus a line-ups pull 10 minutes before each kick-off)
- **daily at 00:00 New York time**
- every update is sanity-checked before publishing and triggers a site redeploy

Scores are **semi-live, not real-time**: they typically trail the broadcast by up to ~15 minutes. This is by design; the whole app is static JSON refreshed by CI, with no servers, sockets or push infrastructure.

## Development

### Quick start

```bash
bun install
bun run update   # fetch the latest data
bun run dev      # http://localhost:5173
```

Production build (fully static output in `dist/`):

```bash
bun run build
bun run preview
```

### Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Vite dev server at `localhost:5173` |
| `bun run build` | type-check and production build into `dist/` |
| `bun run preview` | serve the built `dist/` locally |
| `bun run update` | refresh all tournament data (FIFA, Wikipedia, Open-Meteo) into `public/data/` |
| `bun run gencron` | regenerate the CI cron schedule from the match calendar |
| `bun run genmap` | rebuild the venues map from Natural Earth source data |
| `bun run lint` | Biome lint + format check (includes a11y rules) |
| `bun run format` | Biome auto-format |
| `bun run smoke` | headless smoke test: every route across languages and themes |
| `bun run a11y` | axe-core WCAG A/AA audit: routes × light/dark × RTL |

### Adding a language

1. Create `src/i18n/<code>.ts` with every key from `en.ts` (same order; add `key#one`-style plural variants if the language's grammar needs them).
2. Wire it up: `Lang` union in `src/types.ts`, `LOCALE_TAG` + `LANG_LABEL` in `src/i18n/strings.ts` (key order = menu order), loader in `src/i18n/index.tsx`, detection prefix in `src/settings/SettingsContext.tsx` (variants before their base language), `RTL_LANGS` if right-to-left, `DATA_FALLBACK` if it is a variant.
3. Probe FIFA: if `api.fifa.com` serves the language, add it to `LANGS` in `scripts/update.mjs` (team/stadium/referee names come localized for free); otherwise add it to `CLDR_LANGS` there so team names come from CLDR.
4. Translate the curated data: 16 `rainNote` entries in `scripts/curated/climate.json`, 90 broadcaster notes in `scripts/curated/broadcasters.json`, the SF Bay Area short label in `src/pages/Venues.tsx`, and (non-Latin scripts only) 16 city names in `scripts/curated/city-l10n.json`.
5. Finish: add a smoke pass in `scripts/smoke.mjs`, update the language list and count in this README, run `bun run update && bun run build && bun run smoke`.

## Deploying

The app is a static site with hash routing and relative asset paths. For GitHub Pages:

1. Push to a repository and set **Settings → Pages → Source: GitHub Actions**.
2. `deploy.yml` builds and publishes on every push to `main`.
3. `update-data.yml` refreshes the data on the match-driven schedule above and redeploys. Its cron table is generated from the fixed match calendar; run `bun run gencron` if a kick-off time ever changes.

### Scripts



### Tech

React 19 · TypeScript · Vite · no backend, no runtime dependencies beyond React + Router. SVG throughout: the pitch with line-ups, the projected North America map, the bracket, the logo.

```
scripts/update.mjs    data pipeline (bun run update)
scripts/gencron.mjs   regenerates the match-driven CI schedule
scripts/genmap.mjs    rebuilds the map from Natural Earth data
scripts/smoke.mjs     headless smoke test across routes, languages, themes
scripts/curated/      hand-checked datasets
public/data/          generated JSON the app loads at runtime
src/                  application code (pages, components, i18n, settings)
```

## License

Code and curated data: [MIT](LICENSE). Detailed third-party data and image licensing: [COPYRIGHT](COPYRIGHT). Data courtesy of FIFA's public API, Wikipedia, and Open-Meteo; verify broadcast rights with local listings.
