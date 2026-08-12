import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const page = readFileSync(resolve(root, 'src/pages/DocList.vue'), 'utf8')
const css = readFileSync(resolve(root, 'src/styles/visual-system.css'), 'utf8')
const legacyCss = readFileSync(resolve(root, 'src/styles/modern-shell.css'), 'utf8')
const main = readFileSync(resolve(root, 'src/main.ts'), 'utf8')

function extractCssBlock(source, prelude) {
  const blockStart = source.indexOf(`${prelude} {`)
  assert.notEqual(blockStart, -1, `missing CSS block: ${prelude}`)

  const openingBrace = source.indexOf('{', blockStart)
  let depth = 0

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(openingBrace + 1, index)
  }

  assert.fail(`unterminated CSS block: ${prelude}`)
}

function declarations(source, selector) {
  return Object.fromEntries(
    extractCssBlock(source, selector)
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const colon = entry.indexOf(':')
        return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()]
      }),
  )
}

function specificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length
  const classLike = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length
  const elements = (selector.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+|[>+~*]/g, ' ').match(/\b[a-z][\w-]*\b/gi) ?? []).length
  return [ids, classLike, elements]
}

function compareSpecificity(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

function themeTokens(source, selector) {
  const entries = extractCssBlock(source, selector).matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6});/gi)
  return Object.fromEntries([...entries].map((match) => [match[1], match[2]]))
}

function resolveToken(value, tokens) {
  const token = value.match(/^var\((--[\w-]+)\)$/)?.[1]
  assert.ok(token, `expected semantic color token, received ${value}`)
  assert.ok(tokens[token], `missing ${token}`)
  return tokens[token]
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    const [red, green, blue] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
  }
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

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

test('primary document metric wins the loaded cascade and stays readable in both themes', () => {
  assert.ok(
    main.indexOf("./styles/modern-shell.css") < main.indexOf("./styles/visual-system.css"),
    'the cascade simulation must follow the application stylesheet order',
  )

  const legacySelector = '.doc-stat-card:first-child'
  const surfaceSelector = '.doc-stats > .doc-stat-card:first-child'
  const strongSelector = '.doc-stats > .doc-stat-card.doc-stat-primary:first-child strong'
  const descriptionSelector = '.doc-stats > .doc-stat-card.doc-stat-primary:first-child p'
  const kickerSelector = '.doc-stats > .doc-stat-card.doc-stat-primary:first-child .summary-kicker'
  const legacy = declarations(legacyCss, legacySelector)
  const surface = declarations(css, surfaceSelector)

  assert.equal(legacy.background, 'var(--ui-ink)')
  assert.ok(
    compareSpecificity(specificity(surfaceSelector), specificity(legacySelector)) >= 0,
    'the later visual-system surface rule must match or outrank the legacy first-card rule',
  )
  assert.equal(surface.background, 'var(--ui-surface)')

  const textRules = [
    ['strong', declarations(css, strongSelector), '--ui-ink'],
    ['description', declarations(css, descriptionSelector), '--ui-ink-soft'],
    ['kicker', declarations(css, kickerSelector), '--ui-ink-soft'],
  ]
  const themes = [themeTokens(css, ':root'), themeTokens(css, '[data-theme="dark"]')]

  for (const [label, rule, expectedToken] of textRules) {
    assert.equal(rule.color, `var(${expectedToken})`, `${label} must use its semantic ink token`)
    assert.ok(
      compareSpecificity(specificity(label === 'strong' ? strongSelector : label === 'description' ? descriptionSelector : kickerSelector), specificity('.doc-stat-card:first-child .doc-stat-label')) >= 0,
      `${label} rule must outrank the legacy first-card text rule`,
    )
    for (const tokens of themes) {
      assert.ok(
        contrastRatio(resolveToken(rule.color, tokens), resolveToken(surface.background, tokens)) >= 4.5,
        `${label} must reach 4.5:1 against the shared metric surface`,
      )
    }
  }
})

test('shared controls use the compact desktop rhythm', () => {
  assert.match(css, /\.btn\s*\{[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-search[\s\S]*min-height:\s*36px;/)
  assert.match(css, /\.doc-table tbody td\s*\{[\s\S]*height:\s*42px;/)
})

test('document work surface keeps its layout, scroll, and action contracts', () => {
  assert.match(css, /\.doc-main-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(248px,\s*300px\);/)
  assert.match(css, /\.doc-table-scroll\s*\{[\s\S]*scrollbar-gutter:\s*stable;/)
  assert.match(css, /\.doc-table-scroll:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--ui-primary\);/)
  assert.match(css, /\.doc-table-scroll \.doc-actions-header,\s*\.doc-table-scroll \.doc-actions-cell\s*\{[\s\S]*position:\s*sticky;[\s\S]*right:\s*0;/)
})

test('compact desktop document list gives the table a full row and keeps side cards in two columns', () => {
  const compactDesktop = extractCssBlock(
    css,
    '@media (min-width: 768px) and (max-width: 1279px)',
  )

  assert.match(
    compactDesktop,
    /\.doc-main-layout\s*\{[^{}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
  )
  assert.match(
    compactDesktop,
    /\.doc-side-panel\s*\{[^{}]*display:\s*grid;[^{}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  )
})

test('document metric labels remain muted supporting text', () => {
  assert.match(css, /\.doc-stat-metric span\s*\{[^}]*color:\s*var\(--ui-ink-faint\);[^}]*font-size:\s*11px;/)
})

test('document rows keep compact title and metadata rhythm within 42px', () => {
  assert.match(css, /\.doc-name\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.2;/)
  assert.match(css, /\.doc-meta\s*\{[^}]*font-size:\s*11px;[^}]*line-height:\s*1\.2;/)
  assert.match(css, /\.doc-table tbody td\s*\{[^}]*padding:\s*4px 8px;/)
})

test('document delete controls use the 36px shared control height', () => {
  assert.match(css, /\.doc-bulk-delete-btn,\s*\.doc-delete-btn\s*\{[\s\S]*min-height:\s*36px;/)
})

test('document action cells fit 36px delete controls within 42px rows', () => {
  const rowHeight = css.match(/\.doc-table tbody td\s*\{[^}]*height:\s*(\d+)px;/)
  const actionCellPadding = css.match(/\.doc-table tbody \.doc-actions-cell\s*\{[^}]*padding:\s*(\d+)px\s+8px;/)
  const deleteControlHeight = css.match(/\.doc-bulk-delete-btn,\s*\.doc-delete-btn\s*\{[^}]*min-height:\s*(\d+)px;/)

  assert.ok(rowHeight, 'document rows define a pixel height')
  assert.ok(actionCellPadding, 'action cells define their own vertical padding')
  assert.ok(deleteControlHeight, 'delete controls define a minimum height')
  assert.ok(
    Number(deleteControlHeight[1]) + Number(actionCellPadding[1]) * 2 <= Number(rowHeight[1]),
    'delete control and action-cell padding fit within the data-row height',
  )
})
