import { create } from 'zustand'
import { Session, Message, Project, PROJECT_COLORS } from '../types/session'

interface SessionState {
  sessions: Session[]
  projects: Project[]
  activeSessionId: string | null
  loaded: boolean
  loadError: string | null
  loadData: () => Promise<void>
  retryLoadData: () => Promise<void>
  createSession: (name: string, cwd: string, projectId?: string) => Session
  importSession: (sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => Session
  deleteSession: (id: string) => void
  archiveSession: (id: string) => void
  restoreVersion: (sessionId: string, versionId: string) => void
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateSession: (id: string, updates: Partial<Session>) => void
  toggleMessageBookmark: (sessionId: string, messageId: string) => void
  createProject: (name: string, cwd?: string) => Project
  archiveProject: (id: string) => void
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
        timestamp: new Date(m.timestamp),
        parts: (m.parts || []).map((part: any) => ({
          ...part,
          timestamp: new Date(part.timestamp)
        }))
      })),
      versions: (s.versions || []).map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp),
        messages: (v.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          parts: (m.parts || []).map((part: any) => ({
            ...part,
            timestamp: new Date(part.timestamp)
          }))
        })),
        snapshot: v.snapshot ? {
          ...v.snapshot,
          changes: v.snapshot.changes || [],
          tags: v.snapshot.tags || [],
        } : undefined
      })),
      changes: s.changes || [],
      tags: s.tags || [],
      archived: s.archived || false,
      archivedAt: s.archivedAt ? new Date(s.archivedAt) : undefined
    }))
  }
  if (data.projects) {
    data.projects = data.projects.map((p: any) => ({
      ...p,
      cwd: p.cwd || '.',
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
  loadError: null,

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
            loaded: true,
            loadError: null,
          })
          // Sync authorized workspaces to main process
          const projectCwds = (data.projects || []).map((p: any) => p.cwd).filter(Boolean)
          const sessionCwds = (data.sessions || []).map((s: any) => s.cwd).filter(Boolean)
          const allCwds = [...new Set([...projectCwds, ...sessionCwds])]
          if (allCwds.length > 0) {
            api.syncWorkspaces(allCwds)
          }
          return
        }
      } catch (err) {
        console.error('[Store] loadData error:', err)
        set({ loaded: true, loadError: '数据加载失败，请重启应用或点击重试。' })
        return
      }
    }
    set({ loaded: true })
  },

  retryLoadData: async () => {
    set({ loaded: false, loadError: null })
    await get().loadData()
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
      tags: [],
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

  importSession: (sessionData) => {
    const session: Session = {
      ...sessionData,
      id: crypto.randomUUID(),
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

  archiveSession: (id) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              archived: true,
              archivedAt: new Date(),
              updatedAt: new Date(),
              versions: [
                ...(s.versions || []),
                {
                  id: crypto.randomUUID(),
                  timestamp: new Date(),
                  messages: [...(s.messages || [])],
                  label: `归档：${s.name}`,
                  snapshot: {
                    changes: [...(s.changes || [])],
                    tags: [...(s.tags || [])],
                    cwd: s.cwd,
                    status: s.status,
                  }
                }
              ]
            }
          : s
      ),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
    }))
    scheduleSave()
  },

  restoreVersion: (sessionId, versionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s
        const version = (s.versions || []).find(v => v.id === versionId)
        if (!version) return s
        return {
          ...s,
          messages: [...version.messages],
          changes: version.snapshot?.changes ? [...version.snapshot.changes] : s.changes,
          tags: version.snapshot?.tags ? [...version.snapshot.tags] : s.tags,
          cwd: version.snapshot?.cwd || s.cwd,
          status: version.snapshot?.status || 'idle',
          versions: (s.versions || []).filter(v => v.id !== versionId),
          archived: false,
          archivedAt: undefined,
          updatedAt: new Date()
        }
      }),
      activeSessionId: sessionId
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

  toggleMessageBookmark: (sessionId, messageId) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
          ),
          updatedAt: new Date()
        }
      })
    }))
    scheduleSave()
  },

  createProject: (name, cwd = '.') => {
    const projects = get().projects
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      cwd,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      createdAt: new Date()
    }
    set((state) => ({ projects: [...state.projects, project] }))
    scheduleSave()
    // Sync workspace to main process
    if (cwd && cwd !== '.') {
      window.electronAPI?.syncWorkspaces([cwd])
    }
    return project
  },

  archiveProject: (id) => {
    set((state) => {
      const now = new Date()
      const project = state.projects.find(p => p.id === id)
      return {
        projects: state.projects.filter(p => p.id !== id),
        sessions: state.sessions.map(s =>
          s.projectId === id
            ? {
                ...s,
                archived: true,
                archivedAt: now,
                updatedAt: now,
                versions: [
                  ...(s.versions || []),
                  {
                    id: crypto.randomUUID(),
                    timestamp: now,
                    messages: [...(s.messages || [])],
                    label: `归档：${project?.name || s.name} / ${s.name}`,
                    snapshot: {
                      changes: [...(s.changes || [])],
                      tags: [...(s.tags || [])],
                      cwd: s.cwd,
                      status: s.status,
                    }
                  }
                ]
              }
            : s
        ),
        activeSessionId: state.sessions.some(s => s.projectId === id && s.id === state.activeSessionId)
          ? null
          : state.activeSessionId
      }
    })
    scheduleSave()
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
