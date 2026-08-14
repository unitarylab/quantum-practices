# OMDSH Review Notes

## Package

- Package name: `dsh-unitarylab-quantum-practices`
- Version: `0.1.0`
- DSH compatibility target: `@deepseek-ai/dsh@0.1.0-rc.6`
- Integration mechanism: Profile Bundle / Harness Profile
- Patch file: `cordis.patch.yml`
- Inserted row id: `tool-quantum-practices`

## Capability

The package registers one model-facing tool:

```json
{
  "id": "quantum_practices",
  "kind": "tool",
  "actions": ["list", "search", "get"]
}
```

The tool provides read-only access to the immutable Quantum-Practices Catalog generated from this repository's `SKILL.md` files during release build.

## Runtime Permissions

- Network: none
- Filesystem reads: none
- Filesystem writes: none
- Subprocess execution: none
- Shell execution: none
- Python execution: none
- Credentials / secrets: none
- Native code: none

The DSH plugin does not execute files under `algorithms/**/scripts/*.py` and does not import Python packages. This repository does not ship a root `requirements.txt`, bundled simulator wheels, or a Python runtime. Python environments belong to separate projects that choose to run generated examples outside the DSH plugin runtime.

## Supply Chain

- Upstream attribution: Quantum-Practices is based on and adapted from the public GitHub project `unitarylab/quantum-skills` (`https://github.com/unitarylab/quantum-skills`). The current skill corpus is synchronized from upstream commit `2ad300222b6578fbb8c2a6ff648f709108cbff63`. Only public GitHub upstream skill content is used as the source corpus. See `NOTICE`.
- Runtime dependencies: none
- Peer dependencies: `@deepseek-ai/cordis`, `@deepseek-ai/dsh-tools`
- Install lifecycle scripts: disabled
- Native code: none
- External services: none
- File/link dependencies: forbidden by `scripts/verify-package.mjs`

## Package Evidence

Release commits should include:

- `src/generated/skill-catalog.ts`
- `lib/index.js`
- `lib/skill-store.js`
- `lib/generated/skill-catalog.js`
- `lib/types/index.d.ts`
- `lib/types/skill-store.d.ts`

Before submission, run:

```bash
npm ci
npm run check
npm pack --dry-run --json
git diff --exit-code
```

## Profile Bundle Lifecycle Evidence

Target lifecycle:

```text
install -> ready -> functional -> update -> disable -> remove -> recovery
```

Functional capability evidence:

```json
{
  "id": "quantum_practices",
  "kind": "tool",
  "invocation": "DSH Agent invokes quantum_practices search/get for HHL",
  "assertion": "registered-invoked-and-observed",
  "expected": "The tool resolves HHL to algorithms/linear-systems/hhl and returns the packaged HHL practice guide.",
  "observed": "The registered quantum_practices tool returned the expected HHL practice guide content from the pinned release."
}
```

Install examples:

```bash
dsh plugin --profile web add "/path/to/quantum-practices"
dsh plugin --profile headless add "/path/to/quantum-practices"
dsh --profile headless --dump-config
dsh run "Use the quantum_practices tool to find the HHL practice guide and explain the required matrix constraints."
```

Submission shape:

```json
{
  "project": {
    "id": "quantum-practices",
    "displayName": "Quantum-Practices",
    "subtitle": "Quantum Algorithms Best Practices",
    "kind": "extension",
    "category": "developer-tools",
    "path": null
  },
  "release": {
    "version": "0.1.0",
    "channel": "beta",
    "compatibility": "@deepseek-ai/dsh@0.1.0-rc.6",
    "capabilities": {
      "requiresFabric": false,
      "deepHook": false,
      "restartRequired": true
    },
    "profileBundle": {
      "packageName": "dsh-unitarylab-quantum-practices",
      "spec": "github:unitarylab/quantum-practices#<FULL_40_CHAR_COMMIT_SHA>"
    }
  },
  "management": {
    "method": "profile-bundle",
    "protocol": "harness-profile",
    "source": null
  },
  "declarations": {
    "permissions": "Read-only access to immutable packaged quantum algorithm practice content. No network, subprocess, filesystem writes, credentials, or Python execution.",
    "testing": "Unit, security, package, Profile Bundle and full RC.6 lifecycle verification.",
    "trustedPublisherRequested": false,
    "installScriptsMustRemainDisabled": true
  }
}
```
