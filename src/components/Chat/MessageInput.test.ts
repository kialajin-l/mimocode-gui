import { describe, expect, it, beforeEach } from 'vitest'
import { INPUT_PREFS_KEY, readInputPrefs } from './MessageInput'

describe('MessageInput preferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Compose mode when no preference exists', () => {
    expect(readInputPrefs()).toMatchObject({
      mode: 'compose',
      permission: 'edit',
      model: '',
      reasoning: 'default'
    })
  })

  it('restores persisted prompt controls', () => {
    window.localStorage.setItem(INPUT_PREFS_KEY, JSON.stringify({
      mode: 'plan',
      permission: 'execute',
      model: 'anthropic/claude-sonnet-4-5',
      reasoning: 'high'
    }))

    expect(readInputPrefs()).toMatchObject({
      mode: 'plan',
      permission: 'execute',
      model: 'anthropic/claude-sonnet-4-5',
      reasoning: 'high'
    })
  })

  it('falls back safely for invalid persisted values', () => {
    window.localStorage.setItem(INPUT_PREFS_KEY, JSON.stringify({
      mode: 'writer',
      permission: 'root',
      model: 123,
      reasoning: 'max'
    }))

    expect(readInputPrefs()).toMatchObject({
      mode: 'compose',
      permission: 'edit',
      model: '',
      reasoning: 'default'
    })
  })
})
