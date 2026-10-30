import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

test('the Next build no longer hides TypeScript errors', () => {
  const nextConfig = read('next.config.mjs')
  assert.doesNotMatch(nextConfig, /ignoreBuildErrors/, 'Next must not ignore build errors')
})

test('the project exposes a typecheck script', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit', 'pnpm typecheck runs the compiler')
})

test('the root tsconfig excludes separate packages from the app typecheck', () => {
  const tsconfig = JSON.parse(read('tsconfig.json'))
  assert.ok(tsconfig.exclude.includes('mcp-excel-server'), 'the MCP server has its own tsconfig')
  assert.ok(tsconfig.exclude.includes('conversion-de-planilla-a-web'), 'the legacy copy is not part of the build')
})

test('CI runs typecheck, tests and build', () => {
  const workflowPath = path.join(root, '.github/workflows/ci.yml')
  assert.ok(existsSync(workflowPath), 'the CI workflow exists')
  const workflow = read('.github/workflows/ci.yml')
  assert.match(workflow, /pnpm install --frozen-lockfile/)
  assert.match(workflow, /pnpm typecheck/)
  assert.match(workflow, /pnpm test/)
  assert.match(workflow, /pnpm build/)
})
