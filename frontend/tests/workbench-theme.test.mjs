import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')
const sidebar = readFileSync(resolve(root, 'src/components/AppSidebar.vue'), 'utf8')

function tokenValue(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))
  assert.ok(match, `expected ${name} to define a hex color`)
  return match[1]
}

function contrastRatio(foreground, background) {
  const relativeLuminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    const [red, green, blue] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
  }

  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

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

test('uses dedicated high-contrast navigation tokens in both themes', () => {
  const lightTokens = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const darkTokens = css.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)?.[1] ?? ''

  for (const tokens of [lightTokens, darkTokens]) {
    assert.ok(contrastRatio(tokenValue(tokens, '--ui-nav-foreground'), tokenValue(tokens, '--ui-nav')) >= 4.5)
    assert.ok(contrastRatio(tokenValue(tokens, '--ui-nav-muted'), tokenValue(tokens, '--ui-nav')) >= 4.5)
    assert.ok(contrastRatio(tokenValue(tokens, '--ui-nav-active-foreground'), tokenValue(tokens, '--ui-nav-active')) >= 4.5)
    assert.ok(contrastRatio(tokenValue(tokens, '--ui-nav-focus'), tokenValue(tokens, '--ui-nav')) >= 3)
  }

  assert.match(css, /\.sidebar-header h1\s*\{[\s\S]*color:\s*var\(--ui-nav-foreground\)/)
  assert.match(css, /\.brand-name\s*\{[\s\S]*color:\s*var\(--ui-nav-foreground\)/)
  assert.match(css, /\.nav-item\s*\{[\s\S]*color:\s*var\(--ui-nav-foreground\)/)
  assert.match(css, /\.nav-item\.sub\s*\{[\s\S]*color:\s*var\(--ui-nav-muted\)/)
  assert.match(css, /\.nav-item\.active\s*\{[\s\S]*background:\s*var\(--ui-nav-active\);[\s\S]*color:\s*var\(--ui-nav-active-foreground\)/)
  assert.match(css, /\.theme-toggle\s*\{[\s\S]*color:\s*var\(--ui-nav-foreground\)/)
  assert.match(css, /\.sidebar \.nav-item:focus-visible,[\s\S]*outline-color:\s*var\(--ui-nav-focus\)/)
})

test('preserves the 208px expanded and 60px collapsed sidebar geometry', () => {
  assert.match(css, /:root\s*\{[\s\S]*--ui-nav-width:\s*208px;/)
  assert.match(css, /:root\s*\{[\s\S]*--ui-nav-collapsed:\s*60px;/)
  assert.match(css, /\.sidebar-shell\s*\{[\s\S]*width:\s*var\(--ui-nav-width\);[\s\S]*flex:\s*0 0 var\(--ui-nav-width\)/)
  assert.match(css, /\.sidebar-shell\.is-collapsed\s*\{[\s\S]*width:\s*var\(--ui-nav-collapsed\);[\s\S]*flex-basis:\s*var\(--ui-nav-collapsed\)/)
  assert.match(css, /\.sidebar\.collapsed\s*\{[\s\S]*width:\s*var\(--ui-nav-collapsed\)/)
})

test('theme transitions do not animate layout dimensions', () => {
  const transitionBlock = css.match(/\.app,[\s\S]*?\{[\s\S]*?transition:[^}]+\}/)?.[0] ?? ''
  assert.doesNotMatch(transitionBlock, /\bwidth\b|\bheight\b|grid-template/)
})
