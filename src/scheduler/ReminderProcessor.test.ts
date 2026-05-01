import { describe, it, expect } from 'vitest';
import type {
  IPersistence,
  IPersistenceRead,
  IRead,
  IModify,
  IHttp,
  IModifyCreator,
  IUserRead,
  IRoomRead,
  IMessageBuilder,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { IJobContext } from '@rocket.chat/apps-engine/definition/scheduler';
import type { RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { Reminder } from '../reminder/Reminder.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import { ReminderProcessor } from './ReminderProcessor.ts';

function makeBuilder(): IMessageBuilder {
  const s: Record<string, unknown> = {};
  const self = s as unknown as IMessageBuilder;
  (['setRoom', 'setSender', 'setText'] as const).forEach((k) => {
    s[k] = (): IMessageBuilder => self;
  });
  return self;
}
function makeJobContext(reminderId: string): IJobContext {
  return { reminderId };
}
function makeStore(): { persis: IPersistence; reader: IPersistenceRead } {
  const map = new Map<string, object>();
  const reader = {
    readByAssociation(assoc: RocketChatAssociationRecord): Promise<object[]> {
      const val = map.get(assoc.getID());
      return Promise.resolve(val !== undefined ? [val] : []);
    },
  } as unknown as IPersistenceRead;
  const persis = {
    createWithAssociations(data: object, assocs: RocketChatAssociationRecord[]): Promise<string> {
      assocs.forEach((a): void => {
        map.set(a.getID(), data);
      });
      return Promise.resolve(assocs[0]?.getID() ?? 'id');
    },
    updateByAssociation(assoc: RocketChatAssociationRecord, data: object): Promise<string> {
      map.set(assoc.getID(), data);
      return Promise.resolve(assoc.getID());
    },
  } as unknown as IPersistence;
  return { persis, reader };
}
function makeModify(messages: unknown[]): IModify {
  const builder = makeBuilder();
  const creator = {
    startMessage: (): IMessageBuilder => builder,
    finish(b: unknown): Promise<string> {
      messages.push(b);
      return Promise.resolve('');
    },
  } as unknown as IModifyCreator;
  return { getCreator: (): IModifyCreator => creator } as unknown as IModify;
}
function makeRead(reader: IPersistenceRead, appUser: IUser | undefined, room: IRoom): IRead {
  const userReader = {
    getAppUser: (): Promise<IUser | undefined> => Promise.resolve(appUser),
  } as unknown as IUserRead;
  const roomReader = {
    getDirectByUsernames: (_u: string[]): Promise<IRoom> => Promise.resolve(room),
  } as unknown as IRoomRead;
  return {
    getPersistenceReader: (): IPersistenceRead => reader,
    getUserReader: (): IUserRead => userReader,
    getRoomReader: (): IRoomRead => roomReader,
  } as unknown as IRead;
}

const APP_USER = { username: 'app-user', id: 'app-1' } as unknown as IUser;
const ROOM = { id: 'dm-001' } as unknown as IRoom;
const BASE_REMINDER: Reminder = {
  id: 'rem-001',
  createdBy: 'user-1',
  createdAt: new Date('2025-01-15T08:00:00Z'),
  targetType: 'me',
  targetId: 'user-1',
  targetName: 'alice',
  message: 'Stand-up time',
  frequency: 'once',
  fireAt: new Date('2025-01-15T09:00:00Z'),
  nextFireAt: new Date('2025-01-15T09:00:00Z'),
  status: 'active',
};

describe('ReminderProcessor', () => {
  it('sends a message and completes once-reminder', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(1);
    expect((await new ReminderRepository().findById(reader, 'rem-001'))?.status).toBe('completed');
  });
  it('does nothing when reminder is not found', async () => {
    const { persis, reader } = makeStore();
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('unknown-id'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(0);
  });
  it('does nothing when app user is not found', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, undefined, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(0);
  });
  it('sends message but keeps status active for non-once reminder', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, { ...BASE_REMINDER, frequency: 'daily' });
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(1);
    expect((await new ReminderRepository().findById(reader, 'rem-001'))?.status).toBe('active');
  });
});
