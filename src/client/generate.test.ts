import assert from 'node:assert/strict'
import {test} from 'node:test'
import {utcDateKey} from '../shared/daily.ts'
import {
  EASY_FIXTURE_KEY,
  generateLayout,
  TUTORIAL_KEY,
  tryBumper,
} from './generate.ts'

test('tutorial table is solvable with its witness', () => {
  const layout = generateLayout(TUTORIAL_KEY)
  assert.ok(layout.witness, 'tutorial needs a witness bumper')
  assert.equal(tryBumper(layout, layout.witness!), true)
})

test('easy fixture is solvable with its witness', () => {
  const layout = generateLayout(EASY_FIXTURE_KEY)
  assert.ok(layout.witness, 'fixture needs a witness bumper')
  assert.equal(tryBumper(layout, layout.witness!), true)
})

test('fallback and a month of daily tables are solvable', () => {
  const keys = [
    utcDateKey(),
    ...Array.from({length: 30}, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 18 + i))
      return utcDateKey(d)
    }),
  ]
  for (const key of keys) {
    const layout = generateLayout(key)
    assert.ok(layout.witness, `${key} has no witness`)
    assert.equal(
      tryBumper(layout, layout.witness!),
      true,
      `${key} witness failed`,
    )
    assert.ok(layout.par >= 1 && layout.par <= 3)
  }
})
