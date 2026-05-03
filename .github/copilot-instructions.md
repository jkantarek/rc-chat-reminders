## Quality Gates

All of the following MUST pass before marking any task complete or creating a commit:

| Gate             | Command              | Required                                           |
| ---------------- | -------------------- | -------------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                        |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)                 |
| Format           | `pnpm format:check`  | All files pass                                     |
| Tests + Doctests | `pnpm test`          | All pass                                           |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements     |

**Additional ESLint-enforced constraints**:

- All source files ≤ 150 non-comment lines (`max-lines` rule)
- JSDoc blocks contain ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences (`local/jsdoc-examples-only` rule)
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters

**TDD discipline (task-level)**:

- Within each `F###` group: T001 = test (RED), T002 = implement (GREEN), T003 = refactor (BLUE, optional)
- Confirm T001 FAILS before writing T002; confirm T001 PASSES after T002
- Do NOT start the next `F###` group until the current group is GREEN
- Do NOT batch all tests into one group and all implementations into another

DO NOT commit broken code. DO NOT mark tasks complete if any gate fails.

<!-- SPECKIT START -->
Reference plan: [specs/001-reminders/plan.md](../specs/001-reminders/plan.md)
<!-- SPECKIT END -->

## Code Style

Follow the patterns established in the codebase:

- Check existing files for naming conventions
- Match indentation and formatting styles
- Use the same import/module patterns
- Follow any linting rules configured in the project

## Error Handling

| Condition                | Expected Behavior                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------- |
| User story unclear       | Ask for clarification in progress entry, mark tasks as blocked                        |
| Tests fail               | Run `pnpm test` for detail. Fix the code (never suppress). Do not mark task complete. No commit. |
| Cannot complete story    | Report partial progress, commit only if all completed tasks form coherent unit        |
| All tasks done           | Commit final story, output `<promise>COMPLETE</promise>`                              |
| Dependencies missing     | Note in progress file, skip to next available task                                    |
