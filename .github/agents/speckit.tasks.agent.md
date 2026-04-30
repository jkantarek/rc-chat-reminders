---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
handoffs: 
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_tasks` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    
    Wait for the result of the hook command before proceeding to the Outline.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (interface contracts), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map interface contracts to user stories
   - If research.md exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, F001 tests (TDD RED — write first, must fail), F002 implementation (GREEN), F003 refactor (optional BLUE), Exit Criteria table
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Composability Pass** — After drafting all tasks, trace the full cross-phase dependency chain and fix any gaps **before writing the file**. For each item below, if a gap is found, update the affected task description in place — do not add new phases or reorder phases unless strictly necessary.

   Check every pair of phases where a later phase consumes an artifact produced by an earlier phase:

   | Gap type | What to check | Common fix |
   |----------|--------------|------------|
   | **CSS variable not read** | Does any task write a CSS custom property (e.g. `--pane-width`) that a prior task never wired into a CSS rule? | Add the corresponding CSS rule (e.g. `flex: 0 0 var(--pane-width)`) to the earlier setup task |
   | **DOM element never created** | Does any later task query a DOM element (`#id`, `[role=button]`, etc.) that no earlier task adds to `index.html`? | Add the missing element to the HTML scaffold task in P001 |
   | **Method tested too late** | Does a `main.ts` wiring task call a method (e.g. `setBackground()`) that was never given a RED test in its module's F-group? | Move the method into the module's own `T001`/`T002` pair; remove the ambiguous wording from the wiring task |
   | **Return value not tested** | Does a factory function (e.g. `createViewport`) return a property that a later task depends on (e.g. `getSceneManager()`) but that property is never asserted in the factory's `T001`? | Add the assertion to the factory's existing `T001` |
   | **CSS visual collapse never happens** | Does a task set a data attribute (e.g. `dataset.collapsed = 'true'`) to trigger a visual state, but no CSS rule uses that attribute? | Add the CSS rule to the earlier setup task |
   | **`[P]` marker incorrect** | Is a task marked `[P]` (parallel) but depends on output from a task in the same phase that hasn't been completed yet? | Remove the `[P]` marker |

   After completing the pass, confirm: every artifact produced in phase N is consumed correctly in phase N+1 without requiring any implementer to revisit a completed task.

6. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)
   - Composability pass result: list any gaps found and how they were resolved (or "none found")

7. **Check for extension hooks**: After tasks.md is generated, check if `.specify/extensions.yml` exists in the project root.
   - If it exists, read it and look for entries under the `hooks.after_tasks` key
   - If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
   - Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
   - For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
     - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
     - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
   - For each executable hook, output the following based on its `optional` flag:
     - **Optional hook** (`optional: true`):
       ```
       ## Extension Hooks

       **Optional Hook**: {extension}
       Command: `/{command}`
       Description: {description}

       Prompt: {prompt}
       To execute: `/{command}`
       ```
     - **Mandatory hook** (`optional: false`):
       ```
       ## Extension Hooks

       **Automatic Hook**: {extension}
       Executing: `/{command}`
       EXECUTE_COMMAND: {command}
       ```
   - If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**TDD at task level — DEFAULT**: TDD happens inside each `F###` group, not at the feature layer. Each `F###` is one logical concern. `T001` writes the test (RED — must fail), `T002` implements it (GREEN — makes it pass), `T003` optionally refactors (BLUE). Complete one full cycle before opening the next `F###`. Do NOT batch all tests into one F group and all implementation into another — that over-builds.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] P###F###T### [P?] Description with file path
```

**ID Segments** — `P###F###T###`:

| Segment | Meaning | Resets |
|---------|---------|--------|
| `P###` | Phase number (001, 002, …) | Never |
| `F###` | Feature / logical group within phase (001, 002, …) | Per phase |
| `T###` | Task within feature (001, 002, …) | Per feature |

**Convention within every `F###` group**:
- `T001` — Write test / doctest for this one concern. Must FAIL before T002 starts.
- `T002` — Implement only what makes T001 pass.
- `T003` — (Optional) Refactor while keeping T001 passing.

**Other Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]`
2. **Task ID**: `P###F###T###` following the numbering rules above
3. **[P] marker**: Include ONLY if task touches different files with no unresolved dependencies
4. **Description**: Clear action with exact file path (story identity is encoded in P/F — no `[USN]` label needed)

**Examples**:

- ✅ CORRECT: `- [ ] P001F001T001 Create project directory structure per implementation plan`
- ✅ CORRECT: `- [ ] P001F002T001 [P] Configure ESLint in eslint.config.mjs`
- ✅ CORRECT: `- [ ] P003F001T001 [P] Write inline doctest for clamp() in src/utils/math.ts`
- ✅ CORRECT: `- [ ] P003F001T002 [P] Implement clamp() in src/utils/math.ts`
- ✅ CORRECT: `- [ ] P003F002T001 Write unit test for SceneService in src/renderer/scene.test.ts`
- ✅ CORRECT: `- [ ] P003F002T002 Implement SceneService in src/renderer/scene.ts (depends on P003F001T002)`
- ❌ WRONG: `- [ ] T001 Create model` (old T-only format — missing P and F segments)
- ❌ WRONG: `P003F001T001 Write test` (missing checkbox)
- ❌ WRONG: `- [ ] P003F001T001 Write test` (missing file path)
- ❌ WRONG: `- [ ] P003F002T001 [US1] Implement model` (story label redundant — story is encoded in P/F)
- ❌ WRONG: Grouping ALL tests into F001 and ALL implementation into F002 (that’s feature-layer TDD, not task-level)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase (P003, P004, …)
   - Decompose the story into its smallest independently testable concerns
   - Each concern becomes one `F###` group:
     - `T001` — write test / doctest for that concern (RED)
     - `T002` — implement only what makes T001 pass (GREEN)
     - `T003` — refactor (BLUE, optional)
   - Sequence F groups: pure types/data first, then services that depend on them, then entry points / wiring last
   - Mark `[P]` on `T001`/`T002` pairs when they touch entirely different files (no shared dependency)

2. **From Contracts**:
   - Map each interface contract → to the user story it serves
   - Each interface contract becomes its own `F###` group: T001 writes the contract test (RED), T002 implements it (GREEN)

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **P001**: Setup (project initialization)
- **P002**: Foundational (blocking prerequisites — MUST complete before user stories)
- **P003+**: User Stories in priority order (P1, P2, P3…) — each user story is one phase
  - Decompose the story into concerns; each concern = one `F###` group
  - Within each `F###`: T001 (RED) → T002 (GREEN) → T003 (BLUE, optional) — complete before next `F###`
  - Sequence F groups: data types → services → entry points / wiring
  - **Exit Criteria**: Run all quality gates after all F groups are GREEN; fix before commit
- **Final Phase**: Polish & Cross-Cutting Concerns

**Exit Criteria table to generate into every user story phase**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional ESLint-enforced constraints (include in every story’s Exit Criteria):
- All new source files ≤ 150 non-comment lines
- JSDoc blocks contain ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters
