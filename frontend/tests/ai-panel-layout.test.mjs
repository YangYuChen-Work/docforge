import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDir = dirname(fileURLToPath(import.meta.url))
const component = readFileSync(join(testDir, '../src/components/AiPanel.vue'), 'utf8')
const styles = readFileSync(join(testDir, '../src/styles/page-doc.css'), 'utf8')

test('keeps the AI chat controls reachable when the annotation list grows', () => {
  assert.match(
    component,
    /<div class="ai-panel-prelude">[\s\S]*<div v-if="annotations\.length" class="ai-suggestions-section">[\s\S]*<div class="ai-quick-actions">[\s\S]*<\/div>\s*<\/div>\s*<div ref="chatScrollRef" class="ai-chat-scroll"[^>]*>/,
  )
  assert.match(
    styles,
    /\.ai-panel-prelude\s*\{[^}]*flex:\s*0 1 auto;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/,
  )
  assert.match(styles, /\.ai-chat-input\s*\{[^}]*flex-shrink:\s*0;/)
})
