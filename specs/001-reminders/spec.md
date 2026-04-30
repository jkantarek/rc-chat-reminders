# Feature Specification: RC Chat Reminders — Slash Command Scheduling

**Feature Branch**: `001-reminders`
**Created**: 2026-04-30
**Status**: Draft
**Input**: User description: "the tool should be able to send messages directly to a channel, person etc with custom messages at a custom schedule that can be variable/flexible. target a similar pattern to slack /remind functionality we want to provide slash commands to show what is scheduled and display status/editability to the user. avoid popups and prefer sending single user visibility messages instead if it's supported"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Create a One-Time Reminder (Priority: P1)

A user types `/remind me Stand-up time in 15 minutes` (or `at 9:00am`, or `at 2026-05-01 14:00`) and receives an ephemeral confirmation visible only to them. At the scheduled time the app sends a visible message to the same room (or DM) on their behalf.

**Why this priority**: Core value proposition — without scheduling a reminder nothing else works.

**Independent Test**: Can be fully tested by invoking `/remind me [message] in 1 minute`, waiting, and verifying the message appears in the room. Delivers the MVP of automated reminders.

**Acceptance Scenarios**:

1. **Given** a user is in a room, **When** they type `/remind me Stand-up in 15 minutes`, **Then** they receive an ephemeral "Reminder set: Stand-up — in 15 minutes" confirmation (visible only to them) and a reminder is persisted.
2. **Given** a reminder is scheduled for a past time (parse error), **When** the slash command is invoked, **Then** the user receives an ephemeral error message explaining the problem.
3. **Given** a valid reminder is stored, **When** the scheduled time fires, **Then** a message is sent to the target room/DM containing the reminder text, attributed to the app.

---

### User Story 2 — Create a Recurring Reminder (Priority: P2)

A user types `/remind me Daily standup every day at 9:00am` (or `every Monday at 4pm`, `every weekday at 5pm`). The app schedules a recurring job and confirms ephemerally.

**Why this priority**: Recurring reminders are the main differentiator from a one-shot alert; they enable automated workflow rituals.

**Independent Test**: Can be tested by scheduling a recurring reminder with a short interval (e.g. `every minute`) and verifying multiple deliveries.

**Acceptance Scenarios**:

1. **Given** a user types `/remind me Standup every day at 9am`, **Then** they receive an ephemeral confirmation and a `scheduleRecurring` job is registered with a cron expression.
2. **Given** a recurring reminder is active, **When** the cron fires, **Then** a message appears in the target room each time.
3. **Given** a user cancels the reminder (Story 4), **When** the next cron tick occurs, **Then** no message is sent.

---

### User Story 3 — Remind a Channel or Another User (Priority: P2)

A user types `/remind #general Team meeting at 3pm` or `/remind @alice Submit report at 5pm`. The app schedules the reminder to fire into the specified room or as a DM to the specified user.

**Why this priority**: Enables team-use cases rather than self-only reminders.

**Independent Test**: Can be tested by using `/remind #channel …` and verifying the message appears in that channel at the scheduled time.

**Acceptance Scenarios**:

1. **Given** a user types `/remind #general [message] at [time]`, **When** the time fires, **Then** a visible message appears in `#general`.
2. **Given** a user types `/remind @alice [message] at [time]`, **When** the time fires, **Then** a DM message appears between the app and alice.
3. **Given** an invalid target (unknown user/channel), **When** the slash command is executed, **Then** the user receives an ephemeral error.

---

### User Story 4 — List and Cancel Reminders (Priority: P3)

A user types `/reminders` (or `/reminders list`) to see all their active reminders with IDs, targets, messages, and next-fire times. They can type `/reminders cancel <id>` to cancel one.

**Why this priority**: Without visibility and control, users cannot correct mistakes or manage their reminders over time.

**Independent Test**: After creating two reminders, `/reminders` must list both with status "active". After `/reminders cancel <id>`, the cancelled reminder disappears and the scheduler job is cancelled.

**Acceptance Scenarios**:

1. **Given** a user has active reminders, **When** they type `/reminders`, **Then** they receive an ephemeral list showing each reminder's ID, target, message, next fire time, and status.
2. **Given** a user types `/reminders cancel abc123`, **When** the reminder exists and belongs to them, **Then** they receive ephemeral confirmation and the job is cancelled.
3. **Given** a user types `/reminders cancel unknown-id`, **Then** they receive an ephemeral "not found" error.
4. **Given** a user has no reminders, **When** they type `/reminders`, **Then** they receive an ephemeral "You have no active reminders" message.

---

## Non-Functional Requirements

- **No modal popups**: All feedback is via ephemeral messages (`notifyUser`), not UIKit modals.
- **Single-user visibility**: Ephemeral messages are invisible to other users in the room.
- **Persistence**: Reminders survive server restart (stored in Rocket.Chat persistence layer).
- **File size**: All source files ≤ 150 non-comment lines (enforced by ESLint).
- **Coverage**: ≥ 98% line/branch/function coverage.
- **Schedule formats supported**:
  - One-time: `in X minutes/hours/days`, `at HH:MM[am|pm]`, `at HH:MM tomorrow`, `at YYYY-MM-DD HH:MM`
  - Recurring: `every day at HH:MM`, `every weekday at HH:MM`, `every [Mon|Tue|…|Sun] at HH:MM`, `every month at HH:MM`

## Out of Scope

- Admin view of all users' reminders (only creator can view/cancel their own).
- Snooze / postpone UI.
- Attachments or rich message formatting in reminders.
- Time zone selection (uses server default).
