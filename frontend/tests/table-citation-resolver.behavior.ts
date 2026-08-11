import assert from 'node:assert/strict'
import test from 'node:test'
import { Schema, type Node as ProseMirrorNode } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'

import {
  createReferenceDecorations,
  findCitationRange,
  referenceDecorationsKey,
  type CitationRef,
} from '../src/editor/ReferenceDecorations.ts'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    table: { content: 'tableRow+', group: 'block', tableRole: 'table' },
    tableRow: { content: '(tableCell | tableHeader)+', tableRole: 'row' },
    tableCell: { content: 'block+', tableRole: 'cell' },
    tableHeader: { content: 'block+', tableRole: 'header_cell' },
  },
})

function paragraph(text: string) {
  return schema.node('paragraph', null, text ? schema.text(text) : undefined)
}

function cell(...content: ProseMirrorNode[]) {
  return schema.node('tableCell', null, content)
}

function header(text: string) {
  return schema.node('tableHeader', null, paragraph(text))
}

function row(...cells: ProseMirrorNode[]) {
  return schema.node('tableRow', null, cells)
}

function table(...rows: ProseMirrorNode[]) {
  return schema.node('table', null, rows)
}

function textCell(text: string) {
  return cell(paragraph(text))
}

function editor(doc: ProseMirrorNode) {
  return { state: { doc } }
}

function citation(sourceExcerpt: unknown): CitationRef {
  return {
    key: 'citation-1',
    source_document_id: 'source-1',
    source_excerpt: typeof sourceExcerpt === 'string' ? sourceExcerpt : JSON.stringify(sourceExcerpt),
  }
}

function tableRanges(doc: ProseMirrorNode) {
  const ranges: Array<{ from: number; to: number }> = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') ranges.push({ from: pos, to: pos + node.nodeSize })
  })
  return ranges
}

test('selects the uniquely matching table in a multi-table document', () => {
  const first = table(
    row(header('项目'), header('参数')),
    row(textCell('起升系统'), textCell('180 kW')),
  )
  const second = table(
    row(header('风险类别'), header('应对措施')),
    row(textCell('供应链中断风险'), textCell('建立双供应商保障机制')),
  )
  const doc = schema.node('doc', null, [paragraph('风险评估'), first, second])

  const range = findCitationRange(editor(doc), citation({
    caption: '表4 风险与应对措施',
    headers: ['风险类别', '应对措施'],
    rows: [['供应链中断风险', '建立双供应商保障机制']],
  }))

  assert.deepEqual(range, tableRanges(doc)[1])
})

test('rejects matches supported only by generic structural headers', () => {
  const doc = schema.node('doc', null, table(
    row(header('序号'), header('备注')),
    row(textCell('1'), textCell('制造工序说明')),
  ))

  const range = findCitationRange(editor(doc), citation({
    caption: '表2 技术风险',
    headers: ['序号', '备注'],
    rows: [['2', '关键技术验证计划']],
  }))

  assert.equal(range, null)
})

test('rejects a shared date plus a generic header without discriminative content', () => {
  const doc = schema.node('doc', null, table(
    row(header('序号'), header('销售节点')),
    row(textCell('1'), textCell('2027-11')),
  ))

  const range = findCitationRange(editor(doc), citation({
    caption: '表4 营销风险',
    headers: ['序号', '风险时间'],
    rows: [['7', '2027-11']],
  }))

  assert.equal(range, null)
})

test('preserves decimal and unit punctuation to prevent numeric substring collisions', () => {
  const doc = schema.node('doc', null, table(
    row(header('序号'), header('功率')),
    row(textCell('1'), textCell('257 kW')),
  ))

  const range = findCitationRange(editor(doc), citation({
    caption: '表2 产品质量目标',
    headers: ['序号', '波动率'],
    rows: [['2', '2.5%']],
  }))

  assert.equal(range, null)
})

test('matches numeric and short values only by exact normalized equality', () => {
  const doc = schema.node('doc', null, table(
    row(header('部件编码'), header('目标值')),
    row(textCell('AB-123'), textCell('12.50 MPa')),
  ))

  assert.equal(findCitationRange(editor(doc), citation({
    rows: [['AB', '2.50 MPa']],
  })), null)
})

test('does not use a table-number-only caption as provenance evidence', () => {
  const doc = schema.node('doc', null, table(
    row(header('表2'), header('序号')),
    row(textCell('参数'), textCell('1')),
  ))

  const range = findCitationRange(editor(doc), citation({
    caption: '表2',
    headers: ['序号'],
    rows: [['9']],
  }))

  assert.equal(range, null)
})

test('returns no structured match when the best candidates tie', () => {
  const sharedRows = [
    row(header('风险类别'), header('应对措施')),
    row(textCell('液压泄漏风险'), textCell('增加密封验证')),
  ]
  const doc = schema.node('doc', null, [table(...sharedRows), paragraph('间隔'), table(...sharedRows)])

  const range = findCitationRange(editor(doc), citation({
    headers: ['风险类别', '应对措施'],
    rows: [['液压泄漏风险', '增加密封验证']],
  }))

  assert.equal(range, null)
})

test('resolves a nested table without attributing its cells to the parent table', () => {
  const nested = table(
    row(header('子系统风险'), header('控制措施')),
    row(textCell('回转制动失效风险'), textCell('增加冗余制动回路')),
  )
  const outer = table(
    row(header('总成'), header('分析内容')),
    row(textCell('上车总成'), cell(paragraph('外层总体说明'), nested)),
  )
  const doc = schema.node('doc', null, outer)

  const range = findCitationRange(editor(doc), citation({
    headers: ['子系统风险', '控制措施'],
    rows: [['回转制动失效风险', '增加冗余制动回路']],
  }))

  assert.deepEqual(range, tableRanges(doc)[1])
})

test('returns valid node ranges for tables at document position zero and at the end', () => {
  const leadingTable = table(row(textCell('唯一且足够长的定位内容')))
  const leadingDoc = schema.node('doc', null, leadingTable)
  const leadingRange = findCitationRange(editor(leadingDoc), citation({
    rows: [['唯一且足够长的定位内容']],
  }))

  assert.deepEqual(leadingRange, { from: 0, to: leadingTable.nodeSize })
  assert.equal(leadingDoc.nodeAt(leadingRange!.from)?.type.name, 'table')

  const trailingTable = table(row(textCell('另一个足够长的定位内容')))
  const trailingDoc = schema.node('doc', null, [paragraph('前言'), trailingTable])
  const trailingRange = findCitationRange(editor(trailingDoc), citation({
    rows: [['另一个足够长的定位内容']],
  }))

  assert.deepEqual(trailingRange, {
    from: paragraph('前言').nodeSize,
    to: trailingDoc.content.size,
  })
  assert.equal(trailingDoc.nodeAt(trailingRange!.from)?.type.name, 'table')
})

test('retains plain-text fallback when structured matching does not apply', () => {
  const doc = schema.node('doc', null, paragraph('正文中的普通引用片段'))

  assert.notEqual(findCitationRange(editor(doc), citation('普通引用片段')), null)
})

test('deduplicates table markers per source while preserving active card linkage', () => {
  const doc = schema.node('doc', null, table(
    row(header('风险类别'), header('应对措施')),
    row(textCell('供应链中断风险'), textCell('建立双供应商保障机制')),
  ))
  const excerpt = JSON.stringify({
    headers: ['风险类别', '应对措施'],
    rows: [['供应链中断风险', '建立双供应商保障机制']],
  })
  const citations: CitationRef[] = [
    { key: 'source-a-first', source_document_id: 'source-a', fileName: '来源甲.docx', source_excerpt: excerpt },
    { key: 'source-a-active', source_document_id: 'source-a', fileName: '来源甲.docx', source_excerpt: excerpt },
    { key: 'source-b', source_document_id: 'source-b', fileName: '来源乙.docx', source_excerpt: excerpt },
  ]
  const clickedCitationKeys: string[] = []
  const extension = createReferenceDecorations({
    getAnnotations: () => [],
    getCitations: () => citations,
    getActiveAnnotationId: () => '',
    getActiveCitationKey: () => 'source-a-active',
    onAnnotationClick: () => {},
    onCitationClick: (key) => clickedCitationKeys.push(key),
  })
  const plugins = extension.config.addProseMirrorPlugins!()
  const state = EditorState.create({ doc, plugins })
  const decorations = referenceDecorationsKey.getState(state).find()
  const tableHighlights = decorations.filter((decoration: any) => decoration.from !== decoration.to)
  const markerWidgets = decorations.filter((decoration: any) => decoration.from === decoration.to)

  assert.equal(tableHighlights.length, 1)
  assert.equal(tableHighlights[0].type.attrs.class, 'source-table-highlight active')
  assert.equal(markerWidgets.length, 2)

  const sourceAMarker = markerWidgets.find((decoration: any) =>
    decoration.type.spec.key.includes('来源：来源甲.docx'))
  assert.match(sourceAMarker.type.spec.key, /source-table-marker active/)

  const listeners = new Map<string, (event: any) => void>()
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: () => ({
      className: '',
      textContent: '',
      title: '',
      type: '',
      setAttribute: () => {},
      addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
    }),
  } as any
  try {
    sourceAMarker.type.toDOM()
    listeners.get('click')!({ preventDefault() {}, stopPropagation() {} })
  } finally {
    globalThis.document = previousDocument
  }

  assert.deepEqual(clickedCitationKeys, ['source-a-first'])
})
