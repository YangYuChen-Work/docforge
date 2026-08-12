import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('wizard uses semantic classes instead of layout inline styles', () => {
  const page = read('src/pages/DocWizard.vue')
  assert.match(page, /class="page-back-link"/)
  assert.match(page, /class="workbench-empty-state"/)
  assert.match(page, /class="wizard-confirm-panel"/)
  assert.doesNotMatch(page, /style="color:#1a5ccc/)
  assert.doesNotMatch(page, /style="font-size:12px;color:#999/)
})

test('configuration page exposes a structured detail empty state', () => {
  const page = read('src/pages/DocConfig.vue')
  assert.match(page, /class="config-detail-empty"/)
  assert.doesNotMatch(page, /style="text-align:\s*center;\s*padding:\s*40px/)
})

test('audit table owns scrolling and keeps pagination outside the scrollport', () => {
  const page = read('src/pages/AuditLog.vue')
  assert.match(page, /class="audit-table-scroll"[^>]*tabindex="0"/)
  assert.match(page, /aria-label="日志审计记录"/)
  assert.ok(page.indexOf('audit-table-scroll') < page.indexOf('audit-pagination'))
  assert.match(read('src/styles/page-audit.css'), /\.audit-table-scroll\s*\{[\s\S]*overflow:\s*auto;/)
})

test('audit pagination uses semantic theme tokens without hardcoded colors', () => {
  const css = read('src/styles/page-audit.css')
  const pagination = css.slice(css.indexOf('/* Pagination */'))

  assert.doesNotMatch(pagination, /#[0-9a-f]{3,8}\b/i)
  assert.match(pagination, /\.page-info\s*\{[^}]*color:\s*var\(--ui-ink-soft\);/)
  assert.match(pagination, /\.page-btn\s*\{[^}]*border:\s*1px solid var\(--ui-line\);[^}]*background:\s*var\(--ui-surface\);[^}]*color:\s*var\(--ui-ink\);/)
  assert.match(pagination, /\.page-btn:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--ui-primary\);[^}]*background:\s*var\(--ui-primary-wash\);[^}]*color:\s*var\(--ui-primary\);/)
  assert.match(pagination, /\.page-btn:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ui-primary\);/)
  assert.match(pagination, /\.page-btn:disabled\s*\{[^}]*background:\s*var\(--ui-surface-muted\);[^}]*color:\s*var\(--ui-ink-soft\);/)
})
