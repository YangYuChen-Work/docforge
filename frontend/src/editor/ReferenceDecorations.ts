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

  return { text: chars.join(' '), map }
}

function findTextRange(doc: any, query: string): TextRange | null {
  const needle = query.trim()
  if (!needle) return null

  let result: TextRange | null = null
  doc.descendants((node: any, pos: number) => {
    if (result || !node.isText || !node.text) return

    const exactIndex = node.text.indexOf(needle)
    if (exactIndex >= 0) {
      result = { from: pos + 1 + exactIndex, to: pos + 1 + exactIndex + needle.length }
      return
    }

    const normalizedNeedle = normalizeWithMap(needle).text.trim()
    if (!normalizedNeedle) return
    const normalizedNode = normalizeWithMap(node.text)
    const normalizedIndex = normalizedNode.text.indexOf(normalizedNeedle)
    if (normalizedIndex < 0) return

    const startOffset = normalizedNode.map[normalizedIndex]
    const endOffsetIndex = normalizedIndex + normalizedNeedle.length - 1
    const endOffset = normalizedNode.map[endOffsetIndex]
    if (startOffset === undefined || endOffset === undefined) return
    result = { from: pos + 1 + startOffset, to: pos + 1 + endOffset + 1 }
  })

  return result
}

export function findReferenceRange(editor: any, text: string): TextRange | null {
  return editor?.state?.doc ? findTextRange(editor.state.doc, text) : null
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
  let citationNumber = 0

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
    citationNumber += 1
    const active = citation.key === options.getActiveCitationKey()
    decorations.push(
      Decoration.inline(range.from, range.to, {
        class: active ? 'source-highlight active' : 'source-highlight',
      }),
    )
    decorations.push(
      markerDecoration(
        range.to,
        active ? 'source-marker active' : 'source-marker',
        `来源 ${citationNumber}`,
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
