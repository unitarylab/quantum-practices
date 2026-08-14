import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  MAX_BRIEF_OUTPUT_CHARS,
  MAX_FULL_OUTPUT_CHARS,
  MAX_OUTPUT_CHARS,
  executeQuantumSkill
} from '../src/skill-store.js'

describe('quantum_practices security boundary', () => {
  it('rejects path traversal and unknown ids instead of reading from disk', () => {
    expect(() => executeQuantumSkill({
      action: 'get',
      id: '../../../../../etc/passwd'
    })).toThrow(/not a filesystem path/)

    expect(() => executeQuantumSkill({
      action: 'get',
      id: 'algorithms/linear-systems/not-real'
    })).toThrow(/unknown skill id/)
  })

  it('requires either an exact id or a bounded natural-language query for get', () => {
    expect(() => executeQuantumSkill({
      action: 'get'
    })).toThrow(/query is required for get/)

    expect(() => executeQuantumSkill({
      action: 'get',
      query: 'x'.repeat(257)
    })).toThrow(/256/)

    expect(() => executeQuantumSkill({
      action: 'get',
      query: 'zzzzzzzzzz-no-such-quantum-skill'
    })).toThrow(/no skill matched query/)

    expect(() => executeQuantumSkill({
      action: 'get',
      id: 'algorithms/linear-systems/hhl',
      detail: 'verbose' as never
    })).toThrow(/detail must be brief or full/)
  })

  it('rejects oversized input and result limits', () => {
    expect(() => executeQuantumSkill({
      action: 'search',
      query: 'x'.repeat(257)
    })).toThrow(/256/)

    expect(() => executeQuantumSkill({
      action: 'list',
      limit: 21
    })).toThrow(/between 1 and 20/)
  })

  it('caps brief and full returned practice guide content separately', () => {
    const brief = executeQuantumSkill({
      action: 'get',
      id: 'algorithms/linear-systems/quantum-fourier-transform'
    })
    const full = executeQuantumSkill({
      action: 'get',
      id: 'algorithms/linear-systems/quantum-fourier-transform',
      detail: 'full'
    })

    expect(brief).toContain('detail: brief')
    expect(full).toContain('detail: full')
    expect(brief.length).toBeLessThanOrEqual(MAX_BRIEF_OUTPUT_CHARS)
    expect(full.length).toBeLessThanOrEqual(MAX_FULL_OUTPUT_CHARS)
    expect(MAX_OUTPUT_CHARS).toBe(MAX_FULL_OUTPUT_CHARS)
  })

  it('does not import runtime filesystem, network, shell, or subprocess APIs', async () => {
    const sources = await Promise.all([
      readFile(new URL('../src/index.ts', import.meta.url), 'utf8'),
      readFile(new URL('../src/skill-store.ts', import.meta.url), 'utf8')
    ])
    const combined = sources.join('\n')

    expect(combined).not.toMatch(/node:(fs|child_process|http|https|net|tls|dgram|worker_threads)/)
    expect(combined).not.toMatch(/\b(child_process|spawn|exec|execFile|fork|fetch)\b/)
    expect(combined).not.toMatch(/\bwriteFile(Sync)?\b/)
  })
})
