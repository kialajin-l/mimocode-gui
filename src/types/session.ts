import { FileChange } from '../utils/diffParser'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  bookmarked?: boolean
  parts?: MessagePart[]
}

export interface MessagePart {
  id: string
  type: 'thinking' | 'tool' | 'metadata' | 'text' | 'error'
  title: string
  content: string
  timestamp: Date
  collapsed?: boolean
}

export interface Project {
  id: string
  name: string
  cwd: string
  color: string
  createdAt: Date
}

export const PROJECT_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#ef4444', '#eab308', '#ec4899'] as const

export interface SessionVersion {
  id: string
  timestamp: Date
  messages: Message[]
  label: string
}

export interface Session {
  id: string
  name: string
  pid: number | null
  status: 'running' | 'idle' | 'error'
  cwd: string
  messages: Message[]
  versions: SessionVersion[]
  projectId: string | null
  changes: FileChange[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
