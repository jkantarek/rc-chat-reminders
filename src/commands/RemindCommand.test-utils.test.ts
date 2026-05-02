import { describe } from 'vitest';
import type {
  IPersistence,
  IPersistenceRead,
  IModify,
  IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';

interface StoredRecord {
  data: object;
  readonly associations: RocketChatAssociationRecord[];
}
interface FakeBuilder {
  setRoom: (r: IRoom) => FakeBuilder;
  setText: (t: string) => FakeBuilder;
  getMessage: () => { text: string };
}
export interface Capture {
  notified: string[];
  scheduled: { id: string; when: string | Date }[];
  recurringScheduled: { id: string; interval: string | number; data?: object }[];
}

function matchesAssoc(record: StoredRecord, assoc: RocketChatAssociationRecord): boolean {
  return record.associations.some(
    (a) => a.getModel() === assoc.getModel() && a.getID() === assoc.getID(),
  );
}

export function makeStore(): {
  persis: IPersistence;
  reader: IPersistenceRead;
  store: StoredRecord[];
} {
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
      if (idx !== -1 && existing !== undefined)
        store[idx] = { data, associations: existing.associations };
      return Promise.resolve('updated');
    },
  } as unknown as IPersistence;
  return { persis, reader, store };
}

export function makeRead(reader: IPersistenceRead): IRead {
  return { getPersistenceReader: (): IPersistenceRead => reader } as unknown as IRead;
}

export function makeModify(cap: Capture, voidJob = false, voidRecurringJob = false): IModify {
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
    scheduleRecurring(j: {
      id: string;
      interval: string | number;
      data?: object;
    }): Promise<string | undefined> {
      cap.recurringScheduled.push(j);
      return voidRecurringJob ? Promise.resolve(undefined) : Promise.resolve(j.id);
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

describe.todo('RemindCommand test utilities (helper exports only)');
