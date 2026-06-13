import { useCallback, useRef } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { Message } from '../types/session'
import { parseDiff } from '../utils/diffParser'

export function useSession() {
  const sessions = useSessionStore(s => s.sessions)
  const activeSessionId = useSessionStore(s => s.activeSessionId)
  const projects = useSessionStore(s => s.projects)
  const createSession = useSessionStore(s => s.createSession)
  const deleteSession = useSessionStore(s => s.deleteSession)
  const setActiveSession = useSessionStore(s => s.setActiveSession)
  const addMessage = useSessionStore(s => s.addMessage)
  const updateSession = useSessionStore(s => s.updateSession)
  const createProject = useSessionStore(s => s.createProject)
  const deleteProject = useSessionStore(s => s.deleteProject)

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const sendMessage = useCallback(async (content: string, model?: string, permission?: string) => {
    const sessionId = activeSessionIdRef.current
    if (!sessionId) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    addMessage(sessionId, userMessage)
    updateSession(sessionId, { status: 'running' })

    const api = window.electronAPI
    if (!api) {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `[Browser Mode] Echo: ${content}`,
        timestamp: new Date()
      }
      setTimeout(() => addMessage(sessionId, assistantMessage), 500)
      return
    }

    let streamContent = ''
    const streamMsgId = crypto.randomUUID()

    const handleChunk = (chunk: any) => {
      if (chunk.type === 'text') {
        streamContent += chunk.content
        const storeState = useSessionStore.getState()
        const session = storeState.sessions.find(s => s.id === sessionId)
        if (session) {
          const idx = session.messages.findIndex(m => m.id === streamMsgId)
          if (idx >= 0) {
            const msgs = [...session.messages]
            msgs[idx] = { ...msgs[idx], content: streamContent }
            updateSession(sessionId, { messages: msgs })
          } else {
            addMessage(sessionId, {
              id: streamMsgId,
              role: 'assistant',
              content: streamContent,
              timestamp: new Date()
            })
          }
        }
      }
    }

    try {
      const storeState = useSessionStore.getState()
      const session = storeState.sessions.find(s => s.id === sessionId)
      const cwd = session?.cwd || '.'

      api.onMessageChunk(sessionId, handleChunk)
      const result = await api.sendMessage(sessionId, content, cwd, model, permission)
      api.removeMessageChunkListener(sessionId)

      if (result?.success && result.content) {
        const storeState = useSessionStore.getState()
        const session = storeState.sessions.find(s => s.id === sessionId)
        if (session) {
          const finalMessages = session.messages.filter(m => m.id !== streamMsgId)
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.content,
            timestamp: new Date()
          }
          updateSession(sessionId, {
            messages: [...finalMessages, assistantMessage],
            status: 'idle'
          })

          // Auto-detect file changes
          try {
            const diffResult = await api.gitDiff(session.cwd || '.')
            if (diffResult?.success && diffResult.diff) {
              const changes = parseDiff(diffResult.diff)
              if (changes.length > 0) {
                updateSession(sessionId, { changes })
              }
            }
          } catch (e) {
            console.error('[useSession] git diff error:', e)
          }
        }
      } else {
        updateSession(sessionId, { status: 'idle' })
      }
    } catch (err) {
      console.error('[useSession] sendMessage error:', err)
      api.removeMessageChunkListener(sessionId)
      updateSession(sessionId, { status: 'idle' })
    }
  }, [addMessage, updateSession])

  const cancelMessage = useCallback(async () => {
    const sessionId = activeSessionIdRef.current
    if (!sessionId) return
    const api = window.electronAPI
    if (api) {
      api.removeMessageChunkListener(sessionId)
      await api.cancelMessage(sessionId)
      updateSession(sessionId, { status: 'idle' })
    }
  }, [updateSession])

  return {
    sessions,
    activeSession,
    activeSessionId,
    projects,
    createSession,
    deleteSession,
    setActiveSession,
    updateSession,
    sendMessage,
    cancelMessage,
    createProject,
    deleteProject
  }
}
