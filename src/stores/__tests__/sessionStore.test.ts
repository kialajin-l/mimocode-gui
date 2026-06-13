import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSessionStore } from '../sessionStore'

vi.mock('../../types/session', () => ({
  PROJECT_COLORS: ['#ff0000', '#00ff00', '#0000ff']
}))

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], projects: [], activeSessionId: null, loaded: false })
  })

  describe('createSession', () => {
    it('creates a session with correct defaults', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      expect(session.id).toBeDefined()
      expect(session.name).toBe('Test')
      expect(session.cwd).toBe('/tmp')
      expect(session.status).toBe('idle')
      expect(session.messages).toEqual([])
      expect(useSessionStore.getState().activeSessionId).toBe(session.id)
    })

    it('creates session with projectId', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp', 'proj-1')
      expect(session.projectId).toBe('proj-1')
    })
  })

  describe('addMessage', () => {
    it('appends message to session', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      const msg = { id: 'm1', role: 'user' as const, content: 'hello', timestamp: new Date() }
      useSessionStore.getState().addMessage(session.id, msg)

      const s = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(s?.messages).toHaveLength(1)
      expect(s?.messages[0].content).toBe('hello')
    })
  })

  describe('toggleMessageBookmark', () => {
    it('toggles bookmark on a message', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      const msg = { id: 'm1', role: 'user' as const, content: 'hi', timestamp: new Date(), bookmarked: false }
      useSessionStore.getState().addMessage(session.id, msg)

      useSessionStore.getState().toggleMessageBookmark(session.id, 'm1')
      let s = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(s?.messages[0].bookmarked).toBe(true)

      useSessionStore.getState().toggleMessageBookmark(session.id, 'm1')
      s = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(s?.messages[0].bookmarked).toBe(false)
    })

    it('does not affect other messages', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      useSessionStore.getState().addMessage(session.id, { id: 'm1', role: 'user' as const, content: 'a', timestamp: new Date(), bookmarked: false })
      useSessionStore.getState().addMessage(session.id, { id: 'm2', role: 'assistant' as const, content: 'b', timestamp: new Date(), bookmarked: false })

      useSessionStore.getState().toggleMessageBookmark(session.id, 'm1')
      const s = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(s?.messages[0].bookmarked).toBe(true)
      expect(s?.messages[1].bookmarked).toBe(false)
    })
  })

  describe('persistence / merge', () => {
    it('loads legacy sessions without versions safely', async () => {
      const legacySession = {
        id: 'legacy-1',
        name: 'Legacy',
        pid: null,
        status: 'idle',
        cwd: '/code',
        messages: [{ id: 'm1', role: 'user', content: 'hello', timestamp: '2026-06-13T00:00:00.000Z' }],
        projectId: null,
        changes: [],
        createdAt: '2026-06-13T00:00:00.000Z',
        updatedAt: '2026-06-13T00:00:00.000Z'
      }
      ;(window as any).electronAPI = {
        loadData: vi.fn().mockResolvedValue({ sessions: [legacySession], projects: [], activeSessionId: 'legacy-1' })
      }

      await useSessionStore.getState().loadData()

      const session = useSessionStore.getState().sessions[0]
      expect(session.versions).toEqual([])
      expect(session.tags).toEqual([])
      expect(session.messages[0].timestamp).toBeInstanceOf(Date)
    })

    it('importSession merges session data with new id and timestamps', () => {
      const imported = useSessionStore.getState().importSession({
        name: 'Imported',
        pid: null,
        status: 'idle',
        cwd: '/code',
        messages: [],
        versions: [],
        projectId: null,
        changes: [],
        tags: []
      })

      expect(imported.id).toBeDefined()
      expect(imported.createdAt).toBeInstanceOf(Date)
      expect(imported.name).toBe('Imported')
      expect(useSessionStore.getState().sessions).toHaveLength(1)
    })

    it('deleteProject unlinks sessions from that project', () => {
      const proj = useSessionStore.getState().createProject('Proj')
      const session = useSessionStore.getState().createSession('S', '/tmp', proj.id)

      useSessionStore.getState().deleteProject(proj.id)
      const s = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(s?.projectId).toBeNull()
      expect(useSessionStore.getState().projects).toHaveLength(0)
    })
  })
})
