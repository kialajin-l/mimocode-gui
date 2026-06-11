import { useCallback, useRef } from 'react'
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
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const sendMessage = useCallback(async (content: string) => {
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
    if (api) {
      let streamContent = ''
      
      const handleChunk = (chunk: any) => {
        if (chunk.type === 'text') {
          streamContent += chunk.content
          
          const store = useSessionStore.getState()
          const session = store.sessions.find(s => s.id === sessionId)
          if (session) {
            const streamMsgId = 'stream-' + sessionId
            const existingStreamIdx = session.messages.findIndex(m => m.id === streamMsgId)
            
            if (existingStreamIdx >= 0) {
              const updatedMessages = [...session.messages]
              updatedMessages[existingStreamIdx] = {
                ...updatedMessages[existingStreamIdx],
                content: streamContent
              }
              updateSession(sessionId, { messages: updatedMessages })
            } else {
              addMessage(sessionId, {
                id: streamMsgId,
                role: 'assistant',
                content: streamContent,
                timestamp: new Date()
              })
            }
          }
        } else if (chunk.type === 'metadata') {
          console.log('[metadata]', chunk.content)
        }
      }

      api.onMessageChunk(sessionId, handleChunk)

      const result = await api.sendMessage(sessionId, content, process.cwd())
      
      api.removeMessageChunkListener(sessionId)
      
      if (result.success && result.content) {
        const store = useSessionStore.getState()
        const session = store.sessions.find(s => s.id === sessionId)
        
        if (session) {
          const finalMessages = session.messages.filter(m => !m.id.startsWith('stream-'))
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
        }
      } else {
        updateSession(sessionId, { status: 'error' })
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `Error: ${result.error || 'Unknown error'}`,
          timestamp: new Date()
        }
        addMessage(sessionId, errorMessage)
      }
    } else {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `[Browser Mode] Echo: ${content}`,
        timestamp: new Date()
      }
      setTimeout(() => {
        addMessage(sessionId, assistantMessage)
      }, 500)
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
    createSession,
    deleteSession,
    setActiveSession,
    sendMessage,
    cancelMessage
  }
}
