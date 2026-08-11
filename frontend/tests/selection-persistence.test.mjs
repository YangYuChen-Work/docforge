import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')

test('keeps the last non-empty editor selection when the caret moves', () => {
  assert.match(page, /@selectionChange="handleSelectionChange"/)
  assert.match(
    page,
    /function handleSelectionChange\(text: string\) \{[\s\S]*if \(text\.trim\(\)\) selectionText\.value = text/,
  )
})
