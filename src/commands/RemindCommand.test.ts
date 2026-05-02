import { describe, it, expect } from 'vitest';
import type { IHttp, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { RemindCommand } from './RemindCommand.ts';
import { makeStore, makeRead, makeModify, type Capture } from './RemindCommand.test-utils.test.ts';

const SENDER = { id: 'user-1', username: 'alice' } as unknown as IUser;
const ROOM = { id: 'room-1' } as unknown as IRoom;
const cmd = new RemindCommand();

describe('RemindCommand – one-time', () => {
  it('creates and schedules a one-time me reminder', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['me', 'Stand-up', 'in', '5', 'minutes']);
    await cmd.executor(ctx, makeRead(reader), makeModify(cap), {} as unknown as IHttp, persis);
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(rec['message']).toBe('Stand-up');
    expect(cap.scheduled.length).toBe(1);
    expect(typeof rec['scheduledJobId']).toBe('string');
    expect(cap.notified.join('')).toContain('Stand-up');
  });

  it('replies with error and does not persist when parse fails', async () => {
    const { persis, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const read = makeRead({} as IPersistenceRead);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['me']);
    await cmd.executor(ctx, read, makeModify(cap), {} as unknown as IHttp, persis);
    expect(store.length).toBe(0);
    expect(cap.scheduled.length).toBe(0);
    expect(cap.notified.join('')).toContain('❌');
  });

  it('falls back to reminder id when scheduleOnce returns void', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['me', 'X', 'in', '1', 'minute']);
    const vmod = makeModify(cap, true);
    await cmd.executor(ctx, makeRead(reader), vmod, {} as unknown as IHttp, persis);
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(typeof rec['scheduledJobId']).toBe('string');
  });
});

describe('RemindCommand – recurring', () => {
  it('falls back to reminder id when scheduleRecurring returns void', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      'me',
      'Standup',
      'every',
      'day',
      'at',
      '9am',
    ]);
    await cmd.executor(
      ctx,
      makeRead(reader),
      makeModify(cap, false, true),
      {} as unknown as IHttp,
      persis,
    );
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(typeof rec['scheduledJobId']).toBe('string');
  });

  it('creates and schedules a recurring reminder', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      'me',
      'Standup',
      'every',
      'day',
      'at',
      '9am',
    ]);
    await cmd.executor(ctx, makeRead(reader), makeModify(cap), {} as unknown as IHttp, persis);
    expect(cap.recurringScheduled.length).toBe(1);
    expect(cap.scheduled.length).toBe(0);
    const job = cap.recurringScheduled[0];
    expect(job?.interval).toBe('0 9 * * *');
    const jobData = job?.data as Record<string, unknown> | undefined;
    expect(typeof jobData?.['reminderId']).toBe('string');
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(rec['frequency']).toBe('daily');
    expect(typeof rec['cronExpression']).toBe('string');
    expect(rec['fireAt']).toBeUndefined();
    expect(cap.notified.join('')).toContain('Standup');
  });
});
