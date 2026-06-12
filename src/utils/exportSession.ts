import { Session } from '../types/session'

export function exportSessionToMarkdown(session: Session): string {
  const lines: string[] = []

  lines.push(`# ${session.name}`)
  lines.push('')
  lines.push(`> Created: ${session.createdAt.toLocaleString()}`)
  lines.push('')

  for (const msg of session.messages) {
    const roleLabel = msg.role === 'user' ? '## User' : '## Assistant'
    lines.push(roleLabel)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push('Exported from MiMoCode GUI')

  return lines.join('\n')
}

export function sessionToFilename(session: Session): string {
  const safe = session.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_').slice(0, 80)
  return `${safe}.md`
}
