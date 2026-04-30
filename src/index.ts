import type { ReminderFrequency } from './reminder/Reminder.ts';

export type * from './reminder/Reminder.ts';

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(formatReminderMessage('Alice', 'Stand-up time!')).toBe(
 *   '@Alice — Reminder: Stand-up time!'
 * );
 * expect(formatReminderMessage('bob.smith', 'Submit report')).toBe(
 *   '@bob.smith — Reminder: Submit report'
 * );
 * ```
 */
export function formatReminderMessage(targetUser: string, message: string): string {
  return `@${targetUser} — Reminder: ${message}`;
}

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
