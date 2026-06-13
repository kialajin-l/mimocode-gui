import { create } from 'zustand'

export interface Chapter {
  id: string
  title: string
  content: string
  order: number
  status: 'draft' | 'review' | 'final'
}

export interface Character {
  id: string
  name: string
  description: string
  role: string
}

export interface WorldSetting {
  id: string
  name: string
  description: string
  category: string
}

interface WritingState {
  chapters: Chapter[]
  characters: Character[]
  worldSettings: WorldSetting[]
  addChapter: (title: string) => void
  updateChapter: (id: string, updates: Partial<Chapter>) => void
  deleteChapter: (id: string) => void
  reorderChapters: (chapters: Chapter[]) => void
  addCharacter: (name: string, role: string) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  addWorldSetting: (name: string, category: string) => void
  updateWorldSetting: (id: string, updates: Partial<WorldSetting>) => void
  deleteWorldSetting: (id: string) => void
}

const STORAGE_KEY = 'mimocode-writing-data'

function loadFromStorage(): Partial<WritingState> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveToStorage(state: Partial<WritingState>) {
  try {
    const data = {
      chapters: state.chapters,
      characters: state.characters,
      worldSettings: state.worldSettings
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('[WritingStore] save error:', err)
  }
}

const savedData = loadFromStorage()

export const useWritingStore = create<WritingState>((set, get) => ({
  chapters: savedData.chapters || [],
  characters: savedData.characters || [],
  worldSettings: savedData.worldSettings || [],

  addChapter: (title) => {
    const chapters = get().chapters
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title,
      content: '',
      order: chapters.length,
      status: 'draft'
    }
    set((state) => {
      const updated = { chapters: [...state.chapters, newChapter] }
      saveToStorage(updated)
      return updated
    })
  },

  updateChapter: (id, updates) => {
    set((state) => {
      const updated = {
        chapters: state.chapters.map(ch =>
          ch.id === id ? { ...ch, ...updates } : ch
        )
      }
      saveToStorage(updated)
      return updated
    })
  },

  deleteChapter: (id) => {
    set((state) => {
      const updated = {
        chapters: state.chapters.filter(ch => ch.id !== id)
      }
      saveToStorage(updated)
      return updated
    })
  },

  reorderChapters: (chapters) => {
    set(() => {
      saveToStorage({ chapters })
      return { chapters }
    })
  },

  addCharacter: (name, role) => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name,
      description: '',
      role
    }
    set((state) => {
      const updated = { characters: [...state.characters, newCharacter] }
      saveToStorage(updated)
      return updated
    })
  },

  updateCharacter: (id, updates) => {
    set((state) => {
      const updated = {
        characters: state.characters.map(ch =>
          ch.id === id ? { ...ch, ...updates } : ch
        )
      }
      saveToStorage(updated)
      return updated
    })
  },

  deleteCharacter: (id) => {
    set((state) => {
      const updated = {
        characters: state.characters.filter(ch => ch.id !== id)
      }
      saveToStorage(updated)
      return updated
    })
  },

  addWorldSetting: (name, category) => {
    const newSetting: WorldSetting = {
      id: crypto.randomUUID(),
      name,
      description: '',
      category
    }
    set((state) => {
      const updated = { worldSettings: [...state.worldSettings, newSetting] }
      saveToStorage(updated)
      return updated
    })
  },

  updateWorldSetting: (id, updates) => {
    set((state) => {
      const updated = {
        worldSettings: state.worldSettings.map(ws =>
          ws.id === id ? { ...ws, ...updates } : ws
        )
      }
      saveToStorage(updated)
      return updated
    })
  },

  deleteWorldSetting: (id) => {
    set((state) => {
      const updated = {
        worldSettings: state.worldSettings.filter(ws => ws.id !== id)
      }
      saveToStorage(updated)
      return updated
    })
  }
}))
