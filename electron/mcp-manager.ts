import fs from 'fs'
import path from 'path'
import os from 'os'

export interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  enabled: boolean
  source?: 'gui' | 'claude'
  readonly?: boolean
}

const MCP_CONFIG_DIR = path.join(os.homedir(), '.mimo')
const MCP_CONFIG_FILE = path.join(MCP_CONFIG_DIR, 'mcp.json')

function ensureConfigDir(): void {
  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true })
  }
}

export function loadMcpConfig(): McpServerConfig[] {
  const servers: McpServerConfig[] = []
  try {
    if (fs.existsSync(MCP_CONFIG_FILE)) {
      const raw = fs.readFileSync(MCP_CONFIG_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (data && typeof data === 'object') {
        const guiServers = Array.isArray(data) ? data : data.servers
        if (Array.isArray(guiServers)) {
          servers.push(...guiServers.map((s: Record<string, unknown>) => ({
            id: String(s.id || ''),
            name: String(s.name || ''),
            command: String(s.command || ''),
            args: Array.isArray(s.args) ? s.args.map(String) : [],
            env: s.env && typeof s.env === 'object' ? s.env as Record<string, string> : undefined,
            enabled: s.enabled !== false,
            source: 'gui' as const,
          })).filter((s: McpServerConfig) => s.id && s.command))
        }
      }
    }
  } catch {
    // Keep loading other MCP sources.
  }

  const claudeServers = loadClaudeMcpConfig()
  const existingNames = new Set(servers.map(server => server.name))
  for (const server of claudeServers) {
    if (!existingNames.has(server.name)) {
      servers.push(server)
    }
  }

  return servers
}

function loadClaudeMcpConfig(): McpServerConfig[] {
  try {
    const claudeConfigFile = path.join(os.homedir(), '.claude.json')
    if (!fs.existsSync(claudeConfigFile)) return []
    const raw = fs.readFileSync(claudeConfigFile, 'utf-8')
    const data = JSON.parse(raw)
    const mcpServers = data?.mcpServers
    if (!mcpServers || typeof mcpServers !== 'object') return []

    return parseClaudeMcpServers(mcpServers)
  } catch {
    return []
  }
}

export function parseClaudeMcpServers(mcpServers: unknown): McpServerConfig[] {
  if (!mcpServers || typeof mcpServers !== 'object') return []
  return Object.entries(mcpServers).map(([name, value]) => {
    const config = value as Record<string, unknown>
    return {
      id: `claude:${name}`,
      name,
      command: String(config.command || ''),
      args: Array.isArray(config.args) ? config.args.map(String) : [],
      env: config.env && typeof config.env === 'object' ? config.env as Record<string, string> : undefined,
      enabled: config.disabled !== true,
      source: 'claude' as const,
      readonly: true,
    }
  }).filter((server: McpServerConfig) => server.command)
}

export function saveMcpConfig(servers: McpServerConfig[]): boolean {
  try {
    ensureConfigDir()
    fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify({ servers }, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

export function addMcpServer(server: Omit<McpServerConfig, 'id'>): McpServerConfig | null {
  try {
    const servers = loadMcpConfig()
    const id = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newServer: McpServerConfig = { ...server, id }
    servers.push(newServer)
    if (saveMcpConfig(servers)) return newServer
    return null
  } catch {
    return null
  }
}

export function updateMcpServer(id: string, updates: Partial<Omit<McpServerConfig, 'id'>>): McpServerConfig | null {
  try {
    if (id.startsWith('claude:')) return null
    const servers = loadMcpConfig()
    const idx = servers.findIndex(s => s.id === id)
    if (idx === -1) return null
    servers[idx] = { ...servers[idx], ...updates }
    if (saveMcpConfig(servers)) return servers[idx]
    return null
  } catch {
    return null
  }
}

export function removeMcpServer(id: string): boolean {
  try {
    if (id.startsWith('claude:')) return false
    const servers = loadMcpConfig()
    const filtered = servers.filter(s => s.id !== id)
    if (filtered.length === servers.length) return false
    return saveMcpConfig(filtered)
  } catch {
    return false
  }
}

export function toggleMcpServer(id: string): McpServerConfig | null {
  if (id.startsWith('claude:')) return null
  const servers = loadMcpConfig()
  const server = servers.find(s => s.id === id)
  if (!server) return null
  return updateMcpServer(id, { enabled: !server.enabled })
}
