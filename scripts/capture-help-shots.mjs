#!/usr/bin/env node
/**
 * Captures the screenshots used by the help page (`/ayuda`).
 *
 * The images are real renders of the running app, taken element by element, so
 * the documentation cannot drift from the product. Chrome is driven over the
 * DevTools Protocol with Node's built-in WebSocket: no extra dependency, no
 * build step, and the run is repeatable.
 *
 * Usage:
 *   pnpm build && pnpm start -p 3100          # in another terminal
 *   node scripts/capture-help-shots.mjs --base-url http://localhost:3100
 *
 * Optional flags:
 *   --base-url <url>   app origin to capture (default http://localhost:3000)
 *   --only <id,id>     capture just those shots
 *   --out <dir>        asset directory (default public/ayuda)
 *
 * Output:
 *   <out>/<id>.png     cropped PNG at 2x of the element's CSS box
 *   lib/help-shots.mjs regenerated manifest with the real pixel dimensions
 *
 * This is a development tool. It is not part of the build, the tests or CI: the
 * committed PNGs are the build input and the manifest is what the page imports.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const DESKTOP_WIDTH = 1440
/** Tall viewport so a whole card fits by layout, not by scrolling. */
const TALL = 2800
/** Dialogs size themselves from the viewport height (`max-h-[90vh]`). */
const WINDOW = 860
const DEVICE_SCALE = 2

/**
 * Shots, in page order. `prepare` runs in the page after the example project is
 * loaded; `waitFor` must become truthy before the element is measured.
 *
 * @typedef {{ id: string, viewportHeight?: number, prepare?: string[], waitFor?: string, target: string }} Shot
 * @type {Shot[]}
 */
const SHOTS = [
  {
    id: 'masthead',
    viewportHeight: WINDOW,
    target: "document.querySelector('header')",
  },
  {
    id: 'viviendas',
    target: "help.section('Viviendas')",
  },
  {
    id: 'servicios',
    target: "help.section('Servicios generales')",
  },
  {
    id: 'locales',
    target: "help.section('Locales, oficinas e industrias')",
  },
  {
    id: 'garajes',
    target: "help.section('Garajes')",
  },
  {
    id: 'irve',
    target: "help.section('Recarga de vehículos')",
  },
  {
    id: 'parametros',
    viewportHeight: WINDOW,
    prepare: ["help.clickText('button', 'Parámetros de cálculo')"],
    waitFor: "help.dialog()",
    target: 'help.dialog()',
  },
  {
    id: 'lga',
    prepare: ["help.tab('LGA')"],
    waitFor: "help.panel('Línea General de Alimentación')",
    target: "help.panel('Línea General de Alimentación')",
  },
  {
    id: 'di',
    prepare: ["help.tab('DI')"],
    waitFor: "help.panel('Derivación Individual')",
    target: "help.panel('Derivación Individual')",
  },
  {
    id: 'tablas',
    viewportHeight: WINDOW,
    prepare: ["help.tab('LGA')", "help.clickLabel('[aria-label^=\"Ver tabla\"]')"],
    waitFor: 'help.dialog()',
    target: 'help.dialog()',
  },
  {
    id: 'didactico',
    prepare: ["document.querySelector('#explanation-mode').click()"],
    waitFor: "document.querySelector('[aria-label=\"Desarrollo del cálculo\"]')",
    target: "document.querySelector('[aria-label=\"Desarrollo del cálculo\"]')",
  },
]

/** Helpers injected once per page load, before any shot runs. */
const PAGE_HELPERS = `window.help = {
  clickText(selector, text) {
    const node = [...document.querySelectorAll(selector)]
      .find(el => el.textContent.replace(/\\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()))
    if (!node) throw new Error('No match for ' + selector + ' containing ' + text)
    node.click()
    return true
  },
  clickLabel(selector) {
    const node = document.querySelector(selector)
    if (!node) throw new Error('No match for ' + selector)
    node.click()
    return true
  },
  tab(label) {
    return help.clickText('[role="tab"]', label)
  },
  section(heading) {
    const h3 = [...document.querySelectorAll('h3')]
      .find(el => el.textContent.replace(/\\s+/g, ' ').trim().startsWith(heading))
    return h3 ? h3.closest('section') : null
  },
  panel(heading) {
    const section = help.section(heading)
    return section ? section.parentElement : null
  },
  dialog() {
    return document.querySelector('[role="dialog"]')
  },
}`

const argv = process.argv.slice(2)
const flag = name => {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? null : argv[index + 1]
}

const baseUrl = (flag('base-url') ?? 'http://localhost:3000').replace(/\/$/, '')
const outDir = path.resolve(root, flag('out') ?? 'public/ayuda')
const manifestPath = path.join(root, 'lib/help-shots.mjs')
const only = flag('only')?.split(',').map(value => value.trim()).filter(Boolean) ?? null

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) throw new Error('No Chrome/Chromium binary found. Set CHROME_BIN=/path/to/chrome.')
  return found
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Minimal CDP client over the browser-level WebSocket, flatten sessions. */
class Devtools {
  #socket
  #nextId = 0
  #pending = new Map()

  static async connect(url) {
    const client = new Devtools()
    await client.#open(url)
    return client
  }

  #open(url) {
    return new Promise((resolve, reject) => {
      this.#socket = new WebSocket(url)
      this.#socket.addEventListener('open', () => resolve())
      this.#socket.addEventListener('error', event => reject(new Error(`CDP socket error: ${event.message ?? 'unknown'}`)))
      this.#socket.addEventListener('message', event => {
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return // CDP only speaks JSON; anything else is not ours to handle
        }
        const entry = message.id !== undefined ? this.#pending.get(message.id) : null
        if (!entry) return
        this.#pending.delete(message.id)
        if (message.error) entry.reject(new Error(`${message.error.message} (${message.error.code})`))
        else entry.resolve(message.result)
      })
    })
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#nextId
    const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) }
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject })
      this.#socket.send(JSON.stringify(payload))
    })
  }

  close() {
    this.#socket?.close()
  }
}

/** Waits until `expression` evaluates truthy in the page. */
async function waitFor(client, sessionId, expression, { timeout = 15000, label = expression } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const { result } = await client.send(
      'Runtime.evaluate',
      { expression: `Boolean(${expression})`, returnByValue: true },
      sessionId,
    )
    if (result.value) return
    await sleep(120)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

/** Reads the pixel dimensions out of a PNG IHDR chunk. */
function pngSize(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function capture({ client, sessionId, shot }) {
  const height = shot.viewportHeight ?? TALL
  await client.send(
    'Emulation.setDeviceMetricsOverride',
    { width: DESKTOP_WIDTH, height, deviceScaleFactor: DEVICE_SCALE, mobile: false },
    sessionId,
  )
  await client.send('Page.navigate', { url: `${baseUrl}/` }, sessionId)
  await waitFor(client, sessionId, "document.querySelector('header')", { label: 'the calculator header' })

  // Deterministic state: default light theme, calculation mode, example project.
  await client.send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        localStorage.clear()
        localStorage.setItem('electrocalc-theme', 'light')
        localStorage.setItem('electrocalc-explanation-mode', 'calculation')
      })()`,
    },
    sessionId,
  )
  await client.send('Page.navigate', { url: `${baseUrl}/` }, sessionId)
  await waitFor(client, sessionId, "document.querySelector('header')", { label: 'the calculator header' })
  await waitFor(client, sessionId, "!document.querySelector('[aria-busy=\"true\"]')", { label: 'stored data to load' })
  await client.send('Runtime.evaluate', { expression: PAGE_HELPERS }, sessionId)
  await client.send('Runtime.evaluate', { expression: "help.clickText('button', 'Cargar ejemplo')" }, sessionId)
  await waitFor(client, sessionId, "!document.body.textContent.includes('Cargando datos guardados')")

  for (const step of shot.prepare ?? []) {
    await client.send('Runtime.evaluate', { expression: step }, sessionId)
  }
  if (shot.waitFor) await waitFor(client, sessionId, shot.waitFor)
  await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId)
  await waitFor(client, sessionId, shot.target, { label: shot.id })
  await sleep(250)

  const measured = await client.send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        const el = ${shot.target}
        if (!el) throw new Error('missing target ${shot.id}')
        const box = el.getBoundingClientRect()
        return { x: box.x + window.scrollX, y: box.y + window.scrollY, width: box.width, height: box.height }
      })()`,
      returnByValue: true,
    },
    sessionId,
  )
  const box = measured.result.value
  if (!box || box.width < 20 || box.height < 20) throw new Error(`Invalid box for ${shot.id}: ${JSON.stringify(box)}`)

  const { data } = await client.send(
    'Page.captureScreenshot',
    {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height), scale: 1 },
    },
    sessionId,
  )
  const buffer = Buffer.from(data, 'base64')
  writeFileSync(path.join(outDir, `${shot.id}.png`), buffer)
  return { id: shot.id, ...pngSize(buffer) }
}

function writeManifest(shots) {
  const entries = shots
    .map(shot => `  ${shot.id}: { src: '/ayuda/${shot.id}.png', width: ${shot.width}, height: ${shot.height} },`)
    .join('\n')
  const source = `/**
 * Generated by \`scripts/capture-help-shots.mjs\`. Do not edit by hand: rerun the
 * script after changing the captured screens so the dimensions stay truthful.
 *
 * Intrinsic pixel size of each help screenshot, captured at ${DEVICE_SCALE}x.
 */

/** @typedef {{ src: string, width: number, height: number }} HelpShot */

/** @type {Record<string, HelpShot>} */
export const HELP_SHOTS = {
${entries}
}
`
  writeFileSync(manifestPath, source)
}

async function main() {
  const chrome = findChrome()
  const selected = only ? SHOTS.filter(shot => only.includes(shot.id)) : SHOTS
  if (!selected.length) throw new Error(`No shots matched --only ${only?.join(',')}`)
  mkdirSync(outDir, { recursive: true })

  const profile = mkdtempSync(path.join(tmpdir(), 'help-shots-'))
  const chromeProcess = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--allow-file-access-from-files',
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let stderr = ''
  chromeProcess.stderr.on('data', chunk => { stderr += chunk.toString() })

  try {
    const portFile = path.join(profile, 'DevToolsActivePort')
    const deadline = Date.now() + 20000
    while (!existsSync(portFile)) {
      if (Date.now() > deadline) throw new Error(`Chrome did not expose a debugging port.\n${stderr.slice(-800)}`)
      await sleep(100)
    }
    await sleep(150)
    const [port, browserPath] = readFileSync(portFile, 'utf8').trim().split('\n')
    const client = await Devtools.connect(`ws://127.0.0.1:${port}${browserPath}`)

    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    await client.send('Page.enable', {}, sessionId)
    await client.send('Runtime.enable', {}, sessionId)

    const results = []
    for (const shot of selected) {
      const result = await capture({ client, sessionId, shot })
      results.push(result)
      console.log(`✓ ${result.id.padEnd(11)} ${result.width}×${result.height}`)
    }

    client.close()

    // Keep the manifest complete even for a filtered run.
    const previous = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : ''
    const merged = SHOTS.map(shot => {
      const fresh = results.find(result => result.id === shot.id)
      if (fresh) return fresh
      const match = previous.match(new RegExp(`${shot.id}: \\{ src: '[^']+', width: (\\d+), height: (\\d+) \\}`))
      if (!match) throw new Error(`No size for ${shot.id}: capture it too, or run the full set`)
      return { id: shot.id, width: Number(match[1]), height: Number(match[2]) }
    })
    writeManifest(merged)
    console.log(`\n${results.length} shot(s) written to ${path.relative(root, outDir)}/ and lib/help-shots.mjs refreshed.`)
  } finally {
    chromeProcess.kill('SIGKILL')
    rmSync(profile, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(`\n✗ ${error.message}`)
  process.exitCode = 1
})
