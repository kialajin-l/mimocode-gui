import { describe, expect, it } from 'vitest'
import { buildRunArgs, getEventText } from './cli-message'

describe('cli message helpers', () => {
  it('strips GUI frontmatter before passing messages to the CLI', () => {
    const args = buildRunArgs({
      message: '---\nmode: compose\n---\n\nhello',
      permission: 'edit',
    })

    expect(args.at(-1)).toBe('hello')
    expect(args).not.toContain('---\nmode: compose\n---\n\nhello')
  })

  it('reads text from current MiMo JSON part events', () => {
    expect(getEventText({
      type: 'text',
      part: { text: 'Hello from part text' },
    })).toBe('Hello from part text')
  })
})
