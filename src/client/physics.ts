export const TABLE_W = 390
export const TABLE_H = 640
export const MARGIN = 30
export const BALL_R = 11
export const BUMPER_R = 20
export const POCKET_R = 26
export const PIN_R = 13
export const FRICTION = 0.95
export const RAIL_RESTITUTION = 0.84
export const PIN_RESTITUTION = 0.86
export const BUMPER_RESTITUTION = 0.97
export const STOP_SPEED = 14
export const LAUNCH_SPEED = 740
export const POCKET_ENTER = POCKET_R - 1
export const NEAR_MISS = POCKET_R + BALL_R + 8

export type Circle = {x: number; y: number; r: number}
export type Segment = {x1: number; y1: number; x2: number; y2: number}

export type Ball = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export type World = {
  ball: Ball
  bumper: Circle | null
  pins: Circle[]
  walls: Segment[]
  pocket: Circle
}

export function tableRails(): Segment[] {
  const l = MARGIN
  const r = TABLE_W - MARGIN
  const t = MARGIN
  const b = TABLE_H - MARGIN
  return [
    {x1: l, y1: t, x2: r, y2: t},
    {x1: r, y1: t, x2: r, y2: b},
    {x1: r, y1: b, x2: l, y2: b},
    {x1: l, y1: b, x2: l, y2: t},
  ]
}

export function innerRect(): {l: number; t: number; r: number; b: number} {
  return {l: MARGIN, t: MARGIN, r: TABLE_W - MARGIN, b: TABLE_H - MARGIN}
}

export function speed(ball: Ball): number {
  return Math.hypot(ball.vx, ball.vy)
}

export function isStopped(ball: Ball): boolean {
  return speed(ball) < STOP_SPEED
}

export function inPocket(ball: Ball, pocket: Circle): boolean {
  return Math.hypot(ball.x - pocket.x, ball.y - pocket.y) <= POCKET_ENTER
}

export function nearPocket(ball: Ball, pocket: Circle): boolean {
  const d = Math.hypot(ball.x - pocket.x, ball.y - pocket.y)
  return d <= NEAR_MISS && d > POCKET_ENTER
}

function resolveCircle(
  ball: Ball,
  cx: number,
  cy: number,
  cr: number,
  restitution: number,
): boolean {
  const dx = ball.x - cx
  const dy = ball.y - cy
  const min = ball.r + cr
  const dist = Math.hypot(dx, dy)
  if (dist === 0) {
    ball.x += min
    return false
  }
  if (dist >= min) return false
  const nx = dx / dist
  const ny = dy / dist
  const overlap = min - dist
  ball.x += nx * overlap
  ball.y += ny * overlap
  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx
    ball.vy -= (1 + restitution) * vn * ny
  }
  return true
}

function resolveSegment(
  ball: Ball,
  seg: Segment,
  restitution: number,
): boolean {
  const sx = seg.x2 - seg.x1
  const sy = seg.y2 - seg.y1
  const len2 = sx * sx + sy * sy
  if (len2 === 0) return false
  let t = ((ball.x - seg.x1) * sx + (ball.y - seg.y1) * sy) / len2
  t = Math.max(0, Math.min(1, t))
  const px = seg.x1 + t * sx
  const py = seg.y1 + t * sy
  return resolveCircle(ball, px, py, 0, restitution)
}

export type StepEvent = 'bumper' | 'pin' | 'rail' | 'wall' | 'pocket' | 'stop'

export function stepWorld(world: World, dt: number): StepEvent[] {
  const events: StepEvent[] = []
  const {ball} = world
  const damp = Math.exp(-FRICTION * dt)
  ball.vx *= damp
  ball.vy *= damp
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  for (const rail of tableRails()) {
    if (resolveSegment(ball, rail, RAIL_RESTITUTION)) events.push('rail')
  }
  for (const wall of world.walls) {
    if (resolveSegment(ball, wall, RAIL_RESTITUTION)) events.push('wall')
  }
  for (const pin of world.pins) {
    if (resolveCircle(ball, pin.x, pin.y, pin.r, PIN_RESTITUTION)) {
      events.push('pin')
    }
  }
  if (world.bumper) {
    if (
      resolveCircle(
        ball,
        world.bumper.x,
        world.bumper.y,
        world.bumper.r,
        BUMPER_RESTITUTION,
      )
    ) {
      events.push('bumper')
    }
  }

  // Keep the ball inside the rails if a multi-hit nudged it out.
  const box = innerRect()
  if (ball.x < box.l + ball.r) {
    ball.x = box.l + ball.r
    if (ball.vx < 0) ball.vx *= -RAIL_RESTITUTION
  }
  if (ball.x > box.r - ball.r) {
    ball.x = box.r - ball.r
    if (ball.vx > 0) ball.vx *= -RAIL_RESTITUTION
  }
  if (ball.y < box.t + ball.r) {
    ball.y = box.t + ball.r
    if (ball.vy < 0) ball.vy *= -RAIL_RESTITUTION
  }
  if (ball.y > box.b - ball.r) {
    ball.y = box.b - ball.r
    if (ball.vy > 0) ball.vy *= -RAIL_RESTITUTION
  }

  if (inPocket(ball, world.pocket)) events.push('pocket')
  else if (isStopped(ball)) {
    ball.vx = 0
    ball.vy = 0
    events.push('stop')
  }
  return events
}

export function simulateShot(
  world: World,
  maxTime = 6,
  dt = 1 / 90,
): {pocketed: boolean; closest: number; path: {x: number; y: number}[]} {
  const path: {x: number; y: number}[] = [{x: world.ball.x, y: world.ball.y}]
  let closest = Math.hypot(
    world.ball.x - world.pocket.x,
    world.ball.y - world.pocket.y,
  )
  let t = 0
  let acc = 0
  while (t < maxTime) {
    const events = stepWorld(world, dt)
    t += dt
    acc += dt
    const d = Math.hypot(
      world.ball.x - world.pocket.x,
      world.ball.y - world.pocket.y,
    )
    if (d < closest) closest = d
    if (acc >= 1 / 40) {
      path.push({x: world.ball.x, y: world.ball.y})
      acc = 0
    }
    if (events.includes('pocket')) {
      path.push({x: world.ball.x, y: world.ball.y})
      return {pocketed: true, closest, path}
    }
    if (events.includes('stop')) break
  }
  return {pocketed: false, closest, path}
}

export function launchBall(ball: Ball, cue: {x: number; y: number}): void {
  ball.x = cue.x
  ball.y = cue.y
  ball.vx = 0
  ball.vy = -LAUNCH_SPEED
}

export function resetBall(ball: Ball, cue: {x: number; y: number}): void {
  ball.x = cue.x
  ball.y = cue.y
  ball.vx = 0
  ball.vy = 0
}

export function circlesOverlap(
  a: Circle,
  b: {x: number; y: number; r: number},
  pad = 0,
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + pad
}

export function bumperLegal(
  bumper: Circle,
  cue: {x: number; y: number},
  pocket: Circle,
  pins: Circle[],
  walls: Segment[],
): boolean {
  const box = innerRect()
  if (
    bumper.x - bumper.r < box.l + 2 ||
    bumper.x + bumper.r > box.r - 2 ||
    bumper.y - bumper.r < box.t + 2 ||
    bumper.y + bumper.r > box.b - 2
  ) {
    return false
  }
  if (circlesOverlap(bumper, {x: cue.x, y: cue.y, r: BALL_R}, 6)) return false
  if (circlesOverlap(bumper, pocket, 4)) return false
  for (const pin of pins) {
    if (circlesOverlap(bumper, pin, 2)) return false
  }
  for (const wall of walls) {
    const sx = wall.x2 - wall.x1
    const sy = wall.y2 - wall.y1
    const len2 = sx * sx + sy * sy
    if (len2 === 0) continue
    let t = ((bumper.x - wall.x1) * sx + (bumper.y - wall.y1) * sy) / len2
    t = Math.max(0, Math.min(1, t))
    const px = wall.x1 + t * sx
    const py = wall.y1 + t * sy
    if (Math.hypot(bumper.x - px, bumper.y - py) < bumper.r + 3) return false
  }
  return true
}
