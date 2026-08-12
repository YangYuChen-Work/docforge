export const MIN_CONTENT_ZOOM = 0.5
export const MAX_CONTENT_ZOOM = 2
export const DEFAULT_CONTENT_ZOOM = 1
export const CONTENT_ZOOM_STEP = 0.1

export function clampContentZoom(value) {
  if (!Number.isFinite(value)) return DEFAULT_CONTENT_ZOOM
  return Math.min(MAX_CONTENT_ZOOM, Math.max(MIN_CONTENT_ZOOM, Number(value.toFixed(2))))
}

export function stepContentZoom(value, direction) {
  const nextValue = clampContentZoom(value) + direction * CONTENT_ZOOM_STEP
  return clampContentZoom(nextValue)
}

export function formatContentZoom(value) {
  return `${Math.round(clampContentZoom(value) * 100)}%`
}
