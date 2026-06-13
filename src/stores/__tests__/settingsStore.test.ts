import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('defaults', () => {
    it('has expected default values', () => {
      const state = useSettingsStore.getState()
      expect(state.defaultModel).toBe('auto')
      expect(state.defaultReasoning).toBe('medium')
      expect(state.defaultPermission).toBe('ask')
      expect(state.showStatusCard).toBe(true)
    })
  })

  describe('setDefaultModel', () => {
    it('updates state and persists to localStorage', () => {
      useSettingsStore.getState().setDefaultModel('claude-sonnet')
      expect(useSettingsStore.getState().defaultModel).toBe('claude-sonnet')
      expect(window.localStorage.getItem('mimocode-setting-defaultModel')).toBe('"claude-sonnet"')
    })
  })

  describe('setDefaultReasoning', () => {
    it('updates state and persists to localStorage', () => {
      useSettingsStore.getState().setDefaultReasoning('high')
      expect(useSettingsStore.getState().defaultReasoning).toBe('high')
      expect(window.localStorage.getItem('mimocode-setting-defaultReasoning')).toBe('"high"')
    })
  })

  describe('setDefaultPermission', () => {
    it('updates state and persists to localStorage', () => {
      useSettingsStore.getState().setDefaultPermission('always')
      expect(useSettingsStore.getState().defaultPermission).toBe('always')
      expect(window.localStorage.getItem('mimocode-setting-defaultPermission')).toBe('"always"')
    })
  })

  describe('setShowStatusCard', () => {
    it('updates state and persists to localStorage', () => {
      useSettingsStore.getState().setShowStatusCard(false)
      expect(useSettingsStore.getState().showStatusCard).toBe(false)
      expect(window.localStorage.getItem('mimocode-setting-showStatusCard')).toBe('false')
    })
  })

  describe('loadSetting with persisted localStorage', () => {
    it('store reflects values that were set via setters', () => {
      useSettingsStore.getState().setDefaultModel('gpt-4o')
      useSettingsStore.getState().setShowStatusCard(false)

      const freshState = useSettingsStore.getState()
      expect(freshState.defaultModel).toBe('gpt-4o')
      expect(freshState.showStatusCard).toBe(false)

      expect(window.localStorage.getItem('mimocode-setting-defaultModel')).toBe('"gpt-4o"')
      expect(window.localStorage.getItem('mimocode-setting-showStatusCard')).toBe('false')
    })
  })
})
