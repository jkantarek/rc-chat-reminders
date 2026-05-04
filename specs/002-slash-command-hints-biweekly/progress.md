# Ralph Progress Log

Feature: 002-slash-command-hints-biweekly
Started: 2026-05-03 20:13:55

## Codebase Patterns

- Test files use `describe`/`it`/`expect` from `vitest`; no `beforeEach`/`afterEach`
- Type-level tests use typed const assignments + `expectTypeOf` for optional properties
- `expectTypeOf(x).toEqualTypeOf<T>()` works for optional primitive types but not full union types — use runtime `expect(val).toBe(...)` for union checks
- Commit message subjects must be all-lowercase (commitlint `subject-case` rule)
- Prettier includes `specs/` markdown files — always run `pnpm format:check` before commit

---

---

## Iteration 1 - 2026-05-03T20:16:00-05:00

**User Story**: P001 — Foundational Type Extension

**Tasks Completed**:

- [x] P001F001T001: Write Reminder.test.ts with type-level tests (biweeklyAnchorDate, scheduleLabel, 'biweekly') — confirmed typecheck FAILS before T002
- [x] P001F001T002: Update Reminder.ts — add 'biweekly' to ReminderFrequency; add biweeklyAnchorDate/scheduleLabel to Reminder, PersistedReminder, RecurringScheduleResult

**Tasks Remaining in Story**: None - story complete

**Commit**: 6f2bc4c

**Files Changed**:

- src/reminder/Reminder.ts
- src/reminder/Reminder.test.ts
- specs/002-slash-command-hints-biweekly/tasks.md
- specs/002-slash-command-hints-biweekly/progress.md

**Learnings**:

- `expectTypeOf(f).toEqualTypeOf<UnionType>()` fails typecheck even when types match — Vitest's internal constraint mechanism doesn't handle wide union types well; use `const f: UnionType = 'value'; expect(f).toBe('value')` instead
- Prettier formats `specs/` markdown — always fix before commit

---

---

## Iteration 3 - 2026-05-03T20:38:00-05:00

**User Story**: P003 US-002 — Biweekly Recurring Reminders

**Tasks Completed**:

- [x] P003F001T001/T002: Add EVERY_OTHER_WEEK_DOW regex + parseEveryOtherWeekDow to RecurringScheduleParser
- [x] P003F002T001/T002: Add computeBiweeklyAnchor + toRecurExtras to ReminderFactory; new ReminderFactory.test.ts
- [x] P003F003T001/T002: Add exported shouldFireBiweekly + parity guard in ReminderProcessor
- [x] P003F004T001/T002: Prefer scheduleLabel in ReminderFormatter formatConfirmation + formatSchedule
- [x] P003F005T001/T002: Round-trip biweeklyAnchorDate + scheduleLabel in ReminderRepository
- [x] P004F001T001/T002: Coverage ≥98% verified; script/ci exit 0

**Tasks Remaining in Story**: None - story complete

**Commit**: 46037b7

**Files Changed**:

- src/parsing/RecurringScheduleParser.ts
- src/index.ts
- src/commands/ReminderFactory.ts
- src/commands/ReminderFactory.test.ts (new)
- src/scheduler/ReminderProcessor.ts
- src/scheduler/ReminderProcessor.test.ts
- src/reminder/ReminderFormatter.ts
- src/reminder/ReminderRepository.ts
- src/reminder/ReminderRepository.test.ts
- specs/002-slash-command-hints-biweekly/tasks.md

**Learnings**:

- ESLint max-lines-per-function (skipBlankLines: false) counts blank lines; Prettier can split
  ternary expressions across 3 lines, pushing functions over the 10-line limit — fix by extracting
  named type aliases or small helper functions
- `@typescript-eslint/consistent-type-definitions` requires `interface` over `type` for object shapes
- shouldFireBiweekly needs `ms >= 0` guard to handle `now < anchor` (negative modulo issue)
- computeBiweeklyAnchor must use UTC methods for timezone-agnostic tests
- commitlint body-max-line-length is 100 chars — keep bullet lines short in commit messages

---

**User Story**: P002 US-001 — Slash Command Autocomplete Hints

**Tasks Completed**:

- [x] P002F001T001: Added assertions to RemindCommand.test.ts and RemindersCommand.test.ts for i18nParamsExample and i18nDescription — confirmed RED
- [x] P002F001T002: Set i18nParamsExample/i18nDescription on both commands; created i18n/en.json with all four keys — confirmed GREEN

**Tasks Remaining in Story**: None - story complete

**Commit**: fa685a2

**Files Changed**:

- src/commands/RemindCommand.ts
- src/commands/RemindCommand.test.ts
- src/commands/RemindersCommand.ts
- src/commands/RemindersCommand.test.ts
- i18n/en.json
- specs/002-slash-command-hints-biweekly/tasks.md
- specs/002-slash-command-hints-biweekly/progress.md

**Learnings**:

- Coverage thresholds in vitest.config.ts are global aggregates, not per-file; individual files below 98% don't fail the gate as long as aggregate passes
- i18n/en.json must be created at the repo root (not src/), mirroring RC App convention for i18n files

---
