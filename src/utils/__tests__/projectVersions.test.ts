import { describe, expect, it } from 'vitest'
import { getProjectVersionSessionId } from '../projectVersions'
import { Session } from '../../types/session'

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: 'session',
    name: 'Session',
    pid: null,
    status: 'idle',
    cwd: '/repo',
    messages: [],
    versions: [],
    projectId: 'project-1',
    changes: [],
    tags: [],
    createdAt: new Date('2026-06-15T08:00:00Z'),
    updatedAt: new Date('2026-06-15T08:00:00Z'),
    ...overrides,
  }
}

describe('projectVersions', () => {
  it('uses archived versions from the same project when active session has no versions', () => {
    const active = makeSession({ id: 'active', versions: [] })
    const archived = makeSession({
      id: 'archived',
      archived: true,
      archivedAt: new Date('2026-06-15T10:00:00Z'),
      versions: [{
        id: 'v1',
        label: '归档：Session 1',
        messages: [],
        timestamp: new Date('2026-06-15T10:00:00Z'),
      }],
    })

    expect(getProjectVersionSessionId([active, archived], active.id)).toBe('archived')
  })

  it('prefers active session versions when present', () => {
    const active = makeSession({
      id: 'active',
      versions: [{
        id: 'v-active',
        label: '会话版本 1',
        messages: [],
        timestamp: new Date('2026-06-15T11:00:00Z'),
      }],
    })
    const archived = makeSession({
      id: 'archived',
      archived: true,
      archivedAt: new Date('2026-06-15T10:00:00Z'),
      versions: [{
        id: 'v-archived',
        label: '归档：Session 1',
        messages: [],
        timestamp: new Date('2026-06-15T10:00:00Z'),
      }],
    })

    expect(getProjectVersionSessionId([active, archived], active.id)).toBe('active')
  })

  it('returns null when there is no active session', () => {
    const older = makeSession({
      id: 'older',
      archived: true,
      archivedAt: new Date('2026-06-15T09:00:00Z'),
      versions: [{ id: 'old', label: 'old', messages: [], timestamp: new Date() }],
    })
    const newer = makeSession({
      id: 'newer',
      archived: true,
      archivedAt: new Date('2026-06-15T10:00:00Z'),
      versions: [{ id: 'new', label: 'new', messages: [], timestamp: new Date() }],
    })

    expect(getProjectVersionSessionId([older, newer])).toBeNull()
  })
})
