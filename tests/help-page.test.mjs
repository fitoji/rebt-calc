import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HELP_GROUPS, HELP_SECTIONS } from '../lib/help-sections.mjs'
import { HELP_SHOTS } from '../lib/help-shots.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const helpDoc = read('components/help-doc.tsx')
const helpPage = read('app/ayuda/page.tsx')
const siteHeader = read('components/site-header.tsx')
const calculator = read('components/load-calculator.tsx')
const capture = read('scripts/capture-help-shots.mjs')

/** Pixel size straight out of the PNG IHDR chunk. */
function pngSize(file) {
  const buffer = readFileSync(path.join(root, file))
  assert.equal(buffer.readUInt32BE(0), 0x89504e47, `${file} is a PNG`)
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('every section of the index has exactly one document section', () => {
  const rendered = [...helpDoc.matchAll(/<Section id="([a-z0-9-]+)"/g)].map(match => match[1])

  assert.deepEqual(rendered, HELP_SECTIONS.map(section => section.id), 'sections render in index order')
  assert.equal(new Set(rendered).size, rendered.length, 'no section renders twice')
  assert.match(helpDoc, /<section id=\{id\} aria-labelledby=\{`\$\{id\}-title`\}/, 'each section is labelled by its own heading')
  assert.match(helpDoc, /<h2 id=\{`\$\{id\}-title`\}/, 'the heading carries the label id')
})

test('the index groups every section and nothing else', () => {
  const grouped = HELP_GROUPS.flatMap(group => group.sections.map(section => section.id))

  assert.deepEqual(grouped, HELP_SECTIONS.map(section => section.id), 'groups cover the sections once, in order')
  assert.deepEqual(HELP_GROUPS.map(group => group.title), ['Empezar', 'Previsión de cargas', 'Dimensionado de líneas', 'Uso diario', 'Referencia'])
})

test('every captured screenshot exists with the size the manifest promises', () => {
  for (const [id, shot] of Object.entries(HELP_SHOTS)) {
    assert.equal(shot.src, `/ayuda/${id}.png`, `${id} points at its own file`)
    const file = path.join(root, 'public', shot.src)
    assert.ok(existsSync(file), `${id} was captured into public${shot.src}`)
    assert.deepEqual(pngSize(`public${shot.src}`), { width: shot.width, height: shot.height }, `${id} dimensions match the manifest`)
    assert.ok(shot.width > 0 && shot.height > 0, `${id} has a positive size`)
  }
})

test('the guide shows every screenshot it names and names only real ones', () => {
  const used = [...helpDoc.matchAll(/id="([a-z0-9-]+)"\s+alt=/g)].map(match => match[1]).sort()
  const available = Object.keys(HELP_SHOTS).sort()

  assert.deepEqual(used, available, 'each shot is shown once and no shot is left unused')
})

test('the capture script documents the same shots the manifest ships', () => {
  for (const id of Object.keys(HELP_SHOTS)) {
    assert.match(capture, new RegExp(`id: '${id}'`), `${id} is captured by scripts/capture-help-shots.mjs`)
  }
})

test('both pages share one masthead and the guide is linked from the calculator', () => {
  assert.match(calculator, /<SiteHeader titleAs="h1">/, 'the calculator renders the shared masthead as its h1')
  assert.match(helpDoc, /<SiteHeader>/, 'the guide renders the shared masthead')
  assert.match(calculator, /import \{ SiteHeader \} from '@\/components\/site-header'/, 'the calculator imports the shared masthead')
  assert.match(helpDoc, /import \{ SiteHeader \} from '@\/components\/site-header'/, 'the guide imports the shared masthead')
  assert.match(calculator, /<Link href="\/ayuda"[^>]*aria-label="Cómo usar la app"/, 'the calculator header links to the guide with an accessible name')
  assert.match(helpPage, /import \{ HelpDoc \} from '@\/components\/help-doc'/, 'the /ayuda route renders the guide')
  assert.doesNotMatch(siteHeader, /<h1/, 'the masthead never hardcodes a heading level')
})

test('the guide page carries its own metadata', () => {
  assert.match(helpPage, /title: 'Cómo usar Electro-cálculos/, 'the guide has its own title')
  assert.match(helpPage, /description: '/, 'the guide has a description')
  assert.match(helpPage, /canonical: '\/ayuda'/, 'the guide declares its canonical path')
})

test('the guide is accessible: one h1, a skip link and labelled navigation', () => {
  assert.equal([...helpDoc.matchAll(/<h1[\s>]/g)].length, 1, 'exactly one h1')
  assert.match(helpDoc, /<a href="#contenido" className="sr-only focus:not-sr-only/, 'the skip link is visible on focus')
  assert.match(helpDoc, /<main id="contenido"/, 'the skip link target is the main region')
  assert.equal([...helpDoc.matchAll(/aria-label="Índice de la guía"/g)].length, 2, 'the desktop and mobile indexes are both labelled')
  assert.match(helpDoc, /scroll-mt-8/, 'anchored sections clear the viewport edge')
  assert.match(helpDoc, /<summary className="cursor-pointer/, 'the mobile index is a native disclosure')
})

test('guide styles come from theme tokens, never hardcoded colours', () => {
  assert.doesNotMatch(helpDoc, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours')
  assert.doesNotMatch(helpDoc, /\b(?:bg|text|border)-(?:white|black|gray|grey|slate|zinc|neutral|stone)(?:-\d{2,3})?\b/, 'no raw palette colours')
  for (const token of ['bg-surface-page', 'bg-paper', 'border-line', 'text-ink', 'text-ink-subtle', 'text-brand']) {
    assert.ok(helpDoc.includes(token), `uses the ${token} token`)
  }
})

test('the figures always size images from the manifest, never by hand', () => {
  assert.match(helpDoc, /const shot = HELP_SHOTS\[id\]/, 'the figure reads the manifest entry')
  assert.match(helpDoc, /width=\{shot\.width\}/, 'intrinsic width comes from the capture')
  assert.match(helpDoc, /height=\{shot\.height\}/, 'intrinsic height comes from the capture')
  assert.match(helpDoc, /sizes="\(min-width: 1024px\) 768px, 100vw"/, 'the responsive hint matches the layout column')
  assert.doesNotMatch(helpDoc, /<img /, 'the guide uses next/image, not a raw img')
})

test('the guide cites the normative sources it applies', () => {
  assert.match(helpDoc, /BOE_REBT/, 'links the REBT on the BOE')
  assert.match(helpDoc, /BOE_ITC_BT_52/, 'links the ITC-BT-52 amendment')
  assert.match(helpDoc, /Guía-BT-19/, 'names the guide that reproduces the UNE tables')
  assert.match(helpDoc, /A\.52-14/, 'states the ambient-temperature correction it does not apply')
  assert.match(helpDoc, /A\.52-16/, 'states the soil correction it does not apply')
})
