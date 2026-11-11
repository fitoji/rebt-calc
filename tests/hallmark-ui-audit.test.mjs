import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const globals = read('app/globals.css')
const calc = read('components/load-calculator.tsx')
// La cifra grande del rail vive en su propia tarjeta desde que el resultado
// sigue a la pestaña activa: su tipografía se audita donde se escribe.
const railResultCard = read('components/rail-result.tsx')
const modules = read('components/line-modules.tsx')
const tabs = read('components/ui/tabs.tsx')

const sourceFiles = ['app', 'components', 'lib']
  .flatMap(dir => readdirSync(path.join(root, dir), { recursive: true })
    .map(entry => path.join(dir, entry)))
  .filter(file => /\.(ts|tsx|css|mjs)$/.test(file) && existsSync(path.join(root, file)))
const allSource = sourceFiles.map(read).join('\n')

test('mobile tables keep desktop tables and never trap overflowing content', () => {
  assert.ok(calc.includes('grid gap-3 md:hidden'), 'mobile card layouts present')
  assert.match(calc, /hidden(?: min-w-0)? overflow-x-auto md:block/, 'desktop tables kept for md and up')
  assert.ok(calc.includes('flex min-w-0 flex-col gap-6'), 'the cargas column can shrink inside the grid')
  assert.match(calc, /grid min-w-0 items-start gap-6 xl:grid-cols-\[minmax\(0,1fr\)_320px\]/, 'the shell grid can shrink instead of widening the tab')
  assert.ok(modules.includes('grid min-w-0 gap-6 xl:grid-cols-[1fr_360px]'), 'LGA and DI use the same shrinkable grid')
  assert.ok(modules.includes('min-w-0 rounded-card border border-line bg-paper'), 'LGA and DI cards can shrink with the grid')
  assert.ok(tabs.includes('min-w-0 flex-1 text-sm outline-none'), 'TabsContent itself can shrink')
  // El desborde horizontal se resuelve en el root: si el body fuera contenedor de
  // scroll, ningún `position: sticky` de la app se activaría.
  assert.match(globals, /html\s*{\s*overflow-x: auto;/, 'the root scrolls instead of hiding content (WCAG 1.4.10)')
  assert.doesNotMatch(globals, /body\s*{\s*overflow-x: auto;/, 'the body must not become a scroll container')
  assert.ok(calc.includes('min-w-[700px]'), 'housing desktop min-width grows with the surface column')
  assert.ok(calc.includes('min-w-[580px]'), 'editable desktop min-width preserved')
  assert.match(calc, /xl:sticky[^"]*xl:self-start/, 'the results rail follows the edit on desktop')
})

test('shadcn button component is installed and referenced', () => {
  assert.ok(existsSync(path.join(root, 'components/ui/button.tsx')), 'button.tsx installed')
  assert.match(calc, /from '@\/components\/ui\/button'/, 'calculator imports Button')
})

test('no pure-white surfaces remain in tokens or markup', () => {
  assert.ok(!globals.includes('--background: oklch(1 0 0)'), 'background token tinted')
  assert.ok(!globals.includes('--card: oklch(1 0 0)'), 'card token tinted')
  assert.ok(!globals.includes('--popover: oklch(1 0 0)'), 'popover token tinted')
  assert.match(globals, /--color-paper:/, 'paper theme token exists')
  assert.doesNotMatch(allSource, /bg-white(?!\/)/, 'no plain bg-white surfaces (overlay bg-white/ allowed)')
})

test('shared controls use scoped transition properties', () => {
  const ownSource = sourceFiles
    .filter(file => !file.startsWith('components/ui/'))
    .map(read)
    .join('\n')
  assert.doesNotMatch(ownSource, /transition-all/, 'transition-all banned from own source (vendored shadcn exempt)')
  assert.match(calc, /transition-colors/, 'interactive controls keep scoped transitions')
})

test('numeric readouts use tabular figures while form fields stay out of scope', () => {
  assert.ok(calc.includes('mt-1 font-bold tabular-nums'), 'Metric values use tabular figures')
  assert.ok(railResultCard.includes('text-4xl font-bold tabular-nums'), 'results total uses tabular figures')
  assert.ok(calc.includes('font-semibold tabular-nums'), 'result rows use tabular figures')
  assert.ok(calc.includes('px-4 py-3 text-right tabular-nums'), 'ITA desktop cells use tabular figures')
  assert.doesNotMatch(globals, /\.field\s*\{[^}]*tabular-nums/, 'form fields deliberately out of scope')
})

test('section headings carry their normative block code instead of eyebrows', () => {
  assert.doesNotMatch(calc, /number="0[1-5]"/, 'section numbers removed')
  assert.doesNotMatch(calc, /block text-xs font-bold tracking-wide text-brand-strong/, 'no eyebrow above the heading')
  // P1–P5 es el nombre que usan la ITC-BT-10, el PDF y el panel de resultados: el
  // código va dentro de la línea del título, como un sello, no en un rótulo encima.
  assert.ok(calc.includes('rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink'), 'the code sits inline with the heading')
  for (const [code, title] of [['P1', 'Viviendas'], ['P2', 'Servicios generales'], ['P3', 'Locales, oficinas e industrias'], ['P4', 'Garajes'], ['P5', 'Recarga de vehículos eléctricos']]) {
    assert.ok(calc.includes(`<SectionTitle code="${code}" title="${title}"`), `${code} labels its block`)
  }
  const firstSectionTitle = calc.indexOf('<SectionTitle code="P1" title="Viviendas"')
  assert.ok(firstSectionTitle > 0, 'section title present')
  const section01Close = calc.indexOf('</section>', firstSectionTitle)
  assert.ok(calc.indexOf('<Metric label="Total viviendas"') > 0, 'metrics cluster present')
  assert.ok(calc.indexOf('<Metric label="Total viviendas"') < section01Close, 'metrics cluster inside the Viviendas card')
  assert.ok(calc.indexOf('<Metric label="P1 · Viviendas"') < section01Close, 'P1 metric stays with its controls')
})

test('the project letterhead preview shows the uploaded logo without stretching it', () => {
  assert.match(calc, /\{\(projectInfo\.logo \|\| projectInfo\.companyName\) && <div/, 'preview only renders when there is something to show')
  assert.match(calc, /projectInfo\.logo && <span className="flex h-10 max-w-\[140px\]/, 'logo sits in a fixed-height chip that caps wide logos')
  assert.match(calc, /alt=\{`Logo de \$\{projectInfo\.companyName \|\| 'la empresa'\}`\}/, 'logo has a descriptive alt')
  assert.match(calc, /max-h-full w-auto max-w-\[132px\] object-contain/, 'logo keeps its aspect ratio')
  assert.match(calc, /Membrete del PDF/, 'preview is labelled as the PDF letterhead')
})

test('the example building starts from the legal IRVE minimum', () => {
  // El 10 % de las plazas es el mínimo reglamentario de previsión (Guía-BT-52,
  // Anexo 2, no un apartado de la ITC-BT-10). El ejemplo es el documento de
  // referencia de la primera visita: si arrancara con "todas las plazas", P5 se
  // comería más de la mitad del total y enseñaría un edificio desproporcionado
  // como si fuera lo normal.
  assert.match(calc, /setParking\(30\); setIrveOption\(3\);/, 'the example seeds 30 plazas with the reglamentary 10 % minimum')
  assert.match(calc, /setParking\(0\)\n\s*setIrveOption\(1\)/, 'a cleared project still resets to the plain option')
})
