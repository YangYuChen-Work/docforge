import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { buildFailureMessage, runExportProgressFlow } from '../src/utils/exportProgressFlow.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const editorPage = readFileSync(join(testDir, '../src/pages/DocEditor.vue'), 'utf8')
const contentPanel = readFileSync(join(testDir, '../src/components/ContentPanel.vue'), 'utf8')
const pageDocStyles = readFileSync(join(testDir, '../src/styles/page-doc.css'), 'utf8')

function createHarness({ result, error, reducedMotion = false } = {}) {
  const states = []
  const waits = []
  const events = []

  return {
    states,
    waits,
    events,
    async run() {
      return runExportProgressFlow({
        docId: 'doc-1',
        format: 'docx',
        includeComments: true,
        reducedMotion,
        createExport: async () => {
          if (error) throw error
          return result ?? { export_id: 'exp-1', status: 'completed', error_message: '' }
        },
        openDownload: (payload) => {
          events.push(`download:${payload.export_id}`)
        },
        onStateChange: ({ state, error: nextError }) => {
          states.push(state)
          events.push(state === 'failed' ? `failed:${nextError}` : state)
        },
        wait: async (ms) => {
          waits.push(ms)
        },
      })
    },
  }
}

test('runs success flow as preparing -> generating -> preparing-download -> completed -> idle', async () => {
  const harness = createHarness()

  await harness.run()

  assert.deepEqual(harness.states, [
    'preparing',
    'generating',
    'preparing-download',
    'completed',
    'idle',
  ])
})

test('opens download only after a completed response and before completed state', async () => {
  const harness = createHarness({
    result: { export_id: 'exp-2', status: 'completed', error_message: '' },
  })

  await harness.run()

  assert.deepEqual(harness.events, [
    'preparing',
    'generating',
    'preparing-download',
    'download:exp-2',
    'completed',
    'idle',
  ])
})

test('treats error_message and non-completed statuses as failed without download', async () => {
  for (const result of [
    { export_id: 'exp-3', status: 'completed', error_message: 'bad export' },
    { export_id: 'exp-4', status: 'pending', error_message: '' },
  ]) {
    const harness = createHarness({ result })

    await harness.run()

    assert.equal(harness.states.at(-1), 'failed')
    assert.equal(harness.events.some((event) => event.startsWith('download:')), false)
  }
})

test('treats thrown validation and network errors as failed without download', async () => {
  const validationError = {
    message: 'Request failed',
    raw: {
      response: {
        data: {
          detail: {
            validation_report: {
              errors: ['缺少已确认章节'],
              warnings: ['仍有待补充项'],
            },
          },
        },
      },
    },
  }

  const validationHarness = createHarness({ error: validationError })
  await validationHarness.run()
  assert.equal(validationHarness.states.at(-1), 'failed')
  assert.equal(validationHarness.events.some((event) => event.startsWith('download:')), false)
  assert.match(validationHarness.events.at(-1), /缺少已确认章节/)
  assert.equal(buildFailureMessage(validationError), '缺少已确认章节\n仍有待补充项')

  const networkHarness = createHarness({ error: new Error('network down') })
  await networkHarness.run()
  assert.equal(networkHarness.states.at(-1), 'failed')
  assert.equal(networkHarness.events.some((event) => event.startsWith('download:')), false)
  assert.match(networkHarness.events.at(-1), /network down/)
})

test('skips nonessential success waits when reduced motion is supplied', async () => {
  const normalHarness = createHarness()
  await normalHarness.run()
  assert.deepEqual(normalHarness.waits, [220, 420])

  const reducedHarness = createHarness({ reducedMotion: true })
  await reducedHarness.run()
  assert.deepEqual(reducedHarness.waits, [])
})

test('wires export UI semantics and reduced-motion styling', () => {
  assert.match(editorPage, /role="status"/)
  assert.match(editorPage, /export-progress-overlay/)
  assert.match(contentPanel, /isExporting\?: boolean/)
  assert.match(contentPanel, /:disabled="isExporting"/)
  assert.match(pageDocStyles, /prefers-reduced-motion: reduce/)
  assert.match(pageDocStyles, /export-progress-indeterminate/)
})
