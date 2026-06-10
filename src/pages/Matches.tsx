import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom'
import type { Match } from '../types'
import { useI18n } from '../i18n'
import { useSettings } from '../settings/SettingsContext'
import { useAppData } from '../data/DataContext'
import { displayTz, dayKey, fmtDateLong, relativeDay } from '../utils/time'
import { involvesTeams, sortMatches, STAGE_LABEL_KEY } from '../utils/helpers'
import MatchCard from '../components/MatchCard'
import Flag from '../components/Flag'
import Freshness from '../components/Freshness'
import Icon from '../components/Icon'
import './matches.css'

/** stage filter values: real stages + 'ko' = all knockout rounds */
const STAGE_FILTERS = ['group', 'ko', 'r32', 'r16', 'qf', 'sf', 'third', 'final'] as const
type StageFilter = (typeof STAGE_FILTERS)[number]

export default function Matches() {
  const { t, pick, locale } = useI18n()
  const { settings } = useSettings()
  const { matches, teams, venues } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navType = useNavigationType()

  // remember the filter bar across visits: a shared/typed URL always wins, but
  // arriving with no params restores the last-used selection. Keyed on
  // location.key (not just mount) so navigating away and back — or clicking the
  // Matches nav link while already here — restores instead of wiping the saved
  // filters; the user's own in-page filter changes are never overridden.
  const selfChange = useRef(false)
  const restoredFor = useRef<string | null>(null)
  const pendingRestore = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: must run once per navigation (location.key), not on every searchParams change
  useEffect(() => {
    if (restoredFor.current === location.key) return
    restoredFor.current = location.key
    if (selfChange.current) {
      // this navigation came from our own filter controls: nothing to restore
      selfChange.current = false
      return
    }
    if ([...searchParams.keys()].length > 0) return
    try {
      const saved = localStorage.getItem('wc2026-matches-filters')
      if (saved) {
        pendingRestore.current = true
        setSearchParams(new URLSearchParams(saved), { replace: true })
      }
    } catch {
      /* blocked storage */
    }
  }, [location.key])
  useEffect(() => {
    if (restoredFor.current === null) return
    try {
      localStorage.setItem('wc2026-matches-filters', searchParams.toString())
    } catch {
      /* best-effort */
    }
  }, [searchParams])

  // ---- filters from URL (shareable links), validated against data ----
  const rawStage = searchParams.get('stage') ?? ''
  const stage: StageFilter | '' = (STAGE_FILTERS as readonly string[]).includes(rawStage)
    ? (rawStage as StageFilter)
    : ''
  const rawVenue = searchParams.get('venue') ?? ''
  const venueId = rawVenue && venues[rawVenue] ? rawVenue : ''
  const teamsParam = searchParams.get('teams') ?? ''

  const teamCodes = useMemo(() => {
    const out: string[] = []
    for (const raw of teamsParam.split(',')) {
      const c = raw.trim().toUpperCase()
      if (c && teams[c] && !out.includes(c)) out.push(c)
    }
    return out
  }, [teamsParam, teams])

  const anyFilter = stage !== '' || venueId !== '' || teamCodes.length > 0
  const nActive = (stage !== '' ? 1 : 0) + (venueId !== '' ? 1 : 0) + (teamCodes.length > 0 ? 1 : 0)

  // mobile: collapsible filter panel; start open when arriving with filters in the URL
  const [open, setOpen] = useState(anyFilter)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    selfChange.current = true
    setSearchParams(next, { replace: true })
  }
  const toggleTeam = (code: string) => {
    const next = teamCodes.includes(code) ? teamCodes.filter((c) => c !== code) : [...teamCodes, code]
    setParam('teams', next.join(','))
  }
  const clearAll = () => {
    selfChange.current = true
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  // ---- option lists ----
  const allCodes = useMemo(() => Object.keys(teams).sort(), [teams])
  const venueList = useMemo(
    () =>
      Object.values(venues)
        .slice()
        .sort((a, b) => a.realName.localeCompare(b.realName)),
    [venues],
  )
  const favs = useMemo(() => settings.favorites.filter((c) => Boolean(teams[c])), [settings.favorites, teams])
  const favsActive =
    favs.length > 0 && teamCodes.length === favs.length && favs.every((c) => teamCodes.includes(c))

  // ---- filtering + grouping by calendar day in the display timezone ----
  const filtered = useMemo(() => {
    let list = sortMatches(matches)
    if (stage === 'ko') list = list.filter((m) => m.stage !== 'group')
    else if (stage !== '') list = list.filter((m) => m.stage === stage)
    if (venueId) list = list.filter((m) => m.venueId === venueId)
    if (teamCodes.length) list = list.filter((m) => involvesTeams(m, teamCodes))
    return list
  }, [matches, stage, venueId, teamCodes])

  const days = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of filtered) {
      const venue = m.venueId ? venues[m.venueId] : null
      const k = dayKey(m.date, displayTz(settings, venue))
      const arr = map.get(k)
      if (arr) arr.push(m)
      else map.set(k, [m])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered, venues, settings])

  // arriving with no explicit filters: scroll once to today's day group so the
  // user doesn't wade through weeks of finished matches. One-shot only (never
  // fights later interaction) and skipped on POP so back/forward keeps position.
  const autoScroll = useRef(navType !== 'POP' && [...searchParams.keys()].length === 0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot scroll keyed on the rendered day list only
  useEffect(() => {
    if (pendingRestore.current) {
      // saved filters are about to be applied: scroll on the post-restore render
      pendingRestore.current = false
      return
    }
    if (!autoScroll.current || days.length === 0) return
    autoScroll.current = false
    const todayK = dayKey(new Date().toISOString(), displayTz(settings, null))
    const idx = days.findIndex(([k]) => k >= todayK)
    if (idx <= 0) return // today is the first group (or all days are past): stay at the top
    document.getElementById(`mxp-day-${days[idx][0]}`)?.scrollIntoView({ block: 'start' })
  }, [days])

  const teamChip = (code: string) => {
    const team = teams[code]
    const on = teamCodes.includes(code)
    return (
      <button
        key={code}
        type="button"
        className={`mxp-tchip${on ? ' on' : ''}`}
        title={pick(team.name, code)}
        aria-pressed={on}
        onClick={() => toggleTeam(code)}
      >
        <Flag team={team} size={18} />
        {code}
      </button>
    )
  }

  return (
    <div className="mxp">
      <div className="page-head">
        <h1>{t('navMatches')}</h1>
      </div>

      <div className="mxp-bar">
        <Freshness />
        {/* mobile-only toggle row */}
        <div className="mxp-toggle-row">
          <button
            type="button"
            className={`btn${open ? ' on' : ''}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {`${t('filterStage')} · ${t('filterVenue')} · ${t('filterTeams')}`}
            {nActive > 0 && <span className="chip chip-accent tnum">{nActive}</span>}
          </button>
          <span className="muted small tnum mxp-count">{t('matchesShown', { n: filtered.length })}</span>
        </div>

        <div className={`mxp-panel${open ? ' open' : ''}`}>
          <div className="mxp-row1">
            <label className="mxp-field">
              <span className="small muted">{t('filterStage')}</span>
              <select className="input" value={stage} onChange={(e) => setParam('stage', e.target.value)}>
                <option value="">{t('all')}</option>
                {STAGE_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ko' ? t('filterKnockout') : t(STAGE_LABEL_KEY[s])}
                  </option>
                ))}
              </select>
            </label>

            <label className="mxp-field">
              <span className="small muted">{t('filterVenue')}</span>
              <select className="input" value={venueId} onChange={(e) => setParam('venue', e.target.value)}>
                <option value="">{t('all')}</option>
                {venueList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.realName} · {pick(v.cityName, v.city)}
                  </option>
                ))}
              </select>
            </label>

            {/* desktop-only summary */}
            <div className="mxp-summary">
              <span className="muted small tnum">{t('matchesShown', { n: filtered.length })}</span>
              {teamCodes.length > 0 && (
                <span className="muted small tnum">{t('selectedNTeams', { n: teamCodes.length })}</span>
              )}
              {anyFilter && (
                <button type="button" className="btn" onClick={clearAll}>
                  {t('clearFilters')}
                </button>
              )}
            </div>
          </div>

          <div className="mxp-teams-row">
            <div className="mxp-quick">
              <button
                type="button"
                className={`mxp-tchip${teamCodes.length === 0 ? ' on' : ''}`}
                onClick={() => setParam('teams', '')}
              >
                {t('allTeams')}
              </button>
              {favs.length > 0 && (
                <button
                  type="button"
                  className={`mxp-tchip${favsActive ? ' on' : ''}`}
                  onClick={() => setParam('teams', favs.join(','))}
                >
                  <Icon name="star" size={14} />
                  {t('favoritesOnly')}
                </button>
              )}
            </div>
            <div className="mxp-teams">{allCodes.map(teamChip)}</div>
          </div>

          {/* mobile-only clear row */}
          {anyFilter && (
            <div className="mxp-clear-row">
              <button type="button" className="btn" onClick={clearAll}>
                {t('clearFilters')}
              </button>
            </div>
          )}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="empty">
          <p>{t('noMatchesFound')}</p>
          <button type="button" className="btn" onClick={clearAll}>
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        days.map(([k, ms]) => {
          const first = ms[0]
          const tz0 = displayTz(settings, first.venueId ? venues[first.venueId] : null)
          const rel = relativeDay(first.date, tz0)
          return (
            <section
              className="mxp-day"
              key={k}
              id={`mxp-day-${k}`}
              style={{ scrollMarginTop: 'var(--hdr-h, 58px)' }}
            >
              <div className="day-head">
                <span>{fmtDateLong(first.date, locale, tz0)}</span>
                {rel !== null && (
                  <span className="chip rel">
                    {t(rel === 0 ? 'today' : rel === 1 ? 'tomorrow' : 'yesterday')}
                  </span>
                )}
              </div>
              <div className="cards-grid three">
                {ms.map((m) => (
                  <MatchCard key={m.id} match={m} hideDate showWeather />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
