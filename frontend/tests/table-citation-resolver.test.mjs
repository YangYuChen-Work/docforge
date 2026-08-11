import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))

test('executes the TypeScript table citation resolver regressions', () => {
  const childEnv = { ...process.env }
  delete childEnv.NODE_TEST_CONTEXT
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--test', join(testDir, 'table-citation-resolver.behavior.ts')],
    { cwd: join(testDir, '..'), encoding: 'utf8', env: childEnv },
  )

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`)
})
