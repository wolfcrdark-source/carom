import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {extname, join} from 'node:path'
import {chromium} from '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs'

const root = new URL('../public/', import.meta.url).pathname
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

await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:4173'

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({viewport: {width: 390, height: 720}})
const errors = []
page.on('pageerror', err => errors.push(String(err)))
page.on('console', msg => {
  const text = msg.text()
  if (
    msg.type() === 'error' &&
    !/favicon|\.map/.test(text) &&
    !/404/.test(text)
  ) {
    errors.push(text)
  }
})
page.on('requestfailed', req => {
  const url = req.url()
  if (!/favicon|\.map$/.test(url)) errors.push(`request failed ${url}`)
})

await page.goto(`${origin}/splash.html`, {waitUntil: 'domcontentloaded'})
const splashTitle = await page.locator('h1').innerText()
if (splashTitle !== 'CAROM') throw new Error(`splash title ${splashTitle}`)
await page.locator('#start-btn').click()
await page.waitForURL(/game\.html/)
console.log('splash -> game ok')

await page.goto(`${origin}/game.html?date=fixture-easy`, {
  waitUntil: 'networkidle',
})
await page.waitForFunction(() => window.__carom)
const placed = await page.evaluate(() => window.__carom.useWitness())
if (!placed) throw new Error('useWitness failed')
const launched = await page.evaluate(() => window.__carom.launch())
if (!launched) throw new Error('launch failed')
await page.evaluate(() => window.__carom.waitUntilSettled())
const state = await page.evaluate(() => window.__carom.getState())
console.log('fixture state', state)
if (state.mode !== 'result' || !state.pocketed) {
  throw new Error(`expected pocketed result, got ${JSON.stringify(state)}`)
}

await page.screenshot({
  path: '/workspace/reddit-hack/shots/fixture-pocketed.png',
})
await page.goto(`${origin}/game.html?tutorial=1`, {waitUntil: 'networkidle'})
await page.waitForFunction(() => window.__carom)
const tut = await page.evaluate(() => window.__carom.getState())
if (!tut.tutorial) throw new Error('tutorial did not start')
await page.screenshot({path: '/workspace/reddit-hack/shots/tutorial.png'})

if (errors.length) {
  console.error('page errors', errors)
  throw new Error(`browser errors: ${errors.join('; ')}`)
}

await browser.close()
server.close()
console.log('e2e ok')
