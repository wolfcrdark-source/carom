import {once} from 'node:events'
import type {IncomingMessage, ServerResponse} from 'node:http'
import type {TaskResponse} from '@devvit/web/server'
import {context, reddit} from '@devvit/web/server'
import type {
  PartialJsonValue,
  TriggerResponse,
  UiResponse,
} from '@devvit/web/shared'
import {
  type DailyRsp,
  Endpoint,
  EndpointMethod,
  type ErrorRsp,
  type PostScoreReq,
  type PostScoreRsp,
} from '../shared/api.ts'
import {formatUtcLabel, utcDateKey} from '../shared/daily.ts'
import {
  dbGetDaily,
  dbGetDailyPost,
  dbSetDailyPost,
  dbSubmitScore,
} from './db.ts'

type AnyRsp =
  | DailyRsp
  | PostScoreRsp
  | UiResponse
  | TriggerResponse
  | TaskResponse
  | ErrorRsp

export async function onReq(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  try {
    await route(reqMsg, rspMsg)
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`
    console.error(msg)
    writeJson<ErrorRsp>(500, {error: msg, status: 500}, rspMsg)
  }
}

async function currentUsername(): Promise<string | undefined> {
  if (context.username) return context.username
  try {
    return await reddit.getCurrentUsername()
  } catch {
    return
  }
}

async function route(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  const url = new URL(reqMsg.url ?? '/', 'http://localhost')
  const endpoint = url.pathname.replace(/^\//, '') as Endpoint
  const method = EndpointMethod[endpoint]

  let rsp: AnyRsp
  if (method !== reqMsg.method) {
    rsp = {error: 'not found', status: 404}
  } else {
    switch (endpoint) {
      case Endpoint.GetDaily:
        rsp = await routeGetDaily(url)
        break
      case Endpoint.PostScore:
        rsp = await routePostScore(reqMsg)
        break
      case Endpoint.OnMenuNewPost:
        rsp = await routeMenuNewPost()
        break
      case Endpoint.OnAppInstall:
        rsp = await routeAppInstall()
        break
      case Endpoint.OnDailyPost:
        rsp = await routeDailyPost()
        break
      default:
        endpoint satisfies never
        rsp = {error: 'not found', status: 404}
        break
    }
  }

  writeJson<PartialJsonValue>('status' in rsp ? rsp.status : 200, rsp, rspMsg)
}

async function routeGetDaily(url: URL): Promise<DailyRsp> {
  const dateKey = url.searchParams.get('date') || utcDateKey()
  return dbGetDaily(dateKey, await currentUsername())
}

async function routePostScore(
  reqMsg: IncomingMessage,
): Promise<PostScoreRsp | ErrorRsp> {
  const username = await currentUsername()
  if (!username) return {error: 'sign in to post a score', status: 401}
  const req = await readJson<PostScoreReq>(reqMsg)
  return dbSubmitScore(req.dateKey, username, req.shots, req.pocketed)
}

async function createDailyPost(
  dateKey: string,
): Promise<{id: string; url: string}> {
  const label = formatUtcLabel(dateKey).replace(' · UTC', '')
  const post = await reddit.submitCustomPost({
    title: `CAROM — ${label}`,
    entry: 'default',
    textFallback: {
      text: `CAROM — ${label}. Place one bumper and bank the ball into the pocket.`,
    },
    postData: {dateKey},
  })
  const saved = {id: post.id, url: post.url}
  await dbSetDailyPost(dateKey, saved)
  return saved
}

async function routeMenuNewPost(): Promise<UiResponse> {
  const dateKey = utcDateKey()
  const post = await createDailyPost(dateKey)
  return {
    showToast: {text: `Posted CAROM for ${dateKey}.`, appearance: 'success'},
    navigateTo: post.url,
  }
}

async function routeAppInstall(): Promise<TriggerResponse> {
  const dateKey = utcDateKey()
  const existing = await dbGetDailyPost(dateKey)
  if (!existing) await createDailyPost(dateKey)
  return {}
}

async function routeDailyPost(): Promise<TaskResponse> {
  const dateKey = utcDateKey()
  const existing = await dbGetDailyPost(dateKey)
  if (existing) {
    console.log(`daily post already exists for ${dateKey}: ${existing.url}`)
    return {}
  }
  const post = await createDailyPost(dateKey)
  console.log(`created daily post for ${dateKey}: ${post.url}`)
  return {}
}

async function readJson<T>(reqMsg: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = []
  reqMsg.on('data', chunk => chunks.push(chunk))
  await once(reqMsg, 'end')
  return JSON.parse(`${Buffer.concat(chunks)}`)
}

function writeJson<T extends PartialJsonValue>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json)
  const len = Buffer.byteLength(body)
  rsp.writeHead(status, {
    'Content-Length': len,
    'Content-Type': 'application/json',
  })
  rsp.end(body)
}
