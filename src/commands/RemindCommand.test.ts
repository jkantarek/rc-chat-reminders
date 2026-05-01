import { describe, it, expect } from 'vitest';
import type {
  IPersistence,
  IPersistenceRead,
  IModify,
  IRead,
  IHttp,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { RemindCommand } from './RemindCommand.ts';

interface StoredRecord {
  data: object;
  readonly associations: RocketChatAssociationRecord[];
}
interface FakeBuilder {
  setRoom: (r: IRoom) => FakeBuilder;
  setText: (t: string) => FakeBuilder;
  getMessage: () => { text: string };
}
interface Capture {
  notified: string[];
  scheduled: { id: string; when: string | Date }[];
}

function matchesAssoc(record: StoredRecord, assoc: RocketChatAssociationRecord): boolean {
  return record.associations.some(
    (a) => a.getModel() === assoc.getModel() && a.getID() === assoc.getID(),
  );
}

function makeStore(): { persis: IPersistence; reader: IPersistenceRead; store: StoredRecord[] } {
  const store: StoredRecord[] = [];

  const reader = {
    readByAssociation(assoc: RocketChatAssociationRecord): Promise<object[]> {
      return Promise.resolve(store.filter((r) => matchesAssoc(r, assoc)).map((r) => r.data));
    },
  } as unknown as IPersistenceRead;

  const persis = {
    createWithAssociations(
      data: object,
      associations: RocketChatAssociationRecord[],
    ): Promise<string> {
      store.push({ data, associations });
      return Promise.resolve(`id-${String(store.length)}`);
    },
    updateByAssociation(
      assoc: RocketChatAssociationRecord,
      data: object,
      _upsert?: boolean,
    ): Promise<string> {
      const idx = store.findIndex((r) => matchesAssoc(r, assoc));
      const existing = store[idx];
      if (idx !== -1 && existing !== undefined) {
        store[idx] = { data, associations: existing.associations };
      }
      return Promise.resolve('updated');
    },
  } as unknown as IPersistence;

  return { persis, reader, store };
}

function makeRead(reader: IPersistenceRead): IRead {
  return { getPersistenceReader: (): IPersistenceRead => reader } as unknown as IRead;
}

function makeModify(cap: Capture, voidJob = false): IModify {
  let txt = '';
  const bld: FakeBuilder = {
    setRoom(_r: IRoom): FakeBuilder {
      return bld;
    },
    setText(t: string): FakeBuilder {
      txt = t;
      return bld;
    },
    getMessage(): { text: string } {
      return { text: txt };
    },
  };
  const nfy = {
    getMessageBuilder(): FakeBuilder {
      return bld;
    },
    notifyUser(_u: IUser, m: { text: string }): Promise<void> {
      cap.notified.push(m.text);
      return Promise.resolve();
    },
  };
  const sched = {
    scheduleOnce(j: { id: string; when: string | Date }): Promise<string | undefined> {
      cap.scheduled.push(j);
      return voidJob ? Promise.resolve(undefined) : Promise.resolve(j.id);
    },
  };
  return {
    getNotifier(): typeof nfy {
      return nfy;
    },
    getScheduler(): typeof sched {
      return sched;
    },
  } as unknown as IModify;
}

const SENDER = { id: 'user-1', username: 'alice' } as unknown as IUser;
const ROOM = { id: 'room-1' } as unknown as IRoom;
const cmd = new RemindCommand();

describe('RemindCommand', () => {
  it('creates and schedules a one-time me reminder', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [] };
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
    const cap: Capture = { notified: [], scheduled: [] };
    const read = makeRead({} as IPersistenceRead);
    const ctx = new SlashCommandContext(SENDER, ROOM, ['me']);
    await cmd.executor(ctx, read, makeModify(cap), {} as unknown as IHttp, persis);
    expect(store.length).toBe(0);
    expect(cap.scheduled.length).toBe(0);
    expect(cap.notified.join('')).toContain('❌');
  });

  it('falls back to reminder id when scheduleOnce returns void', async () => {
    const { persis, reader, store } = makeStore();
    const cap: Capture = { notified: [], scheduled: [] };
    const ctx = new SlashCommandContext(SENDER, ROOM, ['me', 'X', 'in', '1', 'minute']);
    const vmod = makeModify(cap, true);
    await cmd.executor(ctx, makeRead(reader), vmod, {} as unknown as IHttp, persis);
    const rec = store[0]?.data as unknown as Record<string, unknown>;
    expect(typeof rec['scheduledJobId']).toBe('string');
  });
});
