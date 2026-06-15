import { beforeEach, describe, expect, it } from 'vitest'
import { clampSidebarWidth, readSidebarWidth, SIDEBAR_WIDTH_KEY } from '../sidebarLayout'

describe('sidebarLayout', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('clamps sidebar width to the allowed range', () => {
    expect(clampSidebarWidth(120)).toBe(220)
    expect(clampSidebarWidth(300)).toBe(300)
    expect(clampSidebarWidth(520)).toBe(380)
  })

  it('reads persisted sidebar width when it is valid', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, '312')

    expect(readSidebarWidth()).toBe(312)
  })

  it('falls back to default width when persisted value is invalid', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, 'wide')

    expect(readSidebarWidth()).toBe(270)
  })
})
