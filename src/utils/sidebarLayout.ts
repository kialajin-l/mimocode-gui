export const SIDEBAR_WIDTH_KEY = 'mimocode.sidebarWidth'
export const DEFAULT_SIDEBAR_WIDTH = 270
export const MIN_SIDEBAR_WIDTH = 220
export const MAX_SIDEBAR_WIDTH = 380

export function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)))
}

export function readSidebarWidth() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH
  const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY)
  const width = raw ? Number(raw) : DEFAULT_SIDEBAR_WIDTH
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH
  return clampSidebarWidth(width)
}
