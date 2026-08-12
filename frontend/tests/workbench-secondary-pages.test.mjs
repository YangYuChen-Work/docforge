import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-dom'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

function cssBlock(source, selector) {
  const blockStart = source.indexOf(`${selector} {`)
  if (blockStart === -1) return ''
  const openingBrace = source.indexOf('{', blockStart)
  let depth = 0
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(openingBrace + 1, index)
  }
  assert.fail(`unterminated CSS block: ${selector}`)
}

function declarations(source, selector) {
  const body = cssBlock(source, selector)
  if (!body) return {}
  return Object.fromEntries(
    body.split(';').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const colon = entry.indexOf(':')
      return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()]
    }),
  )
}

function elementClass(node) {
  if (node.type !== 1) return ''
  const attribute = node.props.find((prop) => prop.type === 6 && prop.name === 'class')
  return attribute?.value?.content ?? ''
}

function findElementByClass(node, className) {
  if (node.type === 1 && elementClass(node).split(/\s+/).includes(className)) return node
  for (const child of node.children ?? []) {
    const found = findElementByClass(child, className)
    if (found) return found
  }
  return null
}

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
  const template = page.match(/<template>([\s\S]*?)<\/template>/)?.[1]
  assert.ok(template, 'AuditLog must contain a template')
  const ast = parse(template)
  const wrapper = findElementByClass(ast, 'audit-table-wrapper')
  assert.ok(wrapper, 'audit table wrapper must exist')

  const elementChildren = wrapper.children.filter((child) => child.type === 1)
  assert.deepEqual(
    elementChildren.map((child) => elementClass(child)),
    ['audit-table-scroll', 'audit-pagination'],
    'the scrollport and pagination must be direct sibling rows',
  )

  const scrollport = elementChildren[0]
  const attributes = Object.fromEntries(
    scrollport.props
      .filter((prop) => prop.type === 6)
      .map((prop) => [prop.name, prop.value?.content ?? '']),
  )
  assert.equal(attributes.tabindex, '0')
  assert.equal(attributes.role, 'region')
  assert.equal(attributes['aria-label'], '日志审计记录')

  const main = read('src/main.ts')
  assert.ok(
    main.indexOf("./styles/page-audit.css") < main.indexOf("./styles/visual-system.css"),
    'final audit declarations must follow the application stylesheet order',
  )
  const pageAudit = read('src/styles/page-audit.css')
  const visualSystem = read('src/styles/visual-system.css')
  const finalDeclarations = (selector) => ({
    ...declarations(pageAudit, selector),
    ...declarations(visualSystem, selector),
  })

  const wrapperRules = finalDeclarations('.audit-table-wrapper')
  assert.equal(wrapperRules.display, 'grid')
  assert.equal(wrapperRules['grid-template-rows'], 'minmax(0, 1fr) auto')
  assert.equal(wrapperRules.height, 'clamp(420px, calc(100dvh - 330px), 680px)')
  assert.equal(wrapperRules['min-height'], '0')
  assert.equal(wrapperRules.overflow, 'hidden')

  const scrollRules = finalDeclarations('.audit-table-scroll')
  assert.equal(scrollRules['min-height'], '0')
  assert.equal(scrollRules.overflow, 'auto')
  assert.equal(finalDeclarations('.audit-table thead th').position, 'sticky')
  assert.equal(finalDeclarations('.audit-table thead th').top, '0')
  assert.equal(finalDeclarations('.audit-pagination').position, 'relative')
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
