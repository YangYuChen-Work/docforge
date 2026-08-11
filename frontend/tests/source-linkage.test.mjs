import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const decorations = readFileSync(join(testDir, '../src/editor/ReferenceDecorations.ts'), 'utf8')
const editor = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')
const panel = readFileSync(join(testDir, '../src/components/AiPanel.vue'), 'utf8')
const contentPanel = readFileSync(join(testDir, '../src/components/ContentPanel.vue'), 'utf8')
const styles = readFileSync(join(testDir, '../src/styles/page-doc.css'), 'utf8')

test('renders the concrete source filename on inline citation markers', () => {
  assert.match(decorations, /fileName\?: string \| null/)
  assert.match(decorations, /marker\.title = label/)
  assert.match(decorations, /marker\.setAttribute\('aria-label', label\)/)
  assert.match(decorations, /const fileName = citation\.fileName/)
  assert.match(decorations, /const label = `来源：\$\{fileName\}`/)
  assert.match(editor, /sourceDetails\.value\[citation\.source_document_id\][\s\S]*original_name/)
})

test('focuses and flashes the matching source card from a citation selection', () => {
  assert.match(panel, /data-citation-key="citation\.key"/)
  assert.match(panel, /function focusCitationCard\(citationKey: string\)/)
  assert.match(panel, /scrollIntoView\(/)
  assert.match(panel, /classList\.add\('source-card-flash'\)/)
  assert.match(panel, /citationFocusRetryTimer = setInterval/)
  assert.match(editor, /focusCitationCard\(citationKey\)/)
})

test('styles full filename markers and the source-card flash state', () => {
  assert.match(contentPanel, /\.word-body :deep\(\.source-marker\)[\s\S]*white-space: normal/)
  assert.match(styles, /\.source-card-flash\s*\{[^}]*animation:/)
  assert.match(styles, /@keyframes sourceCardFlash/)
})
