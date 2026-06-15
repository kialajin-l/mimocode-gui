import { create } from 'zustand'

export interface Skill {
  id: string
  name: string
  description: string
  enabled: boolean
  path: string
  source?: 'registered' | 'discovered'
}

interface ScannedSkill {
  id: string
  name: string
  description: string
  path: string
  source: string
  enabled: boolean
}

interface SkillState {
  skills: Skill[]
  loaded: boolean
  scanning: boolean
  loadSkills: () => Promise<void>
  scanSkills: () => Promise<void>
  installSkill: (module: string) => Promise<{ success: boolean; error?: string }>
  toggleSkill: (id: string) => void
  removeSkill: (id: string) => void
}

// Save skills to a dedicated file (skills.json) to avoid race conditions
// with sessionStore/pluginStore which write to sessions.json
async function saveSkillsToDisk(skills: Skill[]) {
  const api = window.electronAPI
  if (!api) return
  try {
    await api.skillsSave(skills)
  } catch (err) {
    console.error('[SkillStore] save error:', err)
  }
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  loaded: false,
  scanning: false,

  loadSkills: async () => {
    if (get().loaded) return
    const api = window.electronAPI
    let savedSkills: Skill[] = []
    if (api) {
      try {
        // Load from dedicated skills.json file
        const data = await api.skillsLoad()
        if (Array.isArray(data) && data.length > 0) {
          savedSkills = data.map((s: Skill) => ({ ...s, source: 'discovered' as const }))
        } else {
          // Fallback: migrate from sessions.json if skills.json doesn't exist yet
          const legacyData = await api.loadData()
          if (legacyData?.skills && Array.isArray(legacyData.skills)) {
            savedSkills = legacyData.skills.map((s: Skill) => ({ ...s, source: 'discovered' as const }))
          }
        }
      } catch (err) {
        console.error('[SkillStore] loadSkills error:', err)
      }
    }
    set({ skills: savedSkills, loaded: true })
    await get().scanSkills()
  },

  scanSkills: async () => {
    const api = window.electronAPI
    if (!api) return
    set({ scanning: true })
    try {
      const result = await api.scanSkills()
      if (result?.success && Array.isArray(result.skills)) {
        const discovered: Skill[] = result.skills.map((s: ScannedSkill) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          path: s.path,
          enabled: s.enabled,
          source: 'discovered' as const,
        }))
        set((state) => {
          const existingEnabledMap = new Map<string, boolean>()
          for (const s of state.skills) {
            existingEnabledMap.set(s.id, s.enabled)
          }
          const merged = discovered.map(s => ({
            ...s,
            enabled: existingEnabledMap.has(s.id) ? existingEnabledMap.get(s.id)! : s.enabled,
          }))
          return { skills: merged }
        })
        saveSkillsToDisk(get().skills)
      }
    } catch (err) {
      console.error('[SkillStore] scanSkills error:', err)
    } finally {
      set({ scanning: false })
    }
  },

  installSkill: async (module: string) => {
    const api = window.electronAPI
    if (!api) return { success: false, error: 'No electron API' }
    try {
      const result = await api.installSkill(module)
      if (result?.success) {
        await get().scanSkills()
      }
      return { success: result?.success ?? false, error: result?.error }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  toggleSkill: (id) => {
    set((state) => {
      const newSkills = state.skills.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
      saveSkillsToDisk(newSkills)
      return { skills: newSkills }
    })
  },

  removeSkill: (id) => {
    set((state) => {
      const newSkills = state.skills.filter(s => s.id !== id)
      saveSkillsToDisk(newSkills)
      return { skills: newSkills }
    })
  }
}))
