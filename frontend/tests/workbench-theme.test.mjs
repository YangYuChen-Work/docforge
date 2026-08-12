import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')
const sidebar = readFileSync(resolve(root, 'src/components/AppSidebar.vue'), 'utf8')

test('defines matched light and dark industrial workbench tokens', () => {
  assert.match(css, /:root\s*\{[\s\S]*--ui-canvas:\s*#eef3f6;/)
  assert.match(css, /:root\s*\{[\s\S]*--ui-nav:\s*#086783;/)
  assert.match(css, /:root\s*\{[\s\S]*--ui-paper:\s*#fffdf8;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-canvas:\s*#0d171d;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-nav:\s*#083f53;/)
  assert.match(css, /\[data-theme="dark"\]\s*\{[\s\S]*--ui-paper:/)
})

test('keeps the branded sidebar and exposes theme state accessibly', () => {
  assert.match(sidebar, /aria-label="徐工重型"/)
  assert.match(sidebar, /:aria-pressed="props\.theme === 'dark'"/)
  assert.match(css, /\.sidebar\s*\{[\s\S]*background:\s*var\(--ui-nav\)/)
  assert.match(css, /\.nav-item\.active\s*\{[\s\S]*background:/)
})

test('theme transitions do not animate layout dimensions', () => {
  const transitionBlock = css.match(/\.app,[\s\S]*?\{[\s\S]*?transition:[^}]+\}/)?.[0] ?? ''
  assert.doesNotMatch(transitionBlock, /\bwidth\b|\bheight\b|grid-template/)
})
