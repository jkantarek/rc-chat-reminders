---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Policy**: TDD operates at the **task level**, not the feature layer. Each `F###` group is one logical concern (a single function, type, or component). Within that group: `T001` writes the test (🔴 RED — must fail), `T002` implements it (🟢 GREEN — makes it pass), `T003` refactors (🔵 BLUE — optional, keep green). Complete one full RED→GREEN→BLUE cycle before opening the next `F###`. This prevents over-building.

**Organization**: Tasks are grouped by Phase → Feature group (F, one concern per group) → Task (T). IDs reset per level.

## ID Format: `P###F###T###`

| Segment | Meaning                                                   | Resets      |
| ------- | --------------------------------------------------------- | ----------- |
| `P###`  | Phase number (001, 002, …)                                | Never       |
| `F###`  | One logical concern within phase (001, 002, …)            | Per phase   |
| `T###`  | Step within concern (T001=test, T002=impl, T003=refactor) | Per feature |

Examples:

- `P003F001T001` — Story 1, Concern 1, write test (RED)
- `P003F001T002` — Story 1, Concern 1, implement (GREEN)
- `P003F001T003` — Story 1, Concern 1, refactor (BLUE, optional)
- `P003F002T001` — Story 1, Concern 2, write test (RED) ← only start after F001 is GREEN
- `P003F002T002` — Story 1, Concern 2, implement (GREEN)

**Convention within every `F###` group**:

- `T001` — Write test / doctest for this one concern. Run `pnpm test` → must FAIL.
- `T002` — Implement only what makes T001 pass. Run `pnpm test` → must PASS.
- `T003` — (Optional) Refactor. Run `pnpm test` → must still PASS.

- **[P]**: Task can run in parallel (touches different files, no unresolved dependencies)
- Include exact file paths in all task descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented one concern at a time (TDD: each F### group is one concern; T001 writes the test RED, T002 implements GREEN, T003 refactors BLUE)
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1 (P001): Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

### P001F001 — Project Structure

- [ ] P001F001T001 Create project directory structure per implementation plan
- [ ] P001F001T002 Initialize [language] project with [framework] dependencies

### P001F002 — Tooling Configuration

- [ ] P001F002T001 [P] Configure ESLint with project rules
- [ ] P001F002T002 [P] Configure Prettier formatting
- [ ] P001F002T003 [P] Configure TypeScript (`tsconfig.app.json` strict settings)

### Exit Criteria: Phase 1

| Gate       | Command             | Required                           |
| ---------- | ------------------- | ---------------------------------- |
| TypeScript | `pnpm typecheck`    | Zero errors                        |
| Lint       | `pnpm lint`         | Zero warnings (`--max-warnings 0`) |
| Format     | `pnpm format:check` | All files pass                     |

---

## Phase 2 (P002): Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### P002F001 — [First Foundational Area]

Replace with actual concerns from plan.md:

- [ ] P002F001T001 Setup database schema and migrations framework
- [ ] P002F001T002 Create base models/entities that all stories depend on

### P002F002 — [Second Foundational Area]

- [ ] P002F002T001 [P] Implement authentication/authorization framework
- [ ] P002F002T002 [P] Setup API routing and middleware structure
- [ ] P002F002T003 Configure error handling and logging infrastructure

### Exit Criteria: Phase 2

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3 (P003): User Story 1 — [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

> **TDD Rule (task-level)**: Each F### group is ONE logical concern. Complete T001 (test RED) → T002 (impl GREEN) → T003 (refactor BLUE, optional) before opening the next group. Do NOT batch tests across multiple concerns.

### P003F001 — [First concern, e.g. `[Entity1]` type]

- [ ] P003F001T001 [P] Write inline doctest for [Entity1] constructor/factory in src/[domain]/[entity1].ts
- [ ] P003F001T002 [P] Implement [Entity1] type in src/[domain]/[entity1].ts
- [ ] P003F001T003 [P] Refactor [Entity1] if file approaches 150-line limit (optional)

### P003F002 — [Second concern, e.g. `[Entity2]` type]

- [ ] P003F002T001 [P] Write inline doctest for [Entity2] in src/[domain]/[entity2].ts
- [ ] P003F002T002 [P] Implement [Entity2] type in src/[domain]/[entity2].ts

### P003F003 — [Third concern, e.g. `[Service]`]

- [ ] P003F003T001 Write black-box unit test for [Service] in src/[domain]/[service].test.ts
- [ ] P003F003T002 Implement [Service] in src/[domain]/[service].ts (depends on P003F001T002, P003F002T002)

### P003F004 — [Fourth concern, e.g. feature entry point wiring]

- [ ] P003F004T001 Write integration test for [user journey] in src/[domain]/[file].test.ts
- [ ] P003F004T002 Implement [feature entry point] in src/[location]/[file].ts
- [ ] P003F004T003 Wire [feature] into application entry point (if required)

### Exit Criteria: Phase 3 (US1)

All criteria MUST pass before this story is committed:

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints** (violations are lint errors — block the gate):

- All new source files ≤ 150 non-comment lines (`max-lines` rule)
- JSDoc blocks contain ONLY `@example` blocks with ` ```ts @import.meta.vitest ` fences (`local/jsdoc-examples-only`)
- No `@ts-ignore` / `@ts-expect-error` without an adjacent `@example` doctest
- No unused locals or parameters

**Checkpoint**: User Story 1 is fully functional, tested, linted, and covered independently

---

## Phase 4 (P004): User Story 2 — [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

> **TDD Rule (task-level)**: Complete one full RED→GREEN→BLUE cycle per F### group before starting the next.

### P004F001 — [First concern]

- [ ] P004F001T001 [P] Write inline doctest for [function/type] in src/[domain]/[file].ts
- [ ] P004F001T002 [P] Implement [function/type] in src/[domain]/[file].ts

### P004F002 — [Second concern]

- [ ] P004F002T001 Write black-box unit test for [Service] in src/[domain]/[service].test.ts
- [ ] P004F002T002 Implement [Service] in src/[domain]/[service].ts

### P004F003 — [Third concern, e.g. integration]

- [ ] P004F003T001 Write integration test for [user journey] in src/[domain]/[file].test.ts
- [ ] P004F003T002 Implement [feature] in src/[location]/[file].ts
- [ ] P004F003T003 Integrate with User Story 1 components (if needed)

### Exit Criteria: Phase 4 (US2)

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Checkpoint**: User Stories 1 AND 2 both work independently and meet all quality gates

---

## Phase 5 (P005): User Story 3 — [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

> **TDD Rule (task-level)**: Complete one full RED→GREEN→BLUE cycle per F### group before starting the next.

### P005F001 — [First concern]

- [ ] P005F001T001 [P] Write inline doctest for [function/type] in src/[domain]/[file].ts
- [ ] P005F001T002 [P] Implement [function/type] in src/[domain]/[file].ts

### P005F002 — [Second concern]

- [ ] P005F002T001 Write black-box unit test for [Service] in src/[domain]/[service].test.ts
- [ ] P005F002T002 Implement [Service] in src/[domain]/[service].ts

### P005F003 — [Third concern]

- [ ] P005F003T001 Write integration test for [user journey] in src/[domain]/[file].test.ts
- [ ] P005F003T002 Implement [feature] in src/[location]/[file].ts

### Exit Criteria: Phase 5 (US3)

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Checkpoint**: All user stories functional and meeting quality gates

---

[Add more user story phases following the same P00N pattern — each F### group is one concern, T001=test, T002=impl, T003=refactor]

---

## Phase N (P0NN): Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### P0NNF001 — Documentation & Code Quality

- [ ] P0NNF001T001 [P] Update documentation in docs/
- [ ] P0NNF001T002 Code cleanup and domain-aligned refactoring
- [ ] P0NNF001T003 Performance optimizations across all stories

### P0NNF002 — Final Validation

- [ ] P0NNF002T001 Security hardening review
- [ ] P0NNF002T002 Run quickstart.md end-to-end validation

### Exit Criteria: Final Phase (Polish)

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |
| Build            | `pnpm build`         | Zero errors                                    |

---

## Global Quality Gates

These gates must pass at every phase boundary and before every commit:

| Gate                                | Command              | Threshold                          |
| ----------------------------------- | -------------------- | ---------------------------------- |
| TypeScript strict compile           | `pnpm typecheck`     | Zero errors                        |
| ESLint                              | `pnpm lint`          | Zero warnings (`--max-warnings 0`) |
| Prettier                            | `pnpm format:check`  | All files formatted                |
| Vitest (tests + doctests)           | `pnpm test`          | All pass                           |
| Coverage (lines/fns/branches/stmts) | `pnpm test:coverage` | ≥98% each metric                   |
| Build (final phase only)            | `pnpm build`         | Zero errors                        |

**Doctest contract** (enforced by `local/jsdoc-examples-only` ESLint rule):

- Every JSDoc block consists ONLY of `@example` blocks with ` ```ts @import.meta.vitest ` fences
- `@param`, `@returns`, `@description` prose in JSDoc = lint error
- These examples are executed as live tests on every `pnpm test` run

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story (task-level TDD)

1. **Open F001** — write T001 (test for this one concern), confirm FAIL
2. **F001 T002** — implement only what makes T001 pass, confirm PASS
3. **F001 T003** (optional) — refactor, confirm still PASS
4. **Open F002** — repeat RED→GREEN→BLUE for the next concern
5. Continue until all concerns for the story are complete
6. **Exit Criteria check** — run all quality gates, fix before commit

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 (P003)

```bash
# Each F### group is worked sequentially (T001 RED, then T002 GREEN).
# F### groups with [P] on their tasks can be started in parallel
# only when they touch entirely different files.

# F001 cycle — [Entity1] type:
P003F001T001: Write doctest for Entity1 in src/[domain]/[entity1].ts   # RED: pnpm test → fails
P003F001T002: Implement Entity1 in src/[domain]/[entity1].ts            # GREEN: pnpm test → passes

# F002 cycle — [Entity2] type (can start in parallel with F001 if different file):
P003F002T001: Write doctest for Entity2 in src/[domain]/[entity2].ts   # RED
P003F002T002: Implement Entity2 in src/[domain]/[entity2].ts            # GREEN

# F003 cycle — [Service] (depends on F001+F002 completing GREEN):
P003F003T001: Write unit test for Service in src/[domain]/[service].test.ts  # RED
P003F003T002: Implement Service in src/[domain]/[service].ts                  # GREEN
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete P001: Setup — run Exit Criteria
2. Complete P002: Foundational — run Exit Criteria (CRITICAL — blocks all stories)
3. For each F### group in P003: write T001 (RED) → T002 GREEN → optional T003 BLUE
4. Run Exit Criteria for P003 after all F groups are GREEN
5. **STOP and VALIDATE**: All gates pass → commit
6. Deploy/demo if ready

### Incremental Delivery

1. P001 + P002 (gates pass) → Foundation ready
2. P003 (all F groups GREEN, gates pass) → US1 complete → Deploy (MVP!)
3. P004 (all F groups GREEN, gates pass) → US2 complete → Deploy
4. P005 (all F groups GREEN, gates pass) → US3 complete → Deploy
5. Each story adds value without breaking coverage or lint gates

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- `[P]` tasks = different files, no unresolved dependencies — safe to run in parallel
- `F###` = one logical concern (one function, one type, one component) — never batch multiple concerns into one group
- Within each `F###`: T001=test (RED must fail), T002=implement (GREEN must pass), T003=refactor (BLUE optional)
- Never start T002 until T001 is confirmed failing; never start the next F until the current F is GREEN
- `pnpm test` runs BOTH `.test.ts` files AND inline `@example @import.meta.vitest` doctests
- Coverage thresholds (98%) are enforced by Vitest — a miss is a failing test run
- Every user story phase must independently satisfy Exit Criteria before commit
- Commit only after Exit Criteria gates are all green
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
