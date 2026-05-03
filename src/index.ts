import type { ReminderFrequency } from './reminder/Reminder.ts';

export type * from './reminder/Reminder.ts';
export { formatReminderMessage } from './reminder/ReminderFormatter.ts';

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(isValidFrequency('once')).toBe(true);
 * expect(isValidFrequency('weekly')).toBe(true);
 * expect(isValidFrequency('cron')).toBe(true);
 * expect(isValidFrequency('hourly')).toBe(false);
 * expect(isValidFrequency('')).toBe(false);
 * ```
 */
export function isValidFrequency(value: string): value is ReminderFrequency {
  return ['once', 'daily', 'weekly', 'monthly', 'cron'].includes(value);
}
