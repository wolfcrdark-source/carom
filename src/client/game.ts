import type {DailyRsp} from '../shared/api.ts'
import {formatUtcLabel, utcDateKey} from '../shared/daily.ts'
import {isMuted, setMuted, sfx, unlockAudio} from './audio.ts'
import {fetchDaily, fetchPostScore} from './fetch.ts'
import {
  EASY_FIXTURE_KEY,
  generateLayout,
  type Layout,
  TUTORIAL_KEY,
} from './generate.ts'
import {
  BALL_R,
  type Ball,
  BUMPER_R,
  bumperLegal,
  type Circle,
  inPocket,
  launchBall,
  nearPocket,
  resetBall,
  speed,
  stepWorld,
  TABLE_H,
  TABLE_W,
} from './physics.ts'

const SAVE_KEY = 'carom.v1'
const HIT_STOP = 0.05

type Mode = 'place' | 'rolling' | 'result'
type Pt = {x: number; y: number}

type Save = {
  mute: boolean
  seenTutorial: boolean
  streak: number
  lastCompleted: string | null
  best: Record<string, {shots: number; path: Pt[]}>
}

type Result = {
  pocketed: boolean
  shots: number
  par: number
  closest: number
  nearMiss: boolean
  dateKey: string
  newBest: boolean
}

type Spark = {x: number; y: number; vx: number; vy: number; life: number}

function defaultSave(): Save {
  return {
    mute: false,
    seenTutorial: false,
    streak: 0,
    lastCompleted: null,
    best: {},
  }
}

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    return {...defaultSave(), ...(JSON.parse(raw) as Partial<Save>)}
  } catch {
    return defaultSave()
  }
}

function persist(save: Save): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // ignore quota / private mode
  }
}

function queryParam(name: string): string | null {
  return new URLSearchParams(location.search).get(name)
}

function shareText(result: Result, streak: number): string {
  const marks = Array.from({length: result.par}, (_, i) =>
    i < result.shots && result.pocketed ? '●' : i < result.shots ? '✕' : '○',
  ).join('')
  const label =
    result.dateKey.startsWith('fixture') || result.dateKey === TUTORIAL_KEY
      ? result.dateKey
      : formatUtcLabel(result.dateKey).replace(' · UTC', '')
  const line = result.pocketed
    ? `${result.shots} / par ${result.par}`
    : `missed · par ${result.par}`
  return `CAROM · ${label}\n${line}\n${marks}\nstreak ${streak}`
}

function nextStreak(save: Save, dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return save.streak
  if (save.lastCompleted === dateKey) return save.streak
  if (!save.lastCompleted) return 1
  const parts = save.lastCompleted.split('-').map(Number)
  const y = parts[0] ?? 0
  const month = parts[1] ?? 1
  const d = parts[2] ?? 1
  const prev = new Date(Date.UTC(y, month - 1, d))
  prev.setUTCDate(prev.getUTCDate() + 1)
  const expected = utcDateKey(prev)
  return expected === dateKey ? save.streak + 1 : 1
}

const canvas = document.querySelector('#table') as HTMLCanvasElement
const wrap = document.querySelector('#wrap') as HTMLElement
const maybeCtx = canvas.getContext('2d')
if (!maybeCtx) throw new Error('canvas')
const ctx: CanvasRenderingContext2D = maybeCtx

const save = loadSave()
setMuted(save.mute)

let layout: Layout
let ball: Ball
let bumper: Circle
let mode: Mode = 'place'
let shots = 0
let path: Pt[] = []
let ghost: Pt[] = []
let closest = Infinity
let nearMiss = false
let hitBumper = false
let result: Result | null = null
let board: DailyRsp | null = null
let drag = false
let tutorial = false
let shake = 0
let hitStop = 0
let sparks: Spark[] = []
let flash = 0
let copyMsg = ''
let copyUntil = 0
const buttons: {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
}[] = []

function freshBall(): Ball {
  return {x: layout.cue.x, y: layout.cue.y, vx: 0, vy: 0, r: BALL_R}
}

function defaultBumper(): Circle {
  if (tutorial && layout.witness) {
    return {x: layout.witness.x, y: layout.witness.y + 70, r: BUMPER_R}
  }
  return {x: layout.cue.x, y: layout.cue.y - 90, r: BUMPER_R}
}

function loadTable(dateKey: string, isTutorial: boolean): void {
  tutorial = isTutorial
  layout = generateLayout(dateKey)
  ball = freshBall()
  bumper = defaultBumper()
  // Keep the default bumper legal.
  if (
    !bumperLegal(bumper, layout.cue, layout.pocket, layout.pins, layout.walls)
  ) {
    bumper = {x: layout.cue.x + 40, y: layout.cue.y - 80, r: BUMPER_R}
    if (
      !bumperLegal(bumper, layout.cue, layout.pocket, layout.pins, layout.walls)
    ) {
      bumper = {x: 80, y: 480, r: BUMPER_R}
    }
  }
  mode = 'place'
  shots = 0
  path = []
  closest = Infinity
  nearMiss = false
  hitBumper = false
  result = null
  drag = false
  const best = save.best[dateKey]
  ghost = best?.path ?? []
  board = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) refreshBoard(dateKey)
}

function startGame(): void {
  const forced = queryParam('date')
  const wantTutorial =
    queryParam('tutorial') === '1' ||
    (!forced && !save.seenTutorial && queryParam('skipTutorial') !== '1')
  if (wantTutorial) loadTable(TUTORIAL_KEY, true)
  else loadTable(forced || utcDateKey(), false)
}

function finish(pocketed: boolean): void {
  mode = 'result'
  const dateKey = layout.dateKey
  const isDaily = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
  let newBest = false
  if (pocketed && isDaily) {
    const prev = save.best[dateKey]
    if (!prev || shots < prev.shots) {
      save.best[dateKey] = {shots, path: path.slice()}
      newBest = true
    }
    if (save.lastCompleted !== dateKey) {
      save.streak = nextStreak(save, dateKey)
      save.lastCompleted = dateKey
    }
  }
  if (tutorial) {
    save.seenTutorial = true
  }
  persist(save)
  result = {
    pocketed,
    shots,
    par: layout.par,
    closest,
    nearMiss: nearMiss && !pocketed,
    dateKey,
    newBest,
  }
  if (pocketed) {
    sfx.pocket()
    shake = 10
    flash = 0.5
    if (isDaily) submitBoard(dateKey, shots)
  } else if (nearMiss) sfx.near()
  else sfx.miss()
}

function refreshBoard(dateKey: string): void {
  void fetchDaily(dateKey).then(data => {
    if (!data || layout.dateKey !== dateKey) return
    board = data
    if (data.me && data.me.streak > save.streak) {
      save.streak = data.me.streak
      persist(save)
    }
  })
}

function submitBoard(dateKey: string, shots: number): void {
  void fetchPostScore({dateKey, shots, pocketed: true, closest}).then(data => {
    if (!data || layout.dateKey !== dateKey) return
    board = data
    if (data.me && data.me.streak > 0) {
      save.streak = data.me.streak
      persist(save)
    }
  })
}

function doLaunch(): boolean {
  if (mode !== 'place') return false
  if (
    !bumperLegal(bumper, layout.cue, layout.pocket, layout.pins, layout.walls)
  ) {
    return false
  }
  unlockAudio()
  shots += 1
  resetBall(ball, layout.cue)
  launchBall(ball, layout.cue)
  path = [{x: ball.x, y: ball.y}]
  closest = Math.hypot(ball.x - layout.pocket.x, ball.y - layout.pocket.y)
  nearMiss = false
  hitBumper = false
  mode = 'rolling'
  sfx.launch()
  return true
}

function placeBumperAt(x: number, y: number): boolean {
  if (mode !== 'place') return false
  const next = {x, y, r: BUMPER_R}
  if (
    !bumperLegal(next, layout.cue, layout.pocket, layout.pins, layout.walls)
  ) {
    return false
  }
  bumper = next
  return true
}

function worldOf() {
  return {
    ball,
    bumper,
    pins: layout.pins,
    walls: layout.walls,
    pocket: layout.pocket,
  }
}

function burst(x: number, y: number, n = 8, colorBoost = 1): void {
  void colorBoost
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.3
    const s = 40 + Math.random() * 80
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.25 + Math.random() * 0.25,
    })
  }
}

const PHYS_DT = 1 / 120
let acc = 0
let last = performance.now()

function tick(now: number): void {
  const raw = Math.min(0.05, (now - last) / 1000)
  last = now
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - raw)
  } else {
    acc += raw
    while (acc >= PHYS_DT) {
      step(PHYS_DT)
      acc -= PHYS_DT
    }
  }
  shake = Math.max(0, shake - raw * 30)
  flash = Math.max(0, flash - raw)
  for (const spark of sparks) {
    spark.x += spark.vx * raw
    spark.y += spark.vy * raw
    spark.life -= raw
  }
  sparks = sparks.filter(s => s.life > 0)
  draw()
  requestAnimationFrame(tick)
}

function step(dt: number): void {
  if (mode !== 'rolling') return
  const events = stepWorld(worldOf(), dt)
  path.push({x: ball.x, y: ball.y})
  if (path.length > 600) path.shift()
  const d = Math.hypot(ball.x - layout.pocket.x, ball.y - layout.pocket.y)
  if (d < closest) closest = d
  if (events.includes('bumper')) {
    if (!hitBumper) hitBumper = true
    sfx.hit()
    burst(ball.x, ball.y, 6)
    hitStop = HIT_STOP
  }
  if (events.includes('pin')) {
    sfx.hit()
    burst(ball.x, ball.y, 5)
  }
  if (events.includes('rail') || events.includes('wall')) sfx.rail()
  if (nearPocket(ball, layout.pocket)) nearMiss = true
  if (events.includes('pocket') || inPocket(ball, layout.pocket)) {
    hitStop = 0.12
    finish(true)
    return
  }
  if (events.includes('stop') || speed(ball) === 0) {
    if (nearMiss) sfx.near()
    else sfx.miss()
    resetBall(ball, layout.cue)
    mode = 'place'
  }
}

function cssToLogical(clientX: number, clientY: number): Pt {
  const rect = canvas.getBoundingClientRect()
  const scale = Math.min(rect.width / TABLE_W, rect.height / TABLE_H)
  const ox = (rect.width - TABLE_W * scale) / 2
  const oy = (rect.height - TABLE_H * scale) / 2
  return {
    x: (clientX - rect.left - ox) / scale,
    y: (clientY - rect.top - oy) / scale,
  }
}

function inCircle(p: Pt, c: Circle, pad = 10): boolean {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r + pad
}

function hitButton(p: Pt): string | null {
  // Buttons are in logical space too (drawn in the same transform).
  for (const b of buttons) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
      return b.id
  }
  return null
}

function onPointerDown(ev: PointerEvent): void {
  ev.preventDefault()
  unlockAudio()
  const p = cssToLogical(ev.clientX, ev.clientY)
  const id = hitButton(p)
  if (id) {
    handleButton(id)
    return
  }
  if (mode === 'place') {
    drag = true
    placeBumperAt(p.x, p.y)
    canvas.setPointerCapture(ev.pointerId)
  }
}

function onPointerMove(ev: PointerEvent): void {
  if (!drag || mode !== 'place') return
  const p = cssToLogical(ev.clientX, ev.clientY)
  placeBumperAt(p.x, p.y)
}

function onPointerUp(ev: PointerEvent): void {
  if (drag) sfx.place()
  drag = false
  try {
    canvas.releasePointerCapture(ev.pointerId)
  } catch {
    // already released
  }
}

function handleButton(id: string): void {
  if (id === 'launch') {
    doLaunch()
    return
  }
  if (id === 'mute') {
    setMuted(!isMuted())
    save.mute = isMuted()
    persist(save)
    return
  }
  if (id === 'copy' && result) {
    const text = shareText(result, save.streak)
    void navigator.clipboard?.writeText(text).then(
      () => {
        copyMsg = 'Copied'
        copyUntil = performance.now() + 1600
      },
      () => {
        copyMsg = 'Copy failed'
        copyUntil = performance.now() + 1600
      },
    )
    return
  }
  if (id === 'again') {
    if (tutorial) {
      save.seenTutorial = true
      persist(save)
      loadTable(queryParam('date') || utcDateKey(), false)
    } else {
      loadTable(layout.dateKey, false)
    }
    return
  }
  if (id === 'practice') {
    const key = `practice-${Math.floor(Math.random() * 1e9)}`
    loadTable(key, false)
    return
  }
  if (id === 'today') {
    loadTable(utcDateKey(), false)
  }
}

window.addEventListener('keydown', ev => {
  if (ev.code === 'Space' || ev.code === 'Enter') {
    ev.preventDefault()
    unlockAudio()
    if (mode === 'place') doLaunch()
    else if (mode === 'result') handleButton('again')
  }
  if (ev.code === 'KeyM') handleButton('mute')
})

canvas.addEventListener('pointerdown', onPointerDown)
canvas.addEventListener('pointermove', onPointerMove)
canvas.addEventListener('pointerup', onPointerUp)
canvas.addEventListener('pointercancel', onPointerUp)

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const maxW = wrap.clientWidth || window.innerWidth
  const maxH = wrap.clientHeight || window.innerHeight
  const scale = Math.min(maxW / TABLE_W, maxH / TABLE_H)
  const w = Math.floor(TABLE_W * scale)
  const h = Math.floor(TABLE_H * scale)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
}

function draw(): void {
  buttons.length = 0
  const dpr = canvas.width / (parseFloat(canvas.style.width) || TABLE_W)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const cssW = parseFloat(canvas.style.width) || TABLE_W
  const cssH = parseFloat(canvas.style.height) || TABLE_H
  const scale = Math.min(cssW / TABLE_W, cssH / TABLE_H)
  const ox = (cssW - TABLE_W * scale) / 2
  const oy = (cssH - TABLE_H * scale) / 2
  const sx = shake ? (Math.random() - 0.5) * shake : 0
  const sy = shake ? (Math.random() - 0.5) * shake : 0
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.translate(ox + sx, oy + sy)
  ctx.scale(scale, scale)

  // Frame + felt
  ctx.fillStyle = '#1a120c'
  ctx.fillRect(0, 0, TABLE_W, TABLE_H)
  const g = ctx.createRadialGradient(195, 280, 40, 195, 320, 340)
  g.addColorStop(0, '#243043')
  g.addColorStop(1, '#121820')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(22, 22, TABLE_W - 44, TABLE_H - 44, 18)
  ctx.fill()

  // Rails inner gold line
  ctx.strokeStyle = '#c9a15a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(30, 30, TABLE_W - 60, TABLE_H - 60, 12)
  ctx.stroke()

  drawGhost()
  drawTrail()
  drawPocket()
  for (const wall of layout.walls) drawWall(wall)
  for (const pin of layout.pins) drawPin(pin)
  drawBumper()
  drawBall()
  drawSparks()
  if (tutorial && mode === 'place' && layout.witness)
    drawGhostBumper(layout.witness)
  drawHud()
  if (mode === 'result' && result) drawResult(result)
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 236, 190, ${flash * 0.35})`
    ctx.fillRect(0, 0, TABLE_W, TABLE_H)
  }
}

function drawGhost(): void {
  if (ghost.length < 2) return
  ctx.strokeStyle = 'rgba(201, 161, 90, 0.28)'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 6])
  ctx.beginPath()
  ctx.moveTo(ghost[0]!.x, ghost[0]!.y)
  for (const p of ghost) ctx.lineTo(p.x, p.y)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawTrail(): void {
  if (path.length < 2) return
  ctx.strokeStyle = 'rgba(236, 226, 206, 0.45)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(path[0]!.x, path[0]!.y)
  for (const p of path) ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

function drawPocket(): void {
  const p = layout.pocket
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2)
  ctx.strokeStyle = '#d7b56a'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
  ctx.fillStyle = '#07080b'
  ctx.fill()
}

function drawWall(wall: {
  x1: number
  y1: number
  x2: number
  y2: number
}): void {
  ctx.strokeStyle = '#8a7043'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(wall.x1, wall.y1)
  ctx.lineTo(wall.x2, wall.y2)
  ctx.stroke()
}

function drawPin(pin: Circle): void {
  ctx.beginPath()
  ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2)
  ctx.fillStyle = '#2a1d12'
  ctx.fill()
  ctx.strokeStyle = '#c9a15a'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawBumper(): void {
  const legal = bumperLegal(
    bumper,
    layout.cue,
    layout.pocket,
    layout.pins,
    layout.walls,
  )
  ctx.beginPath()
  ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2)
  ctx.fillStyle = legal ? '#e4c37a' : '#8a4a3a'
  ctx.fill()
  ctx.strokeStyle = '#f6edcc'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(bumper.x, bumper.y, bumper.r * 0.45, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(60, 40, 16, 0.45)'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawGhostBumper(c: Circle): void {
  ctx.beginPath()
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(236, 226, 206, 0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])
}

function drawBall(): void {
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r + 1, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fillStyle = '#f6f0e2'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fill()
}

function drawSparks(): void {
  for (const spark of sparks) {
    ctx.globalAlpha = Math.max(0, spark.life * 3)
    ctx.fillStyle = '#f3d989'
    ctx.beginPath()
    ctx.arc(spark.x, spark.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function pill(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fill = '#c9a15a',
  color = '#1a120c',
): void {
  buttons.push({id, x, y, w, h, label})
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = '600 14px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5)
}

function drawHud(): void {
  const title = 'CAROM'
  const date = tutorial
    ? 'First table'
    : layout.dateKey.startsWith('practice-')
      ? 'Practice'
      : layout.dateKey === EASY_FIXTURE_KEY
        ? 'Fixture'
        : formatUtcLabel(layout.dateKey)
  ctx.fillStyle = '#f3ead6'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = '600 18px Palatino, Palatino Linotype, Georgia, serif'
  ctx.fillText(title, 40, 16)
  ctx.font = '12px "Segoe UI", sans-serif'
  ctx.fillStyle = '#d7c9a6'
  ctx.fillText(date, 112, 16)
  ctx.textAlign = 'right'
  ctx.fillText(
    shots === 0 ? `par ${layout.par}` : `shot ${shots} · par ${layout.par}`,
    TABLE_W - 74,
    16,
  )
  pill(
    'mute',
    TABLE_W - 66,
    6,
    50,
    20,
    isMuted() ? 'SOUND' : 'MUTE',
    '#2a241c',
    '#e8dcc8',
  )

  if (mode === 'place') {
    const hint = tutorial
      ? 'Drag the brass bumper, then Launch'
      : 'Place the bumper, then Launch'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e8dcc8'
    ctx.font = '13px "Segoe UI", sans-serif'
    ctx.fillText(hint, TABLE_W / 2, TABLE_H - 52)
    pill('launch', TABLE_W / 2 - 70, TABLE_H - 40, 140, 28, 'LAUNCH')
  }
}

function drawResult(res: Result): void {
  const boardRows = !tutorial ? (board?.leaderboard.slice(0, 5) ?? []) : []
  const cardY = 70
  const cardH = 500
  ctx.fillStyle = 'rgba(10, 10, 14, 0.72)'
  ctx.fillRect(0, 0, TABLE_W, TABLE_H)
  ctx.fillStyle = '#1c1712'
  ctx.beginPath()
  ctx.roundRect(36, cardY, TABLE_W - 72, cardH, 16)
  ctx.fill()
  ctx.strokeStyle = '#c9a15a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#c9a15a'
  ctx.font = '600 13px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('CAROM', TABLE_W / 2, 100)
  ctx.fillStyle = '#f3ead6'
  ctx.font = '600 28px Palatino, Palatino Linotype, Georgia, serif'
  const headline = res.pocketed
    ? res.shots === 1
      ? 'Clean carom'
      : `Pocketed in ${res.shots}`
    : res.nearMiss
      ? 'So close'
      : 'Came to rest'
  ctx.fillText(headline, TABLE_W / 2, 140)
  ctx.font = '14px "Segoe UI", sans-serif'
  ctx.fillStyle = '#d7c9a6'
  const sub = res.pocketed
    ? `par ${res.par}${res.newBest ? ' · new best' : ''}`
    : `closest ${Math.max(0, res.closest - 26).toFixed(0)} px from the lip`
  ctx.fillText(sub, TABLE_W / 2, 168)
  if (res.pocketed && /^\d{4}-\d{2}-\d{2}$/.test(res.dateKey)) {
    const streak = board?.me?.streak ?? save.streak
    const rank = board?.me?.rank
    const extra = rank ? ` · rank ${rank}` : ''
    ctx.fillText(`streak ${streak}${extra}`, TABLE_W / 2, 188)
  }

  ctx.font = '22px "Segoe UI", sans-serif'
  ctx.fillStyle = '#e4c37a'
  const marks = Array.from({length: Math.max(res.par, res.shots)}, (_, i) => {
    if (res.pocketed && i < res.shots) return '●'
    if (!res.pocketed && i < res.shots) return '○'
    return '○'
  }).join('  ')
  ctx.fillText(marks, TABLE_W / 2, 220)

  if (performance.now() < copyUntil && copyMsg) {
    ctx.font = '12px "Segoe UI", sans-serif'
    ctx.fillStyle = '#e8dcc8'
    ctx.fillText(copyMsg, TABLE_W / 2, 242)
  }

  if (boardRows.length) {
    ctx.font = '12px "Segoe UI", sans-serif'
    ctx.fillStyle = '#d7c9a6'
    ctx.fillText("Today's board", TABLE_W / 2, 262)
    boardRows.forEach((row, i) => {
      const mine = board?.username && row.username === board.username
      ctx.fillStyle = mine ? '#e4c37a' : '#cbbba0'
      ctx.textAlign = 'left'
      ctx.fillText(`${i + 1}. ${row.username}`, 70, 280 + i * 16)
      ctx.textAlign = 'right'
      ctx.fillText(`${row.shots}`, TABLE_W - 70, 280 + i * 16)
      ctx.textAlign = 'center'
    })
  }

  const btnTop = tutorial ? 360 : boardRows.length ? 368 : 280
  if (tutorial) {
    pill('again', 70, btnTop, TABLE_W - 140, 34, "Play today's table")
  } else {
    pill('copy', 70, btnTop, TABLE_W - 140, 28, 'Copy result')
    pill(
      'again',
      70,
      btnTop + 34,
      TABLE_W - 140,
      28,
      'Try again',
      '#2a241c',
      '#e8dcc8',
    )
    pill('practice', 70, btnTop + 68, 110, 26, 'Practice', '#2a241c', '#e8dcc8')
    pill('today', 210, btnTop + 68, 110, 26, 'Today', '#2a241c', '#e8dcc8')
  }
}

function settled(): boolean {
  return mode === 'place' || mode === 'result'
}

export type CaromApi = {
  placeBumper: (x: number, y: number) => boolean
  launch: () => boolean
  getState: () => {
    mode: Mode
    shots: number
    pocketed: boolean
    dateKey: string
    par: number
    bumper: Circle
    ball: Ball
    closest: number
    witness: Circle | null
    tutorial: boolean
  }
  waitUntilSettled: () => Promise<void>
  useWitness: () => boolean
}

function api(): CaromApi {
  return {
    placeBumper: placeBumperAt,
    launch: doLaunch,
    getState: () => ({
      mode,
      shots,
      pocketed: result?.pocketed ?? false,
      dateKey: layout.dateKey,
      par: layout.par,
      bumper: {...bumper},
      ball: {...ball},
      closest,
      witness: layout.witness ? {...layout.witness} : null,
      tutorial,
    }),
    waitUntilSettled: () =>
      new Promise(resolve => {
        const start = performance.now()
        const poll = () => {
          if (settled() && !drag) {
            resolve()
            return
          }
          if (performance.now() - start > 8000) {
            resolve()
            return
          }
          requestAnimationFrame(poll)
        }
        requestAnimationFrame(poll)
      }),
    useWitness: () => {
      if (!layout.witness) return false
      return placeBumperAt(layout.witness.x, layout.witness.y)
    },
  }
}

declare global {
  interface Window {
    __carom: CaromApi
  }
}

function boot(): void {
  startGame()
  resize()
  window.addEventListener('resize', resize)
  window.__carom = api()
  last = performance.now()
  requestAnimationFrame(tick)
}

boot()
