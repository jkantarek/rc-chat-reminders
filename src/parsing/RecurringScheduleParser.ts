import type {
  ParseResult,
  ParseError,
  RecurringScheduleResult,
  ReminderFrequency,
} from '../reminder/Reminder.ts';
import { type DayName, DOW_INDEX, resolveHM, pad2, capitalize } from './TimeParser.ts';

const EVERY_DAY = /^every day at (.+)$/i;
const EVERY_WEEKDAY = /^every weekday at (.+)$/i;
const EVERY_DOW = /^every (monday|tuesday|wednesday|thursday|friday|saturday|sunday) at (.+)$/i;
const EVERY_MONTH = /^every month at (.+)$/i;
const EVERY_OTHER_WEEK_DOW =
  /^every other week on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: at (.+))?$/i;

type RecurringParser = (input: string) => ParseResult<RecurringScheduleResult> | null;

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

type RecurFreq = Exclude<ReminderFrequency, 'once'>;
type RecurResult = RecurringScheduleResult;

function makeCron(min: number, h: number, d: string, w: string, f: RecurFreq): RecurResult {
  const cronExpression = `${String(min)} ${String(h)} ${d} * ${w}`;
  return { kind: 'recurring', cronExpression, frequency: f };
}

function parseEveryDay(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = EVERY_DAY.exec(input);
  if (m === null) return null;
  const hm = resolveHM(String(m[1]));
  return 'kind' in hm ? hm : makeCron(hm.m, hm.h, '*', '*', 'daily');
}

function parseEveryWeekday(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = EVERY_WEEKDAY.exec(input);
  if (m === null) return null;
  const hm = resolveHM(String(m[1]));
  return 'kind' in hm ? hm : makeCron(hm.m, hm.h, '*', '1-5', 'cron');
}

function parseEveryDow(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = EVERY_DOW.exec(input);
  if (m === null) return null;
  const dayName = String(m[1]).toLowerCase() as DayName;
  const dow = DOW_INDEX[dayName];
  const hm = resolveHM(String(m[2]));
  return 'kind' in hm ? hm : makeCron(hm.m, hm.h, '*', String(dow), 'weekly');
}

function parseEveryMonth(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = EVERY_MONTH.exec(input);
  if (m === null) return null;
  const hm = resolveHM(String(m[1]));
  return 'kind' in hm ? hm : makeCron(hm.m, hm.h, '1', '*', 'monthly');
}

function parseEveryOtherWeekDow(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = EVERY_OTHER_WEEK_DOW.exec(input);
  if (m === null) return null;
  const dayName = String(m[1]).toLowerCase() as DayName;
  const hm = resolveHM(m[2] ?? '06:00');
  if ('kind' in hm) return hm;
  const dow = DOW_INDEX[dayName];
  const label = `every other week on ${capitalize(dayName)} at ${pad2(hm.h)}:${pad2(hm.m)}`;
  return { ...makeCron(hm.m, hm.h, '*', String(dow), 'biweekly'), scheduleLabel: label };
}

const RECURRING_PARSERS: readonly RecurringParser[] = [
  parseEveryDay,
  parseEveryWeekday,
  parseEveryDow,
  parseEveryMonth,
  parseEveryOtherWeekDow,
];

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(parseRecurring('every day at 9:00am')).toMatchObject({ kind: 'recurring', cronExpression: '0 9 * * *' });
 * expect(parseRecurring('every day at 5:30pm')).toMatchObject({ kind: 'recurring', cronExpression: '30 17 * * *' });
 * expect(parseRecurring('every day at 12am')).toMatchObject({ kind: 'recurring', cronExpression: '0 0 * * *' });
 * expect(parseRecurring('every day at 12pm')).toMatchObject({ kind: 'recurring', cronExpression: '0 12 * * *' });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(parseRecurring('in 5 minutes')).toBeNull();
 * expect(parseRecurring('every day at 0am')).toMatchObject({ kind: 'error' });
 * expect(parseRecurring('every day at 13:30am')).toMatchObject({ kind: 'error' });
 * expect(parseRecurring('every day at 10:70')).toMatchObject({ kind: 'error' });
 * expect(parseRecurring('every weekday at 0am')).toMatchObject({ kind: 'error' });
 * expect(parseRecurring('every Monday at 0am')).toMatchObject({ kind: 'error' });
 * expect(parseRecurring('every month at 0am')).toMatchObject({ kind: 'error' });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const r1 = parseRecurring('every other week on monday');
 * expect(r1).toMatchObject({ kind: 'recurring', frequency: 'biweekly', scheduleLabel: 'every other week on Monday at 06:00', cronExpression: '0 6 * * 1' });
 * const r2 = parseRecurring('every other week on friday at 9am');
 * expect(r2).toMatchObject({ kind: 'recurring', frequency: 'biweekly', scheduleLabel: 'every other week on Friday at 09:00', cronExpression: '0 9 * * 5' });
 * const r3 = parseRecurring('every other week on monday at 25:00');
 * expect(r3).toMatchObject({ kind: 'error', reason: /Cannot parse time/ });
 * ```
 */
export function parseRecurring(input: string): ParseResult<RecurringScheduleResult> | null {
  if (!/^every /i.test(input)) return null;
  for (const parser of RECURRING_PARSERS) {
    const result = parser(input);
    if (result !== null) return result;
  }
  return err(`Cannot parse recurring schedule: "${input}"`);
}
