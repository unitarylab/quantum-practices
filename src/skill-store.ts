import { skills } from './generated/skill-catalog.js'

export type QuantumSkillAction = 'list' | 'search' | 'get'
export type QuantumSkillDetail = 'brief' | 'full'

export interface QuantumSkillArgs {
  action: QuantumSkillAction
  query?: string
  id?: string
  limit?: number
  detail?: QuantumSkillDetail
}

export interface QuantumSkillSummary {
  id: string
  name: string
  description: string
}

export interface QuantumSkillRecord extends QuantumSkillSummary {
  content: string
}

export const MAX_QUERY_CHARS = 256
export const MAX_ID_CHARS = 256
export const MAX_LIMIT = 20
export const DEFAULT_LIMIT = 10
export const MAX_BRIEF_OUTPUT_CHARS = 12_000
export const MAX_FULL_OUTPUT_CHARS = 40_000
export const MAX_OUTPUT_CHARS = MAX_FULL_OUTPUT_CHARS

const VALID_ID = /^(root|[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*)$/
const VALID_ACTIONS = new Set<QuantumSkillAction>(['list', 'search', 'get'])
const STOP_TERMS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'get',
  'give',
  'how',
  'in',
  'me',
  'no',
  'of',
  'on',
  'or',
  'show',
  'skill',
  'skills',
  'such',
  'the',
  'to',
  'use',
  'using',
  'what',
  'which',
  'why',
  'with',
  'quantum',
  'computing',
  'algorithm',
  'algorithms',
  'explain',
  'implement'
])

const catalog: QuantumSkillRecord[] = skills.map(skill => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: skill.content
}))

const skillById: Map<string, QuantumSkillRecord> = new Map(catalog.map(skill => [skill.id, skill]))

export function executeQuantumSkill(args: QuantumSkillArgs): string {
  assertPlainObject(args)

  if (!VALID_ACTIONS.has(args.action)) {
    throw new Error('quantum_practices: action must be one of list, search, or get')
  }

  const limit = normalizeLimit(args.limit)

  if (args.action === 'list') {
    return renderSummaries('Quantum practice catalog', listSkills(limit), catalog.length)
  }

  if (args.action === 'search') {
    const query = normalizeQuery(args.query)
    return renderSummaries(
      `Quantum practice search results for "${query}"`,
      searchSkills(query, limit),
      catalog.length
    )
  }

  if (args.id !== undefined) {
    const id = normalizeId(args.id)
    return renderSkill(getSkillById(id), {
      detail: normalizeDetail(args.detail)
    })
  }

  const query = normalizeQuery(args.query, 'get')
  return renderSkill(getSkillByQuery(query), {
    detail: normalizeDetail(args.detail),
    resolvedFromQuery: query
  })
}

export function listSkills(limit = DEFAULT_LIMIT): QuantumSkillSummary[] {
  const normalizedLimit = normalizeLimit(limit)
  return catalog.slice(0, normalizedLimit).map(toSummary)
}

export function searchSkills(query: string, limit = DEFAULT_LIMIT): QuantumSkillSummary[] {
  const normalizedQuery = normalizeQuery(query)
  const normalizedLimit = normalizeLimit(limit)

  return rankSkills(normalizedQuery)
    .slice(0, normalizedLimit)
    .map(result => toSummary(result.skill))
}

export function getSkillById(id: string): QuantumSkillRecord {
  const normalizedId = normalizeId(id)
  const skill = skillById.get(normalizedId)

  if (!skill) {
    throw new Error(`quantum_practices: unknown skill id "${normalizedId}"`)
  }

  return skill
}

export function getSkillByQuery(query: string): QuantumSkillRecord {
  const normalizedQuery = normalizeQuery(query, 'get')
  const [match] = rankSkills(normalizedQuery)

  if (!match) {
    throw new Error(`quantum_practices: no skill matched query "${normalizedQuery}"`)
  }

  return match.skill
}

function assertPlainObject(value: unknown): asserts value is QuantumSkillArgs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('quantum_practices: arguments must be an object')
  }
}

function normalizeQuery(value: unknown, action = 'search'): string {
  if (typeof value !== 'string') {
    throw new Error(`quantum_practices: query is required for ${action}`)
  }

  const query = value.trim()
  if (!query) {
    throw new Error('quantum_practices: query must be non-empty')
  }

  if (query.length > MAX_QUERY_CHARS) {
    throw new Error(`quantum_practices: query must be ${MAX_QUERY_CHARS} characters or fewer`)
  }

  return query
}

function normalizeId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('quantum_practices: id is required for get')
  }

  const id = value.trim()
  if (!id) {
    throw new Error('quantum_practices: id must be non-empty')
  }

  if (id.length > MAX_ID_CHARS) {
    throw new Error(`quantum_practices: id must be ${MAX_ID_CHARS} characters or fewer`)
  }

  if (!VALID_ID.test(id)) {
    throw new Error('quantum_practices: id must be a known catalog id, not a filesystem path')
  }

  return id
}

function normalizeLimit(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_LIMIT
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('quantum_practices: limit must be an integer')
  }

  if (value < 1 || value > MAX_LIMIT) {
    throw new Error(`quantum_practices: limit must be between 1 and ${MAX_LIMIT}`)
  }

  return value
}

function normalizeDetail(value: unknown): QuantumSkillDetail {
  if (value === undefined) {
    return 'brief'
  }

  if (value !== 'brief' && value !== 'full') {
    throw new Error('quantum_practices: detail must be brief or full')
  }

  return value
}

function rankSkills(query: string): { skill: QuantumSkillRecord, score: number }[] {
  const queryLower = query.toLowerCase()
  const terms = queryLower
    .split(/[^a-z0-9]+/)
    .filter(term => term.length > 1 && !STOP_TERMS.has(term))

  return catalog
    .map(skill => ({ skill, score: scoreSkill(skill, queryLower, terms) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.id.localeCompare(b.skill.id))
}

function scoreSkill(skill: QuantumSkillRecord, query: string, terms: string[]): number {
  let score = 0
  const name = skill.name.toLowerCase()
  const id = skill.id.toLowerCase()
  const idSegments = id.split('/')
  const description = skill.description.toLowerCase()
  const content = skill.content.toLowerCase()

  if (name === query || id === query) score += 100
  if (name.includes(query)) score += 40
  if (id.includes(query)) score += 35
  if (description.includes(query)) score += 20
  if (content.includes(query)) score += 5

  for (const term of terms) {
    if (name === term || idSegments.includes(term)) score += 80
    if (name.includes(term)) score += 12
    if (id.includes(term)) score += 10
    if (description.includes(term)) score += 6
    if (content.includes(term)) score += 1
  }

  if (!isLeafSkill(skill)) {
    score -= 8
  }

  return score
}

function isLeafSkill(skill: QuantumSkillRecord): boolean {
  return !catalog.some(candidate => candidate.id.startsWith(`${skill.id}/`))
}

function toSummary(skill: QuantumSkillRecord): QuantumSkillSummary {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description
  }
}

function renderSummaries(title: string, summaries: QuantumSkillSummary[], total: number): string {
  const lines = [
    `${title}`,
    `Showing ${summaries.length} of ${total} packaged skills.`
  ]

  if (summaries.length === 0) {
    lines.push('No matching skills found.')
    return lines.join('\n')
  }

  for (const skill of summaries) {
    lines.push('', `- id: ${skill.id}`, `  name: ${skill.name}`, `  description: ${skill.description}`)
  }

  return truncateOutput(lines.join('\n'))
}

function renderSkill(
  skill: QuantumSkillRecord,
  options: { detail: QuantumSkillDetail, resolvedFromQuery?: string }
): string {
  const body = options.detail === 'full'
    ? skill.content
    : renderBriefContent(skill.content)
  const maxChars = options.detail === 'full'
    ? MAX_FULL_OUTPUT_CHARS
    : MAX_BRIEF_OUTPUT_CHARS

  return truncateOutput([
    ...(options.resolvedFromQuery ? [`resolved_from_query: ${options.resolvedFromQuery}`] : []),
    `id: ${skill.id}`,
    `name: ${skill.name}`,
    `description: ${skill.description}`,
    `detail: ${options.detail}`,
    '',
    '---',
    '',
    body,
    ...(options.detail === 'brief' ? [
      '',
      '[quantum_practices: brief output. Request detail="full" for complete SKILL.md content.]'
    ] : [])
  ].join('\n'), maxChars)
}

function renderBriefContent(content: string): string {
  const withoutFrontmatter = content.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
  const sections = splitMarkdownSections(withoutFrontmatter)
  const selected = []
  const title = sections.find(section => section.level === 1)

  if (title) {
    selected.push(title.text)
  }

  const wantedHeadings = [
    'purpose',
    'overview',
    'prerequisites',
    'core parameters',
    'common misunderstandings',
    'method selection',
    'quick decision guide',
    'supported simulators',
    'when to use',
    'inputs and outputs',
    'return fields'
  ]

  for (const section of sections) {
    if (section.level < 2) continue

    const heading = section.heading.toLowerCase()
    if (wantedHeadings.some(wanted => heading.includes(wanted))) {
      selected.push(section.text)
    }
  }

  if (selected.length === 0) {
    selected.push(withoutFrontmatter.trim())
  }

  return selected.join('\n\n---\n\n').trim()
}

function splitMarkdownSections(content: string): { level: number, heading: string, text: string }[] {
  const lines = content.split(/\r?\n/)
  const sections: { level: number, heading: string, text: string }[] = []
  let current: { level: number, heading: string, lines: string[] } | undefined

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/)

    if (headingMatch) {
      const marker = headingMatch[1]
      const heading = headingMatch[2]
      if (!marker || !heading) {
        continue
      }

      if (current) {
        sections.push({
          level: current.level,
          heading: current.heading,
          text: current.lines.join('\n').trim()
        })
      }

      current = {
        level: marker.length,
        heading: heading.trim(),
        lines: [line]
      }
      continue
    }

    if (current) {
      current.lines.push(line)
    }
  }

  if (current) {
    sections.push({
      level: current.level,
      heading: current.heading,
      text: current.lines.join('\n').trim()
    })
  }

  return sections
}

function truncateOutput(value: string, maxChars = MAX_FULL_OUTPUT_CHARS): string {
  if (value.length <= maxChars) {
    return value
  }

  const suffix = `\n\n[quantum_practices: output truncated at ${maxChars} characters]`
  return `${value.slice(0, maxChars - suffix.length)}${suffix}`
}
