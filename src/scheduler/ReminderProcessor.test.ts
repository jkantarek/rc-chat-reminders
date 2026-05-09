import { describe, it, expect } from 'vitest';
import type { IHttp } from '@rocket.chat/apps-engine/definition/accessors';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import {
  ReminderProcessor,
  shouldFireBiweekly,
  shouldFireMonthlyNthWeekday,
} from './ReminderProcessor.ts';
import {
  makeJobContext,
  makeStore,
  makeModify,
  makeRead,
  APP_USER,
  ROOM,
  BASE_REMINDER,
} from './ReminderProcessor.test-utils.ts';

const T0 = new Date('2025-01-06T06:00:00.000Z');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('shouldFireBiweekly', () => {
  const biweekly = {
    ...BASE_REMINDER,
    frequency: 'biweekly' as const,
    biweeklyAnchorDate: T0,
    createdAt: T0,
  };

  it('returns true at week 0 (anchor)', () => {
    expect(shouldFireBiweekly(biweekly, T0)).toBe(true);
  });

  it('returns false at week 1 (skip)', () => {
    expect(shouldFireBiweekly(biweekly, new Date(T0.getTime() + WEEK_MS))).toBe(false);
  });

  it('returns true at week 2 (fire)', () => {
    expect(shouldFireBiweekly(biweekly, new Date(T0.getTime() + 2 * WEEK_MS))).toBe(true);
  });

  it('returns true for non-biweekly reminder regardless of time', () => {
    expect(shouldFireBiweekly({ ...BASE_REMINDER, frequency: 'daily' }, T0)).toBe(true);
  });

  it('falls back to createdAt when biweeklyAnchorDate is absent', () => {
    const r = { ...BASE_REMINDER, frequency: 'biweekly' as const, createdAt: T0 };
    expect(shouldFireBiweekly(r, T0)).toBe(true);
    expect(shouldFireBiweekly(r, new Date(T0.getTime() + WEEK_MS))).toBe(false);
  });

  it('returns false before anchor date', () => {
    expect(shouldFireBiweekly(biweekly, new Date(T0.getTime() - 1000))).toBe(false);
  });
});

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

describe('shouldFireMonthlyNthWeekday', () => {
  const monthly = { ...BASE_REMINDER, frequency: 'monthly' as const, cronExpression: '0 9 * * 2' };

  it('returns true when monthlyNthWeekday is undefined', () => {
    const now = new Date('2025-01-07T09:00:00.000Z'); // Tuesday the 7th
    expect(shouldFireMonthlyNthWeekday({ ...monthly }, now)).toBe(true);
  });

  it('returns true on the 1st occurrence (day 1-7)', () => {
    const now = new Date('2025-01-07T09:00:00.000Z'); // Tuesday, 1st of month (day 7)
    expect(shouldFireMonthlyNthWeekday({ ...monthly, monthlyNthWeekday: 1 }, now)).toBe(true);
  });

  it('returns false on the 2nd occurrence when expecting 1st', () => {
    const now = new Date('2025-01-14T09:00:00.000Z'); // Tuesday, day 14 (2nd occurrence)
    expect(shouldFireMonthlyNthWeekday({ ...monthly, monthlyNthWeekday: 1 }, now)).toBe(false);
  });

  it('returns true on the 3rd occurrence (day 15-21)', () => {
    const now = new Date('2025-01-21T09:00:00.000Z'); // Tuesday, day 21 (3rd Tuesday)
    expect(shouldFireMonthlyNthWeekday({ ...monthly, monthlyNthWeekday: 3 }, now)).toBe(true);
  });

  it('returns false on wrong nth for 3rd occurrence', () => {
    const now = new Date('2025-01-21T09:00:00.000Z'); // 3rd Tuesday
    expect(shouldFireMonthlyNthWeekday({ ...monthly, monthlyNthWeekday: 2 }, now)).toBe(false);
  });

  it('returns true for reminder without monthlyNthWeekday regardless of frequency', () => {
    const now = new Date('2025-01-07T09:00:00.000Z');
    expect(shouldFireMonthlyNthWeekday({ ...BASE_REMINDER }, now)).toBe(true);
  });
});
