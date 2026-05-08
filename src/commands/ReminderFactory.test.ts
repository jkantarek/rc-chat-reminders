import { describe, it, expect } from 'vitest';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { RecurringScheduleResult } from '../reminder/Reminder.ts';
import { toRecurringReminder } from './ReminderFactory.ts';
import type { ReminderFields } from './ReminderFactory.ts';

const SENDER = { id: 'user-1', username: 'alice' } as unknown as IUser;
const FIELDS: ReminderFields = {
  message: 'Stand-up',
  sender: SENDER,
  target: { targetType: 'me', targetId: 'user-1', targetName: 'me' },
};

describe('ReminderFactory.toRecurringReminder – biweekly', () => {
  it('sets biweeklyAnchorDate to a Monday for a Monday biweekly cron', () => {
    const s: RecurringScheduleResult = {
      kind: 'recurring',
      frequency: 'biweekly',
      cronExpression: '0 6 * * 1',
      scheduleLabel: 'every other week on Monday at 06:00',
    };
    const r = toRecurringReminder(s, FIELDS);
    expect(r.biweeklyAnchorDate).toBeInstanceOf(Date);
    expect(r.biweeklyAnchorDate?.getUTCDay()).toBe(1);
    expect(r.scheduleLabel).toBe('every other week on Monday at 06:00');
  });

  it('does not set biweeklyAnchorDate for non-biweekly reminder', () => {
    const s: RecurringScheduleResult = {
      kind: 'recurring',
      frequency: 'daily',
      cronExpression: '0 9 * * *',
    };
    const r = toRecurringReminder(s, FIELDS);
    expect(r.biweeklyAnchorDate).toBeUndefined();
    expect(r.scheduleLabel).toBeUndefined();
  });

  it('carries scheduleLabel for non-biweekly reminder when set', () => {
    const s: RecurringScheduleResult = {
      kind: 'recurring',
      frequency: 'weekly',
      cronExpression: '0 9 * * 1',
      scheduleLabel: 'every Monday at 09:00',
    };
    const r = toRecurringReminder(s, FIELDS);
    expect(r.scheduleLabel).toBe('every Monday at 09:00');
    expect(r.biweeklyAnchorDate).toBeUndefined();
  });

  it('carries monthlyNthWeekday for monthly nth weekday reminder', () => {
    const s: RecurringScheduleResult = {
      kind: 'recurring',
      frequency: 'monthly',
      cronExpression: '0 9 * * 2',
      monthlyNthWeekday: 3,
      scheduleLabel: 'the third Tuesday of every month at 09:00',
    };
    const r = toRecurringReminder(s, FIELDS);
    expect(r.monthlyNthWeekday).toBe(3);
    expect(r.scheduleLabel).toBe('the third Tuesday of every month at 09:00');
  });
});
