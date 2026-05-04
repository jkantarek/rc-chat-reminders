# Data Model: 002-slash-command-hints-biweekly

## Type Changes

### `ReminderFrequency` (in `src/reminder/Reminder.ts`)

```diff
- export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
+ export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'cron';
```

### `RecurringScheduleResult` (in `src/reminder/Reminder.ts`)

```diff
  export interface RecurringScheduleResult {
    readonly kind: 'recurring';
    readonly cronExpression: string;
    readonly frequency: Exclude<ReminderFrequency, 'once'>;
+   readonly scheduleLabel?: string;   // human-readable: "every other week on Monday at 06:00"
  }
```

### `Reminder` (in `src/reminder/Reminder.ts`)

```diff
  export interface Reminder {
    readonly id: string;
    readonly createdBy: string;
    readonly createdAt: Date;
    readonly targetType: TargetType;
    readonly targetId: string;
    readonly targetName: string;
    readonly message: string;
    readonly frequency: ReminderFrequency;
    readonly cronExpression?: string;
    readonly fireAt?: Date;
+   readonly biweeklyAnchorDate?: Date;  // first expected firing; set when frequency === 'biweekly'
+   readonly scheduleLabel?: string;     // human-readable schedule; used in confirmations/list
    nextFireAt: Date;
    scheduledJobId?: string;
    status: ReminderStatus;
  }
```

### `PersistedReminder` (in `src/reminder/Reminder.ts`)

```diff
  export interface PersistedReminder {
    id: string;
    createdBy: string;
    createdAt: string;
    ...
    cronExpression?: string;
    fireAt?: string;
+   biweeklyAnchorDate?: string;   // ISO string; set when frequency === 'biweekly'
+   scheduleLabel?: string;         // passed through as-is
    nextFireAt: string;
    scheduledJobId?: string;
    status: ReminderStatus;
  }
```

---

## New File: `i18n/en.json`

```json
{
  "remind_command_params": "[me | @user | #channel] <message> in <N> min/hr/day | at <HH:MM> | every day/weekday/<day> at <time> | every other week on <day> [at <time>]",
  "remind_command_description": "Schedule a reminder for yourself, a user, or a channel",
  "reminders_command_params": "[list | cancel <id>]",
  "reminders_command_description": "List your active reminders or cancel one by ID"
}
```

---

## Parser Output: Biweekly

`parseEveryOtherWeekDow(input: string)` returns a `RecurringScheduleResult`:

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| `kind`           | `'recurring'`                           |
| `cronExpression` | `"0 6 * * 1"` (minute hour `*` `*` dow) |
| `frequency`      | `'biweekly'`                            |
| `scheduleLabel`  | `"every other week on Monday at 06:00"` |

When user supplies a time: the time is parsed with the existing `parseHourMin` helper.  
When user omits a time: defaults to `{ h: 6, m: 0 }` (06:00 UTC).

**Supported day-of-week values**: same as `parseEveryDow` — `monday` through `sunday` (case-insensitive).

**Regex**: `^every other week on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: at (.+))?$/i`

---

## Biweekly Anchor Date Computation

Computed in `ReminderFactory.toRecurringReminder` when `frequency === 'biweekly'`:

```
parseCronBiweekly("0 6 * * 1") → { min: 0, hour: 6, dow: 1 }
daysUntilNext = (dow - now.getUTCDay() + 7) % 7 || 7
anchor = now + daysUntilNext days, set to HH:MM UTC
```

The `|| 7` ensures the anchor is always at least 1 day in the future (consistent with `skipImmediate: true`).

---

## Biweekly Week Parity (in `ReminderProcessor`)

```
weeksSinceAnchor = Math.floor((now - anchor) / 604_800_000)
shouldFire = msSinceAnchor >= 0 && weeksSinceAnchor % 2 === 0
```

- Week 0 (first occurrence): fire
- Week 1 (second occurrence): skip
- Week 2 (third occurrence): fire
- ...

---

## Serialization Flow

```
Parser  →  RecurringScheduleResult { cronExpression, frequency: 'biweekly', scheduleLabel }
         ↓  ReminderFactory.toRecurringReminder
Reminder  { ..., biweeklyAnchorDate: Date, scheduleLabel }
         ↓  ReminderRepository.toPOptionals
PersistedReminder  { ..., biweeklyAnchorDate: ISO string, scheduleLabel }
         ↓  stored in Rocket.Chat persistence
         ↑  ReminderRepository.fromPOptionals
Reminder  { ..., biweeklyAnchorDate: Date, scheduleLabel }
         ↓  ReminderProcessor.shouldFireBiweekly
fire or skip
```
