import { defineTool } from '@deepseek-ai/dsh-tools';
import { executeQuantumSkill } from './skill-store.js';
export const name = 'dsh-unitarylab-quantum-practices';
export const inject = ['tools'];
export function apply(ctx) {
    ctx.tools.register(defineTool({
        name: 'quantum_practices',
        description: 'Quantum Algorithms Best Practices retrieval tool for quantum-computing questions. '
            + 'Use this whenever the user asks about quantum algorithms, simulators, HHL, QPE, QFT, Shor, VQE, QAOA, '
            + 'gradients, Hamiltonian simulation, Schrodingerization, or quantum error correction. '
            + 'For natural-language questions, call get with query set to the user request; use search only when you need '
            + 'to disambiguate multiple skills. The default get detail is brief to save tokens; request full only when '
            + 'implementation details or complete examples are needed. Do not ask the user to provide catalog ids. '
            + 'Read-only: no code execution, subprocess, network access, or file writes.',
        parameters: {
            action: {
                type: 'string',
                required: true,
                enum: ['list', 'search', 'get'],
                description: 'Operation to perform. Use get for most natural user questions; use search for disambiguation; use list for broad discovery.'
            },
            query: {
                type: 'string',
                description: 'Natural-language skill query. Required for search and accepted by get when id is unknown. Maximum 256 characters.'
            },
            id: {
                type: 'string',
                description: 'Exact catalog id for get when already known. Example: algorithms/linear-systems/hhl. Do not ask users for ids.'
            },
            detail: {
                type: 'string',
                enum: ['brief', 'full'],
                description: 'Output detail for get. Defaults to brief to save tokens; use full only for complete skill text or implementation detail.'
            },
            limit: {
                type: 'number',
                description: 'Maximum list or search results to return. Integer from 1 to 20.'
            }
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [
                { type: 'text', text: value }
            ]
        },
        execute: async (args) => executeQuantumSkill(args),
        timeoutMs: 1000
    }));
}
