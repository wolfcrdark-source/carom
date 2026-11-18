import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import type {AddressInfo, Server} from 'node:net'
import {after, before, beforeEach, test} from 'node:test'
import {type Context, redis, runWithContext} from '@devvit/web/server'
import {
  type DailyRsp,
  Endpoint,
  type ErrorRsp,
  type PostScoreReq,
  type PostScoreRsp,
} from '../shared/api.ts'
import {onReq} from './server.ts'

let server: Server
let serverURL: string

const strings = new Map<string, string>()
const zsets = new Map<string, Map<string, number>>()

const redisGet = redis.get.bind(redis)
const redisSet = redis.set.bind(redis)
const redisZAdd = redis.zAdd.bind(redis)
const redisZRange = redis.zRange.bind(redis)
const redisZScore = redis.zScore.bind(redis)
const redisZRank = redis.zRank.bind(redis)

before(async () => {
  redis.get = async key => strings.get(key)
  redis.set = async (key, value) => {
    strings.set(key, value)
    return value
  }
  redis.zAdd = async (key, ...members) => {
    const set = zsets.get(key) ?? new Map<string, number>()
    for (const member of members) set.set(member.member, member.score)
    zsets.set(key, set)
    return members.length
  }
  redis.zRange = async (key, start, stop) => {
    const set = zsets.get(key) ?? new Map<string, number>()
    const rows = [...set.entries()]
      .map(([member, score]) => ({member, score}))
      .sort((a, b) => a.score - b.score || a.member.localeCompare(b.member))
    const from = Number(start)
    const to = Number(stop)
    return rows.slice(from, to < 0 ? undefined : to + 1)
  }
  redis.zScore = async (key, member) => zsets.get(key)?.get(member)
  redis.zRank = async (key, member) => {
    const rows = await redis.zRange(key, 0, -1, {by: 'rank'})
    const i = rows.findIndex(row => row.member === member)
    return i < 0 ? undefined : i
  }

  server = createServer(async (req, rsp) => {
    await runWithContext(
      {
        appName: 'carom-daily',
        appSlug: 'carom-daily',
        postId: 't3_123',
        userId: 't2_123',
        username: 'CTDaRk_Wolf',
        subredditName: 'carom_daily_dev',
      } as unknown as Context,
      () => onReq(req, rsp),
    )
  })
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const info = server.address() as AddressInfo
  serverURL = `http://127.0.0.1:${info.port}`
})

after(async () => {
  redis.get = redisGet
  redis.set = redisSet
  redis.zAdd = redisZAdd
  redis.zRange = redisZRange
  redis.zScore = redisZScore
  redis.zRank = redisZRank
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  strings.clear()
  zsets.clear()
})

test('empty daily board', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.GetDaily}?date=2026-11-18`)
  assert.equal(rsp.status, 200)
  const body = (await rsp.json()) as DailyRsp
  assert.equal(body.dateKey, '2026-11-18')
  assert.equal(body.username, 'CTDaRk_Wolf')
  assert.deepEqual(body.leaderboard, [])
  assert.equal(body.me?.streak, 0)
  assert.equal(body.me?.shots, undefined)
  assert.equal(body.me?.rank, undefined)
})

test('submit score and keep the best', async () => {
  const first: PostScoreReq = {dateKey: '2026-11-18', shots: 3, pocketed: true}
  const firstRsp = await fetch(`${serverURL}/${Endpoint.PostScore}`, {
    body: JSON.stringify(first),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  assert.equal(firstRsp.status, 200)
  const firstBody = (await firstRsp.json()) as PostScoreRsp
  assert.equal(firstBody.accepted, true)
  assert.equal(firstBody.me?.shots, 3)
  assert.equal(firstBody.me?.streak, 1)
  assert.equal(firstBody.leaderboard[0]?.shots, 3)

  const worse: PostScoreReq = {dateKey: '2026-11-18', shots: 4, pocketed: true}
  const worseBody = (await (
    await fetch(`${serverURL}/${Endpoint.PostScore}`, {
      body: JSON.stringify(worse),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  ).json()) as PostScoreRsp
  assert.equal(worseBody.me?.shots, 3)

  const better: PostScoreReq = {dateKey: '2026-11-18', shots: 1, pocketed: true}
  const betterBody = (await (
    await fetch(`${serverURL}/${Endpoint.PostScore}`, {
      body: JSON.stringify(better),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  ).json()) as PostScoreRsp
  assert.equal(betterBody.me?.shots, 1)
  assert.equal(betterBody.leaderboard[0]?.shots, 1)
  assert.equal(betterBody.me?.streak, 1)
})

test('rejects a miss', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.PostScore}`, {
    body: JSON.stringify({dateKey: '2026-11-18', shots: 2, pocketed: false}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
  const body = (await rsp.json()) as PostScoreRsp
  assert.equal(body.accepted, false)
  assert.equal(body.leaderboard.length, 0)
})

test('wrong method', async () => {
  const rsp = await fetch(`${serverURL}/${Endpoint.PostScore}`)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})

test('404', async () => {
  const rsp = await fetch(serverURL)
  assert.equal(rsp.status, 404)
  assert.deepEqual<ErrorRsp>(await rsp.json(), {
    error: 'not found',
    status: 404,
  })
})
