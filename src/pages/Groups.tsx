import { useMemo, useState } from 'react'
import type { Match, StandingRow } from '../types'
import { useI18n } from '../i18n'
import { useAppData } from '../data/DataContext'
import { qualState, sortMatches } from '../utils/helpers'
import MatchCard from '../components/MatchCard'
import TeamName from '../components/TeamName'
import Icon from '../components/Icon'
import './groups.css'

function fmtGd(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function rowQualClass(state: ReturnType<typeof qualState>): string {
  if (state === 'through') return ' gp-tr-through'
  if (state === 'third') return ' gp-tr-third'
  if (state === 'out') return ' gp-tr-out'
  return ''
}

/** P W D L GF GA GD Pts header cells (shared by group + thirds tables) */
function NumHeads() {
  const { t } = useI18n()
  return (
    <>
      <th className="tnum">{t('colP')}</th>
      <th className="tnum gp-hxxs">{t('colW')}</th>
      <th className="tnum gp-hxxs">{t('colD')}</th>
      <th className="tnum gp-hxxs">{t('colL')}</th>
      <th className="tnum gp-hxs">{t('colGF')}</th>
      <th className="tnum gp-hxs">{t('colGA')}</th>
      <th className="tnum">{t('colGD')}</th>
      <th className="tnum">{t('colPts')}</th>
    </>
  )
}

function NumCells({ r }: { r: StandingRow }) {
  return (
    <>
      <td className="tnum">{r.p}</td>
      <td className="tnum gp-hxxs">{r.w}</td>
      <td className="tnum gp-hxxs">{r.d}</td>
      <td className="tnum gp-hxxs">{r.l}</td>
      <td className="tnum gp-hxs">{r.gf}</td>
      <td className="tnum gp-hxs">{r.ga}</td>
      <td className="tnum">{fmtGd(r.gd)}</td>
      <td className="tnum gp-pts">{r.pts}</td>
    </>
  )
}

export default function Groups() {
  const { t } = useI18n()
  const { standings, matches } = useAppData()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const letters = useMemo(() => Object.keys(standings.groups).sort(), [standings.groups])

  const fixturesByGroup = useMemo(() => {
    const map: Record<string, Match[]> = {}
    for (const m of matches) {
      if (m.stage === 'group' && m.group) {
        map[m.group] ??= []
        map[m.group].push(m)
      }
    }
    for (const g of Object.keys(map)) map[g] = sortMatches(map[g])
    return map
  }, [matches])

  const toggle = (g: string) => setOpen((o) => ({ ...o, [g]: !o[g] }))
  const scrollToGroup = (g: string) =>
    document.getElementById(`group-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div>
      <div className="page-head">
        <h1>{t('groupsTitle')}</h1>
      </div>

      <div className="gp-grid">
        {letters.map((g) => {
          const rows = standings.groups[g] ?? []
          const fixtures = fixturesByGroup[g] ?? []
          const isOpen = !!open[g]
          return (
            <section key={g} id={`group-${g}`} className="card gp-card">
              <header className="gp-head">
                <span className="gp-letter" aria-hidden="true">
                  {g}
                </span>
                <h2>{t('groupX', { x: g })}</h2>
              </header>

              <table className="gp-table" aria-label={t('groupX', { x: g })}>
                <thead>
                  <tr>
                    <th className="gp-rank" />
                    <th className="gp-team">{t('filterTeams')}</th>
                    <NumHeads />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.code}
                      className={`gp-tr${rowQualClass(qualState(standings, g, r.rank, r.code))}`}
                    >
                      <td className="gp-rank tnum">{r.rank}</td>
                      <td className="gp-team">
                        <TeamName code={r.code} flagSize={20} />
                      </td>
                      <NumCells r={r} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {fixtures.length > 0 && (
                <>
                  <button
                    type="button"
                    className="gp-fixbtn"
                    aria-expanded={isOpen}
                    aria-controls={`gp-fix-${g}`}
                    onClick={() => toggle(g)}
                  >
                    <Icon name="calendar" size={15} />
                    {t('groupFixtures')}
                    <span className="chip tnum">{fixtures.length}</span>
                    <Icon name="back" size={15} className={`gp-chev${isOpen ? ' open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div id={`gp-fix-${g}`} className="cards-grid gp-fix">
                      {fixtures.map((m) => (
                        <MatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>

      <div className="section-title">
        <h2>{t('thirdsTitle')}</h2>
      </div>
      <section className="card gp-card gp-thirds">
        <table className="gp-table" aria-label={t('thirdsTitle')}>
          <thead>
            <tr>
              <th className="gp-rank" />
              <th className="gp-gcol">{t('group')}</th>
              <th className="gp-team">{t('filterTeams')}</th>
              <NumHeads />
            </tr>
          </thead>
          <tbody>
            {standings.thirds.map((r, i) => (
              <tr
                key={r.code}
                className={
                  'gp-tr' +
                  (r.qualifies === true ? ' gp-tr-through' : r.qualifies === false ? ' gp-tr-out' : '') +
                  (i === 7 ? ' gp-cutline' : '')
                }
              >
                <td className="gp-rank tnum">{r.thirdRank}</td>
                <td className="gp-gcol">
                  <button
                    type="button"
                    className="gp-gbtn"
                    onClick={() => scrollToGroup(r.group)}
                    title={t('groupX', { x: r.group })}
                  >
                    {r.group}
                  </button>
                </td>
                <td className="gp-team">
                  <TeamName code={r.code} flagSize={20} />
                </td>
                <NumCells r={r} />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted gp-info">{t('thirdsInfo')}</p>
      </section>

      <div className="gp-legend small muted">
        <span>
          <i className="gp-dot gp-dot-q" />
          {t('legendQualified')}
        </span>
        <span>
          <i className="gp-dot gp-dot-t" />
          {t('legendThird')}
        </span>
        <span>
          <i className="gp-dot gp-dot-o" />
          {t('legendOut')}
        </span>
      </div>
    </div>
  )
}
