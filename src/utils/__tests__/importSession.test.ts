import { describe, it, expect } from 'vitest'
import { parseMarkdownToSession } from '../importSession'

describe('parseMarkdownToSession', () => {
  it('parses title from # heading', () => {
    const md = `# My Session Title\n\n## User\nhello\n`
    const session = parseMarkdownToSession(md, 'test.md')
    expect(session.name).toBe('My Session Title')
  })

  it('falls back to filename when no # heading', () => {
    const md = `## User\nhello\n`
    const session = parseMarkdownToSession(md, 'my-file.md')
    expect(session.name).toBe('my-file')
  })

  it('strips extension from filename fallback', () => {
    const md = '## User\nhi'
    expect(parseMarkdownToSession(md, 'chat.markdown').name).toBe('chat')
    expect(parseMarkdownToSession(md, 'chat.txt').name).toBe('chat')
  })

  it('parses user and assistant sections', () => {
    const md = `# Chat\n\n## User\nWhat is 2+2?\n\n## Assistant\nThe answer is 4.\n`
    const session = parseMarkdownToSession(md, 'test.md')
    const nonEmpty = session.messages.filter(m => m.content.length > 0)
    expect(nonEmpty).toHaveLength(2)
    expect(nonEmpty[0].role).toBe('user')
    expect(nonEmpty[0].content).toBe('What is 2+2?')
    expect(nonEmpty[1].role).toBe('assistant')
    expect(nonEmpty[1].content).toBe('The answer is 4.')
  })

  it('ignores --- separators and metadata lines', () => {
    const md = `# Session\n\n---\n\nExported from MiMoCode\n\n> Created: 2026-01-01\n\n## User\nhello\n`
    const session = parseMarkdownToSession(md, 'test.md')
    const nonEmpty = session.messages.filter(m => m.content.length > 0)
    expect(nonEmpty).toHaveLength(1)
    expect(nonEmpty[0].content).toBe('hello')
  })

  it('returns correct session defaults', () => {
    const session = parseMarkdownToSession('', 'test.md')
    expect(session.pid).toBeNull()
    expect(session.status).toBe('idle')
    expect(session.cwd).toBe('.')
    expect(session.versions).toEqual([])
    expect(session.projectId).toBeNull()
    expect(session.changes).toEqual([])
    expect(session.tags).toEqual([])
  })

  it('handles multi-line message content', () => {
    const md = `## User\nline 1\nline 2\nline 3\n`
    const session = parseMarkdownToSession(md, 'test.md')
    const nonEmpty = session.messages.filter(m => m.content.length > 0)
    expect(nonEmpty).toHaveLength(1)
    expect(nonEmpty[0].content).toBe('line 1\nline 2\nline 3')
  })
})
