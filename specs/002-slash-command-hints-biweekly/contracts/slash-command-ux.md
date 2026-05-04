# Contract: Slash Command UX — `/remind` and `/reminders`

This contract defines the public-facing UX surface of the two slash commands as displayed in the Rocket.Chat slash command autocomplete panel.

## `/remind` command

| Field               | Value                        |
| ------------------- | ---------------------------- |
| `command`           | `remind`                     |
| `i18nParamsExample` | `remind_command_params`      |
| `i18nDescription`   | `remind_command_description` |

### `i18n/en.json` values

```json
{
  "remind_command_params": "[me | @user | #channel] <message> in <N> min/hr/day | at <HH:MM> | every day/weekday/<day> at <time> | every other week on <day> [at <time>]",
  "remind_command_description": "Schedule a reminder for yourself, a user, or a channel"
}
```

### Supported grammar summary

```
/remind TARGET MESSAGE SCHEDULE

TARGET   = me | @username | #channelname
MESSAGE  = any text (comes before the SCHEDULE keyword)
SCHEDULE = one of:
  in <N> minutes | in <N> hours | in <N> days
  at <HH:MM>
  at <H>am | at <H>pm | at <H:MM>am | at <H:MM>pm
  at <YYYY-MM-DD HH:MM>
  at <H>am tomorrow | at <H>pm tomorrow
  every day at <time>
  every weekday at <time>
  every <day-of-week> at <time>
  every month at <time>
  every other week on <day-of-week> [at <time>]   ← NEW
```

---

## `/reminders` command

| Field               | Value                           |
| ------------------- | ------------------------------- |
| `command`           | `reminders`                     |
| `i18nParamsExample` | `reminders_command_params`      |
| `i18nDescription`   | `reminders_command_description` |

### `i18n/en.json` values

```json
{
  "reminders_command_params": "[list | cancel <id>]",
  "reminders_command_description": "List your active reminders or cancel one by ID"
}
```

---

## Biweekly Schedule Contract

When frequency is `biweekly`, the Rocket.Chat App guarantees:

1. **Parser input**: `every other week on <day> [at <time>]`
   - Day names: `monday` – `sunday` (case-insensitive)
   - Time: any format supported by the existing `parseHourMin` helper
   - If time is omitted, defaults to **06:00 UTC**

2. **Confirmation output** (ephemeral reply):
   - `When:` field shows `scheduleLabel`, e.g. `every other week on Monday at 06:00`

3. **Reminder list output** (`/reminders`):
   - Schedule column shows `scheduleLabel` when present

4. **Processor guarantee**:
   - Message is sent on week 0 (first cron fire ≥ anchor), week 2, week 4, etc.
   - Alternate firings (weeks 1, 3, 5, …) are silently skipped with no side effects
