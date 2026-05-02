# Ralph Progress Log

Feature: 001-reminders
Started: 2026-04-30 08:42:41

## Codebase Patterns

- `App` subclasses use `protected override async extendConfiguration(_configuration, _environmentRead)` with `_` prefix for unused params (noUnusedParameters enforcement)
- `pnpm format` must be run before committing markdown files — progress.md gets trailing newline fixed
- Phase 1 has no TDD cycle; T001 tasks are direct setup actions (no test/impl split)

---

## Iteration 1 - 2026-04-30T08:45:00-05:00

**User Story**: Phase 1 (P001) — Setup: Source directory scaffold and App class stub
**Tasks Completed**:

- [x] P001F001T001: Create source subdirectories `src/commands/`, `src/reminder/`, `src/parsing/`, `src/scheduler/`
- [x] P001F002T001: Create `src/RcChatRemindersApp.ts` with `RcChatRemindersApp extends App` and empty `extendConfiguration` stub
      **Tasks Remaining in Story**: None — story complete
      **Commit**: b5dff4d
      **Files Changed**:
- src/RcChatRemindersApp.ts (created)
- src/commands/ (directory created)
- src/reminder/ (directory created)
- src/parsing/ (directory created)
- src/scheduler/ (directory created)
- specs/001-reminders/tasks.md (P001F001T001, P001F002T001 marked [x])
  **Learnings**:
- The `App` base class from `@rocket.chat/apps-engine` uses constructor `(info: IAppInfo, logger: ILogger, accessors?: IAppAccessors)` — no explicit constructor override needed in the stub since we don't add new behaviour
- `extendConfiguration` accepts two params: `IConfigurationExtend` and `IEnvironmentRead`; use `_` prefix for both in the empty stub
- Phase 1 exit criteria only requires typecheck + lint + format:check (no test/coverage gates)
- `pnpm format` fixed trailing-newline issue in progress.md

---

## Iteration 2 — Phase 2 Foundation

**Story**: P002 — Core Types & Shared Utilities
**Status**: ✅ Complete
**Commit**: ec11339

**Tasks Completed**:

- [x] P002F001T001: `src/reminder/Reminder.ts` — all core domain types (pure declarations)
- [x] P002F002T001: Added RED test for `isValidFrequency('cron')` to `src/index.test.ts`
- [x] P002F002T002: Updated `src/index.ts` — added `'cron'` to frequency guard, re-exports from `Reminder.ts`
- [x] P002F003T001: Created `src/commands/replyEphemeral.test.ts` (RED) with in-memory doubles
- [x] P002F003T002: Implemented `src/commands/replyEphemeral.ts` (GREEN)

**Tasks Remaining in Story**: None — story complete

**Files Changed**:

- `src/reminder/Reminder.ts` (created) — ReminderStatus, ReminderFrequency, TargetType, Reminder, PersistedReminder, OneTimeSchedule, RecurringScheduleResult, ParsedSchedule, ParsedTarget, ParsedCommand, ParseError, ParseResult<T>
- `src/index.ts` (modified) — added 'cron', re-exports type \* from Reminder.ts
- `src/index.test.ts` (modified) — added isValidFrequency('cron') test
- `src/commands/replyEphemeral.ts` (created)
- `src/commands/replyEphemeral.test.ts` (created)
- `src/RcChatRemindersApp.test.ts` (created) — stub test to satisfy ≥98% coverage gate
- `specs/001-reminders/tasks.md` (P002 tasks marked [x])

**Learnings**:

- `@typescript-eslint/consistent-type-definitions` requires object shapes as `interface`, not `type X = { ... }` — primitive unions (`type X = 'a' | 'b'`) are exempt
- `as unknown as T` double casts are allowed by ESLint (don't trigger `no-unsafe-*`) — useful for test stubs
- `no-empty-function` fires on `(): void => {}` — use a comment inside: `(): void => { // intentional no-op }`
- Phase 1 created `RcChatRemindersApp.ts` without a test; Phase 2's ≥98% coverage gate required adding a stub test for the empty `extendConfiguration`
- V8 coverage counts pure type-only files (zero executable code) as 0/0, which doesn't hurt the overall percentage
- `export type * from '...'` (TS 5.0+) is valid with `moduleResolution: bundler`; the re-exporting module also needs a separate `import type { Foo }` to use the type locally

---

---

## Iteration 3 — P003F001 ScheduleParser (one-time formats)

**Story**: P003 User Story 1 — One-Time Reminder
**Feature**: P003F001 — Schedule parser — one-time formats (`src/parsing/ScheduleParser.ts`)

**What was done**:

- T001 (RED): Created `src/parsing/ScheduleParser.ts` with 3 `@example @import.meta.vitest` doctest blocks and a stub returning `{ kind: 'error' }` always; confirmed tests FAIL
- T002 (GREEN): Implemented full parsing logic — relative time (`in X minutes/hours/days`), time-of-day (`at HH:MM`, `at H:MMam/pm`), tomorrow variants (`at Xam/pm tomorrow`), absolute datetime (`at YYYY-MM-DD HH:MM`) — confirmed all tests PASS
- Refactored to dispatch-table pattern to satisfy strict ESLint constraints (`max-lines-per-function: 10`, `complexity: 7`, `max-lines: 150`); added 4th doctest block with 6 edge-case assertions for 100% branch coverage
- Fixed pre-existing TypeScript/ESLint error in `src/RcChatRemindersApp.test.ts` (`type AppUnderTest` → `interface AppUnderTest`)

**Files Changed**:

- `src/parsing/ScheduleParser.ts` (created) — dispatch-table pattern with typed capture helpers, 7 mini-parsers, 4 `@example` doctest blocks, 100% coverage
- `src/RcChatRemindersApp.test.ts` (modified) — fixed `type AppUnderTest` → `interface AppUnderTest`
- `specs/001-reminders/tasks.md` (P003F001T001, P003F001T002 marked [x])

**Quality gates**: All pass — typecheck, lint (0 warnings), format:check, test (13/13), coverage (100% all metrics)

**Learnings**:

- `noUncheckedIndexedAccess` makes `RegExpExecArray` captures `string | undefined`; use `String(m[1])` to coerce to `string` with no branches (avoids dead code coverage gaps)
- Typed capture tuples (`type TwoCaptures = readonly [string, string]`) eliminate downstream null-checks entirely
- `max-lines-per-function: 10` (blank lines count!) forces a dispatch-table architecture; blank lines between grouped helpers must be eliminated carefully
- `parseTimeTomorrow` must NOT re-validate `h/m` ranges — values are always valid from `to24h`; validation would be dead code below the 98% threshold
- Edge-case doctests needed: `at 12am`, `at 12pm`, `at 24:00`, `at 13:30am`, `at 13am tomorrow`, `at 2025-02-30 09:00` for full branch coverage

---

## Iteration 4 — P003 US-1 One-Time Reminder (task tracker sync)

**User Story**: Phase 3 (P003) — One-Time Reminder (complete)
**Tasks Completed**:

- [x] P003F002T001/T002: TargetParser — `parseTarget` with doctests
- [x] P003F003T001/T002: ReminderFormatter — `formatConfirmation` + `formatError` with doctests
- [x] P003F004T001/T002: ReminderRepository — persistence CRUD with in-memory double tests
- [x] P003F005T001/T002: RemindCommandParser — `parseRemindCommand` with doctests
- [x] P003F006T001/T002: ReminderProcessor — IProcessor `processor` with in-memory tests
- [x] P003F007T001/T002: RemindCommand — executor with full in-memory double tests
- [x] P003F008T001/T002: App wiring — extendConfiguration registers command + processor

**Tasks Remaining in Story**: None — story complete
**Commit**: bb3d82e (all P003 code already committed; this iteration syncs tasks.md)
**Files Changed**:

- specs/001-reminders/tasks.md (P003F002–P003F008 all marked [x])
- specs/001-reminders/progress.md (this entry)

**Learnings**:

- Previous Ralph iterations implemented P003F002–F008 across two commits (d24fe14, bb3d82e) but tasks.md was not updated; sync-only iteration required
- ReminderRepository `create` returns the persistence record ID string (not the reminder itself) — callers use the reminder object they passed in
- `updateJobId` / `updateStatus` take both `IPersistence` and `IPersistenceRead` to fetch-then-update atomically within the in-memory double pattern
- RemindCommandParser branches at `first === undefined` and `every` keyword — these appear as uncovered in per-file coverage but overall project coverage stays ≥98%
