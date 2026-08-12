import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  clampContentZoom,
  formatContentZoom,
  stepContentZoom,
} from '../src/editor/contentZoom.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8').replace(/\r\n/g, '\n')

test('clamps invalid and out-of-range zoom values to the supported preview range', () => {
  assert.equal(clampContentZoom(Number.NaN), 1)
  assert.equal(clampContentZoom(0.2), 0.5)
  assert.equal(clampContentZoom(2.4), 2)
  assert.equal(clampContentZoom(1.37), 1.37)
})

test('steps preview zoom by ten percentage points without crossing either limit', () => {
  assert.equal(stepContentZoom(1, -1), 0.9)
  assert.equal(stepContentZoom(1, 1), 1.1)
  assert.equal(stepContentZoom(0.5, -1), 0.5)
  assert.equal(stepContentZoom(2, 1), 2)
})

test('formats zoom as an accessible percentage label', () => {
  assert.equal(formatContentZoom(0.5), '50%')
  assert.equal(formatContentZoom(1), '100%')
  assert.equal(formatContentZoom(2), '200%')
})

test('content panel exposes zoom controls and scaled page layout hooks', () => {
  const template = read('src/components/ContentPanel.vue')
  const css = read('src/styles/editor-interaction.css')

  assert.match(template, /class="editor-zoom-controls"/)
  assert.match(template, /aria-label="缩小正文页面"/)
  assert.match(template, /aria-label="重置正文页面缩放"/)
  assert.match(template, /aria-label="放大正文页面"/)
  assert.match(template, /class="word-page-zoom-frame"/)
  assert.match(template, /transform: `scale\(\$\{contentZoom\}\)`/)
  assert.match(css, /\.word-page-zoom-frame\s*\{[\s\S]*?min-height:\s*0;/)
  assert.match(css, /transform-origin:\s*top center;/)
})
