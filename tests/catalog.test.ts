import { describe, expect, it } from 'vitest'
import { skills } from '../src/generated/skill-catalog.js'

describe('generated skill catalog', () => {
  it('contains every entry with stable metadata', () => {
    expect(skills.length).toBeGreaterThan(40)

    for (const skill of skills) {
      expect(skill.id).toMatch(/^(root|[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*)$/)
      expect(skill.name).toMatch(/^[a-z0-9][a-z0-9-]*$/)
      expect(skill.description.length).toBeGreaterThan(10)
      expect(skill.content).toMatch(new RegExp(`name:\\s*["']?${skill.name}["']?`))
    }
  })

  it('does not contain duplicate ids', () => {
    const ids = skills.map(skill => skill.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('embeds the HHL practice guide with matrix constraints', () => {
    const hhl = skills.find(skill => skill.id === 'algorithms/linear-systems/hhl')

    expect(hhl).toBeDefined()
    expect(hhl?.name).toBe('hhl')
    expect(hhl?.content).toContain('Hermitian')
    expect(hhl?.content).toContain('power of 2')
  })

  it('is synchronized with the current upstream quantum-skills corpus', () => {
    expect(skills.length).toBe(60)
    expect(skills.some(skill => skill.id === 'algorithms/primitives/grover')).toBe(true)
    expect(skills.some(skill => skill.id === 'algorithms/linear-systems/qsvt-qlsa')).toBe(true)
    expect(skills.some(skill => skill.id === 'algorithms/state-preparation/mps')).toBe(true)
    expect(skills.some(skill => skill.id === 'algorithms/primitives/quantum-fourier-transform')).toBe(false)
    expect(skills.some(skill => skill.id === 'algorithms/linear-systems/quantum-fourier-transform')).toBe(true)
  })
})
