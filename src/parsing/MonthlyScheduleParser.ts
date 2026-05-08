import type { ParseResult, ParseError, RecurringScheduleResult } from '../reminder/Reminder.ts';

const MONTHLY_SIMPLE = /^monthly$/i;
const MONTHLY_ON_DAY = /^every month on the (\d{1,2})(?:st|nd|rd|th)?(?:\s+at\s+(.+))?$/i;
const MONTHLY_NTH_DOW =
  /^the (first|second|third|fourth|fifth) (monday|tuesday|wednesday|thursday|friday|saturday|sunday) of every month(?:\s+at\s+(.+))?$/i;

type DayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
type OrdinalName = 'first' | 'second' | 'third' | 'fourth' | 'fifth';

const DOW_MAP: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ORDINAL_MAP: Record<OrdinalName, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

interface HM {
  readonly h: number;
  readonly m: number;
}

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

function to24h(h: number, p: string): number | null {
  if (h < 1 || h > 12) return null;
  return p.toLowerCase() === 'am' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
}

function parseAmPm(s: string): HM | null {
  const m = /^(\d{1,2}):(\d{2})(am|pm)$/i.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[3]));
  return h !== null ? { h, m: parseInt(String(m[2]), 10) } : null;
}

function parseAmPmNoMin(s: string): HM | null {
  const m = /^(\d{1,2})(am|pm)$/i.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[2]));
  return h !== null ? { h, m: 0 } : null;
}

function parse24h(s: string): HM | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m !== null ? { h: parseInt(String(m[1]), 10), m: parseInt(String(m[2]), 10) } : null;
}

function parseHM(s: string): HM | null {
  return parseAmPm(s) ?? parseAmPmNoMin(s) ?? parse24h(s);
}

function resolveHM(timeStr: string | undefined): HM | ParseError {
  if (timeStr === undefined) return { h: 9, m: 0 };
  const hm = parseHM(timeStr);
  if (hm === null || hm.h > 23 || hm.m > 59) return err(`Cannot parse time: "${timeStr}"`);
  return hm;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseMonthlySimple(input: string): ParseResult<RecurringScheduleResult> | null {
  if (!MONTHLY_SIMPLE.test(input)) return null;
  return {
    kind: 'recurring',
    cronExpression: '0 9 1 * *',
    frequency: 'monthly',
    scheduleLabel: 'monthly on the 1st at 09:00',
  };
}

function makeMonthlyDayCron(hm: HM, day: number): RecurringScheduleResult {
  return {
    kind: 'recurring',
    cronExpression: `${String(hm.m)} ${String(hm.h)} ${String(day)} * *`,
    frequency: 'monthly',
    scheduleLabel: `every month on the ${String(day)} at ${pad2(hm.h)}:${pad2(hm.m)}`,
  };
}

function parseMonthlyOnDay(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = MONTHLY_ON_DAY.exec(input);
  if (m === null) return null;
  const day = parseInt(String(m[1]), 10);
  if (day < 1 || day > 31) return err(`Day must be 1–31: got ${String(day)}`);
  const hm = resolveHM(m[2]);
  return 'kind' in hm ? hm : makeMonthlyDayCron(hm, day);
}

function nthLabel(ord: string, day: string, hm: HM): string {
  return `the ${ord} ${capitalize(day)} of every month at ${pad2(hm.h)}:${pad2(hm.m)}`;
}

function nthCron(nth: number, dow: number, label: string, hm: HM): RecurringScheduleResult {
  return {
    kind: 'recurring',
    cronExpression: `${String(hm.m)} ${String(hm.h)} * * ${String(dow)}`,
    frequency: 'monthly',
    monthlyNthWeekday: nth,
    scheduleLabel: label,
  };
}

function parseMonthlyNthDow(input: string): ParseResult<RecurringScheduleResult> | null {
  const m = MONTHLY_NTH_DOW.exec(input);
  if (m === null) return null;
  const hm = resolveHM(m[3]);
  if ('kind' in hm) return hm;
  const ord = String(m[1]).toLowerCase();
  const day = String(m[2]).toLowerCase() as DayName;
  return nthCron(ORDINAL_MAP[ord as OrdinalName], DOW_MAP[day], nthLabel(ord, day, hm), hm);
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(parseMonthlySchedule('monthly')).toMatchObject({ kind: 'recurring', cronExpression: '0 9 1 * *', frequency: 'monthly', scheduleLabel: 'monthly on the 1st at 09:00' });
 * expect(parseMonthlySchedule('MONTHLY')).toMatchObject({ kind: 'recurring', frequency: 'monthly' });
 * expect(parseMonthlySchedule('not monthly')).toBeNull();
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(parseMonthlySchedule('every month on the 15')).toMatchObject({ kind: 'recurring', cronExpression: '0 9 15 * *', frequency: 'monthly' });
 * expect(parseMonthlySchedule('every month on the 15th')).toMatchObject({ kind: 'recurring', cronExpression: '0 9 15 * *' });
 * expect(parseMonthlySchedule('every month on the 1st at 9am')).toMatchObject({ kind: 'recurring', cronExpression: '0 9 1 * *', scheduleLabel: 'every month on the 1 at 09:00' });
 * expect(parseMonthlySchedule('every month on the 15 at 2:30pm')).toMatchObject({ kind: 'recurring', cronExpression: '30 14 15 * *' });
 * expect(parseMonthlySchedule('every month on the 15 at 12am')).toMatchObject({ kind: 'recurring', cronExpression: '0 0 15 * *' });
 * expect(parseMonthlySchedule('every month on the 15 at 12pm')).toMatchObject({ kind: 'recurring', cronExpression: '0 12 15 * *' });
 * expect(parseMonthlySchedule('every month on the 0')).toMatchObject({ kind: 'error' });
 * expect(parseMonthlySchedule('every month on the 15 at 25:00')).toMatchObject({ kind: 'error' });
 * expect(parseMonthlySchedule('every month on the 15 at 0:30am')).toMatchObject({ kind: 'error' });
 * expect(parseMonthlySchedule('every month on the 15 at 0am')).toMatchObject({ kind: 'error' });
 * expect(parseMonthlySchedule('every month on the 15 at badtime')).toMatchObject({ kind: 'error' });
 * ```
 *
 * @example
 * ```ts @import.meta.vitest
 * const r1 = parseMonthlySchedule('the third Tuesday of every month');
 * expect(r1).toMatchObject({ kind: 'recurring', cronExpression: '0 9 * * 2', frequency: 'monthly', monthlyNthWeekday: 3, scheduleLabel: 'the third Tuesday of every month at 09:00' });
 * const r2 = parseMonthlySchedule('the first Monday of every month at 10am');
 * expect(r2).toMatchObject({ kind: 'recurring', cronExpression: '0 10 * * 1', monthlyNthWeekday: 1, scheduleLabel: 'the first Monday of every month at 10:00' });
 * const r3 = parseMonthlySchedule('the fifth Saturday of every month at 14:30');
 * expect(r3).toMatchObject({ kind: 'recurring', cronExpression: '30 14 * * 6', monthlyNthWeekday: 5 });
 * expect(parseMonthlySchedule('the third Tuesday of every month at 25:00')).toMatchObject({ kind: 'error' });
 * expect(parseMonthlySchedule('the sixth Monday of every month')).toBeNull();
 * ```
 */
export function parseMonthlySchedule(input: string): ParseResult<RecurringScheduleResult> | null {
  return parseMonthlySimple(input) ?? parseMonthlyOnDay(input) ?? parseMonthlyNthDow(input);
}
