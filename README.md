# rc-chat-reminders

[![CI](https://github.com/jkantarek/rc-chat-reminders/actions/workflows/ci.yml/badge.svg)](https://github.com/jkantarek/rc-chat-reminders/actions/workflows/ci.yml)
[![Release](https://github.com/jkantarek/rc-chat-reminders/actions/workflows/release.yml/badge.svg)](https://github.com/jkantarek/rc-chat-reminders/actions/workflows/release.yml)

A private [Rocket.Chat App](https://developer.rocket.chat/apps-engine/getting-started) for sending, scheduling, and triggering custom reminders directly inside your Rocket.Chat workspace.

## Features

- **`/remind`** slash command — schedule a one-off or recurring reminder for yourself or any user
- **Recurring schedules** — daily, weekly, and monthly repeat options
- **Instant reminders** — trigger a reminder immediately via slash command
- **Private delivery** — reminders are delivered as direct messages from the app bot user
- **Persistent storage** — reminders survive server restarts using the Apps-Engine key-value store

## Installation (private app)

Download the latest `.zip` from the [Releases page](https://github.com/jkantarek/rc-chat-reminders/releases), then:

1. In your Rocket.Chat workspace, go to **Administration → Apps → Private Apps**
2. Click **Upload Private App** and select the downloaded `.zip`
3. Accept the required permissions and enable the app

> Requires Rocket.Chat ≥ 6.0 and Apps-Engine API ≥ 1.44.0.

## Slash command usage

```
/remind @username <message> at <time> [every <daily|weekly|monthly>]
```

| Example                                                | Description                             |
| ------------------------------------------------------ | --------------------------------------- |
| `/remind me Stand-up time! at 09:00`                   | Remind yourself daily at 09:00          |
| `/remind @alice Submit the report at 2026-05-01 14:00` | One-off reminder for Alice              |
| `/remind me Weekly retro at 16:00 every weekly`        | Recurring weekly reminder               |
| `/remind @team All-hands in 10 minutes`                | Immediate reminder to a channel or user |

## Development

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (`npm i -g pnpm`)

### First-time setup

```bash
script/bootstrap
```

This installs dependencies, sets up git hooks, and verifies all quality gates pass.

### Daily workflow

```bash
pnpm test          # Run unit tests + inline doctests
pnpm typecheck     # TypeScript type-check (zero errors)
pnpm lint          # ESLint (zero warnings)
pnpm format:check  # Prettier formatting check
pnpm rc:package    # Verify the private app package builds cleanly
```

### Building and deploying

```bash
# Package the app as a zip for manual upload
pnpm rc:package
```

The generated release artifact is intended for manual upload under
**Administration → Apps → Private Apps**.

## Project structure

```
src/
├── RcChatRemindersApp.ts      ← Main App class (extends App)
├── commands/
│   └── RemindCommand.ts       ← /remind slash command handler
├── handlers/
│   └── ReminderHandler.ts     ← Message/event handler
├── schedulers/
│   └── ReminderScheduler.ts   ← Cron-style job scheduler
├── lib/
│   └── reminderParser.ts      ← Parse reminder text into structured data
├── index.ts                   ← Shared types and utilities (unit-tested)
└── index.test.ts              ← Co-located tests

app.json                       ← Rocket.Chat App manifest
tsconfig.rc.json               ← RC app compilation config
tsconfig.src.json              ← Ultra-strict config for dev/test
```

## Quality gates

All of the following must pass before any commit:

```
pnpm typecheck      # Zero TypeScript errors
pnpm lint           # Zero ESLint warnings
pnpm format:check   # All files formatted
pnpm test:coverage  # All tests pass, ≥98% coverage
pnpm rc:package     # Private app zip builds successfully
```

Enforced by a pre-commit hook (`script/lint --staged`) and CI (`.github/workflows/ci.yml`).

## Scripts

| Script             | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `script/bootstrap` | First-time setup                                    |
| `script/test`      | Run tests (`--coverage`, `--watch`, `--ui`)         |
| `script/lint`      | Typecheck + ESLint + Prettier (`--fix`, `--staged`) |
| `script/ci`        | Full local CI gate suite                            |

## AI Agent workflow

This project ships with 16 [Speckit](https://github.com/jkantarek/ts-ultrastrict-ai) AI agents for structured feature development. See [AGENTS.md](AGENTS.md) for the full reference.

```
/speckit.specify   →  Describe a reminder feature in natural language
/speckit.plan      →  Generate a technical plan
/speckit.tasks     →  Break plan into ordered tasks
/speckit.implement →  Execute tasks one at a time (TDD: RED → GREEN → refactor)
/speckit.ralph.run →  Autonomous implementation loop
```

## References

- [Rocket.Chat Apps-Engine documentation](https://developer.rocket.chat/apps-engine)
- [Apps-Engine API reference](https://rocketchat.github.io/Rocket.Chat.Apps-engine/)
- [Private apps guide](https://docs.rocket.chat/docs/rocketchat-private-apps)

## License

MIT
