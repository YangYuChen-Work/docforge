async (page) => {
  const widths = [1024, 1280]
  const routes = [
    { slug: 'list', hash: '#/' },
  ]
  const themes = ['light', 'dark']
  const results = []
  const browserErrors = []

  page.on('pageerror', (error) => browserErrors.push({ type: 'pageerror', message: error.message }))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push({ type: 'console', message: message.text() })
  })

  await page.goto('http://127.0.0.1:4174/#/', { waitUntil: 'networkidle' })

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of routes) {
      for (const theme of themes) {
        await page.evaluate((nextTheme) => localStorage.setItem('doc-workbench.theme', nextTheme), theme)
        await page.goto(`http://127.0.0.1:4174/${route.hash}`, { waitUntil: 'networkidle' })
        await page.reload({ waitUntil: 'networkidle' })
        await page.waitForTimeout(180)

        const metrics = await page.evaluate(({ width, routeSlug, requestedTheme }) => {
          const rect = (selector) => {
            const element = document.querySelector(selector)
            if (!element) return null
            const bounds = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return {
              x: Math.round(bounds.x * 10) / 10,
              y: Math.round(bounds.y * 10) / 10,
              width: Math.round(bounds.width * 10) / 10,
              height: Math.round(bounds.height * 10) / 10,
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
              overflowX: style.overflowX,
              overflowY: style.overflowY,
              position: style.position,
              display: style.display,
              visibility: style.visibility,
              transform: style.transform,
              gridTemplateColumns: style.gridTemplateColumns,
              backgroundColor: style.backgroundColor,
              color: style.color,
            }
          }

          const offenders = [...document.querySelectorAll('body *')]
            .filter((element) => {
              const style = getComputedStyle(element)
              if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false
              if (element.closest('.doc-table-scroll, .audit-table-scroll')) return false
              const bounds = element.getBoundingClientRect()
              return bounds.width > 0 && (bounds.left < -1 || bounds.right > width + 1)
            })
            .slice(0, 12)
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              className: String(element.className).slice(0, 120),
              left: Math.round(element.getBoundingClientRect().left),
              right: Math.round(element.getBoundingClientRect().right),
            }))

          return {
            width,
            route: routeSlug,
            requestedTheme,
            actualTheme: document.documentElement.dataset.theme,
            body: { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth },
            html: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
            app: rect('.app'),
            main: rect('.main-content'),
            page: rect('.page-transition-shell'),
            docTable: rect('.doc-table-scroll'),
            auditTable: rect('.audit-table-scroll'),
            editorBody: rect('.editor-body'),
            editorPaper: rect('.word-page'),
            evidenceShell: rect('.editor-evidence-shell'),
            evidenceToggle: rect('.editor-evidence-toggle'),
            horizontalOffenders: offenders,
          }
        }, { width, routeSlug: route.slug, requestedTheme: theme })

        const filename = `${String(width)}-${route.slug}-${theme}.png`
        await page.screenshot({ path: filename, fullPage: false })
        results.push({ ...metrics, screenshot: filename })
      }
    }
  }

  return {
    captures: results.length,
    browserErrorCount: browserErrors.length,
    overflowFailures: results.filter((item) => item.html.scrollWidth > item.html.clientWidth || item.body.scrollWidth > item.body.clientWidth).length,
    themeFailures: results.filter((item) => item.actualTheme !== item.requestedTheme).length,
    browserErrors,
    results: results.map((item) => ({
      width: item.width,
      route: item.route,
      requestedTheme: item.requestedTheme,
      actualTheme: item.actualTheme,
      bodyOverflow: item.body.scrollWidth - item.body.clientWidth,
      htmlOverflow: item.html.scrollWidth - item.html.clientWidth,
      docTable: item.docTable && { clientWidth: item.docTable.clientWidth, scrollWidth: item.docTable.scrollWidth, overflowX: item.docTable.overflowX },
      auditTable: item.auditTable && { clientWidth: item.auditTable.clientWidth, scrollWidth: item.auditTable.scrollWidth, overflowX: item.auditTable.overflowX },
      editorBody: item.editorBody && { width: item.editorBody.width, columns: item.editorBody.gridTemplateColumns },
      editorPaper: item.editorPaper && { width: item.editorPaper.width, backgroundColor: item.editorPaper.backgroundColor, color: item.editorPaper.color },
      evidenceShell: item.evidenceShell && { width: item.evidenceShell.width, position: item.evidenceShell.position, visibility: item.evidenceShell.visibility, transform: item.evidenceShell.transform },
      evidenceToggle: item.evidenceToggle && { display: item.evidenceToggle.display, width: item.evidenceToggle.width },
      horizontalOffenders: item.horizontalOffenders,
      screenshot: item.screenshot,
    })),
  }
}
