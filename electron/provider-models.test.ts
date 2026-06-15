import { describe, it, expect } from 'vitest'
import { buildProviderModelUrls, extractModelIds } from './provider-models'

describe('provider model helpers', () => {
  it('tries the direct models endpoint for Z.AI paas v4 providers first', () => {
    expect(buildProviderModelUrls('https://api.z.ai/api/paas/v4')[0])
      .toBe('https://api.z.ai/api/paas/v4/models')
  })

  it('extracts model ids from OpenAI compatible model responses', () => {
    expect(extractModelIds({
      data: [
        { id: 'glm-5.1' },
        { id: 'glm-5' },
      ],
    })).toEqual(['glm-5.1', 'glm-5'])
  })
})
