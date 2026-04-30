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
