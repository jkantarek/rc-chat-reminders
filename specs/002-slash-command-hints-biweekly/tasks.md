# Feature Tasks: Slash Command Hints & Biweekly Recurring Reminders

Feature: `002-slash-command-hints-biweekly`  
Spec: [spec.md](./spec.md) | Plan: [plan.md](./plan.md) | Research: [research.md](./research.md)

---

## Phase 1 — Setup: Foundational Type Extension

**Goal**: Extend types in `src/reminder/Reminder.ts` to support `'biweekly'` frequency and the new optional
fields (`biweeklyAnchorDate`, `scheduleLabel`). These are compile-time prerequisites for all Phase 3 work.
Phase 2 (US-001) is fully independent and can be done in parallel.

**Independent test criteria**: `pnpm typecheck` reports zero errors with a test file that uses
`biweeklyAnchorDate` and `scheduleLabel` on `Reminder`, and `'biweekly'` as a `ReminderFrequency`.

### F001 — Reminder.ts: add biweekly frequency and optional fields

- [x] P001F001T001 Write `src/reminder/Reminder.test.ts` with a type-level test that constructs a minimal
      `Reminder` object with `biweeklyAnchorDate: new Date()` and asserts `scheduleLabel` is
      `string | undefined`; also assert `'biweekly'` is assignable to `ReminderFrequency` — confirm
      `pnpm typecheck` fails (compile error: unknown properties)
- [x] P001F001T002 In `src/reminder/Reminder.ts`: add `'biweekly'` to `ReminderFrequency`; add
      `scheduleLabel?: string` to `RecurringScheduleResult`; add `biweeklyAnchorDate?: Date` and
      `scheduleLabel?: string` to `Reminder`; add `biweeklyAnchorDate?: string` and `scheduleLabel?: string`
      to `PersistedReminder` — confirm `pnpm typecheck` passes and `pnpm test` is green

### Exit Criteria

| Gate       | Command          | Required                 |
| ---------- | ---------------- | ------------------------ |
| TypeScript | `pnpm typecheck` | Zero errors              |
| Tests      | `pnpm test`      | All pass, no regressions |

---

## Phase 2 — User Story 001: Slash Command Autocomplete Hints

**User story**: As a Rocket.Chat user, when I type `/remind` or `/reminders` in the message box, I want to
see the expected format and a description in the autocomplete panel instead of blank or UUID text.

**Independent test criteria**: Unit assertions confirm `RemindCommand.i18nParamsExample === 'remind_command_params'`
and `RemindersCommand.i18nDescription === 'reminders_command_description'`; `i18n/en.json` contains all
four required keys.

**Dependency**: None. Phase 2 is fully independent of Phase 1 and Phase 3.

### F001 — i18n file + command field updates

- [ ] P002F001T001 [P] Add assertions to `src/commands/RemindCommand.test.ts` that
      `command.i18nParamsExample === 'remind_command_params'` and
      `command.i18nDescription === 'remind_command_description'`; add assertions to
      `src/commands/RemindersCommand.test.ts` that `command.i18nParamsExample === 'reminders_command_params'`
      and `command.i18nDescription === 'reminders_command_description'` — confirm `pnpm test` fails
- [ ] P002F001T002 [P] Create `i18n/en.json` with keys `remind_command_params`,
      `remind_command_description`, `reminders_command_params`, `reminders_command_description` (see
      [contracts/slash-command-ux.md](./contracts/slash-command-ux.md) for exact values); set
      `readonly i18nParamsExample = 'remind_command_params'` and
      `readonly i18nDescription = 'remind_command_description'` on `RemindCommand` in
      `src/commands/RemindCommand.ts`; set `readonly i18nParamsExample = 'reminders_command_params'` and
      `readonly i18nDescription = 'reminders_command_description'` on `RemindersCommand` in
      `src/commands/RemindersCommand.ts` — confirm `pnpm test` passes

### Exit Criteria

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional ESLint constraints:

- All new source files ≤ 150 non-comment lines
- JSDoc blocks contain ONLY `@example` blocks with ` ```ts @import.meta.vitest ` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters

---

## Phase 3 — User Story 002: Biweekly Recurring Reminders

**User story**: As a Rocket.Chat user, I can type `/remind me <message> every other week on Monday` and
receive a reminder that fires exactly every other Monday starting from the week I created it, with a
human-readable label in the confirmation and reminder list.

**Independent test criteria**: A biweekly reminder fires on week 0 (anchor), is silently skipped on
week 1, and fires again on week 2; the confirmation reply shows `every other week on Monday at 06:00`
(or the specified time); the reminder survives a repository round-trip with `biweeklyAnchorDate` intact.

**Sequencing**: All F-groups depend on P001F001T002 being complete. Complete P001 before starting any
F-group here. F001 → F002 → F003 are sequential. F004 and F005 can run in parallel with each other
after P001F001T002 (they do not depend on F002 or F003).

### F001 — Biweekly parser in RecurringScheduleParser (depends on P001F001T002)

- [ ] P003F001T001 Add an `@example` doctest block to `parseRecurring` in
      `src/parsing/RecurringScheduleParser.ts` asserting:
      `parseRecurring('every other week on monday')` returns
      `{ kind: 'recurring', frequency: 'biweekly', scheduleLabel: 'every other week on Monday at 06:00', cronExpression: '0 6 * * 1' }`;
      `parseRecurring('every other week on friday at 9am')` returns
      `{ kind: 'recurring', frequency: 'biweekly', scheduleLabel: 'every other week on Friday at 09:00', cronExpression: '0 9 * * 5' }`;
      `parseRecurring('every other week on monday at 25:00')` returns
      `{ kind: 'error', reason: /Cannot parse time/ }` — confirm `pnpm test` fails
- [ ] P003F001T002 In `src/parsing/RecurringScheduleParser.ts`: add regex
      `EVERY_OTHER_WEEK_DOW = /^every other week on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: at (.+))?$/i`;
      add helpers `pad2(n: number): string` (zero-pads to 2 digits) and `capitalize(s: string): string`
      (upper-cases first character); add function `parseEveryOtherWeekDow` that returns a
      `RecurringScheduleResult` with `frequency: 'biweekly'`, the correct cron string, and
      `scheduleLabel`; append `parseEveryOtherWeekDow` to the `RECURRING_PARSERS` array — confirm
      `pnpm test` passes

### F002 — Biweekly anchor computation in ReminderFactory (depends on P003F001T002)

- [ ] P003F002T001 Create `src/commands/ReminderFactory.test.ts` with tests asserting that
      `toRecurringReminder` called with a biweekly `RecurringScheduleResult` (e.g.,
      `{ kind: 'recurring', frequency: 'biweekly', cronExpression: '0 6 * * 1', scheduleLabel: 'every other week on Monday at 06:00' }`)
      produces a `Reminder` where `biweeklyAnchorDate` is a `Date` instance whose `getDay()` returns `1`
      (Monday) and `scheduleLabel === 'every other week on Monday at 06:00'`; also assert that a non-biweekly
      `RecurringScheduleResult` produces a `Reminder` with `biweeklyAnchorDate === undefined` — confirm
      `pnpm test` fails
- [ ] P003F002T002 In `src/commands/ReminderFactory.ts`: add
      `parseCronBiweekly(cron: string): { min: number; hour: number; dow: number }` that splits the cron
      string and extracts `min`, `hour`, and `dow` fields; add
      `computeBiweeklyAnchor(cron: string, from: Date): Date` that returns the next occurrence of the given
      DOW at the given HH:MM that is at least 1 day after `from`; update `toRecurringReminder` to spread
      `s.scheduleLabel` (when present) and set
      `biweeklyAnchorDate: computeBiweeklyAnchor(s.cronExpression, new Date())` when
      `s.frequency === 'biweekly'` — confirm `pnpm test` passes

### F003 — Biweekly parity guard in ReminderProcessor (depends on P003F002T002)

- [ ] P003F003T001 In `src/scheduler/ReminderProcessor.test.ts` add tests for `shouldFireBiweekly`
      (import from module): a reminder with `biweeklyAnchorDate = T0` and `now = T0` returns `true`
      (week 0); `now = T0 + 7 days` returns `false` (week 1, skip); `now = T0 + 14 days` returns `true`
      (week 2); a reminder with `frequency !== 'biweekly'` always returns `true` — confirm `pnpm test` fails
- [ ] P003F003T002 In `src/scheduler/ReminderProcessor.ts`: add exported function
      `shouldFireBiweekly(reminder: Reminder, now: Date): boolean` — returns `true` for non-biweekly
      reminders; for biweekly, computes `Math.floor((now.getTime() - anchor.getTime()) / 604_800_000) % 2 === 0`
      using `reminder.biweeklyAnchorDate ?? reminder.createdAt` as anchor; call `shouldFireBiweekly` in
      `processReminder` before `fireReminder` and return early (without firing) when it returns `false` —
      confirm `pnpm test` passes

### F004 — Formatter: prefer scheduleLabel over cronExpression (depends on P001F001T002, [P] with F005)

- [ ] P003F004T001 [P] Add `@example` doctest blocks to the relevant function(s) in
      `src/reminder/ReminderFormatter.ts` asserting that a `Reminder` with
      `scheduleLabel: 'every other week on Monday at 06:00'` produces that exact string in both the
      `When:` field of `formatConfirmation` output and the schedule column of `formatSchedule` output;
      also assert that a reminder without `scheduleLabel` still falls back to the existing `cronExpression`
      display — confirm `pnpm test` fails
- [ ] P003F004T002 [P] In `src/reminder/ReminderFormatter.ts` update `formatSchedule` and
      `formatConfirmation` (or their shared schedule-label helper) to use
      `r.scheduleLabel ?? r.cronExpression ?? '(one-time)'` as the displayed schedule string — confirm
      `pnpm test` passes

### F005 — Repository: round-trip biweeklyAnchorDate and scheduleLabel (depends on P001F001T002, [P] with F004)

- [ ] P003F005T001 [P] In `src/reminder/ReminderRepository.test.ts` add a test that constructs a
      `Reminder` with `biweeklyAnchorDate: new Date('2026-05-04T06:00:00.000Z')` and
      `scheduleLabel: 'every other week on Monday at 06:00'`, calls `toPOptionals` then `fromPOptionals`,
      and asserts that `biweeklyAnchorDate` is still a `Date` instance with the same ISO string and
      `scheduleLabel` is unchanged; also assert that a `Reminder` without these fields round-trips
      without adding them — confirm `pnpm test` fails
- [ ] P003F005T002 [P] In `src/reminder/ReminderRepository.ts` update `toPOptionals` to
      conditionally spread `...(reminder.biweeklyAnchorDate !== undefined && { biweeklyAnchorDate: reminder.biweeklyAnchorDate.toISOString() })`
      and `...(reminder.scheduleLabel !== undefined && { scheduleLabel: reminder.scheduleLabel })`;
      update `fromPOptionals` to reconstruct
      `...(p.biweeklyAnchorDate !== undefined && { biweeklyAnchorDate: new Date(p.biweeklyAnchorDate) })`
      and `...(p.scheduleLabel !== undefined && { scheduleLabel: p.scheduleLabel })` — confirm
      `pnpm test` passes

### Exit Criteria

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional ESLint constraints:

- `src/parsing/RecurringScheduleParser.ts` must stay ≤ 150 non-comment lines (currently ~105)
- `src/commands/ReminderFactory.ts` must stay ≤ 150 non-comment lines
- `src/scheduler/ReminderProcessor.ts` must stay ≤ 150 non-comment lines
- JSDoc blocks contain ONLY `@example` blocks with ` ```ts @import.meta.vitest ` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters

---

## Phase 4 — Polish & Cross-Cutting Concerns

**Goal**: Confirm all quality gates pass at ≥98% coverage across the full change set. Refactor any file
that exceeds 130 non-comment lines or has an uncovered branch.

### F001 — Coverage and CI validation

- [ ] P004F001T001 Run `pnpm test:coverage`; for any metric below 98%, identify the uncovered branch and
      add a targeted `@example` doctest or `it()` block in the relevant source file to cover it — repeat
      until all four thresholds are ≥98%
- [ ] P004F001T002 Run `script/ci` (full gate suite: typecheck + lint + format:check + test:coverage +
      rc:package); confirm exit code 0; fix any remaining lint, format, or packaging issue before
      declaring the feature complete

---

## Dependencies

```
P001F001T002 ──┬──► P003F001T001 ──► P003F001T002
               │                         │
               │                         └──► P003F002T001 ──► P003F002T002
               │                                                    │
               │                                                    └──► P003F003T001 ──► P003F003T002
               │
               ├──► P003F004T001 ──► P003F004T002   (parallel with F005)
               └──► P003F005T001 ──► P003F005T002   (parallel with F004)

P002 is fully independent of P001 and P003.

P004 depends on all of P001, P002, and P003 being green.
```

## Parallel Execution Examples

**US-001 (P002) in parallel with US-002 setup (P001)**:

- P002F001T001 / P002F001T002 can start immediately (no type dependency) — touches only
  `RemindCommand.ts`, `RemindersCommand.ts`, their test files, and `i18n/en.json`
- P001F001T001 / P001F001T002 can run at the same time — touches only `Reminder.ts` and
  `Reminder.test.ts`

**Within US-002 (P003) — after P001F001T002 and P003F002T002 are done**:

- P003F004 (formatter) and P003F005 (repository) touch different files with no shared dependency
  — both marked `[P]` and can run in parallel

## Implementation Strategy

**MVP scope** — US-001 only (P002): Two source file edits + one new JSON file. Can be shipped
independently in a single commit without any type changes or test infrastructure work.

**Full scope** — P001 → P002 (parallel) + P003F001 → P003F002 → P003F003 (sequential) + P003F004 /
P003F005 (parallel once P001 done) → P004.

**Suggested commit sequence**:

1. `P001 + P002` — types + i18n hints (can be batched; both are small and non-overlapping)
2. `P003F001 + P003F001` — parser (RED then GREEN, one commit per cycle)
3. `P003F002` — factory (RED then GREEN)
4. `P003F003` — processor (RED then GREEN)
5. `P003F004 + P003F005` — formatter + repository (can be batched; parallel F-groups)
6. `P004` — polish + final CI pass
