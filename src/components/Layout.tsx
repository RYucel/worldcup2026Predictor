import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useData } from '../data/DataContext'
import { groupStageComplete } from '../utils/helpers'
import Icon from './Icon'
import type { IconName } from './Icon'
import Freshness from './Freshness'

const NAV: { to: string; key: string; icon: IconName }[] = [
  { to: '/', key: 'navMatches', icon: 'calendar' },
  { to: '/groups', key: 'navGroups', icon: 'table' },
  { to: '/bracket', key: 'navBracket', icon: 'bracket' },
  { to: '/teams', key: 'navTeams', icon: 'shirt' },
  { to: '/venues', key: 'navVenues', icon: 'stadium' },
  { to: '/watch', key: 'navWatch', icon: 'tv' },
  { to: '/stats', key: 'navStats', icon: 'chart' },
  { to: '/forecast', key: 'navSim', icon: 'target' },
  { to: '/settings', key: 'navSettings', icon: 'gear' },
]

const MORE_TAB = { to: '/more', key: 'navMore' as string, icon: 'dots' as IconName }

/** bottom tabs: the third slot is stage-aware — Groups during the group stage,
 * Bracket once all twelve groups are complete (the page it replaces stays
 * reachable from More and in-app links) */
function tabsFor(knockout: boolean) {
  const phase = knockout ? NAV[2] : NAV[1] // bracket : groups
  return [
    NAV[0],
    phase,
    NAV.find((n) => n.key === 'navTeams') ?? NAV[3],
    NAV.find((n) => n.key === 'navSim') ?? MORE_TAB,
    MORE_TAB,
  ]
}

function Logo() {
  // same artwork as the favicon — single source of truth in public/favicon.svg
  return (
    <img
      className="brand-logo"
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      width={30}
      height={30}
      alt=""
      aria-hidden="true"
    />
  )
}

export default function Layout() {
  const { t } = useI18n()
  const { data } = useData()
  const tabs = tabsFor(groupStageComplete(data?.standings))
  const headerRef = useRef<HTMLElement>(null)

  // sticky children (day headers, filter bars) offset themselves by the real
  // header height — it grows when the nav wraps to a second line
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty('--hdr-h', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // content-driven nav breakpoint: show the top nav only when every label fits
  // on one line (the threshold differs per language), else keep the tab bar
  const navRef = useRef<HTMLElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: t changes when labels change — it is the re-measure signal
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () => {
      let needed = 0
      // fractional rect widths: summed integer offsetWidths under-report by a few px
      for (const child of nav.children) needed += (child as HTMLElement).getBoundingClientRect().width
      needed += (nav.children.length - 1) * 2 // column gap
      // 1px slack against integer rounding clipping the first item in borderline languages
      document.documentElement.classList.toggle('nav-fits', needed <= nav.clientWidth + 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(nav)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [t])

  // split the localized "by {name}" around the author link (word order varies)
  const [byPre, byPost] = t('footerBy', { name: '\u0000' }).split('\u0000')

  return (
    <>
      <header className="shell-header" ref={headerRef}>
        <div className="shell-header-in">
          <NavLink to="/" className="brand">
            <Logo />
            <span>{t('appName')}</span>
          </NavLink>
          <nav className="top-nav" ref={navRef}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <a
            className="gh-link"
            href="https://github.com/26worldcup/26worldcup.github.io"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            <svg viewBox="0 0 16 16" width="19" height="19" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>

      <footer className="shell-footer">
        <div>
          <Freshness />
        </div>
        <div className="shell-footer-links">
          <a href="https://github.com/26worldcup/26worldcup.github.io" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <span>
            {byPre}
            <a href="https://github.com/tomchen" target="_blank" rel="noreferrer">
              Tom Chen
            </a>
            {byPost}
          </span>
          <span aria-hidden="true">·</span>
          <a
            href="https://github.com/26worldcup/26worldcup.github.io/blob/main/COPYRIGHT.md"
            target="_blank"
            rel="noreferrer"
          >
            {t('footerLicense')}
          </a>
        </div>
      </footer>

      <nav className="tab-bar">
        {tabs.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <Icon name={n.icon} />
            {t(n.key)}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
