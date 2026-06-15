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
        loadData: vi.fn().mockResolvedValue({ sessions: [legacySession], projects: [], activeSessionId: 'legacy-1' }),
        syncWorkspaces: vi.fn().mockResolvedValue({ success: true }),
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

  describe('setActiveSession', () => {
    it('sets the active session id', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      useSessionStore.getState().setActiveSession(session.id)
      expect(useSessionStore.getState().activeSessionId).toBe(session.id)
    })
  })

  describe('deleteSession', () => {
    it('removes a session', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      useSessionStore.getState().deleteSession(session.id)
      expect(useSessionStore.getState().sessions).toHaveLength(0)
    })
  })

  describe('archiveProject', () => {
    it('archives all project sessions and removes the project from the sidebar', () => {
      const project = useSessionStore.getState().createProject('Project', '/repo')
      const session = useSessionStore.getState().createSession('Session 1', '/repo', project.id)
      useSessionStore.getState().addMessage(session.id, {
        id: 'm1',
        role: 'user' as const,
        content: 'project archive content',
        timestamp: new Date()
      })

      useSessionStore.getState().archiveProject(project.id)

      const archived = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(useSessionStore.getState().projects).toHaveLength(0)
      expect(archived?.archived).toBe(true)
      expect(archived?.versions[0].messages[0].content).toBe('project archive content')
      expect(useSessionStore.getState().activeSessionId).toBeNull()
    })
  })

  describe('archiveSession', () => {
    it('archives a session into local versions before hiding it', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      const msg = { id: 'm1', role: 'user' as const, content: 'important context', timestamp: new Date() }
      useSessionStore.getState().addMessage(session.id, msg)

      useSessionStore.getState().archiveSession(session.id)

      const archived = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(archived?.archived).toBe(true)
      expect(archived?.versions).toHaveLength(1)
      expect(archived?.versions[0].label).toContain('归档')
      expect(archived?.versions[0].messages[0].content).toBe('important context')
    })

    it('clears active session when archiving the active session', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')

      useSessionStore.getState().archiveSession(session.id)

      expect(useSessionStore.getState().activeSessionId).toBeNull()
    })
  })

  describe('restoreVersion', () => {
    it('restores messages and makes archived sessions visible again', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      useSessionStore.getState().addMessage(session.id, {
        id: 'm1',
        role: 'user' as const,
        content: 'before archive',
        timestamp: new Date()
      })
      useSessionStore.getState().archiveSession(session.id)
      const versionId = useSessionStore.getState().sessions.find(s => s.id === session.id)?.versions[0].id

      useSessionStore.getState().updateSession(session.id, { messages: [] })
      useSessionStore.getState().restoreVersion(session.id, versionId!)

      const restored = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(restored?.archived).toBe(false)
      expect(restored?.messages[0].content).toBe('before archive')
      expect(restored?.versions.find(version => version.id === versionId)).toBeUndefined()
      expect(useSessionStore.getState().activeSessionId).toBe(session.id)
    })
  })

  describe('updateSession', () => {
    it('updates session fields', () => {
      const session = useSessionStore.getState().createSession('Test', '/tmp')
      useSessionStore.getState().updateSession(session.id, { status: 'running', pid: 12345 })

      const updated = useSessionStore.getState().sessions.find(s => s.id === session.id)
      expect(updated?.status).toBe('running')
      expect(updated?.pid).toBe(12345)
    })
  })
})
