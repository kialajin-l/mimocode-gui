import { describe, expect, it } from 'vitest'
import { parseClaudeMcpServers } from './mcp-manager'

describe('mcp manager', () => {
  it('parses Claude MCP servers used by MiMo CLI', () => {
    const servers = parseClaudeMcpServers({
      codegraph: {
        type: 'stdio',
        command: 'codegraph',
        args: ['serve', '--mcp'],
      },
    })

    expect(servers).toEqual([
      {
        id: 'claude:codegraph',
        name: 'codegraph',
        command: 'codegraph',
        args: ['serve', '--mcp'],
        env: undefined,
        enabled: true,
        source: 'claude',
        readonly: true,
      },
    ])
  })
})
