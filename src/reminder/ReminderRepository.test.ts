import { describe, it, expect } from 'vitest';
import type { Reminder } from './Reminder.ts';
import { ReminderRepository } from './ReminderRepository.ts';
import { makeStore, BASE_REMINDER, NOW, FIRE_AT } from './ReminderRepository.test-utils.ts';

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
    expect(await new ReminderRepository().findById(reader, 'unknown')).toBeUndefined();
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
    await new ReminderRepository().create(persis, { ...BASE_REMINDER, scheduledJobId: 'job-pre' });
    expect((await new ReminderRepository().findById(reader, 'rem-001'))?.scheduledJobId).toBe(
      'job-pre',
    );
  });

  it('no-ops when reminder is not found', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await expect(repo.updateJobId(persis, reader, 'x', 'j')).resolves.toBeUndefined();
    await expect(repo.updateStatus(persis, reader, 'x', 'completed')).resolves.toBeUndefined();
  });
});

describe('ReminderRepository.findByUser', () => {
  it('returns only active reminders for the given user', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await repo.create(persis, { ...BASE_REMINDER, id: 'rem-a' });
    await repo.create(persis, { ...BASE_REMINDER, id: 'rem-b' });
    await repo.create(persis, { ...BASE_REMINDER, id: 'rem-c', createdBy: 'user-2' });
    await repo.create(persis, { ...BASE_REMINDER, id: 'rem-d', status: 'completed' });
    const results = await repo.findByUser(reader, 'user-1');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id).sort()).toEqual(['rem-a', 'rem-b']);
  });

  it('returns empty array when user has no active reminders', async () => {
    const { reader } = makeStore();
    expect(await new ReminderRepository().findByUser(reader, 'user-1')).toEqual([]);
  });
});

describe('ReminderRepository biweekly fields round-trip', () => {
  it('round-trips biweeklyAnchorDate and scheduleLabel', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    const anchor = new Date('2026-05-04T06:00:00.000Z');
    const reminder: Reminder = {
      ...BASE_REMINDER,
      frequency: 'biweekly',
      biweeklyAnchorDate: anchor,
      scheduleLabel: 'every other week on Monday at 06:00',
    };
    await repo.create(persis, reminder);
    const found = await repo.findById(reader, 'rem-001');
    expect(found?.biweeklyAnchorDate).toBeInstanceOf(Date);
    expect(found?.biweeklyAnchorDate?.toISOString()).toBe(anchor.toISOString());
    expect(found?.scheduleLabel).toBe('every other week on Monday at 06:00');
  });

  it('does not add biweeklyAnchorDate or scheduleLabel when absent', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    const found = await new ReminderRepository().findById(reader, 'rem-001');
    expect(found?.biweeklyAnchorDate).toBeUndefined();
    expect(found?.scheduleLabel).toBeUndefined();
  });
});

describe('ReminderRepository monthlyNthWeekday round-trip', () => {
  it('round-trips monthlyNthWeekday', async () => {
    const { persis, reader } = makeStore();
    const repo = new ReminderRepository();
    await repo.create(persis, {
      ...BASE_REMINDER,
      frequency: 'monthly',
      monthlyNthWeekday: 3,
      cronExpression: '0 9 * * 2',
    });
    expect((await repo.findById(reader, 'rem-001'))?.monthlyNthWeekday).toBe(3);
  });

  it('does not persist monthlyNthWeekday when absent', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    expect(
      (await new ReminderRepository().findById(reader, 'rem-001'))?.monthlyNthWeekday,
    ).toBeUndefined();
  });
});
