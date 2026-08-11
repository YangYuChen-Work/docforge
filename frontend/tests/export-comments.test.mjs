import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const contentPanel = readFileSync(join(testDir, '../src/components/ContentPanel.vue'), 'utf8')
const editorPage = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')
const exportsApi = readFileSync(join(testDir, '../src/api/exports.ts'), 'utf8')

test('offers an include-comments choice for all three export formats', () => {
  assert.match(contentPanel, /带批注/)
  assert.match(contentPanel, /不带批注/)
  assert.match(contentPanel, /export.*format.*includeComments/)
  assert.match(editorPage, /doExport\(format: string, includeComments: boolean\)/)
  assert.match(exportsApi, /include_comments: includeComments/)
})
