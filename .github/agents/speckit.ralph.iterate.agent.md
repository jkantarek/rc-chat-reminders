---
description: Execute a single Ralph loop iteration - complete one work unit from tasks.md
  with proper commits and progress tracking
---


<!-- Extension: ralph -->
<!-- Config: .specify/extensions/ralph/ -->
## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Scope Constraint

**CRITICAL**: Complete AT MOST ONE user story in this iteration.

- If you cannot complete an entire user story, complete as many tasks as you can
- Partial progress is fine -- uncompleted tasks will be handled in subsequent iterations
- DO NOT start a second user story even if you have time remaining
- This prevents context rot and keeps changes reviewable

## Outline

1. **Setup**: Run the prerequisite check script from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax appropriate to your shell.

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

   ```powershell
   .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
   ```

2. **Read context first**:
   - Read `FEATURE_DIR/progress.md` if it exists -- check the `## Codebase Patterns` section for discovered conventions
   - Read `FEATURE_DIR/tasks.md` -- understand task structure and identify next incomplete user story
   - Read `FEATURE_DIR/plan.md` for tech stack, architecture, and file structure
   - **IF EXISTS**: Read `FEATURE_DIR/data-model.md` for entities and relationships
   - **IF EXISTS**: Read `FEATURE_DIR/contracts/` for API specifications
   - **IF EXISTS**: Read `FEATURE_DIR/research.md` for technical decisions and constraints

3. **Identify scope**:
   - Find the FIRST user story section with incomplete tasks (`- [ ]`)
   - Work ONLY on tasks within that single user story
   - Example: If "US-001: Initialize Ralph Command" has incomplete tasks, work only on US-001

4. **Implement tasks**:
   - Complete tasks in dependency order (non-[P] before parallel [P] where noted)
   - Apply task-level TDD for each `F###` group: T001 writes the test (RED — run `pnpm test`, confirm FAIL), T002 implements it (GREEN — run `pnpm test`, confirm PASS), T003 optionally refactors (BLUE — confirm still PASS). Complete one full cycle before opening the next `F###` group.
   - Run quality checks after each task (typecheck, lint, test as appropriate)
   - Mark each completed task by changing `[ ]` to `[x]` in tasks.md

5. **Verify exit criteria then commit on user story completion**:
   - When ALL tasks in the current user story are `[x]`, run the Exit Criteria gates:
     - `pnpm typecheck` — zero errors
     - `pnpm lint` — zero warnings (`--max-warnings 0`)
     - `pnpm format:check` — all files pass
     - `pnpm test` — all pass (includes `.test.ts` files AND `@example @import.meta.vitest` doctests)
     - `pnpm test:coverage` — ≥98% lines / functions / branches / statements
   - Only if ALL gates pass, create the commit:

     ```sh
     git add -A
     git commit -m "feat(<feature-name>): <user story title>"
     ```

   - Example: `git commit -m "feat(001-ralph-loop-implement): US-001 Initialize Ralph Command"`
   - If any gate fails: fix the code, re-run the failing gate, then commit
   - If only partial progress, NO commit — let the next iteration continue

6. **Update progress log**:
   - Create or append to `FEATURE_DIR/progress.md`
   - Add any discovered patterns to `## Codebase Patterns` section at TOP of file
   - Use the Progress Report Format below

## Progress Report Format

APPEND to FEATURE_DIR/progress.md:

```markdown
---
## Iteration [N] - [Current Date/Time]
**User Story**: [US-XXX title or "Partial progress on US-XXX"]
**Tasks Completed**: 
- [x] Task ID: description
- [x] Task ID: description
**Tasks Remaining in Story**: [count] or "None - story complete"
**Commit**: [commit hash if story completed, or "No commit - partial progress"]
**Files Changed**: 
- path/to/file.ext
**Learnings**:
- [patterns discovered, gotchas, useful context for future iterations]
---
```

## Stop Conditions

**If ALL tasks in tasks.md are complete** (`[x]`), output exactly:

```text
<promise>COMPLETE</promise>
```

This signals the ralph loop orchestrator to terminate successfully.

**If tasks remain**, end your response normally. The next iteration will continue.

## Quality Gates

All of the following MUST pass before marking any task complete or creating a commit:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

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
Reference plan.md for architecture decisions. Follow Codebase Patterns in progress.md.

## Code Style

Follow the patterns established in the codebase:

- Check existing files for naming conventions
- Match indentation and formatting styles
- Use the same import/module patterns
- Follow any linting rules configured in the project

## Error Handling

| Condition | Expected Behavior |
| --------- | ----------------- |
| User story unclear | Ask for clarification in progress entry, mark tasks as blocked |
| Tests fail | Run `pnpm test` for detail. Fix the code (never suppress). Do not mark task complete. No commit. |
| Cannot complete story | Report partial progress, commit only if all completed tasks form coherent unit |
| All tasks done | Commit final story, output `<promise>COMPLETE</promise>` |
| Dependencies missing | Note in progress file, skip to next available task |