import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export type AnnotationRef = {
  id: string
  target_text?: string | null
  status?: string
}

export type CitationRef = {
  key: string
  source_excerpt?: string | null
  fileName?: string | null
  source_document_id?: string | null
  locator?: string | null
}

export type ReferenceDecorationOptions = {
  getAnnotations: () => AnnotationRef[]
  getCitations: () => CitationRef[]
  getActiveAnnotationId: () => string
  getActiveCitationKey: () => string
  onAnnotationClick: (id: string) => void
  onCitationClick: (key: string) => void
}

export const referenceDecorationsKey = new PluginKey('referenceDecorations')
export const REFERENCE_DECORATIONS_REFRESH = 'referenceDecorationsRefresh'

type TextRange = { from: number; to: number }
type NodeRange = { from: number; to: number }
type CaptionRange = NodeRange | null
type TableValue = {
  raw: string
  normalized: string
  isMeaningful: boolean
  isNumeric: boolean
}
type TableMetadata = {
  range: NodeRange
  markerPosition: number
  captionRange: CaptionRange
  cellValues: TableValue[]
  normalizedCellValues: string[]
}

const STRUCTURED_TABLE_FIELDS = new Set(['caption', 'headers', 'rows'])

function normalizeWithMap(value: string) {
  const chars: string[] = []
  const map: number[] = []
  let previousWhitespace = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const whitespace = /\s/.test(char)
    if (whitespace) {
      if (previousWhitespace) continue
      chars.push(' ')
      map.push(index)
      previousWhitespace = true
      continue
    }
    chars.push(char)
    map.push(index)
    previousWhitespace = false
  }

  return { text: chars.join(''), map }
}

function normalizeTableValue(value: string) {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, '')
  const isMeaningful = normalized.length > 1
  return {
    raw: value,
    normalized,
    isMeaningful,
    isNumeric: isMeaningful && /^\d+$/.test(normalized),
  }
}

function isTableCaption(text: string) {
  const normalized = text.trim().toLowerCase()
  return normalized.startsWith('表') || normalized.startsWith('table')
}

function collectTableMetadata(doc: any): TableMetadata[] {
  const tables: TableMetadata[] = []

  doc.descendants((node: any, pos: number, parent: any, index: number) => {
    if (node.type?.name !== 'table') return

    const range = { from: pos, to: pos + node.nodeSize }
    let markerPosition = range.to
    let captionRange: CaptionRange = null

    if (parent && typeof index === 'number' && index > 0) {
      const previousSibling = parent.child(index - 1)
      const previousPos = pos - previousSibling.nodeSize
      const previousRange = { from: previousPos, to: previousPos + previousSibling.nodeSize }
      if (previousSibling.type?.name === 'paragraph' && isTableCaption(previousSibling.textContent || '')) {
        markerPosition = previousRange.to
        captionRange = previousRange
      }
    }

    const cellValues: TableValue[] = []
    node.descendants((child: any) => {
      if (child.type?.name === 'tableCell' || child.type?.name === 'tableHeader') {
        cellValues.push(normalizeTableValue(child.textContent || ''))
      }
    })

    tables.push({
      range,
      markerPosition,
      captionRange,
      cellValues,
      normalizedCellValues: cellValues
        .filter((value) => value.isMeaningful)
        .map((value) => value.normalized),
    })
  })

  return tables
}

function collectStructuredSourceScalars(
  value: unknown,
  values: string[],
  withinStructuredField = false,
) {
  if (value == null) return
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (withinStructuredField) values.push(String(value))
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredSourceScalars(item, values, withinStructuredField)
    return
  }
  if (typeof value !== 'object') return

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    collectStructuredSourceScalars(child, values, withinStructuredField || STRUCTURED_TABLE_FIELDS.has(key))
  }
}

function getStructuredSourceValues(sourceExcerpt: string | null | undefined) {
  if (!sourceExcerpt) return []

  try {
    const parsed = JSON.parse(sourceExcerpt)
    const values: string[] = []
    collectStructuredSourceScalars(parsed, values)
    return Array.from(
      new Map(
        values
          .map((value) => normalizeTableValue(value))
          .filter((value) => value.isMeaningful)
          .map((value) => [value.normalized, value] as const),
      ).values(),
    )
  } catch {
    return []
  }
}

function findStructuredTableMatch(doc: any, citation: CitationRef): TableMetadata | null {
  const sourceValues = getStructuredSourceValues(citation.source_excerpt)
  if (sourceValues.length === 0) return null

  const tables = collectTableMetadata(doc)
  if (tables.length === 0) return null

  let bestMatch: { table: TableMetadata; score: number } | null = null
  let hasTie = false

  for (const table of tables) {
    const matchedValues = new Set<string>()
    let hasLongNonNumericMatch = false

    for (const sourceValue of sourceValues) {
      const matched = table.normalizedCellValues.some((cellValue) => cellValue.includes(sourceValue.normalized))
      if (!matched) continue
      matchedValues.add(sourceValue.normalized)
      if (!sourceValue.isNumeric && sourceValue.normalized.length >= 8) {
        hasLongNonNumericMatch = true
      }
    }

    const score = matchedValues.size
    if (score < 2 && !hasLongNonNumericMatch) continue

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { table, score }
      hasTie = false
      continue
    }

    if (score === bestMatch.score) {
      hasTie = true
    }
  }

  if (!bestMatch || hasTie) return null
  return bestMatch.table
}

function findTextRange(doc: any, query: string): TextRange | null {
  const needle = query.trim()
  if (!needle) return null

  const textNodes: Array<{ text: string; from: number }> = []
  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) textNodes.push({ text: node.text, from: pos + 1 })
  })

  if (textNodes.length === 0) return null

  const absolutePositions: number[] = []
  let combinedText = ''
  for (const node of textNodes) {
    for (let index = 0; index < node.text.length; index += 1) {
      combinedText += node.text[index]
      absolutePositions.push(node.from + index)
    }
  }

  const exactIndex = combinedText.indexOf(needle)
  if (exactIndex >= 0) {
    const endIndex = exactIndex + needle.length - 1
    return {
      from: absolutePositions[exactIndex],
      to: absolutePositions[endIndex] + 1,
    }
  }

  const normalizedNeedle = normalizeWithMap(needle).text.trim()
  if (!normalizedNeedle) return null
  const normalizedText = normalizeWithMap(combinedText)
  const normalizedIndex = normalizedText.text.indexOf(normalizedNeedle)
  if (normalizedIndex < 0) return null

  const startOffset = normalizedText.map[normalizedIndex]
  const endOffsetIndex = normalizedIndex + normalizedNeedle.length - 1
  const endOffset = normalizedText.map[endOffsetIndex]
  if (startOffset === undefined || endOffset === undefined) return null
  return {
    from: absolutePositions[startOffset],
    to: absolutePositions[endOffset] + 1,
  }
}

export function findReferenceRange(editor: any, text: string): TextRange | null {
  return editor?.state?.doc ? findTextRange(editor.state.doc, text) : null
}

export function findCitationRange(editor: any, citation: CitationRef): TextRange | null {
  const doc = editor?.state?.doc
  if (!doc) return null

  const tableMatch = findStructuredTableMatch(doc, citation)
  if (tableMatch) return tableMatch.range

  return findTextRange(doc, citation.source_excerpt || '')
}

function markerDecoration(
  position: number,
  className: string,
  label: string,
  onClick: () => void,
) {
  return Decoration.widget(
    position,
    () => {
      const marker = document.createElement('button')
      marker.type = 'button'
      marker.className = className
      marker.textContent = label
      marker.title = label
      marker.setAttribute('aria-label', label)
      marker.addEventListener('mousedown', (event) => event.preventDefault())
      marker.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      })
      return marker
    },
    { side: 1, key: `${className}:${position}:${label}` },
  )
}

function buildDecorations(state: any, options: ReferenceDecorationOptions) {
  const decorations: any[] = []
  const annotations = options.getAnnotations() || []
  const citations = options.getCitations() || []
  let annotationNumber = 0

  for (const annotation of annotations) {
    const range = findTextRange(state.doc, annotation.target_text || '')
    if (!range) continue
    annotationNumber += 1
    const active = annotation.id === options.getActiveAnnotationId()
    decorations.push(
      Decoration.inline(range.from, range.to, {
        class: active ? 'annotation-highlight active' : 'annotation-highlight',
      }),
    )
    decorations.push(
      markerDecoration(
        range.to,
        active ? 'annotation-marker active' : 'annotation-marker',
        `批注 ${annotationNumber}`,
        () => options.onAnnotationClick(annotation.id),
      ),
    )
  }

  for (const citation of citations) {
    const range = findTextRange(state.doc, citation.source_excerpt || '')
    if (!range) continue
    const active = citation.key === options.getActiveCitationKey()
    const fileName = citation.fileName || `来源资料 ${citation.source_document_id || citation.key}`
    const label = `来源：${fileName}`
    decorations.push(
      Decoration.inline(range.from, range.to, {
        class: active ? 'source-highlight active' : 'source-highlight',
      }),
    )
    decorations.push(
      markerDecoration(
        range.to,
        active ? 'source-marker active' : 'source-marker',
        label,
        () => options.onCitationClick(citation.key),
      ),
    )
  }

  return DecorationSet.create(state.doc, decorations)
}

export function createReferenceDecorations(options: ReferenceDecorationOptions) {
  return Extension.create({
    name: 'referenceDecorations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: referenceDecorationsKey,
          state: {
            init: (_config, state) => buildDecorations(state, options),
            apply: (transaction, oldDecorations) => {
              if (transaction.docChanged || transaction.getMeta(REFERENCE_DECORATIONS_REFRESH)) {
                return buildDecorations(transaction, options)
              }
              return oldDecorations.map(transaction.mapping, transaction.doc)
            },
          },
          props: {
            decorations: (state) => referenceDecorationsKey.getState(state),
          },
        }),
      ]
    },
  })
}
