async (page) => {
  await page.goto('http://127.0.0.1:4174/#/doc/fbe1dc1b91784eb1bd7b319a11158a0a', { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 1024, height: 1000 })
  await page.waitForSelector('.editor-evidence-toggle', { state: 'visible' })
  return page.locator('.editor-evidence-shell').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      transition: style.transition,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
    }
  })
}
