import type {
  ParseResult,
  ParsedCommand,
  ParseError,
  ParsedSchedule,
  ParsedTarget,
} from '../reminder/Reminder.ts';
import { parseSchedule } from './ScheduleParser.ts';
import { parseTarget } from './TargetParser.ts';

const SCHEDULE_KEYWORDS = new Set(['in', 'at', 'monthly']);

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

function findRecurringIndex(tokens: readonly string[], now: Date): number | null {
  for (let i = tokens.length - 1; i >= 1; i--) {
    if (tokens[i]?.toLowerCase() !== 'every') continue;
    if (parseSchedule(tokens.slice(i).join(' '), now).kind !== 'error') return i;
  }
  return null;
}

function findKeywordIndex(tokens: readonly string[], now: Date): number | null {
  for (let i = tokens.length - 1; i >= 1; i--) {
    const token = tokens[i]?.toLowerCase();
    if (token === undefined || !SCHEDULE_KEYWORDS.has(token)) continue;
    if (parseSchedule(tokens.slice(i).join(' '), now).kind !== 'error') return i;
  }
  return null;
}

function findMonthlyNthIndex(tokens: readonly string[], now: Date): number | null {
  for (let i = tokens.length - 6; i >= 1; i--) {
    if (tokens[i]?.toLowerCase() !== 'the') continue;
    const s = parseSchedule(tokens.slice(i).join(' '), now);
    if (s.kind !== 'error') return i;
  }
  return null;
}

function findSplitIndex(tokens: readonly string[], now: Date): number | ParseError {
  const idx =
    findMonthlyNthIndex(tokens, now) ??
    findRecurringIndex(tokens, now) ??
    findKeywordIndex(tokens, now);
  return idx ?? err('No valid schedule found in command');
}

function parseCommand(
  target: ParsedTarget,
  rest: readonly string[],
  now: Date,
): ParseResult<ParsedCommand> {
  const idxOrErr = findSplitIndex(rest, now);
  if (typeof idxOrErr !== 'number') return idxOrErr;
  const schedule = parseSchedule(rest.slice(idxOrErr).join(' '), now) as ParsedSchedule;
  return { target, message: rest.slice(0, idxOrErr).join(' '), schedule };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * const r1 = parseRemindCommand(['me', 'Stand-up', 'in', '15', 'minutes'], now);
 * expect(r1).toMatchObject({ target: { kind: 'me' }, message: 'Stand-up', schedule: { kind: 'once' } });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * const r2 = parseRemindCommand(['me', 'check', 'in', 'with', 'Alice', 'at', '3pm'], now);
 * expect(r2).toMatchObject({ message: 'check in with Alice', schedule: { kind: 'once' } });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * expect(parseRemindCommand(['me'], now)).toMatchObject({ kind: 'error' });
 * const rec = parseRemindCommand(['me', 'Stand-up', 'every', 'day', 'at', '9am'], now);
 * expect(rec).toMatchObject({ message: 'Stand-up', schedule: { kind: 'recurring', cronExpression: '0 9 * * *' } });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * expect(parseRemindCommand(['me', 'Stand-up', 'tomorrow'], now)).toMatchObject({ kind: 'error' });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * expect(parseRemindCommand([], now)).toMatchObject({ kind: 'error' });
 * expect(parseRemindCommand(['nobody', 'Msg', 'in', '5', 'minutes'], now)).toMatchObject({ kind: 'error' });
 * const r = parseRemindCommand(['me', 'Stand-up', 'every', 'morning', 'in', '5', 'minutes'], now);
 * expect(r).toMatchObject({ message: 'Stand-up every morning', schedule: { kind: 'once' } });
 * expect(parseRemindCommand(['me', 'Stand-up', 'at', 'lunchtime'], now)).toMatchObject({ kind: 'error' });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * const m1 = parseRemindCommand(['me', 'Report', 'monthly'], now);
 * expect(m1).toMatchObject({ message: 'Report', schedule: { kind: 'recurring', cronExpression: '0 9 1 * *' } });
 * const m2 = parseRemindCommand(['me', 'Invoice', 'every', 'month', 'on', 'the', '15th'], now);
 * expect(m2).toMatchObject({ message: 'Invoice', schedule: { kind: 'recurring', cronExpression: '0 9 15 * *' } });
 * const m3 = parseRemindCommand(['me', 'Sync', 'the', 'third', 'Tuesday', 'of', 'every', 'month'], now);
 * expect(m3).toMatchObject({ message: 'Sync', schedule: { kind: 'recurring', monthlyNthWeekday: 3 } });
 * const m4 = parseRemindCommand(['me', 'Send', 'report', 'the', 'first', 'Monday', 'of', 'every', 'month', 'at', '9am'], now);
 * expect(m4).toMatchObject({ message: 'Send report', schedule: { kind: 'recurring', monthlyNthWeekday: 1, cronExpression: '0 9 * * 1' } });
 * const m5 = parseRemindCommand(['me', 'Update', 'the', 'quarterly', 'report', 'and', 'budget', 'monthly'], now);
 * expect(m5).toMatchObject({ message: 'Update the quarterly report and budget', schedule: { kind: 'recurring', cronExpression: '0 9 1 * *' } });
 * ```
 */
export function parseRemindCommand(args: readonly string[], now: Date): ParseResult<ParsedCommand> {
  const [first, ...rest] = args;
  if (first === undefined || rest.length < 2)
    return err('Usage: /remind <target> <message> <schedule>');
  const target = parseTarget(first);
  if (target.kind === 'error') return target;
  return parseCommand(target, rest, now);
}
