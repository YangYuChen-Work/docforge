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
