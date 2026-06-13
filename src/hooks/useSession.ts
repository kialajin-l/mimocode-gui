import { useCallback, useRef } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { Message, MessagePart } from '../types/session'
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

  const sendMessage = useCallback(async (content: string, model?: string, permission?: string, reasoning?: string) => {
    let sessionId = activeSessionIdRef.current
    if (!sessionId) {
      const sessionName = content.split('\n').find(line => line.trim() && !line.startsWith('Mode:') && !line.startsWith('Workflow:'))?.trim().slice(0, 40) || 'New Session'
      const session = createSession(sessionName, '.')
      sessionId = session.id
      activeSessionIdRef.current = session.id
    }

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
      setTimeout(() => {
        addMessage(sessionId, assistantMessage)
        updateSession(sessionId, { status: 'idle' })
      }, 500)
      return
    }

    let streamContent = ''
    const streamMsgId = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    let releaseTimer: ReturnType<typeof setTimeout> | null = null

    const isLatestDraft = () => {
      const storeState = useSessionStore.getState()
      const session = storeState.sessions.find(s => s.id === sessionId)
      const lastMessage = session?.messages[session.messages.length - 1]
      return lastMessage?.id === streamMsgId
    }

    const clearReleaseTimer = () => {
      if (releaseTimer) {
        clearTimeout(releaseTimer)
        releaseTimer = null
      }
    }

    const releaseUiIfSettled = () => {
      releaseTimer = null
      if (streamContent.trim() && isLatestDraft()) {
        updateSession(sessionId, { status: 'idle' })
      }
    }

    const scheduleUiRelease = () => {
      clearReleaseTimer()
      releaseTimer = setTimeout(releaseUiIfSettled, 1200)
    }

    const upsertAssistantDraft = (updates: Partial<Message>) => {
      const storeState = useSessionStore.getState()
      const session = storeState.sessions.find(s => s.id === sessionId)
      if (!session) return

      const idx = session.messages.findIndex(m => m.id === streamMsgId)
      if (idx >= 0) {
        const msgs = [...session.messages]
        msgs[idx] = { ...msgs[idx], ...updates }
        updateSession(sessionId, { messages: msgs })
      } else {
        addMessage(sessionId, {
          id: streamMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          parts: [],
          ...updates
        })
      }
    }

    const appendPart = (part: Omit<MessagePart, 'id' | 'timestamp'>) => {
      const storeState = useSessionStore.getState()
      const session = storeState.sessions.find(s => s.id === sessionId)
      const existing = session?.messages.find(m => m.id === streamMsgId)
      const parts = existing?.parts || []
      upsertAssistantDraft({
        parts: [
          ...parts,
          {
            ...part,
            id: crypto.randomUUID(),
            timestamp: new Date()
          }
        ]
      })
    }

    const handleChunk = (chunk: any) => {
      if (chunk.requestId && chunk.requestId !== requestId) return

      if (chunk.type === 'text') {
        streamContent += chunk.content
        upsertAssistantDraft({ content: streamContent })
        scheduleUiRelease()
      } else if (chunk.type === 'metadata') {
        appendPart({
          type: 'metadata',
          title: '运行状态',
          content: chunk.content,
          collapsed: false
        })
      } else if (chunk.type === 'thinking') {
        appendPart({
          type: 'thinking',
          title: '分析过程',
          content: chunk.content,
          collapsed: false
        })
      }
    }

    try {
      const storeState = useSessionStore.getState()
      const session = storeState.sessions.find(s => s.id === sessionId)
      const cwd = session?.cwd || '.'

      upsertAssistantDraft({
        parts: [{
          id: crypto.randomUUID(),
          type: 'metadata',
          title: '启动 MiMo',
          content: `cwd: ${cwd}`,
          timestamp: new Date(),
          collapsed: false
        }]
      })

      api.onMessageChunk(sessionId, handleChunk)
      const variant = reasoning && reasoning !== 'default' ? reasoning : undefined
      const result = await api.sendMessage(sessionId, content, cwd, model, permission, variant, requestId)
      api.removeMessageChunkListener(sessionId)
      clearReleaseTimer()

      if (result?.success && result.content) {
        const storeState = useSessionStore.getState()
        const session = storeState.sessions.find(s => s.id === sessionId)
        if (session) {
          const streamMessage = session.messages.find(m => m.id === streamMsgId)
          const finalMessages = session.messages.map(m =>
            m.id === streamMsgId
              ? {
                  ...m,
                  content: result.content || streamContent,
                  parts: (streamMessage?.parts || []).map(part => ({ ...part, collapsed: true }))
                }
              : m
          )
          updateSession(sessionId, {
            messages: finalMessages,
            ...(isLatestDraft() ? { status: 'idle' as const } : {})
          })

          // Auto-detect file changes after releasing the input/status UI.
          api.gitDiff(session.cwd || '.')
            .then(diffResult => {
              if (diffResult?.success && diffResult.diff) {
                const changes = parseDiff(diffResult.diff)
                if (changes.length > 0) {
                  updateSession(sessionId, { changes })
                }
              }
            })
            .catch(e => console.error('[useSession] git diff error:', e))
        }
      } else {
        upsertAssistantDraft({
          content: `MiMo 执行失败：${result?.error || '未返回内容'}`,
          parts: [{
            id: crypto.randomUUID(),
            type: 'error',
            title: '执行失败',
            content: result?.error || '未返回内容',
            timestamp: new Date(),
            collapsed: false
          }]
        })
        if (isLatestDraft()) updateSession(sessionId, { status: 'idle' })
      }
    } catch (err) {
      console.error('[useSession] sendMessage error:', err)
      api.removeMessageChunkListener(sessionId)
      clearReleaseTimer()
      upsertAssistantDraft({
        content: `MiMo 执行异常：${(err as Error).message}`,
        parts: [{
          id: crypto.randomUUID(),
          type: 'error',
          title: '执行异常',
          content: (err as Error).message,
          timestamp: new Date(),
          collapsed: false
        }]
      })
      if (isLatestDraft()) updateSession(sessionId, { status: 'idle' })
    }
  }, [addMessage, createSession, updateSession])

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
