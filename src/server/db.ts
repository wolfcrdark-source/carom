import {redis} from '@devvit/web/server'
import type {DailyRsp, LeaderRow} from '../shared/api.ts'
import {nextUtcDateKey} from '../shared/daily.ts'

type UserState = {streak: number; lastCompleted: string | null}

function boardKey(dateKey: string): string {
  return `lb:${dateKey}`
}

function userKey(username: string): string {
  return `user:${username}`
}

export function postKey(dateKey: string): string {
  return `daily-post:${dateKey}`
}

async function readUser(username: string): Promise<UserState> {
  const raw = await redis.get(userKey(username))
  if (!raw) return {streak: 0, lastCompleted: null}
  try {
    return {
      streak: 0,
      lastCompleted: null,
      ...(JSON.parse(raw) as Partial<UserState>),
    }
  } catch {
    return {streak: 0, lastCompleted: null}
  }
}

async function writeUser(username: string, state: UserState): Promise<void> {
  await redis.set(userKey(username), JSON.stringify(state))
}

function nextStreak(state: UserState, dateKey: string): UserState {
  if (state.lastCompleted === dateKey) return state
  if (!state.lastCompleted) return {streak: 1, lastCompleted: dateKey}
  return {
    streak:
      nextUtcDateKey(state.lastCompleted, 1) === dateKey ? state.streak + 1 : 1,
    lastCompleted: dateKey,
  }
}

export async function dbGetDaily(
  dateKey: string,
  username?: string,
): Promise<DailyRsp> {
  const rows = await redis.zRange(boardKey(dateKey), 0, 9, {by: 'rank'})
  const leaderboard: LeaderRow[] = rows.map(row => ({
    username: row.member,
    shots: row.score,
  }))
  const rsp: DailyRsp = {dateKey, leaderboard}
  if (!username) return rsp
  rsp.username = username
  const user = await readUser(username)
  const shots = await redis.zScore(boardKey(dateKey), username)
  const rank = await redis.zRank(boardKey(dateKey), username)
  rsp.me = {
    streak: user.streak,
    shots: shots,
    rank: rank === undefined ? undefined : rank + 1,
  }
  return rsp
}

export async function dbSubmitScore(
  dateKey: string,
  username: string,
  shots: number,
  pocketed: boolean,
): Promise<DailyRsp & {accepted: boolean}> {
  if (
    !pocketed ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
    shots < 1 ||
    shots > 99
  ) {
    return {...(await dbGetDaily(dateKey, username)), accepted: false}
  }
  const prev = await redis.zScore(boardKey(dateKey), username)
  let accepted = false
  if (prev === undefined || shots < prev) {
    await redis.zAdd(boardKey(dateKey), {member: username, score: shots})
    accepted = true
  }
  const user = await readUser(username)
  const updated = nextStreak(user, dateKey)
  if (
    updated.lastCompleted !== user.lastCompleted ||
    updated.streak !== user.streak
  ) {
    await writeUser(username, updated)
  }
  return {
    ...(await dbGetDaily(dateKey, username)),
    accepted: accepted || prev !== undefined,
  }
}

export async function dbGetDailyPost(
  dateKey: string,
): Promise<{id: string; url: string} | undefined> {
  const raw = await redis.get(postKey(dateKey))
  if (!raw) return
  try {
    return JSON.parse(raw) as {id: string; url: string}
  } catch {
    return
  }
}

export async function dbSetDailyPost(
  dateKey: string,
  post: {id: string; url: string},
): Promise<void> {
  await redis.set(postKey(dateKey), JSON.stringify(post))
}
