import fs from 'fs'
import path from 'path'

interface MemoryFile {
  name: string
  path: string
  content: string
  mtime: number
}

interface CheckpointFile {
  name: string
  path: string
  content: string
  mtime: number
}

function scanMdFiles(dir: string): MemoryFile[] {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(dir, f)
        const stat = fs.statSync(filePath)
        return {
          name: f,
          path: filePath,
          content: fs.readFileSync(filePath, 'utf-8'),
          mtime: stat.mtimeMs
        }
      })
      .sort((a, b) => b.mtime - a.mtime)
  } catch (err) {
    console.error('[LocalDataAdapter] scanMdFiles error:', err)
    return []
  }
}

function scanNamedMdFiles(projectDir: string, names: string[]): MemoryFile[] {
  return names
    .map(name => path.join(projectDir, name))
    .filter(filePath => fs.existsSync(filePath))
    .map(filePath => {
      const stat = fs.statSync(filePath)
      return {
        name: path.basename(filePath),
        path: filePath,
        content: fs.readFileSync(filePath, 'utf-8'),
        mtime: stat.mtimeMs
      }
    })
}

function validateProjectDir(projectDir: string): boolean {
  if (!projectDir || typeof projectDir !== 'string') return false
  // Reject path traversal
  if (projectDir.includes('..')) return false
  // Reject absolute paths outside reasonable locations
  const resolved = path.resolve(projectDir)
  if (!resolved.match(/^[A-Z]:\\|^\/home\/|^\/Users\//i)) return false
  return true
}

export function readMemoryFiles(projectDir: string): MemoryFile[] {
  if (!validateProjectDir(projectDir)) return []
  const memoryDir = path.join(projectDir, '.claude', 'memory')
  const altMemoryDir = path.join(projectDir, '.mimo', 'memory')
  const mimoCodeMemoryDir = path.join(projectDir, '.mimocode', 'memory')
  const files = [
    ...scanNamedMdFiles(projectDir, ['MEMORY.md', 'notes.md']),
    ...scanMdFiles(memoryDir),
    ...scanMdFiles(altMemoryDir),
    ...scanMdFiles(mimoCodeMemoryDir)
  ]
  const seen = new Set<string>()
  return files.filter(f => {
    if (seen.has(f.name)) return false
    seen.add(f.name)
    return true
  })
}

export function readCheckpoints(projectDir: string): CheckpointFile[] {
  if (!validateProjectDir(projectDir)) return []
  const checkpointDir = path.join(projectDir, '.claude', 'checkpoints')
  const altCheckpointDir = path.join(projectDir, '.mimo', 'checkpoints')
  const mimoCodeCheckpointDir = path.join(projectDir, '.mimocode', 'checkpoints')
  const files = [
    ...scanNamedMdFiles(projectDir, ['checkpoint.md']),
    ...scanMdFiles(checkpointDir),
    ...scanMdFiles(altCheckpointDir),
    ...scanMdFiles(mimoCodeCheckpointDir)
  ]
  const seen = new Set<string>()
  return files.filter(f => {
    if (seen.has(f.name)) return false
    seen.add(f.name)
    return true
  })
}
