import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocEditor.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/editor-refresh.css'), 'utf8')
const visualSystemCss = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')
const aiPanel = readFileSync(resolve(root, 'src/components/AiPanel.vue'), 'utf8')
const pageDocCss = readFileSync(resolve(root, 'src/styles/page-doc.css'), 'utf8')
const contentPanel = readFileSync(resolve(root, 'src/components/ContentPanel.vue'), 'utf8')

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

function classSpecificity(selector) {
  return (selector.match(/\.[A-Za-z_][\w-]*/g) ?? []).length
}

test('narrow evidence drawer manages focus, Escape, inert background, and modal semantics', () => {
  assert.match(page, /ref="evidenceToggleRef"/)
  assert.match(page, /ref="evidenceCloseRef"/)
  assert.match(page, /@click="openEvidencePanel"/)
  assert.match(page, /class="editor-evidence-backdrop"[\s\S]*?tabindex="-1"/)
  assert.match(page, /ref="evidenceShellRef"/)
  assert.match(page, /const drawerModalActive = computed\(\(\) => narrowEvidenceMode\.value && evidencePanelOpen\.value\)/)
  assert.match(page, /await nextTick\(\)\s*evidenceCloseRef\.value\?\.focus\(\)/)
  assert.match(page, /await nextTick\(\)\s*evidenceToggleRef\.value\?\.focus\(\)/)
  assert.match(page, /:role="narrowEvidenceMode \? 'dialog' : undefined"/)
  assert.match(page, /:aria-modal="drawerModalActive \? 'true' : undefined"/)
  assert.match(page, /:aria-label="narrowEvidenceMode \? '数据来源' : undefined"/)

  const inertBindings = page.match(/:inert="drawerModalActive \|\| undefined"/g) ?? []
  assert.ok(inertBindings.length >= 4, 'topbar, toolbar, outline, and content must leave the tab order')
  assert.match(page, /const evidenceModeQuery = window\.matchMedia\('\(min-width: 768px\) and \(max-width: 1179px\)'\)/)

  const mounted = block(page, 'onMounted(async () =>')
  const unmounted = block(page, 'onUnmounted(() =>')
  assert.match(mounted, /window\.addEventListener\('keydown', handleEvidenceKeydown\)/)
  assert.match(unmounted, /window\.removeEventListener\('keydown', handleEvidenceKeydown\)/)

  const keyboard = block(page, 'function handleEvidenceKeydown(event: KeyboardEvent)')
  assert.match(keyboard, /if \(!drawerModalActive\.value\) return/)
  assert.match(keyboard, /event\.key === 'Escape'/)
  assert.match(keyboard, /closeEvidencePanel\(\)/)
  assert.match(keyboard, /event\.key !== 'Tab'/)
  assert.match(keyboard, /querySelectorAll<HTMLElement>/)
  assert.match(keyboard, /event\.shiftKey/)
  assert.match(keyboard, /last\.focus\(\)/)
  assert.match(keyboard, /first\.focus\(\)/)
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
  assert.match(drawer, /top:\s*0;/)
  assert.match(drawer, /right:\s*0;/)
  assert.match(drawer, /bottom:\s*0;/)
  assert.match(drawer, /width:\s*min\(340px, calc\(100vw - 80px\)\);/)
  assert.match(drawer, /height:\s*100dvh;/)
  assert.match(drawer, /transform:\s*translateX\(105%\);/)
  assert.match(drawer, /visibility:\s*hidden;/)
  assert.match(drawer, /pointer-events:\s*none;/)

  const openDrawer = block(narrow, '.editor-evidence-shell.is-open')
  assert.match(openDrawer, /transform:\s*translateX\(0\);/)
  assert.match(openDrawer, /visibility:\s*visible;/)
  assert.match(openDrawer, /pointer-events:\s*auto;/)

  const backdropZ = Number(block(narrow, '.editor-evidence-backdrop').match(/z-index:\s*(\d+);/)?.[1])
  const drawerZ = Number(drawer.match(/z-index:\s*(\d+);/)?.[1])
  assert.ok(Number.isFinite(backdropZ) && Number.isFinite(drawerZ) && backdropZ < drawerZ)
})

test('final visual layer preserves narrow drawer motion alongside theme transitions', () => {
  const narrow = block(visualSystemCss, '@media (max-width: 1179px) and (min-width: 768px)')
  const drawer = block(narrow, '.editor-evidence-shell')
  const transition = drawer.match(/transition:\s*([^;]+);/)

  assert.ok(transition, 'narrow drawer must define its final transition in visual-system.css')
  assert.deepEqual(
    transition[1].split(',').map((item) => item.trim()),
    [
      'transform 220ms var(--ui-ease)',
      'visibility 0s linear 220ms',
      'background-color 260ms var(--ui-ease)',
      'border-color 260ms var(--ui-ease)',
      'color 220ms var(--ui-ease)',
      'box-shadow 260ms var(--ui-ease)',
    ],
  )
  assert.match(
    block(narrow, '.editor-evidence-shell.is-open'),
    /transition-delay:\s*0s;/,
  )
})

test('outline, paper viewport, evidence contents, and toolbar keep independent overflow', () => {
  assert.match(block(css, '.editor-outline'), /overflow-y:\s*auto;/)
  assert.match(block(css, '.editor-content'), /overflow:\s*auto;/)
  assert.match(block(css, '.editor-evidence-shell > .editor-ai-panel'), /overflow:\s*hidden;/)
  assert.match(aiPanel, /class="ai-panel-prelude"/)
  assert.match(aiPanel, /class="ai-chat-scroll"/)
  assert.match(aiPanel, /class="panel-tab-scroll"/)
  assert.match(block(pageDocCss, '.ai-panel-prelude'), /overflow-y:\s*auto;/)
  assert.match(block(pageDocCss, '.ai-chat-scroll'), /overflow-y:\s*auto;/)
  assert.match(block(pageDocCss, '.panel-tab-scroll'), /overflow-y:\s*auto;/)
  const toolbar = block(css, '.editor-toolbar')
  assert.match(toolbar, /flex-wrap:\s*nowrap;/)
  assert.match(toolbar, /overflow-x:\s*auto;/)
  assert.doesNotMatch(toolbar, /transition:[^;]*(?:width|grid-template)/)
})

test('editor-scoped paper rules outrank ContentPanel scoped defaults at each desktop range', () => {
  const baselinePaper = block(contentPanel, '.word-page')
  assert.match(baselinePaper, /background:\s*#fff;/)
  assert.match(baselinePaper, /padding:\s*60px 80px;/)
  assert.match(block(contentPanel, '.word-body :deep(h1)'), /color:\s*#111;/)
  assert.match(block(contentPanel, '.word-body :deep(h2)'), /color:\s*#222;/)
  assert.match(block(contentPanel, '.word-body :deep(p)'), /color:\s*#1a1a1a;/)

  const scopedClassWeight = 2 // component class plus Vue's generated data-v attribute
  assert.ok(classSpecificity('.editor-shell .content-panel .word-page') > scopedClassWeight)
  assert.ok(classSpecificity('.editor-shell .content-panel .word-body p') > scopedClassWeight)

  const paper = block(css, '.editor-shell .content-panel .word-page')
  assert.match(paper, /background:\s*var\(--ui-paper\);/)
  assert.match(paper, /color:\s*var\(--ui-paper-ink\);/)
  assert.match(paper, /padding:\s*52px 62px 68px;/)

  assert.match(block(css, '.editor-shell .content-panel .word-body'), /color:\s*var\(--ui-paper-ink\);/)
  assert.match(
    block(css, '.editor-shell .content-panel .word-body h1,\n.editor-shell .content-panel .word-body h2,\n.editor-shell .content-panel .word-body h3'),
    /color:\s*var\(--ui-paper-ink\);/,
  )
  assert.match(block(css, '.editor-shell .content-panel .word-body p'), /color:\s*var\(--ui-paper-ink\);/)

  const narrow = block(css, '@media (max-width: 1179px) and (min-width: 768px)')
  const narrowPaper = block(narrow, '.editor-shell .content-panel .word-page')
  assert.match(narrowPaper, /padding-right:\s*46px;/)
  assert.match(narrowPaper, /padding-left:\s*46px;/)
})
