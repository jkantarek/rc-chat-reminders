export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  targetUser: string;
  message: string;
  scheduledAt: Date;
  frequency: ReminderFrequency;
  createdBy: string;
}

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
 * expect(isValidFrequency('hourly')).toBe(false);
 * expect(isValidFrequency('')).toBe(false);
 * ```
 */
export function isValidFrequency(value: string): value is ReminderFrequency {
  return ['once', 'daily', 'weekly', 'monthly'].includes(value);
}
