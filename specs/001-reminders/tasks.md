# Tasks: RC Chat Reminders — Slash Command Scheduling

**Input**: Design documents from `/specs/001-reminders/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**TDD Policy**: TDD operates at the **task level**, not the feature layer. Each `F###` group is one logical concern (a single function, type, or component). Within that group: `T001` writes the test (🔴 RED — must fail), `T002` implements it (🟢 GREEN — makes it pass), `T003` refactors (🔵 BLUE — optional, keep green). Complete one full RED→GREEN→BLUE cycle before opening the next `F###`. This prevents over-building.

**Organization**: Tasks are grouped by Phase → Feature group (F, one concern per group) → Task (T). IDs reset per level.

## ID Format: `P###F###T###`

| Segment | Meaning                                                   | Resets      |
| ------- | --------------------------------------------------------- | ----------- |
| `P###`  | Phase number (001, 002, …)                                | Never       |
| `F###`  | One logical concern within phase (001, 002, …)            | Per phase   |
| `T###`  | Step within concern (T001=test, T002=impl, T003=refactor) | Per feature |

**Convention within every `F###` group**:

- `T001` — Write test / doctest for this one concern. Run `pnpm test` → must FAIL.
- `T002` — Implement only what makes T001 pass. Run `pnpm test` → must PASS.
- `T003` — (Optional) Refactor. Run `pnpm test` → must still PASS.

**`[P]`**: Task can run in parallel (touches different files, no unresolved dependencies in the same phase).

---

## Phase 1 (P001): Setup

**Purpose**: Create source directory scaffold and app entry point stub. No user-story logic lives here.

### P001F001 — Source directory structure

- [x] P001F001T001 Create source subdirectories `src/commands/`, `src/reminder/`, `src/parsing/`, `src/scheduler/` per plan.md project structure

### P001F002 — App class scaffold

- [x] P001F002T001 Create `src/RcChatRemindersApp.ts` with `RcChatRemindersApp extends App` and an empty `extendConfiguration` stub (no registrations yet)

### Exit Criteria: Phase 1

| Gate       | Command             | Required                           |
| ---------- | ------------------- | ---------------------------------- |
| TypeScript | `pnpm typecheck`    | Zero errors                        |
| Lint       | `pnpm lint`         | Zero warnings (`--max-warnings 0`) |
| Format     | `pnpm format:check` | All files pass                     |

---

## Phase 2 (P002): Foundation — Core Types & Shared Utilities

**Purpose**: Establish the data model, public re-exports, and the `replyEphemeral` utility that every command depends on. No user-story features land here.

**⚠️ CRITICAL**: No user story phase can begin until this phase is complete and all gates are GREEN.

### P002F001 — Core domain types (src/reminder/Reminder.ts)

- [x] P002F001T001 Implement `ReminderStatus`, `ReminderFrequency` (including `'cron'`), `TargetType`, `Reminder`, `PersistedReminder`, `ParsedSchedule` (union of `OneTimeSchedule` | `RecurringScheduleResult`), `ParsedTarget`, `ParsedCommand`, `ParseError`, `ParseResult<T>` in `src/reminder/Reminder.ts`

> Pure type declarations — compilation failure in any downstream consumer serves as the RED gate. No runtime logic; no doctest needed.

### P002F002 — Update public exports (src/index.ts)

- [x] P002F002T001 Add test case to `src/index.test.ts` asserting `isValidFrequency('cron')` returns `true` (RED — currently fails because `'cron'` is not in the union)
- [x] P002F002T002 Update `src/index.ts`: add `'cron'` to `ReminderFrequency`, update `isValidFrequency` guard to include `'cron'`, and add re-exports of all new types from `src/reminder/Reminder.ts`

### P002F003 — Ephemeral reply utility (src/commands/replyEphemeral.ts)

- [x] P002F003T001 Write unit test for `replyEphemeral` in `src/commands/replyEphemeral.test.ts` using inline in-memory doubles for `IModify` (recording `notifyUser` calls), `INotifier`, `IMessageBuilder`, and `SlashCommandContext`; assert the correct user receives an ephemeral message with the given text (RED — file does not exist)
- [x] P002F003T002 Implement `replyEphemeral(modify: IModify, context: SlashCommandContext, text: string): Promise<void>` in `src/commands/replyEphemeral.ts` using `modify.getNotifier().getMessageBuilder().setRoom().setText()` + `notifyUser`

### Exit Criteria: Phase 2

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Additional constraints**: All new source files ≤ 150 non-comment lines. JSDoc blocks contain ONLY `@example` blocks with ` ```ts @import.meta.vitest ` fences.

**Checkpoint**: Foundation ready — user story phases can now begin.

---

## Phase 3 (P003): User Story 1 — One-Time Reminder (Priority: P1) 🎯 MVP

**Goal**: A user types `/remind me <message> in 15 minutes` (or `at HH:MM`, `at 9am tomorrow`, `at YYYY-MM-DD HH:MM`) and receives an ephemeral confirmation. At the scheduled time a visible persistent message appears in the room.

**Independent Test**: Invoke `RemindCommand.executor` via in-memory doubles with `args = 'me Stand-up in 1 minute'`; assert `ReminderRepository.create` is called, `scheduleOnce` is called with the correct fire time, and an ephemeral confirmation is sent. Invoke `ReminderProcessor.processor` with the stored reminder ID; assert a visible room message is created and status is updated to `'completed'`.

> **TDD Rule**: Each F### group is ONE logical concern. Complete T001 (RED) → T002 (GREEN) → T003 (BLUE, optional) before opening the next group.

### P003F001 — Schedule parser — one-time formats (src/parsing/ScheduleParser.ts)

- [x] P003F001T001 Write inline doctests in `src/parsing/ScheduleParser.ts` for `parseSchedule` covering all one-time formats (`in X minutes/hours/days`, `at HH:MM`, `at H:MMam|pm`, `at Xam|pm tomorrow`, `at YYYY-MM-DD HH:MM`) and error cases (past time, invalid input); run `pnpm test` → must FAIL
- [x] P003F001T002 Implement `parseSchedule(input: string, now: Date): ParseResult<ParsedSchedule>` in `src/parsing/ScheduleParser.ts` handling all one-time formats; recurring input (`every …`) returns a `ParseError` for now

### P003F002 — Target parser — `me` target (src/parsing/TargetParser.ts)

- [x] P003F002T001 [P] Write inline doctests in `src/parsing/TargetParser.ts` for `parseTarget` covering the `'me'` token and an unrecognised token error case; run `pnpm test` → must FAIL
- [x] P003F002T002 [P] Implement `parseTarget(token: string): ParseResult<ParsedTarget>` in `src/parsing/TargetParser.ts` handling `me` → `{ kind: 'me' }` and returning `ParseError` for unrecognised tokens

### P003F003 — Reminder formatter — confirmation & error text (src/reminder/ReminderFormatter.ts)

- [x] P003F003T001 [P] Write inline doctests in `src/reminder/ReminderFormatter.ts` for `formatConfirmation(reminder: Reminder): string` (verifying ID, target, message, and scheduled time appear in output) and `formatError(reason: string): string` (verifying `❌` prefix and reason text); run `pnpm test` → must FAIL
- [x] P003F003T002 [P] Implement `formatConfirmation` and `formatError` as pure exported functions in `src/reminder/ReminderFormatter.ts`

### P003F004 — Reminder repository — create, find, update (src/reminder/ReminderRepository.ts)

- [x] P003F004T001 Write black-box unit tests for `ReminderRepository` in `src/reminder/ReminderRepository.test.ts` covering `create` (returns a `Reminder` with a UUID id), `findById` (returns the reminder or `undefined`), `updateJobId` (persists the job ID), and `updateStatus` (persists status transitions); use inline in-memory doubles for `IPersistence` and `IPersistenceRead` (implementing `createWithAssociations`, `readByAssociation`, `updateByAssociation`); run `pnpm test` → must FAIL
- [x] P003F004T002 Implement `ReminderRepository` class in `src/reminder/ReminderRepository.ts` with `create(persis, reminder): Promise<Reminder>`, `findById(read, id): Promise<Reminder | undefined>`, `updateJobId(persis, id, jobId): Promise<void>`, `updateStatus(persis, id, status): Promise<void>` using dual associations (`USER` + `MISC`) per data-model.md §Persistence

### P003F005 — Command argument parser (src/parsing/RemindCommandParser.ts)

- [x] P003F005T001 Write inline doctests in `src/parsing/RemindCommandParser.ts` for `parseRemindCommand` covering: `me Stand-up in 15 minutes` → valid ParsedCommand; `me` target with `at 3pm` schedule → valid; invalid schedule → ParseError propagated; empty message → ParseError; run `pnpm test` → must FAIL
- [x] P003F005T002 Implement `parseRemindCommand(args: string, now: Date): ParseResult<ParsedCommand>` in `src/parsing/RemindCommandParser.ts` — splits args on first occurrence of schedule keywords (`in`, `at`, `every`), delegates to `parseTarget` and `parseSchedule`, extracts message tokens; depends on P003F001T002, P003F002T002

### P003F006 — Reminder processor — one-time fire (src/scheduler/ReminderProcessor.ts)

- [x] P003F006T001 Write black-box unit test for `ReminderProcessor.processor` in `src/scheduler/ReminderProcessor.test.ts` using in-memory doubles for `IJobContext` (carrying `{ reminderId }`), `IRead` (with in-memory persistence reader), `IModify` (recording `getCreator().finish()` calls); assert a visible room message is created with reminder text and status is updated to `'completed'` for a once-frequency reminder; run `pnpm test` → must FAIL
- [x] P003F006T002 Implement `ReminderProcessor` class in `src/scheduler/ReminderProcessor.ts` implementing `IProcessor` (`id: 'reminder-fire'`): fetch reminder by ID from persistence, resolve target room via `IRead`, create visible message via `modify.getCreator().finish()`, update status to `'completed'` only when `reminder.frequency === 'once'`; depends on P003F004T002

### P003F007 — RemindCommand executor — one-time self reminder (src/commands/RemindCommand.ts)

- [x] P003F007T001 Write black-box unit test for `RemindCommand.executor` in `src/commands/RemindCommand.test.ts` using in-memory doubles for all RC interfaces; cover: successful one-time `me` reminder (assert repository create + scheduleOnce + ephemeral confirmation); parse error path (assert ephemeral error, no persistence call); run `pnpm test` → must FAIL
- [x] P003F007T002 Implement `RemindCommand` class in `src/commands/RemindCommand.ts` with `executor` that: parses args via `parseRemindCommand`, replies ephemerally on error, resolves `me` target to `context.getSender()`, calls `ReminderRepository.create`, calls `modify.getScheduler().scheduleOnce`, calls `ReminderRepository.updateJobId`, replies with `formatConfirmation`; depends on P003F004T002, P003F005T002, P002F003T002, P003F003T002

### P003F008 — App class wiring — command + processor (src/RcChatRemindersApp.ts)

- [x] P003F008T001 Write unit test for `RcChatRemindersApp.extendConfiguration` in `src/RcChatRemindersApp.test.ts` using an in-memory `IConfigurationExtend` double that records registered slash commands and processors; assert `RemindCommand` and `ReminderProcessor` are registered; run `pnpm test` → must FAIL
- [x] P003F008T002 Implement `extendConfiguration` in `src/RcChatRemindersApp.ts` to call `configuration.slashCommands.provideSlashCommand(new RemindCommand(this))` and `configuration.scheduler.registerProcessors([new ReminderProcessor(this)])`; depends on P003F007T002, P003F006T002

### Exit Criteria: Phase 3

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Additional constraints**:

- All new source files ≤ 150 non-comment lines (`max-lines` ESLint rule)
- JSDoc blocks contain ONLY `@example` blocks with ` ```ts @import.meta.vitest ` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters

**MVP Milestone**: After P003 is GREEN, one-time self-reminders (`/remind me … in X minutes`) are fully functional end-to-end.

---

## Phase 4 (P004): User Story 2 — Recurring Reminder (Priority: P2)

**Goal**: A user types `/remind me <message> every day at 9am` (or `every weekday at 5pm`, `every Monday at 4pm`, `every month at 9am`). The app schedules a recurring cron job and confirms ephemerally. Recurring reminders remain `active` until cancelled.

**Independent Test**: Invoke `RemindCommand.executor` with `args = 'me Standup every day at 9am'`; assert `scheduleRecurring` is called with cron expression `'0 9 * * *'` and status stays `'active'`. Invoke `ReminderProcessor.processor` for that reminder; assert status is NOT updated to `'completed'`.

> **TDD Rule**: Complete each F### group fully before opening the next.

### P004F001 — Extend ScheduleParser — recurring formats (src/parsing/ScheduleParser.ts)

- [x] P004F001T001 [P] Add inline doctests to `src/parsing/ScheduleParser.ts` covering all recurring formats: `every day at 9am` → cron `0 9 * * *`; `every weekday at 5pm` → `0 17 * * 1-5`; `every Monday at 10am` → `0 10 * * 1`; `every month at 9am` → `0 9 1 * *`; invalid recurring input → ParseError; run `pnpm test` → new doctests must FAIL
- [x] P004F001T002 [P] Extend `parseSchedule` in `src/parsing/ScheduleParser.ts` to recognise `every …` patterns, produce `ParsedSchedule` with `kind: 'recurring'` and the cron expression per research.md §2 cron map
- [x] P004F001T003 [P] Refactor `src/parsing/ScheduleParser.ts` if non-comment lines approach 150 — extract recurring sub-parser to `src/parsing/RecurringScheduleParser.ts`, re-export via `ScheduleParser.ts`

### P004F002 — RemindCommand recurring branch (src/commands/RemindCommand.ts)

- [x] P004F002T001 Add test to `src/commands/RemindCommand.test.ts` for a recurring schedule input: assert `modify.getScheduler().scheduleRecurring` is called (not `scheduleOnce`) with the correct cron string and `reminderId` in data payload; run `pnpm test` → must FAIL
- [x] P004F002T002 Extend `RemindCommand.executor` in `src/commands/RemindCommand.ts` to branch on `parsed.schedule.kind`: call `scheduleOnce` for `'once'`, `scheduleRecurring` for `'recurring'`; depends on P004F001T002

### P004F003 — ReminderProcessor recurring branch (src/scheduler/ReminderProcessor.ts)

- [x] P004F003T001 Add test to `src/scheduler/ReminderProcessor.test.ts` for a recurring reminder: after `processor` fires, assert status is still `'active'` (NOT `'completed'`); run `pnpm test` → the existing `if (frequency === 'once')` guard may or may not be in place; confirm RED
- [x] P004F003T002 Verify/extend `ReminderProcessor.processor` in `src/scheduler/ReminderProcessor.ts` to skip status update when `reminder.frequency !== 'once'`; confirm P004F003T001 is now GREEN

### Exit Criteria: Phase 4

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Additional constraints**: All source files still ≤ 150 non-comment lines (refactor via P004F001T003 if needed).

---

## Phase 5 (P005): User Story 3 — Channel & User Targets (Priority: P2)

**Goal**: A user types `/remind #general Team meeting at 3pm` or `/remind @alice Submit report at 5pm`. The app resolves the target room or DM and fires the message there. Unknown targets produce an ephemeral error.

**Independent Test**: Invoke `RemindCommand.executor` with `args = '#general Team meeting at 3pm'` via in-memory doubles; assert `ReminderRepository.create` is called with `targetType: 'channel'` and the resolved `roomId`; assert the processor sends the message to the resolved room. Invoke with an unknown `@unknown`; assert ephemeral error, no persistence.

> **TDD Rule**: Complete each F### group fully before opening the next.

### P005F001 — Extend TargetParser for @user and #channel (src/parsing/TargetParser.ts)

- [ ] P005F001T001 [P] Add inline doctests to `src/parsing/TargetParser.ts` covering: `@alice` → `{ kind: 'user', username: 'alice' }`; `#general` → `{ kind: 'channel', channelName: 'general' }`; bare word (not `me`/`@`/`#`) → ParseError; run `pnpm test` → new doctests must FAIL
- [ ] P005F001T002 [P] Extend `parseTarget` in `src/parsing/TargetParser.ts` to handle `@username` and `#channelname` patterns

### P005F002 — Target resolution in RemindCommand (src/commands/RemindCommand.ts)

- [ ] P005F002T001 Add tests to `src/commands/RemindCommand.test.ts` covering: `@alice` target where `IRead.getUserReader()` resolves the user (assert DM room ID stored); `#general` target where `IRead.getRoomReader()` resolves the room; unknown `@user` (resolve returns null → ephemeral error, no persistence); unknown `#channel` (same); run `pnpm test` → must FAIL
- [ ] P005F002T002 Implement `resolveTarget` helper inside `src/commands/RemindCommand.ts`: for `kind: 'me'` return sender's room; for `kind: 'user'` call `read.getUserReader().getByUsername()`; for `kind: 'channel'` call `read.getRoomReader().getByName()`; return `ParseError` on null results; wire into executor; depends on P005F001T002

### Exit Criteria: Phase 5

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

---

## Phase 6 (P006): User Story 4 — List and Cancel Reminders (Priority: P3)

**Goal**: A user types `/reminders` (or `/reminders list`) to see all their active reminders with IDs, targets, messages, and next-fire times. They can type `/reminders cancel <id>` to cancel one. A `help` sub-command shows usage. All output is ephemeral.

**Independent Test**: Create two reminders via `ReminderRepository.create` using in-memory persistence; invoke `RemindersCommand.executor` with no args via in-memory doubles; assert the ephemeral response lists both reminders. Invoke with `cancel <id>`; assert `cancelJob` is called and status updates to `'cancelled'`. Invoke with unknown ID; assert ephemeral "not found" error.

> **TDD Rule**: Complete each F### group fully before opening the next.

### P006F001 — ReminderRepository findByUser (src/reminder/ReminderRepository.ts)

- [ ] P006F001T001 Add unit test to `src/reminder/ReminderRepository.test.ts` for `findByUser`: creates two reminders for the same user and one for a different user; asserts only the correct user's reminders are returned and all are status `'active'`; run `pnpm test` → must FAIL
- [ ] P006F001T002 Implement `ReminderRepository.findByUser(read: IPersistenceRead, userId: string): Promise<Reminder[]>` in `src/reminder/ReminderRepository.ts` using `readByAssociation` on the `USER` association, deserialise all records, filter to `status === 'active'`

### P006F002 — Reminder list formatter (src/reminder/ReminderFormatter.ts)

- [ ] P006F002T001 [P] Add inline doctests to `src/reminder/ReminderFormatter.ts` for `formatReminderList(reminders: Reminder[]): string` covering: non-empty list (verifies ID, target, message, schedule, next-fire time appear); empty list → "You have no active reminders…" message; run `pnpm test` → new doctests must FAIL
- [ ] P006F002T002 [P] Implement `formatReminderList` as a pure exported function in `src/reminder/ReminderFormatter.ts`

### P006F003 — RemindersCommand list sub-command (src/commands/RemindersCommand.ts)

- [ ] P006F003T001 Write black-box unit test for `RemindersCommand.executor` in `src/commands/RemindersCommand.test.ts` using in-memory doubles; cover: no args → list with two active reminders (assert formatted list in ephemeral reply); explicit `list` arg → same; no reminders → "no active reminders" ephemeral reply; run `pnpm test` → must FAIL
- [ ] P006F003T002 Implement `RemindersCommand` class in `src/commands/RemindersCommand.ts` with `executor` handling default `list` sub-command: fetches via `ReminderRepository.findByUser`, formats via `formatReminderList`, replies ephemerally; depends on P006F001T002, P006F002T002, P002F003T002

### P006F004 — RemindersCommand cancel sub-command (src/commands/RemindersCommand.ts)

- [ ] P006F004T001 Add tests to `src/commands/RemindersCommand.test.ts` for `cancel <id>` path: success (reminder exists, owned by user → `cancelJob` called + status `'cancelled'` + ephemeral success); not found (unknown ID → ephemeral error, no job call); already-cancelled reminder → ephemeral "already cancelled" error; run `pnpm test` → must FAIL
- [ ] P006F004T002 Extend `RemindersCommand.executor` in `src/commands/RemindersCommand.ts` with `cancel <id>` sub-command: call `ReminderRepository.findById`, validate ownership, call `modify.getScheduler().cancelJob(reminder.scheduledJobId)`, call `ReminderRepository.updateStatus(..., 'cancelled')`; if `cancelJob` throws, still update status (idempotent cleanup per contracts/reminders-command.md §Behaviour)

### P006F005 — RemindersCommand help sub-command (src/commands/RemindersCommand.ts)

- [ ] P006F005T001 Add test to `src/commands/RemindersCommand.test.ts` for `help` arg: assert ephemeral reply contains `/remind` usage, target examples, and schedule format examples; run `pnpm test` → must FAIL
- [ ] P006F005T002 Extend `RemindersCommand.executor` in `src/commands/RemindersCommand.ts` with `help` sub-command response per contracts/reminders-command.md §Response:help

### P006F006 — Register RemindersCommand in app (src/RcChatRemindersApp.ts)

- [ ] P006F006T001 Extend test in `src/RcChatRemindersApp.test.ts` to additionally assert `RemindersCommand` is registered in `extendConfiguration`; run `pnpm test` → must FAIL
- [ ] P006F006T002 Add `configuration.slashCommands.provideSlashCommand(new RemindersCommand(this))` to `extendConfiguration` in `src/RcChatRemindersApp.ts`; depends on P006F003T002

### Exit Criteria: Phase 6

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Additional constraints**: All source files ≤ 150 non-comment lines. If `RemindersCommand.ts` approaches 150 lines, extract sub-command handlers before P006F005T002.

---

## Phase 7 (P007): Polish & Cross-Cutting Concerns

**Purpose**: Final export audit, migrate the legacy `formatReminderMessage` helper, and run the full CI suite to confirm all gates pass simultaneously.

### P007F001 — Migrate formatReminderMessage to ReminderFormatter (src/reminder/ReminderFormatter.ts + src/index.ts)

- [ ] P007F001T001 Add inline doctest to `src/reminder/ReminderFormatter.ts` for `formatReminderMessage` matching the existing doctests in `src/index.ts`; run `pnpm test` → must FAIL (function not yet in ReminderFormatter)
- [ ] P007F001T002 Move `formatReminderMessage` from `src/index.ts` to `src/reminder/ReminderFormatter.ts`; update `src/index.ts` to re-export it from `src/reminder/ReminderFormatter.ts`; update `src/index.test.ts` import if needed; run all gates → GREEN

### P007F002 — Full CI gate validation

- [ ] P007F002T001 Run `script/ci` to confirm all quality gates pass simultaneously (TypeScript, lint, format, tests + doctests, coverage ≥98% on all metrics)

### Exit Criteria: Phase 7

| Gate             | Command              | Required                                       |
| ---------------- | -------------------- | ---------------------------------------------- |
| TypeScript       | `pnpm typecheck`     | Zero errors                                    |
| Lint             | `pnpm lint`          | Zero warnings (`--max-warnings 0`)             |
| Format           | `pnpm format:check`  | All files pass                                 |
| Tests + Doctests | `pnpm test`          | All pass                                       |
| Coverage         | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

---

## Dependencies (User Story Completion Order)

```
P001 (Setup)
  └─▶ P002 (Foundation: types + replyEphemeral)
        └─▶ P003 (US1: one-time reminder — MVP) ← MUST complete before P004/P005
              ├─▶ P004 (US2: recurring reminder)
              │     └─▶ P006 (US4: list & cancel)
              ├─▶ P005 (US3: channel/user targets)
              │     └─▶ P006 (US4: list & cancel)
              └─▶ P006 (US4: list & cancel)
                    └─▶ P007 (Polish)
```

P004 and P005 are independent of each other and can be worked in parallel by separate engineers once P003 is GREEN.

---

## Parallel Execution Opportunities

### Within P003

These F-groups are independent and can be worked in parallel by separate contributors once P002 is GREEN:

| Parallel group A                                 | Parallel group B        | Parallel group C             |
| ------------------------------------------------ | ----------------------- | ---------------------------- |
| P003F001 (ScheduleParser)                        | P003F002 (TargetParser) | P003F003 (ReminderFormatter) |
| P003F004 (Repository) ← depends on P002F001 only |                         |                              |

P003F005 (RemindCommandParser) must wait for P003F001 + P003F002.
P003F006 (Processor) must wait for P003F004.
P003F007 (RemindCommand) must wait for P003F004 + P003F005 + P002F003.
P003F008 (App wiring) must wait for P003F006 + P003F007.

### Within P004

P004F001 (ScheduleParser extension) and P004F003 (Processor recurring) are independent → [P].
P004F002 (RemindCommand recurring) must wait for P004F001.

### Within P006

P006F001 (Repository findByUser) and P006F002 (Formatter list) are independent → [P].
P006F003 must wait for P006F001 + P006F002.
P006F004 → P006F005 → P006F006 are sequential (same file).

---

## Implementation Strategy

**MVP (Phase 3 only)**: Delivers the full one-time self-reminder loop — create, persist, schedule, fire, confirm — as a standalone working feature. This is sufficient to demo end-to-end value.

**Increment 1 (add P004)**: Unlocks recurring reminders with no changes to the list/cancel UX.

**Increment 2 (add P005)**: Extends targeting to channels and other users; pure extension of existing parsing and command paths.

**Increment 3 (add P006)**: Adds the management surface (`/reminders` list + cancel + help) — completing the full Slack-like UX.

**Increment 4 (add P007)**: Polish and final CI validation before deployment.

Each increment is independently shippable.

---

## Composability Pass Results

All cross-phase artifact dependencies were verified before writing this file. No gaps found.

| Dependency checked                                          | Status                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `parseRemindCommand` uses both parsers (P003F001 + F002)    | ✅ F005 depends on F001T002 + F002T002                 |
| `RemindCommand` uses `replyEphemeral` (P002F003)            | ✅ P003F007T002 depends on P002F003T002                |
| `RemindCommand` uses `ReminderRepository` (P003F004)        | ✅ P003F007T002 depends on P003F004T002                |
| `ReminderProcessor` uses `ReminderRepository` (P003F004)    | ✅ P003F006T002 depends on P003F004T002                |
| `RcChatRemindersApp` registers command + processor          | ✅ P003F008T002 depends on P003F007T002 + P003F006T002 |
| `RemindCommand` recurring branch uses extended parser       | ✅ P004F002T002 depends on P004F001T002                |
| `RemindCommand` @user/#channel uses extended TargetParser   | ✅ P005F002T002 depends on P005F001T002                |
| `RemindersCommand` uses `findByUser` + `formatReminderList` | ✅ P006F003T002 depends on P006F001T002 + P006F002T002 |
| `RemindersCommand` registered in app                        | ✅ P006F006T002 depends on P006F003T002                |
| `formatReminderMessage` migrated before CI gate             | ✅ P007F001 handled before P007F002                    |
