import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../src/components/AppSidebar.vue', import.meta.url)
const stylePath = new URL('../src/styles/visual-system.css', import.meta.url)

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
