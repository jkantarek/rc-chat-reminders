# ts-ultrastrict-ai

Ultra-strict TypeScript project template with full AI agent tooling (Speckit + GitHub Copilot).

## What's included

| Category  | Tool                           | Purpose                                              |
| --------- | ------------------------------ | ---------------------------------------------------- |
| Language  | TypeScript 5.5+                | Ultra-strict compiler options                        |
| Lint      | ESLint 9 + typescript-eslint   | Zero-warning policy, no `any`, explicit return types |
| Format    | Prettier 3                     | Opinionated, consistent formatting                   |
| Test      | Vitest 4 + vite-plugin-doctest | Unit tests + inline doctests                         |
| Coverage  | @vitest/coverage-v8            | 98% threshold enforced                               |
| Git hooks | Husky + lint-staged            | Pre-commit quality gate                              |
| CI        | GitHub Actions                 | Full quality gate on every push/PR                   |
| Agents    | Speckit (16 agents)            | Structured AI-driven feature development             |

## Quick start

```bash
# First-time setup: installs deps, sets up git hooks, verifies all gates
script/bootstrap
```

## Scripts

All day-to-day operations use the `script/` folder ([Scripts to Rule Them All](https://github.com/github/scripts-to-rule-them-all)).
Every script responds to `-h` / `--help`.

| Script             | Purpose                                                 | Key flags                       |
| ------------------ | ------------------------------------------------------- | ------------------------------- |
| `script/bootstrap` | First-time setup: install deps, hooks, verify all gates |                                 |
| `script/test`      | Run the test suite                                      | `--coverage`, `--watch`, `--ui` |
| `script/lint`      | Typecheck + ESLint + Prettier                           | `--fix`, `--staged`             |
| `script/server`    | Start the development server                            |                                 |
| `script/console`   | Launch an interactive REPL                              | `--tsx` for TypeScript REPL     |
| `script/update`    | Update dependencies and re-verify gates                 | `--latest`, `--interactive`     |
| `script/ci`        | Run the full CI gate suite locally                      | `--no-color`                    |

**`script/ci` is the canonical pre-push check** — it mirrors `.github/workflows/ci.yml` exactly.

### pnpm scripts (direct)

| Command              | Description                 |
| -------------------- | --------------------------- |
| `pnpm build`         | Compile TypeScript          |
| `pnpm typecheck`     | Type-check without emitting |
| `pnpm lint`          | ESLint (zero warnings)      |
| `pnpm format`        | Format all files            |
| `pnpm format:check`  | Check formatting            |
| `pnpm test`          | Run all tests once          |
| `pnpm test:coverage` | Tests + coverage report     |

## Quality gates

All of the following must pass before any commit:

```
pnpm typecheck      # Zero TypeScript errors
pnpm lint           # Zero ESLint warnings
pnpm format:check   # All files formatted
pnpm test:coverage  # All tests pass, ≥98% coverage
```

These are enforced by:

- **Pre-commit hook** — `script/lint --staged` → lint-staged on staged files only
- **CI workflow** — `script/ci` / `.github/workflows/ci.yml` — blocks bad PRs

## TypeScript strictness

All compiler options in `tsconfig.src.json`:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "exactOptionalPropertyTypes": true
}
```

## Documentation pattern

All JSDoc must be executable doctests — no prose, no `@param`/`@returns`:

````ts
/**
 * @example
 * ```ts @import.meta.vitest
 * expect(add(1, 2)).toBe(3);
 * ```
 */
export function add(a: number, b: number): number {
  return a + b;
}
````

Doctests are run by `vite-plugin-doctest` as part of every `pnpm test`.

## Linting rules

Beyond zero-warnings and no-`any`, the following structural rules are enforced:

| Rule                        | Limit                         | Enforces                                  |
| --------------------------- | ----------------------------- | ----------------------------------------- |
| `max-lines`                 | 150 lines/file                | Domain-driven file extraction             |
| `max-lines-per-function`    | 10 lines (source), 60 (tests) | Single-purpose functions                  |
| `complexity`                | 7                             | Low cyclomatic complexity                 |
| `max-params`                | 5                             | Group args into typed options objects     |
| `local/jsdoc-examples-only` | —                             | Executable doctests only — no prose JSDoc |

## Editor sync

Formatting is locked at three layers so the editor never drifts from CI:

1. `.editorconfig` — baseline indent/charset/newline for all editors
2. `.vscode/settings.json` — per-language Prettier overrides (prevents VS Code's built-in JSON/YAML formatters from winning)
3. `prettier --check` — enforced on staged files (pre-commit) and full repo (CI)

Install the recommended extensions (`Extensions: Show Recommended Extensions`) to get `EditorConfig`, `Prettier`, `ESLint`, and `Vitest` support automatically.

## Project structure

```
src/
├── index.ts          ← entry point (replace with your domain)
└── index.test.ts     ← co-located black-box tests

script/
├── bootstrap         ← first-time setup
├── test              ← run tests
├── lint              ← lint + format check (also used by pre-commit hook)
├── server            ← start dev server
├── console           ← interactive REPL
├── update            ← update dependencies
└── ci                ← full local CI gate suite

.github/
├── agents/           ← Speckit AI agents (16 total)
├── prompts/          ← Speckit prompt files
├── workflows/        ← CI configuration
└── copilot-instructions.md

eslint-rules/
└── jsdoc-examples-only.mjs   ← custom ESLint rule

.husky/
└── pre-commit        ← delegates to script/lint --staged
```

## AI Agent workflow

See [AGENTS.md](AGENTS.md) for full documentation on all 16 Speckit agents.

Quick reference:

```
/speckit.specify   →  Describe a feature in natural language
/speckit.plan      →  Generate a technical plan
/speckit.tasks     →  Break plan into ordered tasks
/speckit.implement →  Execute tasks one at a time
/speckit.ralph.run →  Autonomous implementation loop
```

## License

MIT
