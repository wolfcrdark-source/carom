import {execFileSync} from 'node:child_process'
import {mkdir, readFile, rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {extname, join} from 'node:path'
import {chromium} from '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs'

const root = new URL('../public/', import.meta.url).pathname
const videoDir = new URL('../video/raw/', import.meta.url).pathname
const outMp4 = new URL('../video/carom.mp4', import.meta.url).pathname
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
}

const server = createServer(async (req, rsp) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  let file = url.pathname === '/' ? '/splash.html' : url.pathname
  file = decodeURIComponent(file)
  if (file.includes('..')) {
    rsp.writeHead(400).end()
    return
  }
  try {
    const body = await readFile(join(root, file))
    rsp.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
    })
    rsp.end(body)
  } catch {
    rsp.writeHead(404).end('not found')
  }
})

await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:4177'
await rm(videoDir, {recursive: true, force: true})
await mkdir(videoDir, {recursive: true})

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({
  viewport: {width: 390, height: 720},
  recordVideo: {dir: videoDir, size: {width: 390, height: 720}},
})
const page = await context.newPage()

await page.goto(`${origin}/splash.html`, {waitUntil: 'domcontentloaded'})
await page.waitForTimeout(1800)
await page.screenshot({path: '/workspace/reddit-hack/shots/splash.png'})
await page.locator('#start-btn').click()
await page.waitForURL(/game\.html/)
await page.waitForFunction(() => window.__carom)
await page.waitForTimeout(800)

await page.goto(`${origin}/game.html?date=fixture-easy&skipTutorial=1`, {
  waitUntil: 'networkidle',
})
await page.waitForFunction(() => window.__carom)
await page.waitForTimeout(1200)
await page.screenshot({path: '/workspace/reddit-hack/shots/table.png'})
const placed = await page.evaluate(() => window.__carom.useWitness())
if (!placed) throw new Error('useWitness failed')
await page.waitForTimeout(900)
const launched = await page.evaluate(() => window.__carom.launch())
if (!launched) throw new Error('launch failed')
await page.evaluate(() => window.__carom.waitUntilSettled())
const state = await page.evaluate(() => window.__carom.getState())
if (!state.pocketed) throw new Error(`did not pocket: ${JSON.stringify(state)}`)
await page.waitForTimeout(2800)
await page.screenshot({path: '/workspace/reddit-hack/shots/result.png'})

const video = page.video()
await page.close()
const webm = video ? await video.path() : ''
await context.close()
await browser.close()
server.close()

if (!webm) throw new Error('no webm recorded')
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    webm,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    outMp4,
  ],
  {stdio: 'inherit'},
)
console.log('recorded', webm, '->', outMp4, 'state', state)
