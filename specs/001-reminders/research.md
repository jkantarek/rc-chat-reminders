# Research: RC Chat Reminders — Phase 0

**Branch**: `001-reminders` | **Date**: 2026-04-30

---

## 1. Rocket.Chat Apps Engine — Slash Commands

### Decision

Use `ISlashCommand` interface from `@rocket.chat/apps-engine/definition/slashcommands`.

### Key API

```ts
interface ISlashCommand {
  command: string; // e.g. "remind" or "reminders"
  i18nParamsExample: string;
  i18nDescription: string;
  providesPreview: boolean;
  executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    http: IHttp,
    persis: IPersistence,
  ): Promise<void>;
}

class SlashCommandContext {
  getSender(): IUser;
  getRoom(): IRoom;
  getArguments(): string[]; // everything after /remind, split by spaces
}
```

### Registration

```ts
// In App.extendConfiguration:
await configuration.slashCommands.provideSlashCommand(new RemindCommand());
await configuration.slashCommands.provideSlashCommand(new RemindersCommand());
```

### Rationale

Two commands provide clean separation: `/remind` for creation, `/reminders` for management. This mirrors Slack's UX.

---

## 2. Scheduler / Processor Pattern

### Decision

Use `ISchedulerExtend.registerProcessors` at startup + `ISchedulerModify.scheduleOnce` / `scheduleRecurring` at runtime.

### Key API

```ts
// Registration at startup:
interface ISchedulerExtend {
  registerProcessors(processors: IProcessor[]): Promise<void>;
}

// One-time execution:
interface IOnetimeSchedule {
  id: string; // must match IProcessor.id
  when: string | Date; // "in 15 minutes" OR Date object
  data?: object; // passed to processor as jobContext
}

// Recurring execution:
interface IRecurringSchedule {
  id: string;
  interval: string | number; // cron string OR human-interval OR ms
  data?: object;
}

// Scheduling at runtime:
interface ISchedulerModify {
  scheduleOnce(job: IOnetimeSchedule): Promise<void | string>; // returns jobId
  scheduleRecurring(job: IRecurringSchedule): Promise<void | string>;
  cancelJob(jobId: string): Promise<void>;
}

// Processor callback:
interface IProcessor {
  id: string;
  processor(jobContext: IJobContext, read, modify, http, persis): Promise<void>;
}
```

### Rationale

One processor (`id = 'reminder-fire'`) handles both one-time and recurring triggers. The `data` payload carries the reminder's stored ID; the processor reads it from persistence to get the full reminder record.

### Cron Expression Map

| User intent              | Cron expression |
| ------------------------ | --------------- |
| `every day at 9am`       | `0 9 * * *`     |
| `every weekday at 9am`   | `0 9 * * 1-5`   |
| `every Monday at 9am`    | `0 9 * * 1`     |
| `every Tuesday at 9am`   | `0 9 * * 2`     |
| `every Wednesday at 9am` | `0 9 * * 3`     |
| `every Thursday at 9am`  | `0 9 * * 4`     |
| `every Friday at 9am`    | `0 9 * * 5`     |
| `every Saturday at 9am`  | `0 9 * * 6`     |
| `every Sunday at 9am`    | `0 9 * * 0`     |
| `every month at 9am`     | `0 9 1 * *`     |

### Alternatives Considered

- **human-interval strings**: Supported for `when`, but cron strings are better for recurring patterns like "every Monday". Decision: use `Date` for one-time (computed by parser), cron string for recurring.

---

## 3. Ephemeral / Single-User-Visibility Messages

### Decision

Use `modify.getNotifier().notifyUser(user, message)` for ALL feedback messages. Never use UIKit modals.

### Key API

```ts
// Ephemeral — only visible to `user`, only while online, not persisted:
interface INotifier {
  notifyUser(user: IUser, message: IMessage): Promise<void>;
  getMessageBuilder(): IMessageBuilder;
}

// Pattern:
const notifier = modify.getNotifier();
const msg = notifier
  .getMessageBuilder()
  .setRoom(context.getRoom())
  .setText('✅ Reminder set for 3pm!');
await notifier.notifyUser(context.getSender(), msg.getMessage());
```

### Rationale

`notifyUser` delivers in-room ephemeral messages (only the invoking user sees them). This is the closest Rocket.Chat equivalent to Slack's ephemeral slash command responses. No popups, no modal dialogs needed.

### Alternatives Considered

- **UIKit modals via `getUiController`**: Rejected per explicit requirement to avoid popups.
- **Persistent visible messages via `getCreator().finish()`**: Rejected for confirmation feedback — would pollute channel for all users. Only used for the actual triggered reminder delivery.

---

## 4. Persistence

### Decision

Use `IPersistence.createWithAssociations` with dual associations: `USER` (for per-user queries) and `MISC` (app-level ID index).

### Key API

```ts
// Write:
const userAssoc = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, userId);
const idAssoc = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, reminderId);
await persis.createWithAssociations(reminderData, [userAssoc, idAssoc]);

// Read all for user:
const records = await read.getPersistenceReader().readByAssociation(userAssoc);

// Read by ID:
const records = await read.getPersistenceReader().readByAssociation(idAssoc);
```

### Rationale

Dual association enables efficient per-user listing (`/reminders`) AND direct lookup by ID (for cancel and processor lookups). Rocket.Chat persistence is an in-app key-value store — no external database needed.

### Limitations

- `updateByAssociation` does an upsert on the first match, so updating status (e.g., to 'cancelled') requires read-then-write.
- No transaction support; cancellation race conditions are acceptable at this scope.

---

## 5. Sending Reminder Messages at Fire Time

### Decision

Persistent visible message via `modify.getCreator().finish()` for actual reminder delivery (needs to be visible to all room members or DM recipient).

### Pattern: Channel reminder

```ts
const msg = modify
  .getCreator()
  .startMessage()
  .setRoom(targetRoom)
  .setSender(appUser)
  .setText(reminderText);
await modify.getCreator().finish(msg);
```

### Pattern: DM reminder

```ts
let dmRoom = await read
  .getRoomReader()
  .getDirectByUsernames([appUser.username, targetUser.username]);
if (!dmRoom) {
  const builder = modify
    .getCreator()
    .startRoom()
    .setType(RoomType.DIRECT_MESSAGE)
    .setCreator(appUser)
    .setMembersToBeAddedByUsernames([appUser.username, targetUser.username]);
  const roomId = (await modify.getCreator().finish(builder)) as string;
  dmRoom = await read.getRoomReader().getById(roomId);
}
// then create message as above
```

### Rationale

Reminder delivery to a channel/DM must be visible to all relevant parties (that's the point). Ephemeral delivery would defeat the purpose.

---

## 6. Natural Language Schedule Parsing

### Decision

Implement a lightweight pure-function parser (`src/parsing/ScheduleParser.ts`) with no external NLP dependencies. Support a well-defined syntax subset.

### Supported Formats

| Input pattern                      | Type      | Resolution                       |
| ---------------------------------- | --------- | -------------------------------- |
| `in X minute(s)`                   | one-time  | `Date.now() + X * 60_000`        |
| `in X hour(s)`                     | one-time  | `Date.now() + X * 3_600_000`     |
| `in X day(s)`                      | one-time  | `Date.now() + X * 86_400_000`    |
| `at HH:MM[am\|pm]`                 | one-time  | today at that wall-clock time    |
| `at H[am\|pm]`                     | one-time  | today at that wall-clock time    |
| `at HH:MM tomorrow`                | one-time  | tomorrow at that wall-clock time |
| `at YYYY-MM-DD HH:MM`              | one-time  | absolute date/time               |
| `every day at HH:MM[am\|pm]`       | recurring | cron `M H * * *`                 |
| `every weekday at HH:MM[am\|pm]`   | recurring | cron `M H * * 1-5`               |
| `every [Mon-Sun] at HH:MM[am\|pm]` | recurring | cron `M H * * N`                 |
| `every month at HH:MM[am\|pm]`     | recurring | cron `M H 1 * *`                 |

### Alternatives Considered

- **`chrono-node`**: Popular NLP date parser, but is an external npm dependency not available in the Rocket.Chat app sandbox. Rejected.
- **`human-interval`**: Built into the Apps Engine scheduler `when` field. Passed through for simple `in X minutes` patterns. Rejected as the sole approach because recurring patterns require cron strings.
- **Full NLP**: Out of scope — defined syntax subset is sufficient and predictable.

---

## 7. Source File Layout (150-line constraint)

Given the 150 non-comment line ESLint limit, the feature decomposes into these modules:

| File                                 | Responsibility                                            | Estimated lines |
| ------------------------------------ | --------------------------------------------------------- | --------------- |
| `src/RcChatRemindersApp.ts`          | App class, `extendConfiguration`                          | ~50             |
| `src/reminder/Reminder.ts`           | Types (`Reminder`, `ReminderStatus`, etc.) + pure helpers | ~70             |
| `src/reminder/ReminderRepository.ts` | Persistence read/write adapter                            | ~80             |
| `src/reminder/ReminderFormatter.ts`  | Format reminder list/confirmation text                    | ~60             |
| `src/parsing/ScheduleParser.ts`      | Parse natural language schedule → `ParsedSchedule`        | ~120            |
| `src/parsing/TargetParser.ts`        | Parse `me`, `@user`, `#channel` → `ParsedTarget`          | ~50             |
| `src/commands/RemindCommand.ts`      | `/remind` slash command executor                          | ~80             |
| `src/commands/RemindersCommand.ts`   | `/reminders` slash command executor                       | ~80             |
| `src/scheduler/ReminderProcessor.ts` | IProcessor for firing reminders                           | ~60             |
| `src/index.ts`                       | Public re-exports (extend existing)                       | ~40             |

All modules are well under 150 lines individually.

---

## 8. Testing Strategy (No Mocking Rule)

### Decision

Extract all business logic into pure functions that accept plain data (no framework interfaces). Framework adapters (slash command executors, processor) are thin wrappers and tested via integration-style test doubles.

### Pattern

```ts
// Pure, framework-free — fully testable:
export function parseSchedule(input: string, now: Date): ParsedSchedule { … }
export function buildConfirmationText(reminder: Reminder): string { … }
export function buildReminderMessage(reminder: Reminder): string { … }

// Adapter — thin, hard to unit test directly but covered by doctests:
class RemindCommand implements ISlashCommand {
  executor(context, read, modify, http, persis) {
    const parsed = parseSchedule(context.getArguments().join(' '), new Date());
    // …
  }
}
```

### Test doubles (not mocks)

For `IPersistence` and `IPersistenceRead`: create in-memory `Map`-based implementations that satisfy the interface, used only in test files. This is permitted under the "no mocking" rule since they are full implementations, not spy wrappers.
