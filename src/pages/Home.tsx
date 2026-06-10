import { usePersistentState } from '../utils/viewState'
import { Link } from 'react-router-dom'
import type { Match } from '../types'
import { useI18n } from '../i18n'
import { useSettings } from '../settings/SettingsContext'
import { useAppData } from '../data/DataContext'
import { displayTz, daysUntil, dayKey, fmtDateLong, relativeDay } from '../utils/time'
import { involvesTeams, sortMatches } from '../utils/helpers'
import MatchCard from '../components/MatchCard'
import Icon from '../components/Icon'
import './home.css'

/** how many calendar days ahead (incl. today) the home page previews */
const HORIZON_DAYS = 5

interface DayGroup {
  key: string // YYYY-MM-DD in the match's display tz
  date: string // representative match date (ISO) for formatting the header
  tz: string | undefined
  rel: number | null
  matches: Match[]
}

export default function Home() {
  const { t, locale } = useI18n()
  const { settings } = useSettings()
  const data = useAppData()
  const [favOnly, setFavOnly] = usePersistentState('wc2026-home-fav', false)
  const [favHintDismissed, setFavHintDismissed] = usePersistentState('wc2026-favhint-dismissed', false)

  const now = Date.now()
  const sorted = sortMatches(data.matches)
  const live = sorted.filter((m) => m.status === 'live')
  const finished = sorted.filter((m) => m.status === 'finished')
  const recent = finished.slice(-6).reverse()

  // ---- hero state ----
  const first = sorted.length > 0 ? sorted[0] : null
  const started = live.length > 0 || finished.length > 0 || (first !== null && now >= Date.parse(first.date))
  let heroLine: string | null = null
  if (first) {
    const firstVenue = first.venueId ? data.venues[first.venueId] : null
    const heroN = daysUntil(first.date, displayTz(settings, firstVenue))
    if (started) heroLine = t('heroLive')
    else if (heroN <= 0) heroLine = t('heroToday')
    else if (heroN === 1) heroLine = t('heroTomorrow')
    else heroLine = t('heroDays', { n: heroN })
  }
  const nTeams = Object.keys(data.teams).length
  const nVenues = Object.keys(data.venues).length

  // ---- upcoming matches in the next HORIZON_DAYS calendar days (display tz) ----
  // the day window depends on the tz a match is displayed in, so cache one window per tz
  const windows = new Map<string, Set<string>>()
  const windowFor = (tz: string | undefined): Set<string> => {
    const cacheKey = tz ?? ''
    let w = windows.get(cacheKey)
    if (!w) {
      w = new Set<string>()
      for (let i = 0; i < HORIZON_DAYS; i++) {
        w.add(dayKey(new Date(now + i * 86400e3).toISOString(), tz))
      }
      windows.set(cacheKey, w)
    }
    return w
  }

  const upcoming: { m: Match; tz: string | undefined; key: string }[] = []
  for (const m of sorted) {
    if (m.status === 'live' || m.status === 'finished') continue
    const venue = m.venueId ? data.venues[m.venueId] : null
    const tz = displayTz(settings, venue)
    const key = dayKey(m.date, tz)
    if (windowFor(tz).has(key)) upcoming.push({ m, tz, key })
  }

  const hasFavs = settings.favorites.length > 0
  const visible =
    favOnly && hasFavs ? upcoming.filter((u) => involvesTeams(u.m, settings.favorites)) : upcoming

  const groups: DayGroup[] = []
  for (const u of visible) {
    let g = groups.find((x) => x.key === u.key)
    if (!g) {
      g = { key: u.key, date: u.m.date, tz: u.tz, rel: relativeDay(u.m.date, u.tz), matches: [] }
      groups.push(g)
    }
    g.matches.push(u.m)
  }
  groups.sort((a, b) => a.key.localeCompare(b.key))

  return (
    <div className="home">
      {/* ---- hero ---- */}
      <section className="home-hero card">
        <h1>{t('appFullName')}</h1>
        <p className="home-hero-sub">{t('appSub')}</p>
        {heroLine && (
          <div className={`home-hero-count${started ? ' is-live' : ''}`}>
            <Icon name="clock" size={17} />
            <span>{heroLine}</span>
          </div>
        )}
        <div className="home-hero-chips">
          <span className="home-chip">{t('matchesShown', { n: sorted.length })}</span>
          <span className="home-chip">
            {nTeams} · {t('navTeams')}
          </span>
          <span className="home-chip">
            {nVenues} · {t('navVenues')}
          </span>
        </div>
      </section>

      {/* ---- live now ---- */}
      {live.length > 0 && (
        <>
          <div className="section-title">
            <h2>{t('liveNow')}</h2>
            <span className="chip chip-live">{t('statusLive')}</span>
          </div>
          <div className="cards-grid">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} showWeather />
            ))}
          </div>
        </>
      )}

      {/* ---- next matches (5-day preview) ---- */}
      {(upcoming.length > 0 || (favOnly && hasFavs)) && (
        <>
          <div className="section-title home-next-head">
            <h2>{t('nextMatches')}</h2>
            {hasFavs && (
              <div className="seg home-favseg">
                <button type="button" className={!favOnly ? 'on' : ''} onClick={() => setFavOnly(false)}>
                  {t('allTeams')}
                </button>
                <button type="button" className={favOnly ? 'on' : ''} onClick={() => setFavOnly(true)}>
                  {t('favoritesOnly')}
                </button>
              </div>
            )}
          </div>
          {/* one-time favorites onboarding: tap the line to dismiss it for good */}
          {!hasFavs && !favHintDismissed && (
            <button
              type="button"
              className="home-fav-hint muted small"
              onClick={() => setFavHintDismissed(true)}
            >
              <span>{t('favHint')}</span>
              <span className="home-fav-hint-x" aria-hidden="true">
                ✕
              </span>
            </button>
          )}
          {groups.length === 0 ? (
            <div className="card empty">{t('noFavMatches')}</div>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="home-day">
                <div className="day-head">
                  <span>{fmtDateLong(g.date, locale, g.tz)}</span>
                  {g.rel === 0 && <span className="rel">{t('today')}</span>}
                  {g.rel === 1 && <span className="rel">{t('tomorrow')}</span>}
                </div>
                <div className="cards-grid">
                  {g.matches.map((m) => (
                    <MatchCard key={m.id} match={m} hideDate showWeather />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}

      {/* ---- recent results ---- */}
      {recent.length > 0 && (
        <>
          <div className="section-title">
            <h2>{t('recentResults')}</h2>
          </div>
          <div className="cards-grid">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </>
      )}

      {/* ---- footer link ---- */}
      <div className="home-more">
        <Link className="btn btn-primary" to="/matches">
          <Icon name="calendar" size={18} />
          {t('seeAllMatches')}
        </Link>
      </div>
    </div>
  )
}
