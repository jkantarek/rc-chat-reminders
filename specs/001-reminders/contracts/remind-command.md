# Slash Command Contract: `/remind`

**Version**: 1.0 | **App**: RC Chat Reminders | **Branch**: `001-reminders`

---

## Command

`/remind`

---

## Purpose

Creates a new reminder that fires a message to a target (self, a user, or a channel) at a specified time or on a recurring schedule.

---

## Syntax

```
/remind <target> <message> <schedule>
```

### Arguments

| Argument     | Required | Description   | Examples                         |
| ------------ | -------- | ------------- | -------------------------------- |
| `<target>`   | yes      | Who to remind | `me`, `@alice`, `#general`       |
| `<message>`  | yes      | Reminder text | `Stand-up time`, `Submit report` |
| `<schedule>` | yes      | When to fire  | See schedule formats below       |

### Schedule Formats

| Format                                                       | Type      | Example                |
| ------------------------------------------------------------ | --------- | ---------------------- |
| `in X minute(s)`                                             | one-time  | `in 15 minutes`        |
| `in X hour(s)`                                               | one-time  | `in 2 hours`           |
| `in X day(s)`                                                | one-time  | `in 3 days`            |
| `at HH:MM[am\|pm]`                                           | one-time  | `at 3pm`, `at 14:30`   |
| `at H[am\|pm] tomorrow`                                      | one-time  | `at 9am tomorrow`      |
| `at YYYY-MM-DD HH:MM`                                        | one-time  | `at 2026-05-01 09:00`  |
| `every day at HH:MM[am\|pm]`                                 | recurring | `every day at 9am`     |
| `every weekday at HH:MM[am\|pm]`                             | recurring | `every weekday at 5pm` |
| `every [Mon\|Tue\|Wed\|Thu\|Fri\|Sat\|Sun] at HH:MM[am\|pm]` | recurring | `every Monday at 10am` |
| `every month at HH:MM[am\|pm]`                               | recurring | `every month at 9am`   |

---

## Examples

```
/remind me Stand-up time in 15 minutes
/remind me Submit weekly report every Friday at 4pm
/remind @alice Review my PR at 3pm
/remind #general Team lunch tomorrow at 12pm
/remind me Hydrate every day at 10am
```

---

## Response

**Success** (ephemeral — visible only to the invoking user):

```
✅ Reminder set [id: abc123]:
  Target: me
  Message: Stand-up time
  When: in 15 minutes (2026-04-30 10:45:00)
```

**Failure** (ephemeral):

```
❌ Could not set reminder: <reason>
```

Possible `<reason>` values:

- `Schedule time is in the past`
- `Unknown target "@unknown-user"`
- `Unknown channel "#nonexistent"`
- `Invalid schedule format — try: "in 15 minutes", "at 3pm", "every Monday at 9am"`
- `Message cannot be empty`
- `Message too long (max 500 characters)`

---

## Behaviour Contract

1. The command always responds ephemerally (only the invoking user sees the response).
2. A successful reminder is persisted before the ephemeral confirmation is sent.
3. The scheduler job is registered after persistence succeeds.
4. If scheduler registration fails, the reminder is marked `cancelled` and an error is returned ephemerally.
5. The reminder fires as a **visible persistent message** in the target room/DM (not ephemeral).
6. One-time reminders transition to `completed` after firing.
7. Recurring reminders remain `active` until cancelled.

---

## Permissions

No special Rocket.Chat permissions required beyond being a member of the room where the command is invoked.

For `@user` targets: the app must be able to resolve the user (no admin permission needed).
For `#channel` targets: the app must have access to the room.
