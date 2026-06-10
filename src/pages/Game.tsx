import { useEffect, useMemo, useRef, useState } from 'react'
import type { SquadPlayer, Team } from '../types'
import { useI18n } from '../i18n'
import { useAppData, useData } from '../data/DataContext'
import { cpuShoots, decided, userShoots, ZONES } from '../game/shootout'
import type { KickOutcome, Zone } from '../game/shootout'
import Flag from '../components/Flag'
import Icon from '../components/Icon'
import './game.css'

const REGULATION = 5

// zone centres inside the 360×150 goal SVG (mouth: x 30..330, bar y 18, ground y 138)
const ZONE_X = [80, 180, 280]
const ZONE_Y = [52, 105]
const zx = (z: Zone) => ZONE_X[z % 3]
const zy = (z: Zone) => ZONE_Y[z < 3 ? 0 : 1]

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'aim' | 'anim' | 'result'

export default function Game() {
  const { t, pick, locale } = useI18n()
  const { teams } = useAppData()
  const { squads, loadSquads } = useData()
  useEffect(() => {
    loadSquads()
  })

  const teamList = useMemo(
    () =>
      Object.values(teams)
        .slice()
        .sort((a, b) => pick(a.name, a.code).localeCompare(pick(b.name, b.code), locale)),
    [teams, pick, locale],
  )

  const [mine, setMine] = useState('')
  const [opp, setOpp] = useState('')
  const [playing, setPlaying] = useState(false)

  const start = () => {
    let me = mine
    if (!me) {
      me = teamList[Math.floor(Math.random() * teamList.length)].code
      setMine(me)
    }
    let other = opp
    if (!other || other === me) {
      const rest = teamList.filter((tm) => tm.code !== me)
      other = rest[Math.floor(Math.random() * rest.length)].code
    }
    setOpp(other)
    setPlaying(true)
  }

  if (!playing) {
    return (
      <div className="game-page">
        <div className="page-head">
          <h1>{t('gameTitle')}</h1>
          <p>{t('gameSub')}</p>
        </div>
        <div className="card card-pad game-setup">
          <TeamSelect
            label={t('gameYourTeam')}
            value={mine}
            onChange={setMine}
            teams={teamList}
            allowRandom={t('gameRandom')}
          />
          <TeamSelect
            label={t('gameOpponent')}
            value={opp}
            onChange={setOpp}
            teams={teamList.filter((tm) => tm.code !== mine)}
            allowRandom={t('gameRandom')}
          />
          <button type="button" className="btn btn-primary game-start" onClick={start}>
            <Icon name="target" size={17} />
            {t('gameStart')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <Shootout
      key={`${mine}-${opp}`}
      mine={teams[mine]}
      opp={teams[opp]}
      mySquad={squads?.[mine]?.players ?? []}
      oppSquad={squads?.[opp]?.players ?? []}
      onExit={() => setPlaying(false)}
    />
  )
}

function TeamSelect({
  label,
  value,
  onChange,
  teams,
  allowRandom,
}: {
  label: string
  value: string
  onChange: (code: string) => void
  teams: Team[]
  allowRandom?: string
}) {
  const { pick } = useI18n()
  const selected = teams.find((tm) => tm.code === value)
  return (
    <label className="game-pick">
      <span className="game-pick-label">{label}</span>
      <span className="game-pick-row">
        {selected ? <Flag team={selected} size={26} /> : <span className="game-pick-ball">⚽</span>}
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{allowRandom ?? '—'}</option>
          {teams.map((tm) => (
            <option key={tm.code} value={tm.code}>
              {pick(tm.name, tm.code)}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

function Shootout({
  mine,
  opp,
  mySquad,
  oppSquad,
  onExit,
}: {
  mine: Team
  opp: Team
  mySquad: SquadPlayer[]
  oppSquad: SquadPlayer[]
  onExit: () => void
}) {
  const { t, pick } = useI18n()

  const myKickers = useMemo(() => shuffle(mySquad.filter((p) => p.pos !== 'GK')), [mySquad])
  const oppKickers = useMemo(() => shuffle(oppSquad.filter((p) => p.pos !== 'GK')), [oppSquad])
  const myKeeper = useMemo(() => mySquad.find((p) => p.pos === 'GK') ?? null, [mySquad])
  const oppKeeper = useMemo(() => oppSquad.find((p) => p.pos === 'GK') ?? null, [oppSquad])
  const kickIdx = useRef(0)

  const [myKicks, setMyKicks] = useState<boolean[]>([])
  const [oppKicks, setOppKicks] = useState<boolean[]>([])
  const [shooting, setShooting] = useState(true) // my team kicks first
  const [phase, setPhase] = useState<Phase>('aim')
  const [outcome, setOutcome] = useState<KickOutcome | null>(null)

  const over = decided(myKicks, oppKicks, REGULATION)
  const round = Math.min(myKicks.length, oppKicks.length) + 1
  const suddenDeath = round > REGULATION

  const nextKicker = (list: SquadPlayer[]): SquadPlayer | null => {
    if (!list.length) return null
    return list[kickIdx.current % list.length]
  }
  const kicker = shooting ? nextKicker(myKickers) : nextKicker(oppKickers)
  const keeper = shooting ? oppKeeper : myKeeper

  // animation timers, cleared on unmount so they never fire on a dead component
  const timeoutIds = useRef<number[]>([])
  useEffect(
    () => () => {
      for (const id of timeoutIds.current) window.clearTimeout(id)
    },
    [],
  )

  const fire = (zone: Zone) => {
    if (phase !== 'aim' || over) return
    const out = shooting ? userShoots(zone) : cpuShoots(zone)
    setOutcome(out)
    setPhase('anim')
    timeoutIds.current = [
      window.setTimeout(() => setPhase('result'), 650),
      window.setTimeout(() => {
        const scored = out.result === 'goal'
        if (shooting) setMyKicks((k) => [...k, scored])
        else setOppKicks((k) => [...k, scored])
        if (!shooting) kickIdx.current += 1
        setShooting((s) => !s)
        setOutcome(null)
        setPhase('aim')
      }, 1700),
    ]
  }

  const myScore = myKicks.filter(Boolean).length
  const oppScore = oppKicks.filter(Boolean).length
  const won = myScore > oppScore

  const resultKey =
    outcome?.result === 'goal'
      ? 'gameGoal'
      : outcome?.result === 'missed'
        ? 'gameMissed'
        : shooting
          ? 'gameSaved'
          : 'gameYouSaved'

  // both rows show the same number of dot slots so sudden-death kicks stay
  // aligned round-by-round even while one team is a kick ahead
  const dotSlots = Math.max(REGULATION, myKicks.length, oppKicks.length)

  return (
    <div className="game-page">
      <div className="game-board card">
        <ScoreRow team={mine} kicks={myKicks} active={shooting && !over} slots={dotSlots} />
        <ScoreRow team={opp} kicks={oppKicks} active={!shooting && !over} slots={dotSlots} />

        <div className="game-status small">
          {over
            ? t(won ? 'gameYouWin' : 'gameYouLose')
            : suddenDeath
              ? t('gameSuddenDeath')
              : t('gameRound', { n: round })}
        </div>

        {!over && (
          <>
            <div className="game-goal-wrap">
              <svg className="game-goal" viewBox="0 0 360 170" aria-hidden="false">
                <title>{t(shooting ? 'gameShootHint' : 'gameSaveHint')}</title>
                {/* net */}
                <g className="gg-net">
                  {Array.from({ length: 13 }, (_, i) => (
                    <line key={`v${i}`} x1={30 + i * 25} y1={20} x2={30 + i * 25} y2={138} />
                  ))}
                  {Array.from({ length: 5 }, (_, i) => (
                    <line key={`h${i}`} x1={30} y1={20 + i * 30} x2={330} y2={20 + i * 30} />
                  ))}
                </g>
                {/* frame */}
                <path className="gg-frame" d="M26 142V16h308v126" />
                <line className="gg-ground" x1={0} y1={142} x2={360} y2={142} />
                {/* keeper */}
                <g
                  className={`gg-keeper${phase !== 'aim' ? ' dive' : ''}`}
                  style={
                    phase !== 'aim' && outcome
                      ? {
                          transform: `translate(${zx(outcome.keeperZone) - 180}px, ${zy(outcome.keeperZone) - 95}px) rotate(${outcome.keeperZone % 3 === 0 ? -28 : outcome.keeperZone % 3 === 2 ? 28 : 0}deg)`,
                        }
                      : undefined
                  }
                >
                  <circle cx={180} cy={78} r={9} />
                  <rect x={172} y={88} width={16} height={30} rx={6} />
                  <line x1={172} y1={94} x2={158} y2={82} />
                  <line x1={188} y1={94} x2={202} y2={82} />
                </g>
                {/* ball */}
                <circle
                  className={`gg-ball${phase !== 'aim' && outcome ? ' shot' : ''}`}
                  style={
                    phase !== 'aim' && outcome
                      ? {
                          transform: `translate(${
                            (outcome.result === 'missed'
                              ? zx(outcome.shotZone) +
                                (outcome.shotZone % 3 === 0 ? -46 : outcome.shotZone % 3 === 2 ? 46 : 0)
                              : zx(outcome.shotZone)) - 180
                          }px, ${(outcome.result === 'missed' ? Math.min(zy(outcome.shotZone) - 48, 2) : zy(outcome.shotZone)) - 158}px)`,
                        }
                      : undefined
                  }
                  cx={180}
                  cy={158}
                  r={7}
                />
                {/* target zones */}
                {phase === 'aim' &&
                  ZONES.map((z) => (
                    <rect
                      key={z}
                      className="gg-zone"
                      x={32 + (z % 3) * 99}
                      y={z < 3 ? 20 : 80}
                      width={97}
                      height={z < 3 ? 60 : 58}
                      role="button"
                      tabIndex={0}
                      aria-label={`${t(shooting ? 'gameShootHint' : 'gameSaveHint')} ${z + 1}/6`}
                      onClick={() => fire(z)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          fire(z)
                        }
                      }}
                    />
                  ))}
                {phase === 'result' && outcome && (
                  <text
                    className={`gg-verdict ${outcome.result === 'goal' ? (shooting ? 'good' : 'bad') : shooting ? 'bad' : 'good'}`}
                    x={180}
                    y={86}
                    textAnchor="middle"
                  >
                    {t(resultKey)}
                  </text>
                )}
              </svg>
            </div>

            <div className="game-hint small muted">{t(shooting ? 'gameShootHint' : 'gameSaveHint')}</div>

            <div className="game-players small">
              <span>
                <b>{t('gameKicker')}:</b>{' '}
                {kicker ? `${kicker.no ?? ''} ${kicker.name}`.trim() : pick((shooting ? mine : opp).name)}
              </span>
              <span>
                <b>{t('gameKeeper')}:</b>{' '}
                {keeper ? `${keeper.no ?? ''} ${keeper.name}`.trim() : pick((shooting ? opp : mine).name)}
              </span>
            </div>
          </>
        )}

        {over && (
          <div className="game-over">
            <div className={`game-over-msg ${won ? 'good' : 'bad'}`}>
              {t(won ? 'gameYouWin' : 'gameYouLose')}
            </div>
            <div className="game-over-score tnum">
              {myScore} : {oppScore}
            </div>
            <button type="button" className="btn btn-primary" onClick={onExit}>
              {t('gamePlayAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreRow({
  team,
  kicks,
  active,
  slots,
}: {
  team: Team
  kicks: boolean[]
  active: boolean
  slots: number
}) {
  const { pick } = useI18n()
  return (
    <div className={`game-score-row${active ? ' on' : ''}`}>
      <Flag team={team} size={22} />
      <span className="game-score-name">{pick(team.name, team.code)}</span>
      <span className="game-dots">
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className={`game-dot${i < kicks.length ? (kicks[i] ? ' ok' : ' ko') : ''}`}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="game-score-n tnum">{kicks.filter(Boolean).length}</span>
    </div>
  )
}
