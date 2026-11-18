import {hashString, mulberry32} from '../shared/daily.ts'
import {
  BALL_R,
  BUMPER_R,
  bumperLegal,
  type Circle,
  launchBall,
  PIN_R,
  POCKET_R,
  resetBall,
  type Segment,
  simulateShot,
  TABLE_W,
} from './physics.ts'

export const TUTORIAL_KEY = 'tutorial'
export const EASY_FIXTURE_KEY = 'fixture-easy'

export type Layout = {
  dateKey: string
  cue: {x: number; y: number}
  pocket: Circle
  pins: Circle[]
  walls: Segment[]
  par: number
  witness: Circle | null
}

function cloneWorld(
  layout: Layout,
  bumper: Circle | null,
): {
  ball: {x: number; y: number; vx: number; vy: number; r: number}
  bumper: Circle | null
  pins: Circle[]
  walls: Segment[]
  pocket: Circle
} {
  return {
    ball: {x: layout.cue.x, y: layout.cue.y, vx: 0, vy: 0, r: BALL_R},
    bumper: bumper ? {...bumper} : null,
    pins: layout.pins.map(p => ({...p})),
    walls: layout.walls.map(w => ({...w})),
    pocket: {...layout.pocket},
  }
}

export function tryBumper(layout: Layout, bumper: Circle): boolean {
  if (
    !bumperLegal(bumper, layout.cue, layout.pocket, layout.pins, layout.walls)
  ) {
    return false
  }
  const world = cloneWorld(layout, bumper)
  launchBall(world.ball, layout.cue)
  return simulateShot(world).pocketed
}

export function findWitness(layout: Layout, rng?: () => number): Circle | null {
  const candidates: Circle[] = []
  const boxPad = 50
  for (let y = 80; y <= 530; y += 14) {
    for (let x = 58; x <= 332; x += 14) {
      candidates.push({x, y, r: BUMPER_R})
    }
  }
  // A few jittered points around the launch column, which is where most solutions live.
  if (rng) {
    for (let i = 0; i < 40; i++) {
      candidates.push({
        x: layout.cue.x + (rng() - 0.5) * 160,
        y: 90 + rng() * 430,
        r: BUMPER_R,
      })
    }
  }
  void boxPad
  for (const bumper of candidates) {
    if (tryBumper(layout, bumper)) return bumper
  }
  return null
}

function tutorialLayout(): Layout {
  // Same family as the easy fixture: one pin on the launch line, bumper on the left banks right.
  const layout: Layout = {
    dateKey: TUTORIAL_KEY,
    cue: {x: 175, y: 555},
    pocket: {x: 250, y: 100, r: POCKET_R},
    pins: [{x: 175, y: 315, r: PIN_R + 5}],
    walls: [],
    par: 2,
    witness: {x: 132, y: 445, r: BUMPER_R},
  }
  if (!tryBumper(layout, layout.witness!)) {
    layout.witness = findWitness(layout)
  }
  return layout
}

function easyFixtureLayout(): Layout {
  const layout: Layout = {
    dateKey: EASY_FIXTURE_KEY,
    cue: {x: 175, y: 555},
    pocket: {x: 250, y: 100, r: POCKET_R},
    pins: [{x: 175, y: 315, r: PIN_R + 5}],
    walls: [],
    par: 2,
    witness: {x: 132, y: 445, r: BUMPER_R},
  }
  if (!tryBumper(layout, layout.witness!)) {
    layout.witness = findWitness(layout)
  }
  return layout
}

function randomLayout(dateKey: string, rng: () => number): Layout {
  const cueX = 80 + rng() * (TABLE_W - 160)
  const cueY = 540 + rng() * 20
  const pocket: Circle = {
    x: 70 + rng() * (TABLE_W - 140),
    y: 78 + rng() * 50,
    r: POCKET_R,
  }
  const pins: Circle[] = []
  const pinCount = 3 + Math.floor(rng() * 4)
  let guard = 0
  while (pins.length < pinCount && guard++ < 80) {
    const pin: Circle = {
      x: 70 + rng() * (TABLE_W - 140),
      y: 160 + rng() * 300,
      r: PIN_R + (rng() < 0.3 ? 3 : 0),
    }
    const hitsCue = Math.hypot(pin.x - cueX, pin.y - cueY) < pin.r + BALL_R + 40
    const hitsPocket =
      Math.hypot(pin.x - pocket.x, pin.y - pocket.y) < pin.r + POCKET_R + 16
    const hitsPin = pins.some(
      p => Math.hypot(p.x - pin.x, p.y - pin.y) < p.r + pin.r + 10,
    )
    if (!hitsCue && !hitsPocket && !hitsPin) pins.push(pin)
  }
  const walls: Segment[] = []
  if (rng() < 0.45) {
    const x = 80 + rng() * (TABLE_W - 160)
    const y = 200 + rng() * 200
    const w = 40 + rng() * 70
    const horiz = rng() < 0.5
    walls.push(
      horiz
        ? {x1: x - w / 2, y1: y, x2: x + w / 2, y2: y}
        : {x1: x, y1: y - w / 2, x2: x, y2: y + w / 2},
    )
  }
  return {
    dateKey,
    cue: {x: cueX, y: cueY},
    pocket,
    pins,
    walls,
    par: 3,
    witness: null,
  }
}

function fallbackLayout(dateKey: string): Layout {
  const layout: Layout = {
    dateKey,
    cue: {x: 140, y: 555},
    pocket: {x: 258, y: 100, r: POCKET_R},
    pins: [
      {x: 140, y: 300, r: PIN_R + 5},
      {x: 200, y: 230, r: PIN_R},
    ],
    walls: [],
    par: 3,
    witness: {x: 230, y: 450, r: BUMPER_R},
  }
  if (!tryBumper(layout, layout.witness!)) {
    layout.witness = findWitness(layout)
  }
  return layout
}

export function generateLayout(dateKey: string): Layout {
  if (dateKey === TUTORIAL_KEY) return tutorialLayout()
  if (dateKey === EASY_FIXTURE_KEY) return easyFixtureLayout()

  const rng = mulberry32(hashString(`carom:${dateKey}`))
  for (let attempt = 0; attempt < 30; attempt++) {
    const layout = randomLayout(dateKey, rng)
    // Prefer tables where a straight shot does not already go in.
    const straight = tryBumper(layout, {x: -200, y: -200, r: BUMPER_R})
    // tryBumper with an off-table bumper is always illegal; simulate raw launch.
    const world = {
      ball: {x: layout.cue.x, y: layout.cue.y, vx: 0, vy: 0, r: BALL_R},
      bumper: null,
      pins: layout.pins.map(p => ({...p})),
      walls: layout.walls.map(w => ({...w})),
      pocket: {...layout.pocket},
    }
    resetBall(world.ball, layout.cue)
    launchBall(world.ball, layout.cue)
    const free = simulateShot(world).pocketed
    void straight
    const witness = findWitness(layout, rng)
    if (!witness) continue
    if (free && attempt < 20) continue
    layout.witness = witness
    const tight =
      Math.hypot(witness.x - layout.cue.x, witness.y - layout.cue.y) < 160
    layout.par = free ? 1 : tight ? 2 : 3
    return layout
  }
  return fallbackLayout(dateKey)
}
