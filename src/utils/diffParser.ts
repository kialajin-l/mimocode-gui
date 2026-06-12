export interface FileChange {
  file: string
  status: 'modified' | 'created' | 'deleted'
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'context' | 'added' | 'removed'
  content: string
  oldLine?: number
  newLine?: number
}

export function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = []
  const fileSections = diffText.split(/^diff --git/m).slice(1)

  for (const section of fileSections) {
    const fileMatch = section.match(/a\/(.+?) b\//)
    if (!fileMatch) continue

    const file = fileMatch[1]
    let status: FileChange['status'] = 'modified'
    if (section.includes('new file mode')) status = 'created'
    else if (section.includes('deleted file mode')) status = 'deleted'

    const additions = (section.match(/^\+[^+]/gm) || []).length
    const deletions = (section.match(/^-[^-]/gm) || []).length

    const hunks: DiffHunk[] = []
    const hunkSections = section.split(/^@@/m).slice(1)

    for (const hunk of hunkSections) {
      const headerMatch = hunk.match(/(.+?)@@(.*)/s)
      if (!headerMatch) continue

      const header = headerMatch[1].trim()
      const body = headerMatch[2]
      const lines: DiffLine[] = []

      let oldLine = parseInt(header.match(/-(\d+)/)?.[1] || '0')
      let newLine = parseInt(header.match(/\+(\d+)/)?.[1] || '0')

      for (const line of body.split('\n')) {
        if (line.startsWith('+')) {
          lines.push({ type: 'added', content: line.slice(1), newLine: newLine++ })
        } else if (line.startsWith('-')) {
          lines.push({ type: 'removed', content: line.slice(1), oldLine: oldLine++ })
        } else if (line.startsWith(' ') || line === '') {
          lines.push({ type: 'context', content: line.slice(1), oldLine: oldLine++, newLine: newLine++ })
        }
      }

      hunks.push({ header, lines })
    }

    files.push({ file, status, additions, deletions, hunks })
  }

  return files
}
