import type {
  ParseResult,
  ParseError,
  RecurringScheduleResult,
  ReminderFrequency,
} from '../reminder/Reminder.ts';

const EVERY_DAY = /^every day at (.+)$/i;
const EVERY_WEEKDAY = /^every weekday at (.+)$/i;
const EVERY_DOW = /^every (monday|tuesday|wednesday|thursday|friday|saturday|sunday) at (.+)$/i;
const EVERY_MONTH = /^every month at (.+)$/i;

const AT_12H_NO_MIN = /^(\d{1,2})(am|pm)$/i;
const AT_12H_MIN = /^(\d{1,2}):(\d{2})(am|pm)$/i;
const AT_24H = /^(\d{1,2}):(\d{2})$/;

type DayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

const DOW_INDEX: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type RecurringParser = (input: string) => ParseResult<RecurringScheduleResult> | null;

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

function to24h(h: number, p: string): number | null {
  if (h < 1 || h > 12) return null;
  return p.toLowerCase() === 'am' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
}

function parseAm12(s: string): { readonly h: number; readonly m: number } | null {
  const m = AT_12H_NO_MIN.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[2]));
  return h !== null ? { h, m: 0 } : null;
}

function parseAm12Min(s: string): { readonly h: number; readonly m: number } | null {
  const m = AT_12H_MIN.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[3]));
  return h !== null ? { h, m: parseInt(String(m[2]), 10) } : null;
}

function parse24hTime(s: string): { readonly h: number; readonly m: number } | null {
  const m = AT_24H.exec(s);
  return m !== null ? { h: parseInt(String(m[1]), 10), m: parseInt(String(m[2]), 10) } : null;
}

function parseHourMin(s: string): { readonly h: number; readonly m: number } | null {
  return parseAm12(s) ?? parseAm12Min(s) ?? parse24hTime(s);
}

function isValidHM(hm: { readonly h: number; readonly m: number }): boolean {
  return hm.h <= 23 && hm.m <= 59;
}

type RecurFreq = Exclude<ReminderFrequency, 'once'>;
type RecurResult = RecurringScheduleResult;

function makeCron(min: number, h: number, d: string, w: string, f: RecurFreq): RecurResult {
  const cronExpression = `${String(min)} ${String(h)} ${d} * ${w}`;
  return { kind: 'recurring', cronExpression, frequency: f };
}

function resolveHM(timeStr: string): { readonly h: number; readonly m: number } | ParseError {
  const hm = parseHourMin(timeStr);
  if (hm === null || !isValidHM(hm)) return err(`Cannot parse time: "${timeStr}"`);
  return hm;
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

const RECURRING_PARSERS: readonly RecurringParser[] = [
  parseEveryDay,
  parseEveryWeekday,
  parseEveryDow,
  parseEveryMonth,
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
