import { create } from 'zustand'
import { Session, Message } from '../types/session'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  createSession: (name: string, cwd: string) => Session
  deleteSession: (id: string) => void
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateSession: (id: string, updates: Partial<Session>) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (name, cwd) => {
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      pid: null,
      status: 'idle',
      cwd,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id
    }))
    return session
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
    }))
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id })
  },

  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      )
    }))
  },

  updateSession: (id, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      )
    }))
  }
}))
