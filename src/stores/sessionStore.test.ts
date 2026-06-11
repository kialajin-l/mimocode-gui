import { useSessionStore } from './sessionStore'

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], activeSessionId: null })
  })

  it('creates a session', () => {
    const { createSession } = useSessionStore.getState()
    const session = createSession('Test Session', '/tmp')

    expect(session.id).toBeDefined()
    expect(session.name).toBe('Test Session')
    expect(session.status).toBe('idle')
  })

  it('sets active session', () => {
    const { createSession, setActiveSession } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')

    setActiveSession(session.id)
    expect(useSessionStore.getState().activeSessionId).toBe(session.id)
  })

  it('adds message to session', () => {
    const { createSession, addMessage } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')

    addMessage(session.id, {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date()
    })

    const updatedSession = useSessionStore.getState().sessions.find((s) => s.id === session.id)
    expect(updatedSession?.messages).toHaveLength(1)
  })

  it('deletes session', () => {
    const { createSession, deleteSession } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')

    deleteSession(session.id)
    expect(useSessionStore.getState().sessions).toHaveLength(0)
  })

  it('updates session', () => {
    const { createSession, updateSession } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')

    updateSession(session.id, { status: 'running', pid: 12345 })

    const updatedSession = useSessionStore.getState().sessions.find((s) => s.id === session.id)
    expect(updatedSession?.status).toBe('running')
    expect(updatedSession?.pid).toBe(12345)
  })
})
