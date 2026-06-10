// Pure penalty-shootout logic. Zones are a 3×2 goal grid:
//   0 1 2   (top row: harder to save, easier to miss)
//   3 4 5   (bottom row)

export type Zone = 0 | 1 | 2 | 3 | 4 | 5

export const ZONES: Zone[] = [0, 1, 2, 3, 4, 5]

// chance the shot itself flies off target, by aimed zone
const MISS: Record<Zone, number> = { 0: 0.12, 1: 0.06, 2: 0.12, 3: 0.04, 4: 0, 5: 0.04 }

// where keepers (and CPU shooters) like to go: corners over centre
const KEEPER_W: Record<Zone, number> = { 0: 0.16, 1: 0.08, 2: 0.16, 3: 0.22, 4: 0.16, 5: 0.22 }
const SHOT_W: Record<Zone, number> = { 0: 0.18, 1: 0.06, 2: 0.18, 3: 0.21, 4: 0.16, 5: 0.21 }

const SAVE_IF_GUESSED = 0.85 // CPU keeper, right zone
const USER_SAVE_IF_GUESSED = 0.9 // human keeper, right zone (a touch generous)

function weightedPick(weights: Record<Zone, number>): Zone {
  let r = Math.random()
  for (const z of ZONES) {
    r -= weights[z]
    if (r <= 0) return z
  }
  return 5
}

export type KickResult = 'goal' | 'saved' | 'missed'

export interface KickOutcome {
  result: KickResult
  shotZone: Zone
  keeperZone: Zone
}

/** the user shoots at `aim`; the CPU keeper picks its own corner */
export function userShoots(aim: Zone): KickOutcome {
  const keeperZone = weightedPick(KEEPER_W)
  if (Math.random() < MISS[aim]) return { result: 'missed', shotZone: aim, keeperZone }
  if (keeperZone === aim && Math.random() < SAVE_IF_GUESSED) {
    return { result: 'saved', shotZone: aim, keeperZone }
  }
  return { result: 'goal', shotZone: aim, keeperZone }
}

/** the CPU shoots; the user dives to `dive` */
export function cpuShoots(dive: Zone): KickOutcome {
  const shotZone = weightedPick(SHOT_W)
  if (Math.random() < MISS[shotZone] * 0.7) return { result: 'missed', shotZone, keeperZone: dive }
  if (dive === shotZone && Math.random() < USER_SAVE_IF_GUESSED) {
    return { result: 'saved', shotZone, keeperZone: dive }
  }
  return { result: 'goal', shotZone, keeperZone: dive }
}

/** is the shootout mathematically decided? kicks = arrays of made/failed per team */
export function decided(a: boolean[], b: boolean[], regulation = 5): boolean {
  const sa = a.filter(Boolean).length
  const sb = b.filter(Boolean).length
  if (a.length <= regulation && b.length <= regulation) {
    // regulation phase: ends early when out of reach, else after five complete pairs
    const leftA = regulation - a.length
    const leftB = regulation - b.length
    if (sa > sb + leftB || sb > sa + leftA) return true
    return a.length === regulation && b.length === regulation && sa !== sb
  }
  // sudden death: a pair must be COMPLETE before comparing (both teams kick)
  return a.length === b.length && sa !== sb
}
