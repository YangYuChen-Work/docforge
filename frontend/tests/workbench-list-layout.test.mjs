import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocList.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')

test('document table owns horizontal scrolling and exposes a named region', () => {
  assert.match(page, /class="doc-table-scroll"[^>]*tabindex="0"/)
  assert.match(page, /class="doc-table-scroll"[^>]*role="region"/)
  assert.match(page, /aria-label="项目文档列表"/)
  assert.match(css, /\.doc-table-scroll\s*\{[\s\S]*overflow-x:\s*auto;/)
  assert.match(css, /\.doc-table\s*\{[\s\S]*min-width:\s*720px;/)
})

test('document metrics use one contiguous work surface', () => {
  assert.match(css, /\.doc-stats\s*\{[\s\S]*gap:\s*0;/)
  assert.match(css, /\.doc-stat-card\s*\{[\s\S]*border-radius:\s*0;/)
  assert.match(css, /\.doc-stat-card\s*\+[\s\S]*border-left:/)
})

test('shared controls use the compact desktop rhythm', () => {
  assert.match(css, /\.btn\s*\{[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-search[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-table tbody td\s*\{[\s\S]*height:\s*42px;/)
})

test('document work surface keeps its layout, scroll, and action contracts', () => {
  assert.match(css, /\.doc-main-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(248px,\s*300px\);/)
  assert.match(css, /\.doc-table-scroll\s*\{[\s\S]*scrollbar-gutter:\s*stable;/)
  assert.match(css, /\.doc-table-scroll:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--ui-primary\);/)
  assert.match(css, /\.doc-table-scroll \.doc-actions-header,\s*\.doc-table-scroll \.doc-actions-cell\s*\{[\s\S]*position:\s*sticky;[\s\S]*right:\s*0;/)
})

test('document metric labels remain muted supporting text', () => {
  assert.match(css, /\.doc-stat-metric span\s*\{[^}]*color:\s*var\(--ui-ink-faint\);[^}]*font-size:\s*11px;/)
})

test('document rows keep compact title and metadata rhythm within 42px', () => {
  assert.match(css, /\.doc-name\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.2;/)
  assert.match(css, /\.doc-meta\s*\{[^}]*font-size:\s*11px;[^}]*line-height:\s*1\.2;/)
  assert.match(css, /\.doc-table tbody td\s*\{[^}]*padding:\s*4px 8px;/)
})

test('document delete controls use the 36px shared control height', () => {
  assert.match(css, /\.doc-bulk-delete-btn,\s*\.doc-delete-btn\s*\{[\s\S]*min-height:\s*36px;/)
})

test('document action cells fit 36px delete controls within 42px rows', () => {
  const rowHeight = css.match(/\.doc-table tbody td\s*\{[^}]*height:\s*(\d+)px;/)
  const actionCellPadding = css.match(/\.doc-table tbody \.doc-actions-cell\s*\{[^}]*padding:\s*(\d+)px\s+8px;/)
  const deleteControlHeight = css.match(/\.doc-bulk-delete-btn,\s*\.doc-delete-btn\s*\{[^}]*min-height:\s*(\d+)px;/)

  assert.ok(rowHeight, 'document rows define a pixel height')
  assert.ok(actionCellPadding, 'action cells define their own vertical padding')
  assert.ok(deleteControlHeight, 'delete controls define a minimum height')
  assert.ok(
    Number(deleteControlHeight[1]) + Number(actionCellPadding[1]) * 2 <= Number(rowHeight[1]),
    'delete control and action-cell padding fit within the data-row height',
  )
})
