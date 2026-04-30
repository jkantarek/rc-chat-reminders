# Implementation Plan: RC Chat Reminders — Slash Command Scheduling

**Branch**: `001-reminders` | **Date**: 2026-04-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-reminders/spec.md`

---

## Summary

Build a Rocket.Chat app that lets users schedule one-time and recurring reminders via `/remind` and `/reminders` slash commands. Reminders fire as persistent room/DM messages at the scheduled time; all command feedback is delivered as ephemeral single-user-visibility messages. The implementation uses the Rocket.Chat Apps Engine (`@rocket.chat/apps-engine ^1.44.0`) scheduler, persistence, and notifier APIs with no external NLP or scheduling dependencies.

---

## Technical Context

**Language/Version**: TypeScript 5.5, ES2022, ESM modules  
**Primary Dependencies**: `@rocket.chat/apps-engine ^1.44.0` (runtime provided by RC server)  
**Storage**: Rocket.Chat app persistence layer (`IPersistence` / `IPersistenceRead`) — no external DB  
**Testing**: Vitest 4, `vite-plugin-doctest`, ≥98% coverage target  
**Target Platform**: Rocket.Chat server (Apps Engine sandbox), deployed as `.zip` via `rc-apps deploy`  
**Project Type**: Rocket.Chat App (server-side plugin)  
**Performance Goals**: Slash command response < 1s; scheduler fire accuracy within ±1s  
**Constraints**: All source files ≤ 150 non-comment lines (ESLint `max-lines`); no external npm deps at runtime (Apps Engine sandbox restrictions); no UIKit modals  
**Scale/Scope**: Single-team deployment; ~10–100 active reminders per server

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The project constitution (`constitution.md`) is a template — project rules are governed by `AGENTS.md` and `.github/copilot-instructions.md`.

| Gate                                                 | Status           | Notes                                                           |
| ---------------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| Max 150 non-comment lines per file                   | ✅ PASS          | All modules estimated well under 150 lines (see research.md §7) |
| No `@ts-ignore` / `@ts-expect-error` without doctest | ✅ PASS          | No suppressions planned                                         |
| No unused locals/params                              | ✅ PASS          | Strict TS config enforced                                       |
| JSDoc = `@example` blocks only                       | ✅ PASS          | All docs via executable doctests                                |
| No mocking — test doubles only                       | ✅ PASS          | In-memory persistence doubles, pure function extraction         |
| ≥98% coverage                                        | ✅ PASS (target) | Pure logic modules + doctests provide full coverage             |
| TDD: RED before GREEN                                | ✅ REQUIRED      | Task groups follow T001=test, T002=impl pattern                 |

**Post-design re-check**: All modules fit within size constraints; no constitution violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-reminders/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: API research & decisions
├── data-model.md        # Phase 1: entities, types, state transitions
├── quickstart.md        # Phase 1: dev setup & patterns
├── contracts/
│   ├── remind-command.md     # /remind contract
│   └── reminders-command.md  # /reminders contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── RcChatRemindersApp.ts         # App class — extendConfiguration
├── commands/
│   ├── RemindCommand.ts          # /remind slash command
│   └── RemindersCommand.ts       # /reminders slash command
├── reminder/
│   ├── Reminder.ts               # Types + pure helper functions
│   ├── ReminderRepository.ts     # Persistence read/write adapter
│   └── ReminderFormatter.ts      # Pure text formatters
├── parsing/
│   ├── ScheduleParser.ts         # parseSchedule() — NL → ParsedSchedule
│   └── TargetParser.ts           # parseTarget() — token → ParsedTarget
├── scheduler/
│   └── ReminderProcessor.ts      # IProcessor: fires reminders
└── index.ts                      # Public re-exports (extend existing)
```

**Structure Decision**: Single-project layout. The app has no frontend or separate backend — everything runs in the RC Apps Engine sandbox. Tests are co-located (`*.test.ts`) with source files. No `tests/` subdirectory needed; the co-location pattern is established by the existing `src/index.test.ts`.

---

## Complexity Tracking

> No constitution violations requiring justification.

---

## Architecture Overview

### Slash Command Flow

```
User types /remind me Standup in 15 minutes
    │
    ▼
RemindCommand.executor(context, read, modify, http, persis)
    │
    ├── parseRemindCommand(args, now)        → ParsedCommand | ParseError
    │       ├── parseTarget(tokens[0])       → ParsedTarget | ParseError
    │       ├── findScheduleKeyword(tokens)  → split message vs schedule
    │       └── parseSchedule(tokens, now)   → ParsedSchedule | ParseError
    │
    ├── [on error] → replyEphemeral(modify, context, errorText)
    │
    ├── resolveTarget(target, read)          → IRoom | IUser | ParseError
    │
    ├── ReminderRepository.create(persis, reminder)
    │
    ├── modify.getScheduler().scheduleOnce / scheduleRecurring
    │       └── data: { reminderId }
    │
    └── ReminderRepository.updateJobId(persis, id, jobId)
        └── replyEphemeral(modify, context, confirmText)
```

### Scheduler Processor Flow

```
Cron/timer fires → ReminderProcessor.processor(jobContext, read, modify, http, persis)
    │
    ├── ReminderRepository.findById(read, reminderId)
    │
    ├── resolve target room (from reminder.targetId)
    │
    ├── modify.getCreator().startMessage() + finish()  ← visible to all
    │
    └── [once] ReminderRepository.updateStatus(persis, id, 'completed')
```

### `/reminders` Command Flow

```
User types /reminders cancel abc123
    │
    ▼
RemindersCommand.executor
    ├── parse sub-command: "cancel", arg = "abc123"
    ├── ReminderRepository.findByUser(read, userId) → filter by id
    ├── modify.getScheduler().cancelJob(reminder.scheduledJobId)
    ├── ReminderRepository.updateStatus(persis, id, 'cancelled')
    └── replyEphemeral(modify, context, "✅ Reminder cancelled …")
```

---

## Key Design Decisions

| Decision                        | Choice                                          | Rationale                                                     |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Ephemeral feedback              | `notifyUser` everywhere                         | Per spec: no popups, single-user visibility                   |
| Schedule parsing                | Pure function, defined syntax subset            | No external deps (RC sandbox restriction); cron for recurring |
| Persistence indexing            | Dual associations (USER + MISC)                 | Efficient per-user list AND direct ID lookup                  |
| One processor for all reminders | `id = 'reminder-fire'`, `data = { reminderId }` | Simplest; reminder data in persistence, not job payload       |
| Recurring stay `active`         | Never auto-complete recurring                   | User must cancel; mirrors Slack behaviour                     |
| Message delivery                | `getCreator().finish()` (persistent)            | Actual reminder must be visible to room/DM participants       |
| Test strategy                   | Pure function extraction + in-memory doubles    | Satisfies no-mock rule; maximises testable surface            |

---

## Phase 0: Research Output

See [research.md](research.md).

All NEEDS CLARIFICATION items resolved:

| Item                     | Resolution                                                           |
| ------------------------ | -------------------------------------------------------------------- |
| Scheduler API            | `ISchedulerModify.scheduleOnce` / `scheduleRecurring` + `IProcessor` |
| Ephemeral messages       | `modify.getNotifier().notifyUser()`                                  |
| Persistence pattern      | `createWithAssociations` with USER + MISC associations               |
| Natural language parsing | Custom pure parser; cron for recurring, `Date` for one-time          |
| DM creation              | `getRoomReader().getDirectByUsernames()` + create if absent          |

---

## Phase 1: Design Output

| Artifact                                                         | Status      |
| ---------------------------------------------------------------- | ----------- |
| [data-model.md](data-model.md)                                   | ✅ Complete |
| [contracts/remind-command.md](contracts/remind-command.md)       | ✅ Complete |
| [contracts/reminders-command.md](contracts/reminders-command.md) | ✅ Complete |
| [quickstart.md](quickstart.md)                                   | ✅ Complete |

---

## Implementation Order (for `/speckit.tasks`)

Suggested feature group order for tasks.md generation:

1. **F001** — Types & data model (`src/reminder/Reminder.ts`)
2. **F002** — Schedule parser (`src/parsing/ScheduleParser.ts`)
3. **F003** — Target parser (`src/parsing/TargetParser.ts`)
4. **F004** — Reminder repository (`src/reminder/ReminderRepository.ts`)
5. **F005** — Reminder formatter (`src/reminder/ReminderFormatter.ts`)
6. **F006** — Reminder processor (`src/scheduler/ReminderProcessor.ts`)
7. **F007** — `/remind` command (`src/commands/RemindCommand.ts`)
8. **F008** — `/reminders` command (`src/commands/RemindersCommand.ts`)
9. **F009** — App entry point (`src/RcChatRemindersApp.ts`)
10. **F010** — Public index re-exports (`src/index.ts`)
