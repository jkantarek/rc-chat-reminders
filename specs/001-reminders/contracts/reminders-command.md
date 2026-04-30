# Slash Command Contract: `/reminders`

**Version**: 1.0 | **App**: RC Chat Reminders | **Branch**: `001-reminders`

---

## Command

`/reminders`

---

## Purpose

Displays, inspects, and cancels the invoking user's reminders. All output is ephemeral (single-user visibility).

---

## Syntax

```
/reminders [list]
/reminders cancel <id>
/reminders help
```

### Sub-commands

| Sub-command      | Alias    | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `list` (default) | _(none)_ | Show all active reminders for the invoking user |
| `cancel <id>`    | —        | Cancel the reminder with the given ID           |
| `help`           | —        | Show usage instructions                         |

If no sub-command is given, `list` is assumed.

---

## Examples

```
/reminders
/reminders list
/reminders cancel abc123
/reminders help
```

---

## Response: `list`

**Has reminders** (ephemeral):

```
📋 Your active reminders:

#1  [id: abc123]  me  "Stand-up time"  — every day at 9am  (next: 2026-05-01 09:00)
#2  [id: def456]  #general  "Team lunch"  — 2026-05-02 12:00  (once)

To cancel: /reminders cancel <id>
```

**No reminders** (ephemeral):

```
You have no active reminders. Use /remind to create one.
```

---

## Response: `cancel <id>`

**Success** (ephemeral):

```
✅ Reminder cancelled: "Stand-up time" [id: abc123]
```

**Not found** (ephemeral):

```
❌ No active reminder found with id "abc123".
```

**Already cancelled / completed** (ephemeral):

```
❌ Reminder "Stand-up time" [id: abc123] is already cancelled.
```

---

## Response: `help`

**Ephemeral**:

```
RC Chat Reminders — Commands:

/remind <target> <message> <schedule>
  target:   me | @username | #channel
  schedule: in 15 minutes | at 3pm | every Monday at 9am | …

/reminders             — list your active reminders
/reminders cancel <id> — cancel a reminder
/reminders help        — show this help
```

---

## Behaviour Contract

1. All output is ephemeral (only the invoking user sees responses).
2. `list` shows only reminders created by the invoking user where `status = 'active'`.
3. `cancel` only cancels reminders belonging to the invoking user.
4. Cancelling a reminder calls `ISchedulerModify.cancelJob(scheduledJobId)` and updates status to `'cancelled'`.
5. If `cancelJob` fails, the status is still set to `'cancelled'` (idempotent cleanup).
6. Reminders with `status = 'completed'` or `'cancelled'` are hidden from `list`.

---

## Permissions

No special Rocket.Chat permissions required. Users can only see and cancel their own reminders.
