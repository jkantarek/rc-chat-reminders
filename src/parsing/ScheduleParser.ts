import type { ParseResult, ParsedSchedule, ParseError } from '../reminder/Reminder.ts';

const IN_PATTERN = /^in (\d+) (minute|minutes|hour|hours|day|days)$/i;
const AT_24H_PATTERN = /^at (\d{1,2}):(\d{2})$/;
const AT_12H_MIN_PATTERN = /^at (\d{1,2}):(\d{2})(am|pm)$/i;
const AT_12H_TOMORROW_PATTERN = /^at (\d{1,2})(am|pm) tomorrow$/i;
const AT_12H_NO_MIN_PATTERN = /^at (\d{1,2})(am|pm)$/i;
const AT_DATETIME_PATTERN = /^at (\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

interface DateTimeParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

type TwoCaptures = readonly [string, string];
type ThreeCaptures = readonly [string, string, string];
type FiveCaptures = readonly [string, string, string, string, string];
type Parser = (input: string, now: Date) => ParseResult<ParsedSchedule> | null;

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}
function to24h(h: number, period: string): number | null {
  if (h < 1 || h > 12) return null;
  return period.toLowerCase() === 'am' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
}
function getCaptures2(m: RegExpExecArray): TwoCaptures {
  return [String(m[1]), String(m[2])];
}
function getCaptures3(m: RegExpExecArray): ThreeCaptures {
  return [String(m[1]), String(m[2]), String(m[3])];
}
function getCaptures5(m: RegExpExecArray): FiveCaptures {
  return [String(m[1]), String(m[2]), String(m[3]), String(m[4]), String(m[5])];
}

function parseRelativeTime(amount: string, unit: string, now: Date): ParseResult<ParsedSchedule> {
  const n = parseInt(amount, 10);
  if (n <= 0) return err('Amount must be a positive number');
  const fireAt = new Date(now);
  const u = unit.toLowerCase();
  if (u.startsWith('m')) fireAt.setUTCMinutes(fireAt.getUTCMinutes() + n);
  else if (u.startsWith('h')) fireAt.setUTCHours(fireAt.getUTCHours() + n);
  else fireAt.setUTCDate(fireAt.getUTCDate() + n);
  return { kind: 'once', fireAt };
}
function parseTimeToday(h: number, m: number, now: Date): ParseResult<ParsedSchedule> {
  if (h < 0 || h > 23 || m < 0 || m > 59) return err('Invalid time value');
  const fireAt = new Date(now);
  fireAt.setUTCHours(h, m, 0, 0);
  if (fireAt.getTime() <= now.getTime()) fireAt.setUTCDate(fireAt.getUTCDate() + 1);
  return { kind: 'once', fireAt };
}
function parseTimeTomorrow(h: number, m: number, now: Date): ParseResult<ParsedSchedule> {
  const fireAt = new Date(now);
  fireAt.setUTCHours(h, m, 0, 0);
  fireAt.setUTCDate(fireAt.getUTCDate() + 1);
  return { kind: 'once', fireAt };
}
function isDateTimeRoundTrip(fireAt: Date, p: DateTimeParts, m: number): boolean {
  return (
    fireAt.getUTCFullYear() === p.year &&
    fireAt.getUTCMonth() === m &&
    fireAt.getUTCDate() === p.day &&
    fireAt.getUTCHours() === p.hour &&
    fireAt.getUTCMinutes() === p.minute
  );
}
function parseAbsoluteDateTime(p: DateTimeParts, now: Date): ParseResult<ParsedSchedule> {
  const m = p.month - 1;
  const fireAt = new Date(Date.UTC(p.year, m, p.day, p.hour, p.minute, 0, 0));
  if (!isDateTimeRoundTrip(fireAt, p, m)) return err('Invalid date or time');
  if (fireAt.getTime() <= now.getTime()) return err('Scheduled time must be in the future');
  return { kind: 'once', fireAt };
}

function parseEvery(input: string, _now: Date): ParseResult<ParsedSchedule> | null {
  return /^every /i.test(input) ? err('Recurring reminders are not yet supported') : null;
}
function parseRelative(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = IN_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures2(m);
  return parseRelativeTime(caps[0], caps[1], now);
}
function parseAbsolute(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = AT_DATETIME_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures5(m);
  const p = { year: +caps[0], month: +caps[1], day: +caps[2], hour: +caps[3], minute: +caps[4] };
  return parseAbsoluteDateTime(p, now);
}
function parse24h(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = AT_24H_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures2(m);
  return parseTimeToday(parseInt(caps[0], 10), parseInt(caps[1], 10), now);
}
function parse12hMin(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = AT_12H_MIN_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures3(m);
  const h = to24h(parseInt(caps[0], 10), caps[2]);
  if (h === null) return err('Invalid hour: must be 1–12');
  return parseTimeToday(h, parseInt(caps[1], 10), now);
}
function parse12hTomorrow(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = AT_12H_TOMORROW_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures2(m);
  const h = to24h(parseInt(caps[0], 10), caps[1]);
  if (h === null) return err('Invalid hour: must be 1–12');
  return parseTimeTomorrow(h, 0, now);
}
function parse12hNoMin(input: string, now: Date): ParseResult<ParsedSchedule> | null {
  const m = AT_12H_NO_MIN_PATTERN.exec(input);
  if (m === null) return null;
  const caps = getCaptures2(m);
  const h = to24h(parseInt(caps[0], 10), caps[1]);
  if (h === null) return err('Invalid hour: must be 1–12');
  return parseTimeToday(h, 0, now);
}

const PARSERS: readonly Parser[] = [
  parseEvery,
  parseRelative,
  parseAbsolute,
  parse24h,
  parse12hMin,
  parse12hTomorrow,
  parse12hNoMin,
];

/**
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 *
 * const r1 = parseSchedule('in 15 minutes', now);
 * expect(r1.kind).toBe('once');
 * if (r1.kind !== 'once') throw new Error('expected once');
 * expect(r1.fireAt).toEqual(new Date('2025-01-15T08:15:00.000Z'));
 *
 * const r2 = parseSchedule('in 2 hours', now);
 * expect(r2.kind).toBe('once');
 * if (r2.kind !== 'once') throw new Error('expected once');
 * expect(r2.fireAt).toEqual(new Date('2025-01-15T10:00:00.000Z'));
 *
 * const r3 = parseSchedule('in 1 day', now);
 * expect(r3.kind).toBe('once');
 * if (r3.kind !== 'once') throw new Error('expected once');
 * expect(r3.fireAt).toEqual(new Date('2025-01-16T08:00:00.000Z'));
 *
 * expect(parseSchedule('in 0 minutes', now).kind).toBe('error');
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 *
 * const r4 = parseSchedule('at 14:30', now);
 * expect(r4.kind).toBe('once');
 * if (r4.kind !== 'once') throw new Error('expected once');
 * expect(r4.fireAt).toEqual(new Date('2025-01-15T14:30:00.000Z'));
 *
 * const r5 = parseSchedule('at 3:30pm', now);
 * expect(r5.kind).toBe('once');
 * if (r5.kind !== 'once') throw new Error('expected once');
 * expect(r5.fireAt).toEqual(new Date('2025-01-15T15:30:00.000Z'));
 *
 * const r6 = parseSchedule('at 9am tomorrow', now);
 * expect(r6.kind).toBe('once');
 * if (r6.kind !== 'once') throw new Error('expected once');
 * expect(r6.fireAt).toEqual(new Date('2025-01-16T09:00:00.000Z'));
 *
 * const r7 = parseSchedule('at 3pm', now);
 * expect(r7.kind).toBe('once');
 * if (r7.kind !== 'once') throw new Error('expected once');
 * expect(r7.fireAt).toEqual(new Date('2025-01-15T15:00:00.000Z'));
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 *
 * const r8 = parseSchedule('at 2025-06-15 09:00', now);
 * expect(r8.kind).toBe('once');
 * if (r8.kind !== 'once') throw new Error('expected once');
 * expect(r8.fireAt).toEqual(new Date('2025-06-15T09:00:00.000Z'));
 *
 * expect(parseSchedule('at 08:00', now).kind).toBe('once');
 * expect(parseSchedule('at 2024-01-01 09:00', now).kind).toBe('error');
 * expect(parseSchedule('invalid input', now).kind).toBe('error');
 * expect(parseSchedule('every day at 9am', now).kind).toBe('error');
 * expect(parseSchedule('at 13am', now).kind).toBe('error');
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const now = new Date('2025-01-15T08:00:00.000Z');
 *
 * expect(parseSchedule('at 12am', now).kind).toBe('once');
 * expect(parseSchedule('at 12pm', now).kind).toBe('once');
 * expect(parseSchedule('at 24:00', now).kind).toBe('error');
 * expect(parseSchedule('at 13:30am', now).kind).toBe('error');
 * expect(parseSchedule('at 13am tomorrow', now).kind).toBe('error');
 * expect(parseSchedule('at 2025-02-30 09:00', now).kind).toBe('error');
 * ```
 */
export function parseSchedule(input: string, now: Date): ParseResult<ParsedSchedule> {
  const trimmed = input.trim();
  for (const parser of PARSERS) {
    const result = parser(trimmed, now);
    if (result !== null) return result;
  }
  return err(`Cannot parse schedule: "${input}". Use "in X minutes/hours/days" or "at HH:MM".`);
}
