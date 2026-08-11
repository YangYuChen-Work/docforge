# Task 3 Report — Table citation coverage

## Changed files

- `frontend/src/editor/ReferenceDecorations.ts`
- `frontend/src/components/ContentPanel.vue`

## Commands and output

1. Focused source-linkage test

   Command:
   `node --test frontend/tests/source-linkage.test.mjs`

   Result:
   - 5 tests passed
   - 0 failed

2. Frontend build

   Command:
   `npm run build`

   Result:
   - `vue-tsc -b && vite build` succeeded
   - Vite emitted existing chunk-size warnings for large production bundles

## Self-review

- Reused the existing structured-table matching path instead of duplicating citation parsing.
- `buildDecorations` now collects table metadata once, routes reliable table citations to table-level markers, and keeps inline markers for plain-text citations.
- Table markers are deduplicated per matched table plus `source_document_id`, while preserving the first citation key as the click target.
- Source-card-to-editor navigation now uses `findCitationRange`, so structured table citations scroll to the matched table range instead of falling back to raw excerpt lookup.
- Added table marker and active-table styles without changing the existing inline source-marker/source-highlight styling path.
- Added node-selection scrolling for table ranges so matched tables can be focused reliably.

## Concerns

- `npm run build` still reports large Vite chunks in the existing frontend bundle; this task did not change bundling strategy.
