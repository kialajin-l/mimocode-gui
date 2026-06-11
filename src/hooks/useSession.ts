import { useEffect } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { Message } from '../types/session'

export function useSession() {
  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    addMessage,
    updateSession
  } = useSessionStore()

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onSessionOutput((sessionId, data) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data,
        timestamp: new Date()
      }
      addMessage(sessionId, assistantMessage)
    })

    api.onSessionError((sessionId, data) => {
      updateSession(sessionId, { status: 'error' })
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${data}`,
        timestamp: new Date()
      }
      addMessage(sessionId, errorMessage)
    })

    api.onSessionExit((sessionId, code) => {
      updateSession(sessionId, { status: code === 0 ? 'idle' : 'error', pid: null })
    })

    return () => {
      api.removeSessionListeners()
    }
  }, [addMessage, updateSession])

  const sendMessage = async (content: string) => {
    if (!activeSession) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    addMessage(activeSession.id, userMessage)

    const api = window.electronAPI
    if (api) {
      await api.sendMessage(activeSession.id, content)
    } else {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Echo: ${content}`,
        timestamp: new Date()
      }
      setTimeout(() => {
        addMessage(activeSession.id, assistantMessage)
      }, 500)
    }
  }

  const startSession = async (name: string, cwd: string) => {
    const session = createSession(name, cwd)

    const api = window.electronAPI
    if (api) {
      updateSession(session.id, { status: 'running' })
      const result = await api.startSession(session.id, cwd)
      if (result.pid) {
        updateSession(session.id, { pid: result.pid })
      }
    }

    return session
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    startSession,
    deleteSession,
    setActiveSession,
    sendMessage
  }
}
