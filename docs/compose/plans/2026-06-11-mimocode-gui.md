# MiMoCode Desktop GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop GUI for MiMoCode similar to Codex Desktop App, with chat interface, session management, and theme switching.

**Architecture:** Electron + React + Vite,复用 NightShift 2.0 的 Electron 框架和 Hermes-Pro 的 Chat 组件。每个会话是独立的 MiMoCode CLI 进程，支持 CLI 和 API 双模式。

**Tech Stack:** Electron 28+, React 18, TypeScript, Zustand, Tailwind CSS, Vite

---

## File Structure

```
E:\code\mimocode-gui\
├── electron/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本
│   ├── cli-bridge.ts        # CLI 调用封装
│   └── api-bridge.ts        # API 调用封装
├── src/
│   ├── App.tsx              # 根组件
│   ├── main.tsx             # React 入口
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ToolCallDisplay.tsx
│   │   ├── Sidebar/
│   │   │   ├── SessionList.tsx
│   │   │   └── SessionItem.tsx
│   │   └── Settings/
│   │       └── ThemeSwitcher.tsx
│   ├── hooks/
│   │   ├── useSession.ts
│   │   └── useTheme.ts
│   ├── services/
│   │   ├── mimocode-cli.ts
│   │   └── mimocode-api.ts
│   ├── stores/
│   │   ├── sessionStore.ts
│   │   └── themeStore.ts
│   └── themes/
│       ├── dark.css
│       ├── light.css
│       └── variables.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

---

## Task 1: Project Scaffolding

**Covers:** [S6]
**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Initialize project**

```bash
cd E:\code
mkdir mimocode-gui
cd mimocode-gui
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom zustand
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react electron electron-builder
```

- [ ] **Step 3: Create package.json**

```json
{
  "name": "mimocode-gui",
  "version": "1.0.0",
  "description": "MiMoCode Desktop GUI",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "vite build && electron .",
    "package": "electron-builder"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^28.0.0",
    "electron-builder": "^24.13.3",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MiMoCode</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './themes/variables.css'
import './themes/dark.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 8: Create src/App.tsx**

```tsx
function App() {
  return (
    <div className="app">
      <h1>MiMoCode Desktop</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: initial project scaffolding"
```

---

## Task 2: Theme System

**Covers:** [S3]
**Files:**
- Create: `src/themes/variables.css`
- Create: `src/themes/dark.css`
- Create: `src/themes/light.css`
- Create: `src/stores/themeStore.ts`
- Create: `src/hooks/useTheme.ts`
- Create: `src/components/Settings/ThemeSwitcher.tsx`

- [ ] **Step 1: Create theme variables**

```css
/* src/themes/variables.css */
:root {
  --transition-speed: 0.2s;
}
```

- [ ] **Step 2: Create dark theme**

```css
/* src/themes/dark.css */
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
  --accent-color: #6366f1;
  --accent-hover: #818cf8;
  --error-color: #ef4444;
  --success-color: #22c55e;
}
```

- [ ] **Step 3: Create light theme**

```css
/* src/themes/light.css */
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;
  --text-primary: #000000;
  --text-secondary: #666666;
  --border-color: #d1d5db;
  --accent-color: #6366f1;
  --accent-hover: #4f46e5;
  --error-color: #dc2626;
  --success-color: #16a34a;
}
```

- [ ] **Step 4: Create theme store**

```typescript
// src/stores/themeStore.ts
import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  }
}))
```

- [ ] **Step 5: Create useTheme hook**

```typescript
// src/hooks/useTheme.ts
import { useThemeStore } from '../stores/themeStore'

export function useTheme() {
  const { theme, setTheme } = useThemeStore()
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }
  
  return { theme, setTheme, toggleTheme }
}
```

- [ ] **Step 6: Create ThemeSwitcher component**

```tsx
// src/components/Settings/ThemeSwitcher.tsx
import { useTheme } from '../../hooks/useTheme'

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button onClick={toggleTheme} className="theme-switcher">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

- [ ] **Step 7: Update App.tsx to use theme**

```tsx
// src/App.tsx
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'

function App() {
  return (
    <div className="app">
      <header>
        <h1>MiMoCode</h1>
        <ThemeSwitcher />
      </header>
    </div>
  )
}

export default App
```

- [ ] **Step 8: Add base styles**

```css
/* Add to src/App.css or index.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
}

.theme-switcher {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background-color var(--transition-speed);
}

.theme-switcher:hover {
  background-color: var(--bg-tertiary);
}
```

- [ ] **Step 9: Test theme switching**

Run: `npm run dev`
Expected: App loads with dark theme, clicking theme button switches to light theme

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: add theme system with dark/light modes"
```

---

## Task 3: Session Store

**Covers:** [S3]
**Files:**
- Create: `src/stores/sessionStore.ts`
- Create: `src/hooks/useSession.ts`

- [ ] **Step 1: Create session types**

```typescript
// src/types/session.ts
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
```

- [ ] **Step 2: Create session store**

```typescript
// src/stores/sessionStore.ts
import { create } from 'zustand'
import { Session, Message } from '../types/session'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  createSession: (name: string, cwd: string) => Session
  deleteSession: (id: string) => void
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateSession: (id: string, updates: Partial<Session>) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  
  createSession: (name, cwd) => {
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      pid: null,
      status: 'idle',
      cwd,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id
    }))
    return session
  },
  
  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
    }))
  },
  
  setActiveSession: (id) => {
    set({ activeSessionId: id })
  },
  
  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      )
    }))
  },
  
  updateSession: (id, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      )
    }))
  }
}))
```

- [ ] **Step 3: Create useSession hook**

```typescript
// src/hooks/useSession.ts
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
  
  const sendMessage = async (content: string) => {
    if (!activeSession) return
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    addMessage(activeSession.id, userMessage)
    
    // TODO: Call CLI or API bridge
    // For now, simulate assistant response
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
  
  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    sendMessage
  }
}
```

- [ ] **Step 4: Test session store**

```typescript
// src/stores/sessionStore.test.ts
import { useSessionStore } from './sessionStore'

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], activeSessionId: null })
  })
  
  it('creates a session', () => {
    const { createSession } = useSessionStore.getState()
    const session = createSession('Test Session', '/tmp')
    
    expect(session.id).toBeDefined()
    expect(session.name).toBe('Test Session')
    expect(session.status).toBe('idle')
  })
  
  it('sets active session', () => {
    const { createSession, setActiveSession } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')
    
    setActiveSession(session.id)
    expect(useSessionStore.getState().activeSessionId).toBe(session.id)
  })
  
  it('adds message to session', () => {
    const { createSession, addMessage } = useSessionStore.getState()
    const session = createSession('Test', '/tmp')
    
    addMessage(session.id, {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date()
    })
    
    const updatedSession = useSessionStore.getState().sessions.find((s) => s.id === session.id)
    expect(updatedSession?.messages).toHaveLength(1)
  })
})
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add session store and useSession hook"
```

---

## Task 4: Chat Components

**Covers:** [S3]
**Files:**
- Create: `src/components/Chat/MessageList.tsx`
- Create: `src/components/Chat/MessageInput.tsx`
- Create: `src/components/Chat/ToolCallDisplay.tsx`

- [ ] **Step 1: Create MessageList component**

```tsx
// src/components/Chat/MessageList.tsx
import { Message } from '../../types/session'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
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
            </div>
            <div className="message-text">{message.content}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create MessageInput component**

```tsx
// src/components/Chat/MessageInput.tsx
import { useState, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState('')
  
  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <div className="message-input">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1}
      />
      <button onClick={handleSend} disabled={disabled || !input.trim()}>
        Send
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create ToolCallDisplay component**

```tsx
// src/components/Chat/ToolCallDisplay.tsx
interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: string
}

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (toolCalls.length === 0) return null
  
  return (
    <div className="tool-calls">
      <div className="tool-calls-header">Tool Calls</div>
      {toolCalls.map((call, index) => (
        <div key={index} className="tool-call">
          <div className="tool-call-name">{call.name}</div>
          <pre className="tool-call-args">{JSON.stringify(call.args, null, 2)}</pre>
          {call.result && (
            <div className="tool-call-result">
              <strong>Result:</strong> {call.result}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Add chat styles**

```css
/* Add to src/themes/variables.css or separate chat.css */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.message-content {
  flex: 1;
}

.message-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.message-role {
  font-weight: 600;
  color: var(--text-primary);
}

.message-time {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.message-text {
  color: var(--text-primary);
  line-height: 1.5;
}

.message-user {
  flex-direction: row-reverse;
}

.message-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
}

.message-input textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  resize: none;
  font-family: inherit;
}

.message-input textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.message-input button {
  padding: 0.75rem 1.5rem;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color var(--transition-speed);
}

.message-input button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.message-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-calls {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.tool-calls-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.tool-call {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.25rem;
}

.tool-call-name {
  font-weight: 600;
  color: var(--accent-color);
}

.tool-call-args {
  font-family: monospace;
  font-size: 0.875rem;
  overflow-x: auto;
}

.tool-call-result {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add chat components (MessageList, MessageInput, ToolCallDisplay)"
```

---

## Task 5: Sidebar Components

**Covers:** [S3]
**Files:**
- Create: `src/components/Sidebar/SessionList.tsx`
- Create: `src/components/Sidebar/SessionItem.tsx`

- [ ] **Step 1: Create SessionItem component**

```tsx
// src/components/Sidebar/SessionItem.tsx
import { Session } from '../../types/session'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  return (
    <div
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="session-item-content">
        <div className="session-item-name">{session.name}</div>
        <div className="session-item-status">
          <span className={`status-dot status-${session.status}`} />
          {session.status}
        </div>
      </div>
      <button
        className="session-item-delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create SessionList component**

```tsx
// src/components/Sidebar/SessionList.tsx
import { useSession } from '../../hooks/useSession'
import { SessionItem } from './SessionItem'

export function SessionList() {
  const { sessions, activeSessionId, setActiveSession, deleteSession, createSession } = useSession()
  
  const handleCreate = () => {
    const name = prompt('Session name:')
    if (name) {
      createSession(name, process.cwd())
    }
  }
  
  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={handleCreate} className="session-list-add">
          +
        </button>
      </div>
      <div className="session-list-items">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => setActiveSession(session.id)}
            onDelete={() => deleteSession(session.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add sidebar styles**

```css
/* Add to src/themes/variables.css or separate sidebar.css */
.session-list {
  width: 250px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.session-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.session-list-header h3 {
  margin: 0;
  font-size: 1rem;
}

.session-list-add {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-list-add:hover {
  background-color: var(--bg-tertiary);
}

.session-list-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color var(--transition-speed);
}

.session-item:hover {
  background-color: var(--bg-tertiary);
}

.session-item.active {
  background-color: var(--accent-color);
  color: white;
}

.session-item-content {
  flex: 1;
  min-width: 0;
}

.session-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.session-item.active .session-item-status {
  color: rgba(255, 255, 255, 0.8);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-idle {
  background-color: var(--success-color);
}

.status-running {
  background-color: var(--accent-color);
}

.status-error {
  background-color: var(--error-color);
}

.session-item-delete {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-speed);
}

.session-item:hover .session-item-delete {
  opacity: 1;
}

.session-item.active .session-item-delete {
  color: rgba(255, 255, 255, 0.8);
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add sidebar components (SessionList, SessionItem)"
```

---

## Task 6: Main Layout

**Covers:** [S3]
**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx with layout**

```tsx
// src/App.tsx
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { useSession } from './hooks/useSession'
import './App.css'

function App() {
  const { activeSession, sendMessage } = useSession()
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>MiMoCode</h1>
        <ThemeSwitcher />
      </header>
      <main className="app-main">
        <SessionList />
        <div className="app-chat">
          {activeSession ? (
            <>
              <MessageList messages={activeSession.messages} />
              <MessageInput onSend={sendMessage} />
            </>
          ) : (
            <div className="app-empty">
              <p>Select a session or create a new one</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Create App.css**

```css
/* src/App.css */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.app-header h1 {
  font-size: 1.25rem;
  margin: 0;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.app-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
```

- [ ] **Step 3: Test layout**

Run: `npm run dev`
Expected: App shows sidebar with session list, main area with empty state

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add main layout with sidebar and chat area"
```

---

## Task 7: Electron Integration

**Covers:** [S2]
**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/cli-bridge.ts`

- [ ] **Step 1: Create Electron main process**

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

- [ ] **Step 2: Create preload script**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.invoke('send-message', message),
  onMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('message', (_, message) => callback(message))
  }
})
```

- [ ] **Step 3: Create CLI bridge**

```typescript
// electron/cli-bridge.ts
import { spawn, ChildProcess } from 'child_process'

const processes = new Map<string, ChildProcess>()

export function startCliSession(sessionId: string, cwd: string): ChildProcess {
  const proc = spawn('mimocode', ['chat', '--session', sessionId], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  processes.set(sessionId, proc)
  
  proc.stdout?.on('data', (data) => {
    // Send to renderer
  })
  
  proc.stderr?.on('data', (data) => {
    // Handle errors
  })
  
  return proc
}

export function sendCliMessage(sessionId: string, message: string) {
  const proc = processes.get(sessionId)
  if (proc && proc.stdin) {
    proc.stdin.write(message + '\n')
  }
}

export function stopCliSession(sessionId: string) {
  const proc = processes.get(sessionId)
  if (proc) {
    proc.kill()
    processes.delete(sessionId)
  }
}
```

- [ ] **Step 4: Update package.json for Electron**

```json
{
  "main": "dist-electron/main.js",
  "scripts": {
    "electron:dev": "vite build && electron ."
  }
}
```

- [ ] **Step 5: Test Electron app**

Run: `npm run electron:dev`
Expected: Electron window opens, shows MiMoCode GUI

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Electron integration with CLI bridge"
```

---

## Task 8: Final Integration

**Covers:** [S7]
**Files:**
- Modify: various files for final touches

- [ ] **Step 1: Add keyboard shortcuts**

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react'
import { useSession } from './useSession'

export function useKeyboardShortcuts() {
  const { createSession } = useSession()
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            createSession('New Session', process.cwd())
            break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createSession])
}
```

- [ ] **Step 2: Add error boundary**

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

- [ ] **Step 3: Update App.tsx with error boundary**

```tsx
// src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeSwitcher } from './components/Settings/ThemeSwitcher'
import { SessionList } from './components/Sidebar/SessionList'
import { MessageList } from './components/Chat/MessageList'
import { MessageInput } from './components/Chat/MessageInput'
import { useSession } from './hooks/useSession'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function App() {
  const { activeSession, sendMessage } = useSession()
  useKeyboardShortcuts()
  
  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <h1>MiMoCode</h1>
          <ThemeSwitcher />
        </header>
        <main className="app-main">
          <SessionList />
          <div className="app-chat">
            {activeSession ? (
              <>
                <MessageList messages={activeSession.messages} />
                <MessageInput onSend={sendMessage} />
              </>
            ) : (
              <div className="app-empty">
                <p>Select a session or create a new one</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 4: Final test**

Run: `npm run dev`
Expected: Full app works with all features

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add keyboard shortcuts and error boundary"
```

---

## Summary

This plan covers the MVP implementation of MiMoCode Desktop GUI with:

1. **Project Scaffolding** - Basic Electron + React setup
2. **Theme System** - Dark/light theme switching
3. **Session Store** - State management for sessions
4. **Chat Components** - MessageList, MessageInput, ToolCallDisplay
5. **Sidebar Components** - SessionList, SessionItem
6. **Main Layout** - App structure
7. **Electron Integration** - CLI bridge
8. **Final Integration** - Keyboard shortcuts, error boundary

**Next Steps:**
1. Execute this plan task-by-task
2. Test each component
3. Iterate based on feedback
4. Add advanced features (file browser, code diff, etc.)
