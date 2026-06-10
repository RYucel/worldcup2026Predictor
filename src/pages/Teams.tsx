import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Team } from '../types'
import { DATA_FALLBACK, useI18n } from '../i18n'
import { useSettings } from '../settings/SettingsContext'
import { useAppData } from '../data/DataContext'
import Flag from '../components/Flag'
import Icon from '../components/Icon'
import './teams.css'

function TeamCard({ team }: { team: Team }) {
  const { t, pick } = useI18n()
  const { settings, toggleFavorite } = useSettings()
  const fav = settings.favorites.includes(team.code)
  const favLabel = t(fav ? 'removeFavorite' : 'addFavorite')
  return (
    <Link to={`/team/${team.code}`} className="card tm-card">
      <Flag team={team} size={36} />
      <div className="tm-info">
        <div className="tm-name">{pick(team.name, team.code)}</div>
        <div className="tm-meta small muted">
          {team.ranking !== null && <span className="chip tnum">#{team.ranking}</span>}
          {team.nickname && <span className="tm-nick">{team.nickname}</span>}
        </div>
      </div>
      <button
        type="button"
        className={`tm-star${fav ? ' on' : ''}`}
        aria-label={favLabel}
        title={favLabel}
        aria-pressed={fav}
        onClick={(e) => {
          e.preventDefault()
          toggleFavorite(team.code)
        }}
      >
        <Icon name={fav ? 'starFill' : 'star'} size={20} />
      </button>
    </Link>
  )
}

export default function Teams() {
  const { t, lang } = useI18n()
  const { settings } = useSettings()
  const { teams } = useAppData()
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const by: Record<string, Team[]> = {}
    for (const team of Object.values(teams)) {
      by[team.group] ??= []
      by[team.group].push(team)
    }
    const letters = Object.keys(by).sort()
    for (const g of letters) {
      by[g].sort((a, b) => (a.name.en || a.code).localeCompare(b.name.en || b.code))
    }
    return { by, letters }
  }, [teams])

  // space-separated terms AND together: "ko pu" finds Korea Republic, "墨 哥" finds 墨西哥
  const termsKey = query.trim().toLowerCase()
  const visible = useMemo(() => {
    const terms = termsKey.split(/\s+/).filter(Boolean)
    if (!terms.length) return null // no filter — show everything
    // the data has no pt-BR/zh-TW names, so cards display the DATA_FALLBACK
    // language (pt/zh) — search must cover the names users actually see
    const fallbackLang = DATA_FALLBACK[lang]
    const set = new Set<string>()
    for (const team of Object.values(teams)) {
      // search the user's language + English (all 12 name locales would cross-match noise)
      const hay = [
        team.code,
        team.nickname ?? '',
        team.name[lang] ?? '',
        (fallbackLang && team.name[fallbackLang]) ?? '',
        team.name.en ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (terms.every((term) => hay.includes(term))) set.add(team.code)
    }
    return set
  }, [termsKey, teams, lang])

  const show = (code: string) => !visible || visible.has(code)

  const favTeams = settings.favorites
    .map((c) => teams[c])
    .filter((tm): tm is Team => Boolean(tm) && show(tm.code))

  const nothing = visible !== null && visible.size === 0

  return (
    <div className="tm-page">
      <div className="page-head tm-head">
        <h1>{t('teamsTitle')}</h1>
        <input
          className="input tm-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('teamsTitle')}
          aria-label={t('teamsTitle')}
        />
      </div>

      {nothing ? (
        <div className="empty">{t('noMatchesFound')}</div>
      ) : (
        <>
          {favTeams.length > 0 && (
            <section>
              <div className="section-title">
                <h2>{t('favoritesOnly')}</h2>
              </div>
              <div className="cards-grid three">
                {favTeams.map((tm) => (
                  <TeamCard key={tm.code} team={tm} />
                ))}
              </div>
            </section>
          )}

          {groups.letters.map((g) => {
            const list = groups.by[g].filter((tm) => show(tm.code))
            if (!list.length) return null
            return (
              <section key={g}>
                <div className="section-title">
                  <h2>{t('groupX', { x: g })}</h2>
                </div>
                <div className="cards-grid three">
                  {list.map((tm) => (
                    <TeamCard key={tm.code} team={tm} />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
