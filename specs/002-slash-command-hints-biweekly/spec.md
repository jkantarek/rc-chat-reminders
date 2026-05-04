# Feature Spec: Slash Command Hints & Biweekly Recurring Reminders

## Feature ID: 002-slash-command-hints-biweekly

## Overview

Two UX improvements to the `/remind` and `/reminders` slash commands:

1. **Slash command hints** — populate `i18nParamsExample` and `i18nDescription` so
   Rocket.Chat shows the expected command format and an example instead of the raw
   app UUID when a user types `/rem` or `/remind` in the message box.

2. **Biweekly recurring reminders** — parse `every other week on <day> [at <time>]`
   as a new recurring schedule. When no time is given, default to 6:00 AM UTC.
   The processor must skip alternate weekly cron firings so only every-other-week
   occurrences send the message.

## User Stories

### US-001: Slash command autocomplete hints

**As a** Rocket.Chat user,  
**When** I type `/rem` or `/remind` in the message box,  
**I want** to see the expected format and a concrete example in the autocomplete panel,  
**So that** I know what syntax to use without opening documentation.

**Acceptance criteria:**

- `/remind` shows: params hint with full grammar, description of the command
- `/reminders` shows: description of what it does (list / cancel)
- Hint text is human-readable English, not a UUID or raw i18n key

### US-002: Every-other-week recurring reminder

**As a** Rocket.Chat user,  
**When** I type `/remind me <message> every other week on Monday`,  
**I want** a reminder that fires every other Monday starting from when I created it,  
**So that** I can set up bi-weekly recurring reminders.

**Acceptance criteria:**

- Parses `every other week on <day>` (case-insensitive)
- Parses `every other week on <day> at <time>` with any supported time format
- Defaults to 6:00 AM UTC when no time is given
- The first occurrence fires on the next matching day-of-week (not immediately)
- Alternate weekly cron firings are skipped — only every-other-week sends the message
- Uses frequency label `biweekly` for confirmation and list display
- Confirmation message uses `every other week on <day> at HH:MM` format

## Out of Scope

- Localization / translations for other languages (only English hint text in this feature)
- "Every other week starting from <date>" (start date is always "from now")
- Biweekly with multiple days of week (e.g., "every other week on Mon and Wed")

## Constraints

- All quality gates must pass (`pnpm typecheck`, `pnpm lint`, `pnpm test:coverage ≥ 98%`)
- No file may exceed 150 non-comment source lines (ESLint `max-lines`)
- No mocks in tests; no `@ts-ignore`; `explicit-function-return-type` required
- TDD: failing test (RED) before each implementation unit (GREEN)
