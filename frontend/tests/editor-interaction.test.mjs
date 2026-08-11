import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

test('editor interaction stylesheet keeps the nested grid shrinkable', () => {
  const css = read('src/styles/editor-interaction.css')
  assert.match(css, /\.editor-body\s*\{[\s\S]*?height:\s*0;/)
  assert.match(css, /\.editor-body\s*\{[\s\S]*?min-height:\s*0;/)
  assert.match(css, /\.content-panel\s*\{[\s\S]*?display:\s*flex;/)
  assert.match(css, /\.editor-content\s*\{[\s\S]*?overflow:\s*auto;/)
  assert.match(css, /\.editor-content\s*\{[\s\S]*?scrollbar-gutter:\s*stable/)
})

test('content panel exposes a keyboard-accessible scroll region outside the action bar', () => {
  const template = read('src/components/ContentPanel.vue')
  assert.match(template, /class="chapter-actionbar"/)
  assert.match(template, /class="editor-content"[^>]*tabindex="0"/)
  assert.match(template, /role="region"/)
  assert.ok(template.indexOf('chapter-actionbar') < template.indexOf('editor-content'))
})

test('app wraps route views in a short out-in transition', () => {
  const template = read('src/App.vue')
  assert.match(template, /<Transition name="page" mode="out-in">/)
  assert.match(template, /<component :is="Component" :key="route\.path"/)
})

test('reduced motion disables editor interaction animation', () => {
  const css = read('src/styles/editor-interaction.css')
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/)
  assert.match(css, /scroll-behavior:\s*auto;/)
  assert.match(css, /animation:\s*none\s*!important;/)
})
