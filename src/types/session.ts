export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface Session {
  id: string
  name: string
  pid: number | null
  status: 'running' | 'idle' | 'error'
  cwd: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
