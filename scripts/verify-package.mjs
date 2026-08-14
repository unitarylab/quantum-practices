import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

const errors = []

await checkPackageShape()
await checkWorkshopManifest()
await checkSourceBoundary()
await checkPatch()
await checkCatalog()

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`verify-package: ${error}`)
  }
  process.exit(1)
}

console.log('verify-package: package shape, patch, and catalog checks passed.')

async function checkPackageShape() {
  assert(packageJson.name === 'dsh-unitarylab-quantum-practices', 'unexpected package name')
  assert(/^(@deepseek-ai\/|@dsh-external\/|dsh-)/.test(packageJson.name), 'package name does not match DSH policy')
  assert(packageJson.type === 'module', 'package must be ESM')
  assert(packageJson.private === true, 'package must remain private until registry submission is ready')
  assert(packageJson.main === 'lib/index.js', 'main must be lib/index.js')
  assert(packageJson.types === 'lib/types/index.d.ts', 'types must be lib/types/index.d.ts')
  assert(packageJson.license === 'MIT', 'license must match LICENSE')
  assert(packageJson.dsh?.bundle?.patch === './cordis.patch.yml', 'dsh.bundle.patch must point to ./cordis.patch.yml')

  await mustExist(packageJson.main, 'main file is missing')
  await mustExist(packageJson.types, 'types file is missing')
  await mustExist(packageJson.dsh.bundle.patch, 'Cordis patch file is missing')

  for (const scriptName of ['preinstall', 'install', 'postinstall', 'prepare']) {
    assert(!packageJson.scripts?.[scriptName], `${scriptName} install script is forbidden`)
  }

  for (const blockName of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const block = packageJson[blockName] ?? {}
    for (const [name, spec] of Object.entries(block)) {
      assert(!/^(file|link):/.test(String(spec)), `${blockName}.${name} must not use ${spec}`)
    }
  }

  const files = new Set(packageJson.files ?? [])
  for (const expected of ['lib', 'src', 'cordis.patch.yml', 'README.md', 'LICENSE', 'NOTICE']) {
    assert(files.has(expected), `files[] must include ${expected}`)
  }
}

async function checkPatch() {
  const patch = await readFile(path.join(rootDir, 'cordis.patch.yml'), 'utf8')
  assert(patch.includes('- insert:'), 'cordis.patch.yml must use - insert:')
  assert(patch.includes('id: tool-quantum-practices'), 'cordis.patch.yml must insert tool-quantum-practices')
  assert(patch.includes(`name: 'dsh-unitarylab-quantum-practices'`), 'cordis.patch.yml must reference this package')

  for (const coreId of ['tools', 'llm', 'session', 'web']) {
    assert(!patch.includes(`id: ${coreId}\n`), `cordis.patch.yml must not collide with core id ${coreId}`)
  }
}

async function checkWorkshopManifest() {
  const manifest = packageJson.dshWorkshop
  assert(manifest && typeof manifest === 'object', 'dshWorkshop manifest is required for Workshop submission')
  assert(manifest.schema === 'omdsh-workshop-package/v1', 'dshWorkshop.schema must be omdsh-workshop-package/v1')
  assert(manifest.type === 'plugin', 'dshWorkshop.type must be plugin')

  assert(manifest.integration?.protocol === 'harness-profile', 'dshWorkshop.integration.protocol must be harness-profile')
  assert(manifest.integration?.artifact === 'package.json', 'dshWorkshop.integration.artifact must be package.json')
  await mustExist(manifest.integration?.artifact, 'dshWorkshop.integration.artifact is missing')

  assert(manifest.install?.mode === 'transactional', 'dshWorkshop.install.mode must be transactional')
  assert(manifest.install?.adapter === 'profile-bundle', 'dshWorkshop.install.adapter must be profile-bundle')
  assert(manifest.install?.failurePolicy === 'generation-rollback', 'dshWorkshop.install.failurePolicy must be generation-rollback')
  assert(manifest.install?.touchesCurrentBeforeActivation === false, 'dshWorkshop.install.touchesCurrentBeforeActivation must be false')

  assert(manifest.lifecycle?.activation === 'restart-profile', 'dshWorkshop.lifecycle.activation must be restart-profile')
  assert(manifest.lifecycle?.dispose === 'unknown', 'dshWorkshop.lifecycle.dispose must be unknown until remove lifecycle is independently evidenced')

  const permissions = new Set(manifest.permissions ?? [])
  for (const permission of [
    'harness:tool',
    'catalog:read',
    'network:none',
    'filesystem:none',
    'subprocess:none',
    'shell:none',
    'python:none',
    'credentials:none',
    'native-code:none'
  ]) {
    assert(permissions.has(permission), `dshWorkshop.permissions must include ${permission}`)
  }

  const evidence = manifest.evidence ?? {}
  await mustExist(evidence.install, 'dshWorkshop.evidence.install is missing')
  for (const evidenceName of ['failureIsolation', 'hotReload', 'remove']) {
    const evidencePath = evidence[evidenceName]
    if (evidencePath !== null) {
      await mustExist(evidencePath, `dshWorkshop.evidence.${evidenceName} is missing`)
    }
  }
}

async function checkSourceBoundary() {
  await mustNotExist('requirements.txt', 'root requirements.txt must not be shipped')

  const files = await findFiles(rootDir)
  for (const file of files) {
    const relative = path.relative(rootDir, file).split(path.sep).join('/')

    assert(!relative.endsWith('.whl'), `wheel artifacts must not be shipped: ${relative}`)

    if (isTextFile(relative)) {
      const source = await readFile(file, 'utf8')
      const forbiddenMirrorPattern = new RegExp('git' + 'ee\\.com', 'i')
      assert(!forbiddenMirrorPattern.test(source), `${relative} must not reference non-GitHub mirror sources`)
    }
  }
}

async function checkCatalog() {
  const skillFiles = await findSkillFiles(rootDir)
  const catalogModule = await import(`${pathToFileURL(path.join(rootDir, 'lib/generated/skill-catalog.js')).href}?t=${Date.now()}`)
  const catalog = catalogModule.skills

  assert(Array.isArray(catalog), 'generated catalog must export skills array')
  assert(catalog.length === skillFiles.length, `catalog has ${catalog.length} entries but repository has ${skillFiles.length} SKILL.md files`)

  const ids = new Set()
  for (const skill of catalog) {
    assert(typeof skill.id === 'string' && skill.id.length > 0, 'catalog entry id is required')
    assert(!ids.has(skill.id), `duplicate catalog id ${skill.id}`)
    ids.add(skill.id)
    assert(typeof skill.name === 'string' && skill.name.length > 0, `${skill.id}: name is required`)
    assert(typeof skill.description === 'string' && skill.description.length > 0, `${skill.id}: description is required`)
    assert(typeof skill.content === 'string' && skill.content.startsWith('---\n'), `${skill.id}: content must embed complete SKILL.md text`)
  }

  assert(ids.has('algorithms/linear-systems/hhl'), 'catalog must include HHL practice guide')
  assert(ids.has('root'), 'catalog must include root skill')
}

async function findSkillFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') {
      continue
    }

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!new Set(['.git', 'node_modules', 'lib']).has(entry.name)) {
        files.push(...await findSkillFiles(fullPath))
      }
      continue
    }

    if (entry.isFile() && entry.name === 'SKILL.md') {
      files.push(fullPath)
    }
  }

  return files
}

async function findFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') {
      continue
    }

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!new Set(['.git', 'node_modules']).has(entry.name)) {
        files.push(...await findFiles(fullPath))
      }
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

function isTextFile(relativePath) {
  return /\.(cjs|js|json|md|mjs|py|ts|txt|yaml|yml)$/.test(relativePath)
}

async function mustExist(relativePath, message) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    errors.push(message)
    return
  }

  try {
    await access(path.join(rootDir, relativePath))
  } catch {
    errors.push(message)
  }
}

async function mustNotExist(relativePath, message) {
  try {
    await access(path.join(rootDir, relativePath))
    errors.push(message)
  } catch {
    // Expected: the forbidden path is absent.
  }
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message)
  }
}
