import { create } from 'zustand'
import { Session, Message, Project, PROJECT_COLORS } from '../types/session'

interface SessionState {
  sessions: Session[]
  projects: Project[]
  activeSessionId: string | null
  loaded: boolean
  loadData: () => Promise<void>
  createSession: (name: string, cwd: string, projectId?: string) => Session
  deleteSession: (id: string) => void
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateSession: (id: string, updates: Partial<Session>) => void
  createProject: (name: string) => Project
  deleteProject: (id: string) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function reviveDates(data: any) {
  if (!data) return data
  if (data.sessions) {
    data.sessions = data.sessions.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: (s.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })),
      changes: s.changes || []
    }))
  }
  if (data.projects) {
    data.projects = data.projects.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt)
    }))
  }
  return data
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const { sessions, projects, activeSessionId } = useSessionStore.getState()
    const api = window.electronAPI
    if (api) {
      api.saveData({ sessions, projects, activeSessionId })
    }
  }, 500)
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  projects: [],
  activeSessionId: null,
  loaded: false,

  loadData: async () => {
    if (get().loaded) return
    const api = window.electronAPI
    if (api) {
      try {
        const data = await api.loadData()
        if (data) {
          reviveDates(data)
          set({
            sessions: data.sessions || [],
            projects: data.projects || [],
            activeSessionId: data.activeSessionId || null,
            loaded: true
          })
          return
        }
      } catch (err) {
        console.error('[Store] loadData error:', err)
      }
    }
    set({ loaded: true })
  },

  createSession: (name, cwd, projectId) => {
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      pid: null,
      status: 'idle',
      cwd,
      messages: [],
      versions: [],
      projectId: projectId || null,
      changes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id
    }))
    scheduleSave()
    return session
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
    }))
    scheduleSave()
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id })
    scheduleSave()
  },

  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      )
    }))
    scheduleSave()
  },

  updateSession: (id, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      )
    }))
    scheduleSave()
  },

  createProject: (name) => {
    const projects = get().projects
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      createdAt: new Date()
    }
    set((state) => ({ projects: [...state.projects, project] }))
    scheduleSave()
    return project
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      sessions: state.sessions.map(s =>
        s.projectId === id ? { ...s, projectId: null } : s
      )
    }))
    scheduleSave()
  }
}))
