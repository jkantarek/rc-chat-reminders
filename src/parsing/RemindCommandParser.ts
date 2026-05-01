import type {
  ParseResult,
  ParsedCommand,
  ParseError,
  ParsedSchedule,
  ParsedTarget,
} from '../reminder/Reminder.ts';
import { parseSchedule } from './ScheduleParser.ts';
import { parseTarget } from './TargetParser.ts';

const SCHEDULE_KEYWORDS = new Set(['in', 'at']);

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

function isRecurring(tokens: readonly string[]): boolean {
  return tokens.some((t) => t.toLowerCase() === 'every');
}

function findSplitIndex(tokens: readonly string[], now: Date): number | ParseError {
  if (isRecurring(tokens)) return err('Recurring reminders are not yet supported');
  for (let i = tokens.length - 1; i >= 1; i--) {
    const token = tokens[i]?.toLowerCase();
    if (token === undefined || !SCHEDULE_KEYWORDS.has(token)) continue;
    if (parseSchedule(tokens.slice(i).join(' '), now).kind !== 'error') return i;
  }
  return err('No valid schedule found in command');
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
 * expect(rec).toMatchObject({ kind: 'error', reason: expect.stringContaining('Recurring') });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 * expect(parseRemindCommand(['me', 'Stand-up', 'tomorrow'], now)).toMatchObject({ kind: 'error' });
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
