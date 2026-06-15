import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ScannedSkill {
  id: string
  name: string
  description: string
  path: string
  source: string
  enabled: boolean
}

// Skill directories: follows OpenCode/Codex/Claude conventions
const SKILL_DIRS = [
  path.join(os.homedir(), '.agents', 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
  path.join(os.homedir(), '.codex', 'skills'),
  path.join(os.homedir(), '.mimo', 'skills'),
  path.join(os.homedir(), '.local', 'share', 'mimo', 'skills'),
]

// Read SKILL.md frontmatter or fallback to directory name
function readSkillManifest(dirPath: string): { name: string; description: string } | null {
  const skillMdPath = path.join(dirPath, 'SKILL.md')
  try {
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf-8')
      // Extract frontmatter between --- markers
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]
        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
        return {
          name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : path.basename(dirPath),
          description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '',
        }
      }
      // No frontmatter, use first line as description
      const firstLine = content.split('\n').find(line => line.trim() && !line.startsWith('#'))
      return {
        name: path.basename(dirPath),
        description: firstLine?.trim() || '',
      }
    }
  } catch {
    // skip malformed files
  }

  // Fallback: check for JSON manifests
  const candidates = ['skill.json', 'manifest.json', 'package.json']
  for (const name of candidates) {
    const filePath = path.join(dirPath, name)
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(raw)
        if (data && typeof data === 'object') {
          return {
            name: data.name || path.basename(dirPath),
            description: data.description || '',
          }
        }
      }
    } catch {
      // skip malformed files
    }
  }

  return null
}

function scanDirectory(dirPath: string): ScannedSkill[] {
  const results: ScannedSkill[] = []
  try {
    if (!fs.existsSync(dirPath)) return results
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue // skip hidden dirs like .system
      const skillDir = path.join(dirPath, entry.name)
      const manifest = readSkillManifest(skillDir)
      if (manifest) {
        results.push({
          id: entry.name,
          name: manifest.name,
          description: manifest.description,
          path: skillDir,
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

export function scanSkillDirectories(): ScannedSkill[] {
  const all: ScannedSkill[] = []
  for (const dir of SKILL_DIRS) {
    all.push(...scanDirectory(dir))
  }
  return all
}
