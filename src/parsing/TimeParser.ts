import type { ParseError } from '../reminder/Reminder.ts';

export type DayName =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export const DOW_INDEX: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface HourMin {
  readonly h: number;
  readonly m: number;
}

const AT_12H_MIN = /^(\d{1,2}):(\d{2})(am|pm)$/i;
const AT_12H_NO_MIN = /^(\d{1,2})(am|pm)$/i;
const AT_24H = /^(\d{1,2}):(\d{2})$/;

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

export function to24h(h: number, p: string): number | null {
  if (h < 1 || h > 12) return null;
  return p.toLowerCase() === 'am' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
}

function parseAmPmMin(s: string): HourMin | null {
  const m = AT_12H_MIN.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[3]));
  return h !== null ? { h, m: parseInt(String(m[2]), 10) } : null;
}

function parseAmPmNoMin(s: string): HourMin | null {
  const m = AT_12H_NO_MIN.exec(s);
  if (m === null) return null;
  const h = to24h(parseInt(String(m[1]), 10), String(m[2]));
  return h !== null ? { h, m: 0 } : null;
}

function parse24hMin(s: string): HourMin | null {
  const m = AT_24H.exec(s);
  return m !== null ? { h: parseInt(String(m[1]), 10), m: parseInt(String(m[2]), 10) } : null;
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(parseHourMin('9am')).toEqual({ h: 9, m: 0 });
 * expect(parseHourMin('2:30pm')).toEqual({ h: 14, m: 30 });
 * expect(parseHourMin('14:30')).toEqual({ h: 14, m: 30 });
 * expect(parseHourMin('12am')).toEqual({ h: 0, m: 0 });
 * expect(parseHourMin('12pm')).toEqual({ h: 12, m: 0 });
 * expect(parseHourMin('0am')).toBeNull();
 * expect(parseHourMin('badtime')).toBeNull();
 * ```
 */
export function parseHourMin(s: string): HourMin | null {
  return parseAmPmMin(s) ?? parseAmPmNoMin(s) ?? parse24hMin(s);
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(resolveHM('9am')).toEqual({ h: 9, m: 0 });
 * expect(resolveHM('14:30')).toEqual({ h: 14, m: 30 });
 * expect(resolveHM('badtime')).toMatchObject({ kind: 'error' });
 * expect(resolveHM('25:00')).toMatchObject({ kind: 'error' });
 * expect(resolveHM('10:70')).toMatchObject({ kind: 'error' });
 * ```
 */
export function resolveHM(timeStr: string): HourMin | ParseError {
  const hm = parseHourMin(timeStr);
  if (hm === null || hm.h > 23 || hm.m > 59) return err(`Cannot parse time: "${timeStr}"`);
  return hm;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
