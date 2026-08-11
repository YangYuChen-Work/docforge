import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const componentPath = new URL('../src/components/AppSidebar.vue', import.meta.url)
const stylePath = new URL('../src/styles/visual-system.css', import.meta.url)
const emblemPath = new URL('../src/assets/xcmg-emblem.png', import.meta.url)

test('侧栏品牌只显示徐工重型并移除旧品牌文案', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /aria-label="徐工重型"/)
  assert.match(source, />徐工重型</)
  assert.doesNotMatch(source, />DOCFORGE</)
  assert.doesNotMatch(source, />项目文档工作台</)
  assert.doesNotMatch(source, /brand-mark/)
})

test('侧栏不再渲染运行环境卡片或请求其状态', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.doesNotMatch(source, /sidebar-provider/)
  assert.doesNotMatch(source, /providerLabel|providerDetail|aiProvider/)
  assert.doesNotMatch(source, /axios\.get\(['"]\/health['"]\)/)
})

test('徐工重型使用楷书字体栈', async () => {
  const source = await readFile(stylePath, 'utf8')

  assert.match(source, /STKaiti[^;]*KaiTi[^;]*BiauKai[^;]*serif/)
})

test('侧栏品牌包含透明工业图标资源并保留 DOM 中文字', async () => {
  const source = await readFile(componentPath, 'utf8')
  const emblem = await readFile(emblemPath)
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  assert.match(source, /class="brand-emblem"/)
  assert.match(source, /brandEmblemUrl/)
  assert.match(source, /xcmg-emblem\.png/)
  assert.match(source, />徐工重型</)
  assert.deepEqual(emblem.subarray(0, 8), pngSignature)
  await stat(emblemPath)
})

test('品牌图标与文案在侧栏收起时保持可识别', async () => {
  const source = await readFile(stylePath, 'utf8')

  assert.match(source, /\.brand-emblem\s*\{[\s\S]*?width:/)
  assert.match(source, /\.sidebar\.collapsed \.brand-name\s*\{[\s\S]*?display:\s*none/)
  assert.match(source, /\.sidebar\.collapsed \.brand-emblem/)
  assert.match(source, /\.sidebar\.collapsed \.sidebar-header h1\.brand-lockup\s*\{[\s\S]*?display:\s*flex/)
})

test('品牌图标尺寸略微放大且收起态保持紧凑', async () => {
  const source = await readFile(stylePath, 'utf8')

  assert.match(source, /\.brand-emblem\s*\{[\s\S]*?width:\s*36px/)
  assert.match(source, /\.sidebar\.collapsed \.brand-emblem\s*\{[\s\S]*?width:\s*32px/)
})
