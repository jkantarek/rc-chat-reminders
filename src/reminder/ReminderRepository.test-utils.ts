import { describe } from 'vitest';
import type { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import type { Reminder } from './Reminder.ts';

interface StoredRecord {
  data: object;
  readonly associations: RocketChatAssociationRecord[];
}

export const NOW = new Date('2025-01-15T08:00:00Z');
export const FIRE_AT = new Date('2025-01-15T09:00:00Z');

export const BASE_REMINDER: Reminder = {
  id: 'rem-001',
  createdBy: 'user-1',
  createdAt: NOW,
  targetType: 'me',
  targetId: 'user-1',
  targetName: 'me',
  message: 'Stand-up time',
  frequency: 'once',
  fireAt: FIRE_AT,
  nextFireAt: FIRE_AT,
  status: 'active',
};

export function makeStore(): {
  persis: IPersistence;
  reader: IPersistenceRead;
  store: StoredRecord[];
} {
  const store: StoredRecord[] = [];
  function matchesAssoc(record: StoredRecord, assoc: RocketChatAssociationRecord): boolean {
    return record.associations.some(
      (a) => a.getModel() === assoc.getModel() && a.getID() === assoc.getID(),
    );
  }
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

describe.todo('ReminderRepository test utilities (helper exports only)');
