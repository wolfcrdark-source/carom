import {
  type DailyRsp,
  Endpoint,
  type PostScoreReq,
  type PostScoreRsp,
} from '../shared/api.ts'

async function readJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T | undefined> {
  let rsp: Response
  try {
    rsp = await fetch(input, init)
  } catch (err) {
    console.error(`HTTP error: ${err instanceof Error ? err.message : err}`)
    return
  }
  if (!rsp.ok) {
    const text = await rsp.text().catch(() => '')
    console.error(`HTTP status ${rsp.status}: ${rsp.statusText}; ${text}`)
    return
  }
  return (await rsp.json()) as T
}

export async function fetchDaily(
  dateKey: string,
): Promise<DailyRsp | undefined> {
  return readJson<DailyRsp>(
    `${Endpoint.GetDaily}?date=${encodeURIComponent(dateKey)}`,
    {
      headers: {Accept: 'application/json'},
    },
  )
}

export async function fetchPostScore(
  req: PostScoreReq,
): Promise<PostScoreRsp | undefined> {
  return readJson<PostScoreRsp>(Endpoint.PostScore, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(req),
  })
}
