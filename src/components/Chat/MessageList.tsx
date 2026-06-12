import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from '../../types/session'
import { CodeBlock } from './CodeBlock'
import { BookmarkButton } from './BookmarkButton'
import { useSessionStore } from '../../stores/sessionStore'

interface MessageListProps {
  messages: Message[]
  sessionId?: string
}

export function MessageList({ messages, sessionId }: MessageListProps) {
  const toggleBookmark = useSessionStore(s => s.toggleMessageBookmark)

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message message-${message.role}`}>
          <div className="message-avatar">
            {message.role === 'user' ? '👤' : '🤖'}
          </div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? 'You' : 'MiMoCode'}
              </span>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {sessionId && (
                <BookmarkButton
                  bookmarked={message.bookmarked || false}
                  onToggle={() => toggleBookmark(sessionId, message.id)}
                />
              )}
            </div>
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
                {message.content}
              </Markdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
