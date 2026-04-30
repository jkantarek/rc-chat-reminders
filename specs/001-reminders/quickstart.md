# Quickstart: Implementing RC Chat Reminders

**Branch**: `001-reminders` | **Date**: 2026-04-30

---

## Prerequisites

- Node.js 18+ and pnpm 10+
- A Rocket.Chat server (local dev or remote) with Apps Engine enabled
- `@rocket.chat/apps-cli` installed globally: `npm i -g @rocket.chat/apps-cli`

---

## Local Development Setup

```bash
# Install dependencies
pnpm install

# Run tests in watch mode
pnpm test:watch

# Type-check
pnpm typecheck

# Lint
pnpm lint
```

---

## Project Entry Point

The app class lives at `src/RcChatRemindersApp.ts` (referenced in `app.json` → `classFile`).

```ts
// src/RcChatRemindersApp.ts
import { App } from '@rocket.chat/apps-engine/definition/App';
import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import type { IConfigurationExtend } from '@rocket.chat/apps-engine/definition/accessors';

export class RcChatRemindersApp extends App {
  constructor(info: IAppInfo, logger, accessors) {
    super(info, logger, accessors);
  }

  async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    // Register slash commands
    await configuration.slashCommands.provideSlashCommand(new RemindCommand(this));
    await configuration.slashCommands.provideSlashCommand(new RemindersCommand(this));

    // Register scheduler processor
    await configuration.scheduler.registerProcessors([new ReminderProcessor(this)]);
  }
}
```

---

## Key Module Map

```
src/
├── RcChatRemindersApp.ts         App class — registers commands + processor
├── commands/
│   ├── RemindCommand.ts          /remind — creates reminders
│   └── RemindersCommand.ts       /reminders — lists & cancels
├── reminder/
│   ├── Reminder.ts               Types: Reminder, ParsedSchedule, ParsedTarget…
│   ├── ReminderRepository.ts     Persistence adapter (read/write/cancel)
│   └── ReminderFormatter.ts      Pure functions: format list, confirmation, error text
├── parsing/
│   ├── ScheduleParser.ts         parseSchedule(input, now) → ParsedSchedule | ParseError
│   └── TargetParser.ts           parseTarget(token) → ParsedTarget | ParseError
├── scheduler/
│   └── ReminderProcessor.ts      IProcessor: fires reminders at scheduled time
└── index.ts                      Public re-exports (types + pure helpers)
```

---

## TDD Workflow

### Creating a new reminder (start here)

```bash
# 1. Write failing test (RED)
# src/parsing/ScheduleParser.test.ts
it('parses "in 15 minutes" as one-time', () => {
  const now = new Date('2026-05-01T10:00:00Z');
  const result = parseSchedule('in 15 minutes', now);
  expect(result).toEqual({ kind: 'once', fireAt: new Date('2026-05-01T10:15:00Z') });
});

# 2. Confirm it fails:
pnpm test src/parsing/ScheduleParser.test.ts

# 3. Implement parseSchedule in src/parsing/ScheduleParser.ts

# 4. Confirm it passes:
pnpm test src/parsing/ScheduleParser.test.ts

# 5. Run all gates:
pnpm typecheck && pnpm lint && pnpm test:coverage
```

---

## Implementing a Slash Command

```ts
// src/commands/RemindCommand.ts
import type {
  ISlashCommand,
  SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import type {
  IRead,
  IModify,
  IHttp,
  IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';

export class RemindCommand implements ISlashCommand {
  command = 'remind';
  i18nParamsExample = '<target> <message> <schedule>';
  i18nDescription = 'Set a reminder for yourself, a user, or a channel';
  providesPreview = false;

  async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    _http: IHttp,
    persis: IPersistence,
  ): Promise<void> {
    const args = context.getArguments().join(' ');
    const parseResult = parseRemindCommand(args, new Date());

    if (parseResult.kind === 'error') {
      await replyEphemeral(modify, context, `❌ ${parseResult.reason}`);
      return;
    }

    // resolve target, persist reminder, schedule job, confirm
    // …
  }
}
```

---

## Sending Ephemeral Messages

```ts
// Utility pattern used throughout commands:
async function replyEphemeral(
  modify: IModify,
  context: SlashCommandContext,
  text: string,
): Promise<void> {
  const notifier = modify.getNotifier();
  const msg = notifier.getMessageBuilder().setRoom(context.getRoom()).setText(text);
  await notifier.notifyUser(context.getSender(), msg.getMessage());
}
```

---

## Deploying to Rocket.Chat

```bash
# Package the app
pnpm rc:package       # → dist/rc-chat-reminders-0.1.0.zip

# Deploy to a running Rocket.Chat server
pnpm rc:deploy        # prompts for server URL + credentials
```

---

## Running All Quality Gates

```bash
pnpm typecheck        # Zero TypeScript errors
pnpm lint             # Zero ESLint warnings
pnpm format:check     # Prettier clean
pnpm test             # All unit + doctest pass
pnpm test:coverage    # ≥98% coverage
```

Or run the full CI suite in one command:

```bash
script/ci
```
