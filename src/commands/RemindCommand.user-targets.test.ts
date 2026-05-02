import { describe, it, expect } from 'vitest';
import type {
  IHttp,
  IPersistenceRead,
  IUserRead,
  IRoomRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { RemindCommand } from './RemindCommand.ts';
import { makeStore, makeRead, makeModify, type Capture } from './RemindCommand.test-utils.test.ts';

const SENDER = { id: 'user-1', username: 'alice' } as unknown as IUser;
const ROOM = { id: 'room-1' } as unknown as IRoom;
const cmd = new RemindCommand();
const ALICE = { id: 'user-alice', username: 'alice' } as unknown as IUser;
const GENERAL_ROOM = { id: 'room-general', name: 'general' } as unknown as IRoom;

describe('RemindCommand – target resolution success', () => {
  it('creates reminder for @alice target with resolved user ID', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      '@alice',
      'Review PR',
      'in',
      '30',
      'minutes',
    ]);
    const userReader = {
      getByUsername: (u: string): Promise<IUser | undefined> =>
        Promise.resolve(u === 'alice' ? ALICE : undefined),
    } as unknown as IUserRead;
    await cmd.executor(
      ctx,
      makeRead(reader, userReader),
      makeModify(cap),
      {} as unknown as IHttp,
      persis,
    );
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(rec['targetType']).toBe('user');
    expect(rec['targetId']).toBe('user-alice');
    expect(rec['message']).toBe('Review PR');
    expect(cap.scheduled.length).toBe(1);
  });

  it('creates reminder for #general target with resolved room ID', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      '#general',
      'Team meeting',
      'in',
      '30',
      'minutes',
    ]);
    const roomReader = {
      getByName: (n: string): Promise<IRoom | undefined> =>
        Promise.resolve(n === 'general' ? GENERAL_ROOM : undefined),
    } as unknown as IRoomRead;
    await cmd.executor(
      ctx,
      makeRead(reader, undefined, roomReader),
      makeModify(cap),
      {} as unknown as IHttp,
      persis,
    );
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(rec['targetType']).toBe('channel');
    expect(rec['targetId']).toBe('room-general');
    expect(rec['message']).toBe('Team meeting');
    expect(cap.scheduled.length).toBe(1);
  });
});

describe('RemindCommand – target resolution errors', () => {
  it('replies with error for unknown @user and does not persist', async () => {
    const { persis, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const userReader = {
      getByUsername: (_u: string): Promise<IUser | undefined> => Promise.resolve(undefined),
    } as unknown as IUserRead;
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      '@unknown',
      'Message',
      'in',
      '5',
      'minutes',
    ]);
    await cmd.executor(
      ctx,
      makeRead({} as IPersistenceRead, userReader),
      makeModify(cap),
      {} as unknown as IHttp,
      persis,
    );
    expect(store.length).toBe(0);
    expect(cap.scheduled.length).toBe(0);
    expect(cap.notified.join('')).toContain('❌');
  });

  it('replies with error for unknown #channel and does not persist', async () => {
    const { persis, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [], recurringScheduled: [] };
    const roomReader = {
      getByName: (_n: string): Promise<IRoom | undefined> => Promise.resolve(undefined),
    } as unknown as IRoomRead;
    const ctx = new SlashCommandContext(SENDER, ROOM, [
      '#unknown',
      'Message',
      'in',
      '5',
      'minutes',
    ]);
    await cmd.executor(
      ctx,
      makeRead({} as IPersistenceRead, undefined, roomReader),
      makeModify(cap),
      {} as unknown as IHttp,
      persis,
    );
    expect(store.length).toBe(0);
    expect(cap.scheduled.length).toBe(0);
    expect(cap.notified.join('')).toContain('❌');
  });
});
