# Security Policy

## DeepSeek Harness Runtime Boundary

Runtime permissions:
- Network: none
- Filesystem reads: none
- Filesystem writes: none
- Subprocess execution: none
- Shell execution: none
- Python execution: none
- Credentials / secrets: none
- Native code: none

The DeepSeek Harness plugin only queries immutable practice guide content embedded into the released JavaScript artifact. It does not read `algorithms/**/scripts/*.py`, invoke Python, install Python packages, or call UnitaryLab, Qiskit, PennyLane, or Classiq at runtime.

## Input Controls

The `quantum_practices` tool enforces these runtime limits:
- `action` must be one of `list`, `search`, or `get`.
- `query` is required for `search`, must be non-empty, and must be 256 characters or fewer.
- `id` is required for `get`, must match a catalog id format, and must already exist in the embedded catalog.
- `limit` must be an integer from 1 to 20.
- Tool output is capped at 40,000 characters.

The `get` operation never treats user input as a filesystem path. It only performs a lookup in the generated in-memory catalog.

## Supply Chain

The package has no runtime dependencies. `@deepseek-ai/cordis` and `@deepseek-ai/dsh-tools` are peer dependencies supplied by the DeepSeek Harness profile. TypeScript, Vitest, and DeepSeek Harness packages in `devDependencies` are used only for local build and test.

Install lifecycle scripts (`preinstall`, `install`, `postinstall`, and `prepare`) must remain disabled.

## Reporting

Please report vulnerabilities through the repository issue tracker or by contacting the maintainers privately if public disclosure would expose users before a fix is available.
