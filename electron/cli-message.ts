export function buildRunArgs(options: {
  message: string
  model?: string
  variant?: string
  permission?: string
  mode?: string
}) {
  const args = ['run']

  if (options.model && options.model.includes('/')) {
    args.push('--model', options.model)
  }
  if (options.variant) {
    args.push('--variant', options.variant)
  }
  const effectivePermission = options.permission ?? (options.mode === 'build' ? 'execute' : 'edit')
  if (effectivePermission === 'execute') {
    args.push('--dangerously-skip-permissions')
  }
  args.push('--format', 'json')
  args.push(stripGuiFrontmatter(options.message))
  return args
}

export function stripGuiFrontmatter(message: string) {
  return message.replace(/^---\r?\n(?:mode|file):[\s\S]*?\r?\n---\r?\n\r?\n/, '')
}

export function getEventText(event: any): string {
  if (typeof event?.content === 'string') return event.content
  if (typeof event?.text === 'string') return event.text
  if (typeof event?.part?.content === 'string') return event.part.content
  if (typeof event?.part?.text === 'string') return event.part.text
  return ''
}

export function getEventToolName(event: any): string {
  if (typeof event?.name === 'string') return event.name
  if (typeof event?.toolName === 'string') return event.toolName
  if (typeof event?.part?.name === 'string') return event.part.name
  if (typeof event?.part?.tool === 'string') return event.part.tool
  return ''
}
