import { describe, it, expect } from 'vitest';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { makeStore, makeRead } from './RemindCommand.test-utils.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import { RemindersCommand } from './RemindersCommand.ts';
import {
  type RemCapture,
  makeRemModify,
  BASE_REMINDER,
  NO_JOB_REMINDER,
  seed,
  HTTP,
} from './RemindersCommand.test-utils.ts';

const SENDER = { id: 'user-1', username: 'alice' } as unknown as IUser;
const ROOM = { id: 'room-1' } as unknown as IRoom;
const cmd = new RemindersCommand();

describe('RemindersCommand list', () => {
  it('shows empty message when user has no reminders', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['list']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('no active reminders');
  });

  it('lists active reminders', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [BASE_REMINDER]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['list']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('rem-001');
    expect(cap.notified.join('')).toContain('Stand-up time');
  });

  it('unknown sub-command defaults to list', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['blah']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('no active reminders');
  });
});

describe('RemindersCommand cancel success', () => {
  it('cancels an active reminder by id', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [BASE_REMINDER]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'rem-001']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('✅');
    expect(cap.notified.join('')).toContain('rem-001');
    expect(cap.cancelledJobs).toContain('job-001');
  });

  it('still updates status to cancelled if cancelJob throws', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [BASE_REMINDER]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'rem-001']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap, true), HTTP, persis);
    expect(cap.notified.join('')).toContain('✅');
    const repo = new ReminderRepository();
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.status).toBe('cancelled');
  });

  it('cancels reminder without a scheduled job id', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [NO_JOB_REMINDER]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'rem-002']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('✅');
    expect(cap.cancelledJobs).toHaveLength(0);
  });
});

describe('RemindersCommand cancel errors', () => {
  it('returns not found for unknown id', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'no-such-id']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('❌');
    expect(cap.notified.join('')).toContain('no-such-id');
  });

  it('returns already cancelled for cancelled reminder', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [{ ...BASE_REMINDER, status: 'cancelled' }]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'rem-001']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('❌');
    expect(cap.notified.join('')).toContain('already cancelled');
  });

  it('returns not found when cancelling another user reminder', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    await seed(persis, [{ ...BASE_REMINDER, id: 'rem-003', createdBy: 'other-user' }]);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel', 'rem-003']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('❌');
    expect(cap.notified.join('')).toContain('rem-003');
  });

  it('cancel without id shows help', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['cancel']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('/reminders');
  });
});

describe('RemindersCommand help', () => {
  it('shows help text with usage', async () => {
    const { persis, reader } = makeStore();
    const cap: RemCapture = { notified: [], cancelledJobs: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['help']);
    await cmd.executor(ctx, makeRead(reader), makeRemModify(cap), HTTP, persis);
    expect(cap.notified.join('')).toContain('/reminders');
    expect(cap.notified.join('')).toContain('/remind');
  });
});
