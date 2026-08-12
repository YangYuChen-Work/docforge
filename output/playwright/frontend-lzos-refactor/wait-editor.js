async (page) => {
  await page.waitForSelector('.editor-evidence-toggle', { state: 'visible' })
  return { ready: true }
}
