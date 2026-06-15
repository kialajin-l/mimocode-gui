export function buildProviderModelUrls(baseUrl: string): string[] {
  const url = baseUrl.trim().replace(/\/$/, '')
  if (!url) return []

  const candidates: string[] = []

  if (/(?:\/v\d+|\/paas\/v\d+|\/compatible-mode\/v\d+|\/openai|\/anthropic\/v\d+|\/coding\/v\d+|\/step_plan\/v\d+|\/api\/gateway)$/.test(url)) {
    candidates.push(`${url}/models`)
  }

  candidates.push(`${url}/v1/models`)

  const parentUrl = url.replace(/\/[^/]+$/, '')
  if (parentUrl !== url) {
    candidates.push(`${parentUrl}/v1/models`)
  }

  try {
    const parsed = new URL(url)
    candidates.push(`${parsed.origin}/v1/models`)
    candidates.push(`${parsed.origin}/models`)
  } catch {}

  return Array.from(new Set(candidates))
}

export function extractModelIds(data: any): string[] {
  const candidates = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data?.model)
          ? data.model
          : []

  return Array.from(new Set(candidates
    .map((item: any) => typeof item === 'string' ? item : (item?.id || item?.name || item?.model))
    .filter((item: any): item is string => typeof item === 'string' && item.trim().length > 0)))
}
