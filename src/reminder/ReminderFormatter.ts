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

function formatSchedule(r: Reminder): string {
  if (r.frequency === 'once')
    return (r.fireAt ?? r.nextFireAt).toISOString().slice(0, 16).replace('T', ' ');
  return r.cronExpression ?? r.nextFireAt.toISOString().slice(0, 16).replace('T', ' ');
}
function formatFreq(r: Reminder): string {
  if (r.frequency === 'once') return '(once)';
  return `(next: ${r.nextFireAt.toISOString().slice(0, 16).replace('T', ' ')})`;
}
function formatListItem(r: Reminder, i: number): string {
  return `#${String(i + 1)}  [id: ${r.id}]  ${r.targetName}  "${r.message}"  — ${formatSchedule(r)}  ${formatFreq(r)}`;
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const r = {
 *   id: 'abc123', createdBy: 'u1', createdAt: new Date(), targetType: 'me' as const,
 *   targetId: 'u1', targetName: 'me', message: 'Stand-up', frequency: 'once' as const,
 *   fireAt: new Date('2025-01-15T09:00:00Z'), nextFireAt: new Date('2025-01-15T09:00:00Z'),
 *   status: 'active' as const,
 * };
 * const text = formatReminderList([r]);
 * expect(text).toContain('abc123');
 * expect(text).toContain('me');
 * expect(text).toContain('Stand-up');
 * expect(text).toContain('2025-01-15');
 * expect(text).toContain('(once)');
 * const noFireAt = { ...r, fireAt: undefined };
 * expect(formatReminderList([noFireAt])).toContain('2025-01-15');
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const text = formatReminderList([]);
 * expect(text).toContain('no active reminders');
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const rec = {
 *   id: 'rec1', createdBy: 'u1', createdAt: new Date(), targetType: 'me' as const,
 *   targetId: 'u1', targetName: 'me', message: 'Daily sync', frequency: 'daily' as const,
 *   cronExpression: '0 9 * * *', nextFireAt: new Date('2025-01-16T09:00:00Z'),
 *   status: 'active' as const,
 * };
 * const t = formatReminderList([rec]);
 * expect(t).toContain('0 9 * * *');
 * expect(t).toContain('(next:');
 * const noExpr = { ...rec, cronExpression: undefined };
 * expect(formatReminderList([noExpr])).toContain('2025-01-16');
 * ```
 */
export function formatReminderList(reminders: Reminder[]): string {
  if (reminders.length === 0) return 'You have no active reminders. Use /remind to create one.';
  const items = reminders.map(formatListItem).join('\n');
  return `📋 Your active reminders:\n\n${items}\n\nTo cancel: /reminders cancel <id>`;
}
