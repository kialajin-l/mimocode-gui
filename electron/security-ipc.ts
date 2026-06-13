import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const LOGS_DIR = path.join(app.getPath('userData'), 'logs.json')

// --- Path Sanitization ---

export function validateFilePath(file: string): { valid: boolean; error?: string } {
  if (!file || typeof file !== 'string') {
    return { valid: false, error: 'Invalid file path' }
  }
  if (file.length > 500) {
    return { valid: false, error: 'File path too long' }
  }
  if (path.isAbsolute(file)) {
    return { valid: false, error: 'Absolute paths not allowed' }
  }
  if (file.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' }
  }
  return { valid: true }
}

export function validateCwd(cwd: string | undefined): { valid: boolean; resolved: string; error?: string } {
  const resolved = path.resolve(cwd || process.cwd())
  const projectRoot = process.cwd()
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    return { valid: false, resolved, error: 'Access denied: cwd outside project directory' }
  }
  return { valid: true, resolved }
}

export function isSensitiveFile(filePath: string): boolean {
  const basename = path.basename(filePath).toLowerCase()
  const patterns = ['.env', 'credentials', 'secret', 'password', 'token', '.key', '.pem', 'id_rsa', 'id_ed25519']
  return patterns.some(p => basename.includes(p))
}

// --- Operation Logging ---

export interface OperationLog {
  timestamp: string
  type: 'git-accept' | 'git-reject' | 'terminal-execute' | 'security-block'
  details: Record<string, string>
}

function readLogs(): OperationLog[] {
  try {
    if (fs.existsSync(LOGS_DIR)) {
      const raw = fs.readFileSync(LOGS_DIR, 'utf-8')
      return JSON.parse(raw)
    }
  } catch { /* ignore corrupt log */ }
  return []
}

function writeLogs(logs: OperationLog[]): void {
  try {
    const dir = path.dirname(LOGS_DIR)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    // Keep last 1000 entries
    const trimmed = logs.slice(-1000)
    fs.writeFileSync(LOGS_DIR, JSON.stringify(trimmed, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Security] Failed to write log:', err)
  }
}

export function logOperation(type: OperationLog['type'], details: Record<string, string>): void {
  const logs = readLogs()
  logs.push({
    timestamp: new Date().toISOString(),
    type,
    details
  })
  writeLogs(logs)
}

// --- Dangerous Command Detection ---

const DANGEROUS_PATTERNS = [
  // Unix destructive
  'rm -rf', 'rm -fr', 'rm -r ', 'rm -R ',
  'rmdir /s', 'rmdir /q',
  'shred', 'wipe',
  // Windows destructive
  'del /f', 'del /s', 'del /q',
  'rd /s', 'rd /q',
  'Remove-Item -Recurse', 'Remove-Item -Force',
  'Format-Volume',
  // Disk/system
  'format', 'mkfs', 'fdisk', 'parted',
  '> /dev/sda', '> /dev/sdb', '> /dev/nvme',
  'dd if=', 'dd of=',
  // System control
  'shutdown', 'reboot', 'init 0', 'init 6', 'systemctl stop',
  // Permission escalation
  'chmod -R 777', 'chown -R',
  // Remote execution
  'curl | sh', 'curl | bash', 'wget | sh', 'wget | bash',
  'eval(', 'exec(',
  // File system destruction
  '> /etc/', '>> /etc/',
  '> /usr/', '>> /usr/',
  '> /var/', '>> /var/',
]

export function isDangerousCommand(command: string): { dangerous: boolean; reason?: string } {
  const lower = command.toLowerCase().trim()
  for (const pattern of DANGEROUS_PATTERNS) {
    if (lower.includes(pattern)) {
      return { dangerous: true, reason: `Contains dangerous pattern: ${pattern}` }
    }
  }
  return { dangerous: false }
}
