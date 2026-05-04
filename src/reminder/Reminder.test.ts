import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Reminder, ReminderFrequency } from './Reminder.ts';

describe('Reminder type contract — biweekly extension', () => {
  it('biweeklyAnchorDate and scheduleLabel are present on Reminder', () => {
    const r: Reminder = {
      id: 'r1',
      createdBy: 'user-1',
      createdAt: new Date(),
      targetType: 'me' as const,
      targetId: 'user-1',
      targetName: 'me',
      message: 'test',
      frequency: 'biweekly',
      nextFireAt: new Date(),
      status: 'active' as const,
      biweeklyAnchorDate: new Date(),
    };
    expectTypeOf(r.scheduleLabel).toEqualTypeOf<string | undefined>();
  });

  it('biweekly is assignable to ReminderFrequency', () => {
    const f: ReminderFrequency = 'biweekly';
    expect(f).toBe('biweekly');
  });
});
