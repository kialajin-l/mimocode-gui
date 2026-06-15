import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RightPanel } from '../RightPanel'
import { useSessionStore } from '../../../stores/sessionStore'

vi.mock('../../../stores/inspectorStore', () => ({
  useInspectorStore: () => ({
    fetchSessions: vi.fn(),
  }),
}))

vi.mock('../DiffViewer', () => ({
  DiffViewer: () => <div>审查面板</div>,
}))

describe('RightPanel versions', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], projects: [], activeSessionId: null, loaded: true })
  })

  it('shows local session versions for archived sessions with project context', () => {
    useSessionStore.setState({
      sessions: [{
        id: 'active-1',
        name: 'Active Session',
        pid: null,
        status: 'idle',
        cwd: '/tmp',
        messages: [],
        versions: [],
        projectId: 'project-1',
        changes: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'archived-1',
        name: 'Archived Session',
        pid: null,
        status: 'idle',
        cwd: '/tmp',
        messages: [],
        versions: [{
          id: 'v1',
          timestamp: new Date('2026-06-15T10:00:00Z'),
          label: '归档：Archived Session',
          messages: [{ id: 'm1', role: 'user', content: 'archived text', timestamp: new Date() }]
        }],
        projectId: 'project-1',
        changes: [],
        tags: [],
        archived: true,
        archivedAt: new Date('2026-06-15T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      activeSessionId: 'active-1',
    })

    render(<RightPanel open changes={[]} sessionId="active-1" />)

    fireEvent.click(screen.getByRole('button', { name: '会话版本' }))

    expect(screen.getByText('归档：Archived Session')).toBeTruthy()
    expect(screen.getByText(/1 条消息/)).toBeTruthy()
  })

  it('shows archived local versions from the active session project', () => {
    const baseSession = {
      pid: null,
      status: 'idle' as const,
      cwd: '/repo',
      messages: [],
      projectId: 'project-1',
      changes: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    useSessionStore.setState({
      sessions: [
        {
          ...baseSession,
          id: 'active-1',
          name: 'Session 5',
          versions: [],
        },
        {
          ...baseSession,
          id: 'archived-1',
          name: 'Session 4',
          versions: [{
            id: 'v1',
            timestamp: new Date('2026-06-15T10:00:00Z'),
            label: '归档：Session 4',
            messages: [{ id: 'm1', role: 'user', content: 'archived project text', timestamp: new Date() }]
          }],
          archived: true,
          archivedAt: new Date('2026-06-15T10:00:00Z'),
        }
      ],
      activeSessionId: 'active-1',
    })

    render(<RightPanel open changes={[]} sessionId="active-1" />)

    fireEvent.click(screen.getByRole('button', { name: '会话版本' }))

    expect(screen.getByText('归档：Session 4')).toBeTruthy()
  })
})
