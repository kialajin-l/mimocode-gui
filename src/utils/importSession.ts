import { Session, Message } from '../types/session'

export function parseMarkdownToSession(content: string, filename: string): Omit<Session, 'id' | 'createdAt' | 'updatedAt'> {
  const lines = content.split('\n')
  const messages: Message[] = []
  let currentRole: 'user' | 'assistant' | 'system' = 'user'
  let currentContent: string[] = []
  let sessionName = filename.replace(/\.(md|markdown|txt)$/i, '')

  for (const line of lines) {
    if (line.startsWith('# ')) {
      sessionName = line.slice(2).trim()
      continue
    }

    if (line.startsWith('## User')) {
      if (currentContent.length > 0) {
        messages.push(createMessage(currentRole, currentContent.join('\n')))
      }
      currentRole = 'user'
      currentContent = []
    } else if (line.startsWith('## Assistant')) {
      if (currentContent.length > 0) {
        messages.push(createMessage(currentRole, currentContent.join('\n')))
      }
      currentRole = 'assistant'
      currentContent = []
    } else if (line === '---') {
      continue
    } else if (line.startsWith('Exported from')) {
      continue
    } else if (line.startsWith('> Created:')) {
      continue
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0) {
    messages.push(createMessage(currentRole, currentContent.join('\n')))
  }

  return {
    name: sessionName,
    pid: null,
    status: 'idle',
    cwd: '.',
    messages,
    versions: [],
    projectId: null,
    changes: [],
    tags: []
  }
}

function createMessage(role: 'user' | 'assistant' | 'system', content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content: content.trim(),
    timestamp: new Date()
  }
}
