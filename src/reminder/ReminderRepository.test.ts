import { describe, it, expect } from 'vitest';
import type { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import type { Reminder } from './Reminder.ts';
import { ReminderRepository } from './ReminderRepository.ts';

interface StoredRecord {
  data: object;
  readonly associations: RocketChatAssociationRecord[];
}

function matchesAssoc(record: StoredRecord, assoc: RocketChatAssociationRecord): boolean {
  return record.associations.some(
    (a) => a.getModel() === assoc.getModel() && a.getID() === assoc.getID(),
  );
}

function makeStore(): { persis: IPersistence; reader: IPersistenceRead } {
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

  return { persis, reader };
}

const NOW = new Date('2025-01-15T08:00:00Z');
const FIRE_AT = new Date('2025-01-15T09:00:00Z');

const BASE_REMINDER: Reminder = {
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

describe('ReminderRepository', () => {
  it('create + findById round-trips a reminder', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await repo.create(persis, BASE_REMINDER);
    const found = await repo.findById(reader, 'rem-001');
    expect(found).toBeDefined();
    expect(found?.id).toBe('rem-001');
    expect(found?.message).toBe('Stand-up time');
    expect(found?.createdAt).toEqual(NOW);
    expect(found?.fireAt).toEqual(FIRE_AT);
    expect(found?.nextFireAt).toEqual(FIRE_AT);
    expect(found?.status).toBe('active');
  });

  it('findById returns undefined for unknown id', async () => {
    const { reader } = makeStore();
    const repo = new ReminderRepository();
    const found = await repo.findById(reader, 'unknown');
    expect(found).toBeUndefined();
  });

  it('updateJobId sets scheduledJobId on existing reminder', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await repo.create(persis, BASE_REMINDER);
    await repo.updateJobId(persis, reader, 'rem-001', 'job-abc');
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.scheduledJobId).toBe('job-abc');
  });

  it('updateStatus changes status on existing reminder', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await repo.create(persis, BASE_REMINDER);
    await repo.updateStatus(persis, reader, 'rem-001', 'completed');
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.status).toBe('completed');
  });
});

describe('ReminderRepository optional fields and guards', () => {
  it('round-trips a cron reminder without fireAt', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    const cron: Reminder = {
      id: 'rem-001',
      createdBy: 'user-1',
      createdAt: NOW,
      targetType: 'me',
      targetId: 'user-1',
      targetName: 'me',
      message: 'Stand-up time',
      frequency: 'cron',
      cronExpression: '0 9 * * *',
      nextFireAt: FIRE_AT,
      status: 'active',
    };
    await repo.create(persis, cron);
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.cronExpression).toBe('0 9 * * *');
    expect(found?.fireAt).toBeUndefined();
  });

  it('round-trips a reminder with pre-set scheduledJobId', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    const r: Reminder = { ...BASE_REMINDER, scheduledJobId: 'job-pre' };
    await repo.create(persis, r);
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.scheduledJobId).toBe('job-pre');
  });

  it('no-ops when reminder is not found', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await expect(repo.updateJobId(persis, reader, 'x', 'j')).resolves.toBeUndefined();
    await expect(repo.updateStatus(persis, reader, 'x', 'completed')).resolves.toBeUndefined();
  });
});
