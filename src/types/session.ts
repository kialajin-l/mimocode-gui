import { FileChange } from '../utils/diffParser'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface Project {
  id: string
  name: string
  color: string
  createdAt: Date
}

export const PROJECT_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#ef4444', '#eab308', '#ec4899'] as const

export interface Session {
  id: string
  name: string
  pid: number | null
  status: 'running' | 'idle' | 'error'
  cwd: string
  messages: Message[]
  projectId: string | null
  changes: FileChange[]
  createdAt: Date
  updatedAt: Date
}
