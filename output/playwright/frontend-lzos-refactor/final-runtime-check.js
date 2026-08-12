async (page) => {
  const parseRgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
  const linear = (channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const contrast = (foreground, background) => {
    const [fr, fg, fb] = parseRgb(foreground)
    const [br, bg, bb] = parseRgb(background)
    const first = 0.2126 * linear(fr) + 0.7152 * linear(fg) + 0.0722 * linear(fb)
    const second = 0.2126 * linear(br) + 0.7152 * linear(bg) + 0.0722 * linear(bb)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  }
  const themes = ['light', 'dark']
  const result = { themes: {}, editorResize: null, errors: [] }
  page.on('pageerror', (error) => result.errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') result.errors.push(message.text())
  })

  for (const theme of themes) {
    await page.setViewportSize({ width: 1024, height: 1000 })
    await page.goto('http://127.0.0.1:4174/#/', { waitUntil: 'networkidle' })
    await page.evaluate((value) => localStorage.setItem('doc-workbench.theme', value), theme)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.doc-stat-primary strong')

    const list = await page.evaluate(() => {
      const primary = document.querySelector('.doc-stat-primary')
      const value = primary?.querySelector('strong')
      const variants = ['editing', 'pending', 'archived', 'failed']
      const statuses = {}
      for (const variant of variants) {
        const probe = document.createElement('span')
        probe.className = `status-tag ${variant}`
        probe.textContent = variant
        document.body.appendChild(probe)
        const style = getComputedStyle(probe)
        statuses[variant] = {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        }
        probe.remove()
      }
      const primaryStyle = primary && getComputedStyle(primary)
      const valueStyle = value && getComputedStyle(value)
      return {
        primaryColor: valueStyle?.color,
        primaryBackground: primaryStyle?.backgroundColor,
        statuses,
      }
    })
    list.primaryContrast = contrast(list.primaryColor, list.primaryBackground)
    for (const status of Object.values(list.statuses)) {
      status.contrast = contrast(status.color, status.backgroundColor)
    }
    await page.screenshot({ path: `1024-list-${theme}.png` })

    await page.goto('http://127.0.0.1:4174/#/audit', { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.audit-pagination')
    const audit = await page.evaluate(() => {
      const wrapper = document.querySelector('.audit-table-wrapper')
      const scroll = document.querySelector('.audit-table-scroll')
      const pagination = document.querySelector('.audit-pagination')
      const header = document.querySelector('.audit-table thead th')
      const wrapperRect = wrapper.getBoundingClientRect()
      const paginationRect = pagination.getBoundingClientRect()
      return {
        wrapperHeight: wrapperRect.height,
        wrapperBottom: wrapperRect.bottom,
        scrollClientHeight: scroll.clientHeight,
        scrollHeight: scroll.scrollHeight,
        scrollOverflowY: getComputedStyle(scroll).overflowY,
        stickyPosition: getComputedStyle(header).position,
        paginationBottom: paginationRect.bottom,
        paginationVisible: paginationRect.top >= wrapperRect.top && paginationRect.bottom <= innerHeight,
        siblings: scroll.parentElement === wrapper && pagination.parentElement === wrapper,
      }
    })
    await page.screenshot({ path: `1024-audit-${theme}.png` })
    result.themes[theme] = { list, audit }
  }

  await page.goto('http://127.0.0.1:4174/#/doc/fbe1dc1b91784eb1bd7b319a11158a0a', { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 1024, height: 1000 })
  await page.waitForSelector('.editor-evidence-toggle', { state: 'visible' })
  await page.locator('.editor-evidence-toggle').click()
  const focusedBefore = await page.evaluate(() => document.activeElement?.className)
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.waitForTimeout(120)
  const focusedAfter = await page.evaluate(() => {
    const shell = document.querySelector('.editor-evidence-shell')
    const active = document.activeElement
    return {
      className: active?.className || '',
      text: active?.textContent?.trim().slice(0, 40) || '',
      insideEvidence: Boolean(active && shell?.contains(active)),
      visible: active instanceof HTMLElement ? Boolean(active.offsetWidth || active.offsetHeight || active.getClientRects().length) : false,
    }
  })
  result.editorResize = { focusedBefore, focusedAfter }
  return result
}
