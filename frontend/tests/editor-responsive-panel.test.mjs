import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocEditor.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/editor-refresh.css'), 'utf8')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function block(source, header) {
  const match = new RegExp(`${escapeRegExp(header)}\\s*\\{`).exec(source)
  assert.ok(match, `missing CSS block: ${header}`)
  const open = source.indexOf('{', match.index)
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, index)
  }
  assert.fail(`unclosed CSS block: ${header}`)
}

function vueTag(source, name) {
  const match = new RegExp(`<${name}\\b[\\s\\S]*?\\/>`).exec(source)
  assert.ok(match, `missing Vue tag: ${name}`)
  return match[0]
}

test('narrow evidence drawer manages focus, Escape, inert background, and modal semantics', () => {
  assert.match(page, /ref="evidenceToggleRef"/)
  assert.match(page, /ref="evidenceCloseRef"/)
  assert.match(page, /@click="openEvidencePanel"/)
  assert.match(page, /@keydown\.esc\.stop\.prevent="closeEvidencePanel\(\)"/)
  assert.match(page, /const drawerModalActive = computed\(\(\) => narrowEvidenceMode\.value && evidencePanelOpen\.value\)/)
  assert.match(page, /await nextTick\(\)\s*evidenceCloseRef\.value\?\.focus\(\)/)
  assert.match(page, /await nextTick\(\)\s*evidenceToggleRef\.value\?\.focus\(\)/)
  assert.match(page, /:role="narrowEvidenceMode \? 'dialog' : undefined"/)
  assert.match(page, /:aria-modal="drawerModalActive \? 'true' : undefined"/)
  assert.match(page, /:aria-label="narrowEvidenceMode \? '数据来源' : undefined"/)

  const inertBindings = page.match(/:inert="drawerModalActive \|\| undefined"/g) ?? []
  assert.ok(inertBindings.length >= 4, 'topbar, toolbar, outline, and content must leave the tab order')
  assert.match(page, /const evidenceModeQuery = window\.matchMedia\('\(min-width: 768px\) and \(max-width: 1179px\)'\)/)
})

test('AiPanel keeps its complete existing ref, seven props, and eight events', () => {
  const aiPanel = vueTag(page, 'AiPanel')
  assert.match(aiPanel, /ref="aiPanelRef"/)
  assert.deepEqual(
    [...aiPanel.matchAll(/:([A-Za-z][\w-]*)=/g)].map((match) => match[1]),
    ['annotations', 'citations', 'sourceDetails', 'citationState', 'selectionText', 'activeAnnotationId', 'activeCitationKey'],
  )
  assert.deepEqual(
    [...aiPanel.matchAll(/@([A-Za-z][\w-]*)=/g)].map((match) => match[1]),
    ['updateAnnotation', 'replaceSelection', 'insertAtCursor', 'aiAction', 'createAnnotation', 'annotationFocus', 'citationFocus', 'commentAiAction'],
  )
})

test('wide editor keeps three columns and hides drawer-only controls', () => {
  assert.match(block(css, '.editor-body'), /grid-template-columns:\s*minmax\(200px, 224px\) minmax\(0, 1fr\) minmax\(260px, 300px\);/)

  const wide1440 = block(css, '@media (min-width: 1440px)')
  assert.match(block(wide1440, '.editor-shell > .editor-body'), /grid-template-columns:\s*minmax\(214px, 248px\) minmax\(0, 1fr\) minmax\(280px, 320px\);/)

  const wide = block(css, '@media (min-width: 1180px)')
  assert.match(block(wide, '.editor-evidence-shell'), /position:\s*static;/)
  assert.match(block(wide, '.editor-evidence-toggle,\n  .editor-evidence-close,\n  .editor-evidence-backdrop'), /display:\s*none;/)
})

test('narrow editor uses two columns and a correctly layered fixed drawer', () => {
  const narrow = block(css, '@media (max-width: 1179px) and (min-width: 768px)')
  assert.match(block(narrow, '.editor-body'), /grid-template-columns:\s*minmax\(184px, 214px\) minmax\(0, 1fr\);/)

  const drawer = block(narrow, '.editor-evidence-shell')
  assert.match(drawer, /position:\s*fixed;/)
  assert.match(drawer, /width:\s*min\(340px, calc\(100vw - 80px\)\);/)
  assert.match(drawer, /transform:\s*translateX\(105%\);/)
  assert.match(block(narrow, '.editor-evidence-shell.is-open'), /transform:\s*translateX\(0\);/)

  const backdropZ = Number(block(narrow, '.editor-evidence-backdrop').match(/z-index:\s*(\d+);/)?.[1])
  const drawerZ = Number(drawer.match(/z-index:\s*(\d+);/)?.[1])
  assert.ok(Number.isFinite(backdropZ) && Number.isFinite(drawerZ) && backdropZ < drawerZ)
})

test('outline, paper viewport, evidence contents, and toolbar keep independent overflow', () => {
  assert.match(block(css, '.editor-outline'), /overflow-y:\s*auto;/)
  assert.match(block(css, '.editor-content'), /overflow:\s*auto;/)
  assert.match(block(css, '.editor-evidence-shell > .editor-ai-panel'), /overflow:\s*hidden;/)
  const toolbar = block(css, '.editor-toolbar')
  assert.match(toolbar, /flex-wrap:\s*nowrap;/)
  assert.match(toolbar, /overflow-x:\s*auto;/)
  assert.doesNotMatch(toolbar, /transition:[^;]*(?:width|grid-template)/)
})

test('editor-scoped paper rules outrank ContentPanel scoped defaults at each desktop range', () => {
  const paper = block(css, '.editor-shell .content-panel .word-page')
  assert.match(paper, /background:\s*var\(--ui-paper\);/)
  assert.match(paper, /color:\s*var\(--ui-paper-ink\);/)
  assert.match(paper, /padding:\s*52px 62px 68px;/)

  assert.match(block(css, '.editor-shell .content-panel .word-body'), /color:\s*var\(--ui-paper-ink\);/)
  assert.match(
    block(css, '.editor-shell .content-panel .word-body h1,\n.editor-shell .content-panel .word-body h2,\n.editor-shell .content-panel .word-body h3'),
    /color:\s*var\(--ui-paper-ink\);/,
  )

  const narrow = block(css, '@media (max-width: 1179px) and (min-width: 768px)')
  const narrowPaper = block(narrow, '.editor-shell .content-panel .word-page')
  assert.match(narrowPaper, /padding-right:\s*46px;/)
  assert.match(narrowPaper, /padding-left:\s*46px;/)
})
