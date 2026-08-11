import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const decorations = readFileSync(join(testDir, '../src/editor/ReferenceDecorations.ts'), 'utf8')
const editor = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')

test('renders the concrete source filename on inline citation markers', () => {
  assert.match(decorations, /fileName\?: string \| null/)
  assert.match(decorations, /marker\.title = label/)
  assert.match(decorations, /marker\.setAttribute\('aria-label', label\)/)
  assert.match(decorations, /const fileName = citation\.fileName/)
  assert.match(decorations, /const label = `来源：\$\{fileName\}`/)
  assert.match(editor, /sourceDetails\.value\[citation\.source_document_id\][\s\S]*original_name/)
})
