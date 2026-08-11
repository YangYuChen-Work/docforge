const DEFAULT_WAIT_MS = {
  preparingDownload: 220,
  completed: 420,
}

function defaultWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildFailureMessage(error) {
  const validation = error?.raw?.response?.data?.detail?.validation_report
  const messages = validation
    ? [...(validation.errors || []), ...(validation.warnings || [])].join('\n')
    : error?.message || '未知错误'

  return messages || '导出前校验未通过'
}

export async function runExportProgressFlow({
  createExport,
  openDownload,
  onStateChange,
  wait = defaultWait,
  docId,
  format,
  includeComments,
  reducedMotion = false,
}) {
  const successWaitMs = reducedMotion
    ? { preparingDownload: 0, completed: 0 }
    : DEFAULT_WAIT_MS

  await onStateChange({ state: 'preparing', format, includeComments, error: '' })
  await onStateChange({ state: 'generating', format, includeComments, error: '' })

  try {
    const result = await createExport(docId, format, includeComments)
    if (result.error_message || result.status !== 'completed') {
      onStateChange({
        state: 'failed',
        format,
        includeComments,
        error: result.error_message || '导出未完成，请重试',
      })
      return { ok: false, result }
    }

    await onStateChange({ state: 'preparing-download', format, includeComments, error: '' })
    if (successWaitMs.preparingDownload > 0) {
      await wait(successWaitMs.preparingDownload)
    }

    await openDownload(result)
    await onStateChange({ state: 'completed', format, includeComments, error: '' })
    if (successWaitMs.completed > 0) {
      await wait(successWaitMs.completed)
    }

    await onStateChange({ state: 'idle', format: '', includeComments: false, error: '' })
    return { ok: true, result }
  } catch (error) {
    onStateChange({
      state: 'failed',
      format,
      includeComments,
      error: buildFailureMessage(error),
    })
    return { ok: false, error }
  }
}

export { buildFailureMessage }
