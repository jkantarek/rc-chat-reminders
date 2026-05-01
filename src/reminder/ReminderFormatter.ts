import type { Reminder } from './Reminder.ts';

/**
 * @example
 * ```ts @import.meta.vitest
 * const reminder = {
 *   id: 'abc123',
 *   createdBy: 'user-1',
 *   createdAt: new Date('2025-01-15T08:00:00Z'),
 *   targetType: 'me' as const,
 *   targetId: 'user-1',
 *   targetName: 'me',
 *   message: 'Stand-up time',
 *   frequency: 'once' as const,
 *   nextFireAt: new Date('2025-01-15T09:00:00Z'),
 *   status: 'active' as const,
 * };
 *
 * const text = formatConfirmation(reminder);
 * expect(text).toContain('abc123');
 * expect(text).toContain('me');
 * expect(text).toContain('Stand-up time');
 * expect(text).toContain('2025-01-15');
 * ```
 */
export function formatConfirmation(reminder: Reminder): string {
  const when =
    reminder.fireAt?.toISOString() ?? reminder.cronExpression ?? reminder.nextFireAt.toISOString();
  return `✅ Reminder set [id: ${reminder.id}]:\n  Target: ${reminder.targetName}\n  Message: ${reminder.message}\n  When: ${when}`;
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const text = formatError('Schedule time is in the past');
 * expect(text).toMatch(/^❌/);
 * expect(text).toContain('Schedule time is in the past');
 * ```
 */
export function formatError(reason: string): string {
  return `❌ Could not set reminder: ${reason}`;
}
