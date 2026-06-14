import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ScannedPlugin {
  id: string
  name: string
  description: string
  path: string
  source: string
  enabled: boolean
}

const PLUGIN_DIRS = [
  path.join(os.homedir(), '.mimo', 'plugins'),
  path.join(os.homedir(), '.local', 'share', 'mimo', 'plugins'),
]

function readPluginManifest(dirPath: string): Record<string, any> | null {
  const candidates = ['plugin.json', 'manifest.json', 'package.json']
  for (const name of candidates) {
    const filePath = path.join(dirPath, name)
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(raw)
        if (data && typeof data === 'object') return data
      }
    } catch {
      // skip malformed files
    }
  }
  return null
}

function scanDirectory(dirPath: string): ScannedPlugin[] {
  const results: ScannedPlugin[] = []
  try {
    if (!fs.existsSync(dirPath)) return results
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pluginDir = path.join(dirPath, entry.name)
      const manifest = readPluginManifest(pluginDir)
      if (manifest) {
        results.push({
          id: manifest.id || entry.name,
          name: manifest.name || entry.name,
          description: manifest.description || '',
          path: pluginDir,
          source: dirPath,
          enabled: false,
        })
      }
    }
  } catch {
    // directory read errors are non-fatal
  }
  return results
}

export function scanPluginDirectories(): ScannedPlugin[] {
  const all: ScannedPlugin[] = []
  for (const dir of PLUGIN_DIRS) {
    all.push(...scanDirectory(dir))
  }
  return all
}
