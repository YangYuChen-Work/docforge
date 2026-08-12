import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocEditor.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/editor-refresh.css'), 'utf8')

test('editor exposes an accessible narrow-desktop evidence drawer', () => {
  assert.match(page, /class="editor-evidence-toggle"/)
  assert.match(page, /:aria-expanded="evidencePanelOpen"/)
  assert.match(page, /class="editor-evidence-shell"/)
  assert.match(page, /:class="\{ 'is-open': evidencePanelOpen \}"/)
  assert.match(page, /class="editor-evidence-backdrop"/)
  assert.match(page, /const evidencePanelOpen = ref\(false\)/)
})

test('evidence panel becomes a drawer below 1180px without shrinking the paper', () => {
  assert.match(css, /@media \(max-width:\s*1179px\) and \(min-width:\s*768px\)/)
  assert.match(css, /\.editor-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(184px,\s*214px\) minmax\(0,\s*1fr\);/)
  assert.match(css, /\.editor-evidence-shell\s*\{[\s\S]*position:\s*fixed;/)
  assert.match(css, /\.editor-evidence-shell\.is-open\s*\{[\s\S]*transform:\s*translateX\(0\);/)
})

test('editor paper uses semantic paper colors in both themes', () => {
  assert.match(css, /\.word-page\s*\{[\s\S]*background:\s*var\(--ui-paper\);/)
  assert.match(css, /\.word-page\s*\{[\s\S]*color:\s*var\(--ui-paper-ink\);/)
})
