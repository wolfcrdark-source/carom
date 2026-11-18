/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

export type LeaderRow = {username: string; shots: number}

export type DailyRsp = {
  dateKey: string
  username?: string
  leaderboard: LeaderRow[]
  me?: {shots?: number; rank?: number; streak: number}
}

export type PostScoreReq = {
  dateKey: string
  shots: number
  pocketed: boolean
  closest?: number
}

export type PostScoreRsp = DailyRsp & {accepted: boolean}

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetDaily: 'api/daily',
  PostScore: 'api/score',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
  OnDailyPost: 'internal/scheduler/daily-post',
} as const

export const EndpointMethod = {
  [Endpoint.GetDaily]: 'GET',
  [Endpoint.PostScore]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.OnDailyPost]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}
