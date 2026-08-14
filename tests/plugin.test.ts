import { describe, expect, it, vi } from 'vitest'
import { apply, inject, name } from '../src/index.js'

describe('DSH plugin entrypoint', () => {
  it('registers the quantum_practices tool', async () => {
    const register = vi.fn()
    const ctx = { tools: { register } }

    apply(ctx as never)

    expect(name).toBe('dsh-unitarylab-quantum-practices')
    expect(inject).toEqual(['tools'])
    expect(register).toHaveBeenCalledTimes(1)

    const tool = register.mock.calls[0]?.[0] as {
      name: string
      description: string
      execute: (args: unknown) => string | Promise<string>
    }

    expect(tool.name).toBe('quantum_practices')
    expect(tool.description).toContain('Read-only')
    expect(tool.description).toContain('Quantum Algorithms Best Practices')
    expect(tool.description).toContain('Do not ask the user to provide catalog ids')
    expect(tool.description).toContain('call get with query')

    const result = await tool.execute({ action: 'search', query: 'HHL linear system', limit: 3 })
    expect(result).toContain('algorithms/linear-systems/hhl')
  })

  it('returns packaged practice content through the registered tool', async () => {
    const register = vi.fn()
    apply({ tools: { register } } as never)

    const tool = register.mock.calls[0]?.[0] as {
      execute: (args: unknown) => string | Promise<string>
    }

    const result = await tool.execute({ action: 'get', id: 'algorithms/linear-systems/hhl' })
    expect(result).toContain('id: algorithms/linear-systems/hhl')
    expect(result).toContain('detail: brief')
    expect(result).toContain('HHL Algorithm')
    expect(result).toContain('Hermitian')
    expect(result).toContain('Request detail="full"')
  })

  it('returns full practice content only when detail is full', async () => {
    const register = vi.fn()
    apply({ tools: { register } } as never)

    const tool = register.mock.calls[0]?.[0] as {
      execute: (args: unknown) => string | Promise<string>
    }

    const brief = await tool.execute({ action: 'get', id: 'algorithms/linear-systems/hhl' })
    const full = await tool.execute({ action: 'get', id: 'algorithms/linear-systems/hhl', detail: 'full' })

    expect(full).toContain('detail: full')
    expect(full).toContain('## Implementation Architecture')
    expect(full.length).toBeGreaterThan(brief.length)
  })

  it('resolves natural-language get queries without requiring a skill id', async () => {
    const register = vi.fn()
    apply({ tools: { register } } as never)

    const tool = register.mock.calls[0]?.[0] as {
      execute: (args: unknown) => string | Promise<string>
    }

    const result = await tool.execute({
      action: 'get',
      query: 'Explain HHL matrix constraints for solving linear systems'
    })

    expect(result).toContain('resolved_from_query: Explain HHL matrix constraints for solving linear systems')
    expect(result).toContain('id: algorithms/linear-systems/hhl')
    expect(result).toContain('detail: brief')
    expect(result).toContain('Hermitian')
  })
})
