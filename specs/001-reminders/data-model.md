# Data Model: RC Chat Reminders

**Branch**: `001-reminders` | **Date**: 2026-04-30

---

## Core Entities

### `Reminder`

The central entity. Stored in the Rocket.Chat app persistence layer (key-value store).

```ts
type ReminderStatus = 'active' | 'completed' | 'cancelled';
type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
type TargetType = 'me' | 'user' | 'channel';

interface Reminder {
  readonly id: string; // UUID v4, generated at creation
  readonly createdBy: string; // Rocket.Chat userId of creator
  readonly createdAt: Date; // creation timestamp (ISO string in storage)

  // Target
  readonly targetType: TargetType; // 'me' | 'user' | 'channel'
  readonly targetId: string; // userId (for 'me'/'user') or roomId (for 'channel')
  readonly targetName: string; // display name: '@alice' or '#general' or 'me'

  // Message
  readonly message: string; // reminder text

  // Schedule
  readonly frequency: ReminderFrequency; // 'once' | 'daily' | …
  readonly cronExpression?: string; // set for recurring reminders
  readonly fireAt?: Date; // set for one-time reminders
  nextFireAt: Date; // mutable: updated after each fire (for display)

  // Job tracking
  scheduledJobId?: string; // ID returned by scheduleOnce/scheduleRecurring

  // Status
  status: ReminderStatus;
}
```

**Serialization note**: `Date` fields are stored as ISO 8601 strings in the persistence layer. A `ReminderRepository` handles serialization/deserialization.

---

### `ParsedSchedule`

Output type from `ScheduleParser.parseSchedule()`.

```ts
type OneTimeSchedule = {
  readonly kind: 'once';
  readonly fireAt: Date;
};

type RecurringScheduleResult = {
  readonly kind: 'recurring';
  readonly cronExpression: string;
  readonly frequency: Exclude<ReminderFrequency, 'once'>;
};

type ParsedSchedule = OneTimeSchedule | RecurringScheduleResult;
```

---

### `ParsedTarget`

Output type from `TargetParser.parseTarget()`.

```ts
type ParsedTarget =
  | { readonly kind: 'me' }
  | { readonly kind: 'user'; readonly username: string }
  | { readonly kind: 'channel'; readonly channelName: string };
```

---

### `ParsedCommand`

Combined result of parsing the full `/remind` argument string.

```ts
interface ParsedCommand {
  readonly target: ParsedTarget;
  readonly message: string;
  readonly schedule: ParsedSchedule;
}
```

---

### `ParseError`

Returned when parsing fails (rather than throwing).

```ts
interface ParseError {
  readonly kind: 'error';
  readonly reason: string; // human-readable description for ephemeral feedback
}

type ParseResult<T> = T | ParseError;
```

---

## State Transitions

```
           ┌──────────────────────────────────────┐
           │          Reminder Lifecycle           │
           └──────────────────────────────────────┘

 /remind →  ┌─────────┐
            │ active  │ ──── once fires ──────────→ ┌───────────┐
            └─────────┘                             │ completed │
                 │                                  └───────────┘
                 │
         /reminders cancel
                 │
                 ↓
            ┌───────────┐
            │ cancelled │
            └───────────┘
```

- **`active`**: Reminder is stored and a scheduler job is registered.
- **`completed`**: One-time reminder has fired. Recurring reminders stay `active` until cancelled.
- **`cancelled`**: User cancelled via `/reminders cancel <id>`. Scheduler job has been cancelled.

---

## Persistence Storage Schema

Stored using `IPersistence` with dual associations:

| Association | Model  | Key          | Purpose                           |
| ----------- | ------ | ------------ | --------------------------------- |
| `userAssoc` | `USER` | `userId`     | List all reminders for a user     |
| `idAssoc`   | `MISC` | `reminderId` | Look up a specific reminder by ID |

**Stored payload** (JSON-serializable object):

```ts
interface PersistedReminder {
  id: string;
  createdBy: string;
  createdAt: string; // ISO 8601
  targetType: TargetType;
  targetId: string;
  targetName: string;
  message: string;
  frequency: ReminderFrequency;
  cronExpression?: string;
  fireAt?: string; // ISO 8601 or undefined
  nextFireAt: string; // ISO 8601
  scheduledJobId?: string;
  status: ReminderStatus;
}
```

---

## Validation Rules

| Field            | Rule                                                        |
| ---------------- | ----------------------------------------------------------- |
| `message`        | Non-empty string, max 500 characters                        |
| `fireAt`         | Must be in the future at creation time (one-time reminders) |
| `cronExpression` | Must be a valid 5-field cron string                         |
| `targetName`     | Must match `me`, `@<username>`, or `#<channelname>`         |
| `id`             | UUID v4 format                                              |

---

## Existing Types (extend/replace in `src/index.ts`)

The existing `src/index.ts` exports `ReminderFrequency` and `Reminder`. These will be superseded by the types above (the existing `Reminder` interface is a simplified placeholder):

| Existing export         | Action                                             |
| ----------------------- | -------------------------------------------------- |
| `ReminderFrequency`     | **Extend** — add `'cron'` value                    |
| `Reminder`              | **Replace** — with full `Reminder` interface above |
| `formatReminderMessage` | **Keep** — rename/absorb into `ReminderFormatter`  |
| `isValidFrequency`      | **Keep** — extend to include `'cron'`              |
