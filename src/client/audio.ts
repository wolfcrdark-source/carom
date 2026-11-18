let ctx: AudioContext | null = null
let muted = false

export function setMuted(value: boolean): void {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

export function unlockAudio(): void {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext?: typeof AudioContext})
        .webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function beep(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.08,
  at = 0,
): void {
  if (muted || !ctx) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  place: () => beep(220, 0.06, 'sine', 0.04),
  launch: () => {
    beep(140, 0.1, 'triangle', 0.06)
    beep(280, 0.08, 'sine', 0.03, 0.03)
  },
  hit: () => beep(180 + Math.random() * 80, 0.05, 'square', 0.03),
  rail: () => beep(90, 0.04, 'triangle', 0.03),
  near: () => {
    beep(520, 0.12, 'sine', 0.05)
    beep(390, 0.16, 'sine', 0.04, 0.05)
  },
  pocket: () => {
    beep(392, 0.18, 'sine', 0.07)
    beep(494, 0.2, 'sine', 0.06, 0.08)
    beep(587, 0.28, 'sine', 0.05, 0.16)
  },
  miss: () => beep(110, 0.2, 'sine', 0.05),
}
