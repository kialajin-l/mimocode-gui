import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, MessagePart } from '../../types/session'
import { CodeBlock } from './CodeBlock'
import { BookmarkButton } from './BookmarkButton'
import { CopyButton } from './CopyButton'
import { ThinkingStatus } from './ThinkingStatus'
import { useSessionStore } from '../../stores/sessionStore'

interface MessageListProps {
  messages: Message[]
  sessionId?: string
  isRunning?: boolean
}

export function MessageList({ messages, sessionId, isRunning }: MessageListProps) {
  const toggleBookmark = useSessionStore(s => s.toggleMessageBookmark)
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoFollow, setAutoFollow] = useState(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const lastMessage = messages[messages.length - 1]
  const lastMessageContent = lastMessage?.content ?? ''

  // Tail traversal to find last assistant message id (avoids reverse().find() allocation)
  let lastAssistantMessageId: string | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantMessageId = messages[i].id
      break
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior })
  }

  useEffect(() => {
    const scrollContainer = containerRef.current?.closest('.chat-area')
    if (!(scrollContainer instanceof HTMLElement)) return

    const handleScroll = () => {
      const nearBottom = isNearBottom(scrollContainer)
      setAutoFollow(nearBottom)
      setShowScrollToBottom(!nearBottom)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [sessionId])

  useEffect(() => {
    setAutoFollow(true)
    setShowScrollToBottom(false)
    window.setTimeout(() => scrollToBottom('auto'), 0)
  }, [sessionId])

  useEffect(() => {
    if (!autoFollow) return
    window.setTimeout(() => scrollToBottom(isRunning ? 'auto' : 'smooth'), 0)
  }, [messages.length, lastMessageContent, isRunning, autoFollow])

  if (messages.length === 0) {
    return <EmptySessionBackdrop />
  }

  return (
    <div className="message-list-container" ref={containerRef}>
      <div className="message-list">
        {messages.map((message) => {
          const display = parseMessageDisplay(message.content)
          // Use message.mode for badge display (more reliable than parsing content)
          const displayMode = message.mode || display.mode
          return (
            <div key={message.id} className={`message message-${message.role}`} data-mode={displayMode || undefined}>
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-stack">
                <div className="message-content">
                  <div className="message-header">
                    {message.mode && (
                      <span className={`mode-badge mode-${message.mode}`}>{message.mode}</span>
                    )}
                    <span className="message-role">
                      {message.role === 'user' ? '你' : 'MiMoCode'}
                    </span>
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    <div className="message-actions">
                      <CopyButton content={message.content} />
                      {sessionId && (
                        <BookmarkButton
                          bookmarked={message.bookmarked || false}
                          onToggle={() => toggleBookmark(sessionId, message.id)}
                        />
                      )}
                    </div>
                  </div>
                  {display.badges.length > 0 && (
                    <div className="message-badges">
                      {display.badges.map(badge => <span key={badge} className={`mode-badge mode-${badge.toLowerCase()}`}>{badge}</span>)}
                    </div>
                  )}
                  {message.role === 'assistant' && message.parts && message.parts.length > 0 && (
                    <ExecutionTrace
                      parts={message.parts}
                      collapsedByDefault={Boolean(display.content.trim()) && message.parts.every(part => part.collapsed)}
                    />
                  )}
                  <div className="message-text">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '')
                          const isInline = !match && !String(children).includes('\n')
                          if (isInline) {
                            return <code className={className} {...props}>{children}</code>
                          }
                          return (
                            <CodeBlock
                              code={String(children).replace(/\n$/, '')}
                              language={match?.[1]}
                            />
                          )
                        }
                      }}
                    >
                      {display.content}
                    </Markdown>
                  </div>
                </div>
                {isRunning && message.id === lastAssistantMessageId && (
                  <ThinkingStatus />
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {showScrollToBottom && (
        <button
          type="button"
          className="scroll-to-bottom-button"
          aria-label="回到最新消息"
          title="回到最新消息"
          onClick={() => {
            setAutoFollow(true)
            setShowScrollToBottom(false)
            scrollToBottom()
          }}
        >
          ↓
        </button>
      )}
    </div>
  )
}

function isNearBottom(element: HTMLElement, threshold = 120) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
}

function ExecutionTrace({ parts, collapsedByDefault }: { parts: MessagePart[]; collapsedByDefault: boolean }) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault)

  useEffect(() => {
    if (collapsedByDefault) setCollapsed(true)
  }, [collapsedByDefault])

  if (parts.length === 0) return null

  return (
    <div className={`execution-trace ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="execution-trace-header"
        onClick={() => setCollapsed(prev => !prev)}
      >
        <span className="execution-chevron">{collapsed ? '›' : '⌄'}</span>
        <span className="execution-dot" />
        <span>{collapsed ? '已处理' : '执行过程'}</span>
        <span className="execution-count">{parts.length}</span>
      </button>
      {!collapsed && (
        <div className="execution-trace-list">
          {parts.map(part => (
            <ExecutionPart key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptySessionBackdrop() {
  const stars = Array.from({ length: 30 }, (_, index) => index)
  const [burstId, setBurstId] = useState(0)

  return (
    <div className="mimo-empty-backdrop" aria-label="MiMoCode 空会话背景">
      <div className="mimo-stars" aria-hidden="true">
        {stars.map(star => <span key={star} className={`mimo-star s${star + 1}`}>✦</span>)}
        <span className="mimo-meteor m1"><i /></span>
        <span className="mimo-meteor m2"><i /></span>
        <span className="mimo-meteor m3"><i /></span>
      </div>
      <div className="mimo-hero-card">
        <button
          type="button"
          className="mimo-logo-button"
          aria-label="触发 MiMo Logo 特效"
          onClick={() => setBurstId(Date.now())}
        >
          <span className="mimo-hero-kicker">Xiaomi</span>
          {burstId > 0 && (
            <>
              <span className="mimo-logo-burst" key={burstId} aria-hidden="true" />
              <span className="mimo-logo-particles" key={`p-${burstId}`} aria-hidden="true">
                {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
              </span>
            </>
          )}
          <span className="mimo-pixel-logo" aria-label="MiMo Code">
            {MIMO_LOGO_ROWS.map((row, rowIndex) => (
              <span
                className={`mimo-logo-row ${rowIndex === 0 ? 'label' : ''}`}
                key={`${row}-${rowIndex}`}
                style={{ gridTemplateColumns: `repeat(${MIMO_LOGO_COLUMNS}, 0.66em)` }}
              >
                {Array.from(row.padEnd(MIMO_LOGO_COLUMNS, ' ')).map((char, columnIndex) => (
                  <span
                    className={`mimo-logo-cell ${columnIndex < MIMO_LOGO_SPLIT ? 'left' : 'right'} ${char === ' ' ? 'space' : ''}`}
                    key={`${rowIndex}-${columnIndex}`}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </button>
        <div className="mimo-cli-tip">
          <span />
          提示：直接在底部输入任务，或先用 Compose / Plan 梳理需求。
        </div>
      </div>
      <div className="mimo-empty-footer">~ ◎ MCP /status</div>
    </div>
  )
}

const MIMO_LOGO_THIN = {
  left: [
    '                  ',
    '                  ',
    '█▀▄▀█ █ █▀▄▀█ █▀▀█',
    '█ ▀ █ █ █ ▀ █ █  █',
    '▀   ▀ ▀ ▀   ▀ ▀▀▀▀',
  ],
  right: [
    '              Xiaomi',
    '                    ',
    '  █▀▀ █▀▀█ █▀▀▄ █▀▀▀',
    '  █   █  █ █  █ █▀▀ ',
    '  ▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀▀',
  ],
}

const MIMO_LOGO_GAP = ' '
const MIMO_LOGO_SPLIT = MIMO_LOGO_THIN.left[0].length + MIMO_LOGO_GAP.length
const MIMO_LOGO_ROWS = MIMO_LOGO_THIN.left.map((left, index) => `${left}${MIMO_LOGO_GAP}${MIMO_LOGO_THIN.right[index] ?? ''}`)
const MIMO_LOGO_COLUMNS = Math.max(...MIMO_LOGO_ROWS.map(row => row.length))

function ExecutionPart({ part }: { part: MessagePart }) {
  const [collapsed, setCollapsed] = useState(part.collapsed ?? true)

  return (
    <div className={`execution-part ${part.type}`}>
      <button
        type="button"
        className="execution-part-header"
        onClick={() => setCollapsed(prev => !prev)}
      >
        <span>{collapsed ? '›' : '⌄'}</span>
        <strong>{part.title}</strong>
        <time>{part.timestamp.toLocaleTimeString()}</time>
      </button>
      {!collapsed && (
        <pre className="execution-part-body">{part.content}</pre>
      )}
    </div>
  )
}

function parseMessageDisplay(content: string) {
  const lines = content.split('\n')
  const badges: string[] = []
  const bodyLines = [...lines]
  let mode: string | null = null

  // New format: ---\nmode: <mode>\n---
  const modeMatch = content.match(/^---\nmode:\s*(compose|plan|build)\n---/)
  if (modeMatch) {
    mode = modeMatch[1]
    badges.push(mode)
    const afterMode = content.slice(modeMatch[0].length).replace(/^\n+/, '')
    return { content: afterMode, badges, mode }
  }

  // Legacy format: Mode: Compose.
  if (bodyLines[0]?.startsWith('Mode:')) {
    const modeStr = bodyLines.shift()?.replace('Mode:', '').replace('.', '').trim()
    if (modeStr) {
      mode = modeStr.toLowerCase()
      badges.push(modeStr)
    }
  }

  if (bodyLines[0]?.startsWith('Workflow:')) {
    const workflow = bodyLines.shift()?.replace('Workflow:', '').replace('enabled.', '').trim()
    if (workflow) badges.push(workflow)
  }

  while (bodyLines[0] === '') bodyLines.shift()

  return { content: bodyLines.join('\n'), badges, mode }
}
