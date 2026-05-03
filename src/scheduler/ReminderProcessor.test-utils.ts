import { describe } from 'vitest';
import type {
  IPersistence,
  IPersistenceRead,
  IRead,
  IModify,
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

function makeBuilder(): IMessageBuilder {
  const s: Record<string, unknown> = {};
  const self = s as unknown as IMessageBuilder;
  (['setRoom', 'setSender', 'setText'] as const).forEach((k) => {
    s[k] = (): IMessageBuilder => self;
  });
  return self;
}

export function makeJobContext(reminderId: string): IJobContext {
  return { reminderId };
}

export function makeStore(): { persis: IPersistence; reader: IPersistenceRead } {
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

export function makeModify(messages: unknown[]): IModify {
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

export function makeRead(
  reader: IPersistenceRead,
  appUser: IUser | undefined,
  room: IRoom,
  channelRoom?: IRoom,
): IRead {
  const userReader = {
    getAppUser: (): Promise<IUser | undefined> => Promise.resolve(appUser),
  } as unknown as IUserRead;
  const roomReader = {
    getDirectByUsernames: (_u: string[]): Promise<IRoom> => Promise.resolve(room),
    getByName: (_n: string): Promise<IRoom | undefined> => Promise.resolve(channelRoom),
  } as unknown as IRoomRead;
  return {
    getPersistenceReader: (): IPersistenceRead => reader,
    getUserReader: (): IUserRead => userReader,
    getRoomReader: (): IRoomRead => roomReader,
  } as unknown as IRead;
}

export const APP_USER = { username: 'app-user', id: 'app-1' } as unknown as IUser;
export const ROOM = { id: 'dm-001' } as unknown as IRoom;
export const BASE_REMINDER: Reminder = {
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

describe.todo('ReminderProcessor test utilities (helper exports only)');
