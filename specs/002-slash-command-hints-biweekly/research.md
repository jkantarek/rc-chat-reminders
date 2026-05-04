# Research: 002-slash-command-hints-biweekly

## i18n / Slash Command Hint Mechanism

**Decision**: Create `i18n/en.json` with string keys for `i18nParamsExample` and `i18nDescription`; set those keys on the command classes.

**Rationale**:

- The `ISlashCommand` interface fields are i18n lookup keys, not literal strings. If no i18n file is present, Rocket.Chat falls back to the raw key or the app ID (as seen in the screenshot).
- The `script/rc-package` script already includes `i18n/` in the zip when the directory exists (`if [[ -d i18n ]]; then copy_dir_into_package "i18n"; fi`).
- Creating `i18n/en.json` with meaningful keys and values makes the hints display correctly.

**Alternatives considered**:

- Setting literal English text directly in the fields — technically renders but is the wrong semantic use of the field; future localisation would require changing source files.
- Using `''` (current state) — Rocket.Chat shows the app UUID as fallback.

---

## Biweekly Recurring Reminders — Scheduling Strategy

**Decision**: Store biweekly reminders with a **weekly cron expression** (e.g., `0 6 * * 1` for Monday at 6am) and the `frequency = 'biweekly'` label. A **biweeklyAnchorDate** (the date of the first expected occurrence) is computed at creation time and stored on the `Reminder`. The `ReminderProcessor` uses the anchor to skip every other weekly firing.

**Rationale**:

- Standard cron has no native "every 2 weeks" syntax; a weekly cron that skips alternate firings is the established workaround.
- Storing the anchor date is deterministic and requires no runtime state tracking beyond the already-persisted `Reminder` object.
- The processor already fetches the full `Reminder` (via `fetchReminder`), so checking `biweeklyAnchorDate` costs no extra I/O.
- `skipImmediate: true` on the recurring job means the first firing always occurs on the next matching day-of-week, which is equal to the computed anchor; parity check at week 0 always fires.

**Week parity formula**:

```
weeksSinceAnchor = Math.floor((now - biweeklyAnchorDate) / 604_800_000)
shouldFire = weeksSinceAnchor % 2 === 0
```

**Alternatives considered**:

- Self-rescheduling one-time reminders: cleaner from a scheduling perspective but adds significant complexity to `ReminderProcessor` (needs to re-schedule a new one-time job after each firing) and complicates cancellation.
- Storing DOW + time as extra fields instead of anchor date: more flexibility but more data; computing from anchor + cron string is sufficient.
- Using even/odd ISO week number: fails across year boundaries (ISO week 1 vs week 53).

---

## Default Time for "every other week on day" (no time specified)

**Decision**: Default to **06:00 UTC** when no time is provided.

**Rationale**:

- Matches the feature request ("should default to 6am").
- 6:00 UTC is a reasonable morning time globally and aligns with existing convention for a "start of business" reminder.

**Implementation**: In `parseEveryOtherWeekDow`, check if the time capture group matched. If `undefined`, use `{ h: 6, m: 0 }`.

---

## Human-Readable Schedule Label

**Decision**: Add an optional `scheduleLabel?: string` field to `RecurringScheduleResult`, `Reminder`, and `PersistedReminder`. The biweekly parser populates it with a string like `"every other week on Monday at 06:00"`. `ReminderFormatter` uses it when present, falling back to `cronExpression`.

**Rationale**:

- The cron expression `0 6 * * 1` is not user-friendly for confirmation messages or the reminder list.
- Generating the label at parse time (where the DOW name is already known) avoids reverse-parsing the cron expression in the formatter.
- An optional field with fallback is fully backward compatible.

---

## File Size Constraints

All files checked against the `max-lines: 150 (skipComments: true)` ESLint rule.

| File                         | Current total | Comment lines (approx) | Non-comment (approx) | Headroom  |
| ---------------------------- | ------------- | ---------------------- | -------------------- | --------- |
| `RecurringScheduleParser.ts` | 145           | ~35                    | ~110                 | ~40 lines |
| `ReminderFormatter.ts`       | 116           | ~30                    | ~86                  | ~64 lines |
| `ReminderRepository.ts`      | 131           | ~5                     | ~126                 | ~24 lines |
| `ReminderFactory.ts`         | 62            | ~0                     | ~62                  | ~88 lines |
| `ReminderProcessor.ts`       | 80            | ~0                     | ~80                  | ~70 lines |
| `Reminder.ts`                | 66            | ~0                     | ~66                  | ~84 lines |

All changes fit within the 150-line limit. No file splitting required.
