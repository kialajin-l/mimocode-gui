# 侧边栏升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the flat session list into a collapsible project tree with color-coded project nodes, nested sessions, and a new project button.

**Architecture:** Add a `Project` type that groups sessions. Update the Zustand store to manage projects alongside sessions. Replace the flat `SessionList` with a `ProjectNode` + `SessionItem` tree structure. Style with the dark theme from `ui/index.html`.

**Tech Stack:** React, Zustand, TypeScript, CSS

---

## File Structure

| File | Purpose |
|------|---------|
| `src/types/session.ts` | Add `Project` interface |
| `src/stores/sessionStore.ts` | Add project CRUD operations |
| `src/components/Sidebar/ProjectNode.tsx` | **New** — collapsible project node |
| `src/components/Sidebar/SessionList.tsx` | Rewrite to render project tree |
| `src/components/Sidebar/SessionItem.tsx` | Minor update — remove delete button from here |
| `src/App.css` | Add sidebar styles matching prototype |

---

### Task 1: Add Project type and store operations

**Covers:** Project data model

**Files:**
- Modify: `src/types/session.ts`
- Modify: `src/stores/sessionStore.ts`

- [ ] **Step 1: Add Project interface to session.ts**

```typescript
// Add after the Session interface

const PROJECT_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#ef4444', '#eab308', '#ec4899'] as const

interface Project {
  id: string
  name: string
  color: string
  createdAt: Date
}
```

- [ ] **Step 2: Update Session interface to include projectId**

```typescript
// Add to existing Session interface
interface Session {
  id: string
  name: string
  pid: number | null
  status: 'idle' | 'running' | 'error'
  cwd: string
  messages: Message[]
  projectId: string | null  // ADD THIS
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 3: Update sessionStore with project operations**

Add to `SessionState` interface:
```typescript
interface SessionState {
  sessions: Session[]
  projects: Project[]
  activeSessionId: string | null
  createProject: (name: string) => Project
  deleteProject: (id: string) => void
  // ... existing methods
}
```

Add implementations:
```typescript
projects: [],

createProject: (name) => {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    color: PROJECT_COLORS[useSessionStore.getState().projects.length % PROJECT_COLORS.length],
    createdAt: new Date()
  }
  set((state) => ({ projects: [...state.projects, project] }))
  return project
},

deleteProject: (id) => {
  set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    sessions: state.sessions.map(s => s.projectId === id ? { ...s, projectId: null } : s)
  }))
},
```

Update `createSession` to accept optional `projectId`:
```typescript
createSession: (name, cwd, projectId?: string) => {
  const session: Session = {
    id: crypto.randomUUID(),
    name,
    pid: null,
    status: 'idle',
    cwd,
    messages: [],
    projectId: projectId || null,  // ADD
    createdAt: new Date(),
    updatedAt: new Date()
  }
  // ... rest unchanged
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

---

### Task 2: Create ProjectNode component

**Covers:** Collapsible project UI

**Files:**
- Create: `src/components/Sidebar/ProjectNode.tsx`

- [ ] **Step 1: Create ProjectNode component**

```tsx
import { useState } from 'react'
import { Project, Session } from '../../types/session'
import { SessionItem } from './SessionItem'

interface ProjectNodeProps {
  project: Project
  sessions: Session[]
  activeSessionId: string | null
  expanded: boolean
  onToggle: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export function ProjectNode({ 
  project, sessions, activeSessionId, expanded, onToggle, 
  onSelectSession, onDeleteSession 
}: ProjectNodeProps) {
  return (
    <div className={`project-node ${expanded ? 'expanded' : ''}`}>
      <div className="project-header" onClick={onToggle}>
        <span className="project-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <span className="project-icon-dot" style={{ background: project.color }} />
        <span className="project-name-text">{project.name}</span>
      </div>
      {expanded && (
        <div className="session-list-nested">
          {sessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onSelectSession(session.id)}
              onDelete={() => onDeleteSession(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

---

### Task 3: Rewrite SessionList with project tree

**Covers:** Session list with project grouping

**Files:**
- Modify: `src/components/Sidebar/SessionList.tsx`

- [ ] **Step 1: Rewrite SessionList**

```tsx
import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { ProjectNode } from './ProjectNode'

export function SessionList() {
  const { sessions, projects, activeSessionId, createSession, deleteSession, 
          setActiveSession, createSession, createProject, deleteProject } = useSession()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim())
      setNewProjectName('')
      setShowNewProject(false)
    }
  }

  const ungroupedSessions = sessions.filter(s => !s.projectId)

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={() => setShowNewProject(!showNewProject)} className="session-list-add">+</button>
      </div>

      {showNewProject && (
        <div className="session-input-row">
          <input
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            autoFocus
          />
          <button onClick={handleCreateProject} disabled={!newProjectName.trim()}>OK</button>
        </div>
      )}

      <div className="session-list-items">
        {projects.map(project => (
          <ProjectNode
            key={project.id}
            project={project}
            sessions={sessions.filter(s => s.projectId === project.id)}
            activeSessionId={activeSessionId}
            expanded={expandedProjects.has(project.id)}
            onToggle={() => toggleProject(project.id)}
            onSelectSession={setActiveSession}
            onDeleteSession={deleteSession}
          />
        ))}

        {ungroupedSessions.length > 0 && (
          <div className="session-list-ungrouped">
            <div className="session-list-section-label">其他</div>
            {ungroupedSessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSession(session.id)}
              >
                <span className="session-title">{session.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
        + New project
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update useSession hook to expose project operations**

In `src/hooks/useSession.ts`, add to the store destructuring:
```typescript
const {
  sessions,
  activeSessionId,
  projects,          // ADD
  createSession,
  deleteSession,
  setActiveSession,
  addMessage,
  updateSession,
  createProject,     // ADD
  deleteProject      // ADD
} = useSessionStore()
```

Add to return value:
```typescript
return {
  sessions,
  activeSession,
  activeSessionId,
  projects,          // ADD
  createSession,
  deleteSession,
  setActiveSession,
  sendMessage,
  cancelMessage,
  createProject,     // ADD
  deleteProject      // ADD
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

---

### Task 4: Add sidebar CSS styles

**Covers:** Visual styling matching prototype

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add project tree CSS**

Append to `src/App.css`:

```css
/* Project tree */
.project-node {
  margin: 1px 8px;
  border-radius: 6px;
}

.project-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 140ms;
  color: #72727a;
  font-size: 13px;
  font-weight: 500;
}

.project-header:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.project-chevron {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 140ms cubic-bezier(0.25, 1, 0.5, 1);
  flex-shrink: 0;
  color: var(--text-secondary, #555);
}

.project-chevron svg {
  width: 12px;
  height: 12px;
}

.project-node.expanded .project-chevron {
  transform: rotate(90deg);
}

.project-icon-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-name-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Nested session list */
.session-list-nested {
  padding-left: 12px;
}

.session-list-nested .session-item {
  padding: 5px 10px 5px 24px;
  margin: 1px 0;
  font-size: 12.5px;
  position: relative;
}

.session-list-nested .session-item.active::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--accent-color, #7c3aed);
  border-radius: 0 2px 2px 0;
}

/* Ungrouped sessions */
.session-list-section-label {
  padding: 6px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #555);
}

/* New project button */
.new-project-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  margin: 6px 8px;
  border-radius: 6px;
  color: var(--text-secondary, #555);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  transition: all 140ms;
  border: 1px dashed var(--border-color, #333);
  background: transparent;
  font-family: inherit;
  width: calc(100% - 16px);
  text-align: left;
}

.new-project-btn:hover {
  border-color: var(--accent-color, #7c3aed);
  color: var(--accent-color, #7c3aed);
  background-color: rgba(124, 58, 237, 0.08);
}
```

- [ ] **Step 2: Update session-item active style for dark theme**

In `src/App.css`, update existing `.session-item.active`:
```css
.session-item.active {
  background-color: rgba(124, 58, 237, 0.12);
  color: var(--text-primary, #eee);
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

---

### Task 5: Wire up project creation in new session flow

**Covers:** Create session within a project

**Files:**
- Modify: `src/components/Sidebar/SessionList.tsx`

- [ ] **Step 1: Add "new session" to project context**

Update ProjectNode to accept an `onNewSession` prop and add a "+" button:

In `ProjectNode.tsx`, add to props:
```typescript
interface ProjectNodeProps {
  // ... existing
  onNewSession: (projectId: string) => void  // ADD
}
```

Add button in the project header (after project-name-text):
```tsx
<button 
  className="project-add-session" 
  onClick={(e) => { e.stopPropagation(); onNewSession(project.id) }}
  title="New session"
>
  +
</button>
```

- [ ] **Step 2: Handle new session in SessionList**

In `SessionList.tsx`, add handler:
```typescript
const handleNewSessionInProject = (projectId: string) => {
  const name = `Session ${sessions.length + 1}`
  createSession(name, '.', projectId)
  // Expand the project
  setExpandedProjects(prev => new Set(prev).add(projectId))
}
```

Pass to ProjectNode:
```tsx
<ProjectNode
  // ... existing props
  onNewSession={handleNewSessionInProject}
/>
```

- [ ] **Step 3: Verify build and manual test**

Run: `npm run build`
Then: `npm run electron:dev`
Test: Create a project, add sessions within it, verify collapse/expand works

---

### Task 6: Clean up and commit

**Covers:** Final cleanup

**Files:**
- All modified files

- [ ] **Step 1: Remove unused code from SessionItem**

Check if `SessionItem.tsx` still has the delete button. If it's now handled by ProjectNode or parent, simplify it.

- [ ] **Step 2: Run final build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/types/session.ts src/stores/sessionStore.ts src/components/Sidebar/ProjectNode.tsx src/components/Sidebar/SessionList.tsx src/hooks/useSession.ts src/App.css
git commit -m "feat: upgrade sidebar with project tree and collapsible sessions"
```
