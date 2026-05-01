import type { ParseResult, ParsedTarget, ParseError } from '../reminder/Reminder.ts';

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const r1 = parseTarget('me');
 * expect(r1.kind).toBe('me');
 *
 * const r2 = parseTarget('unknown');
 * expect(r2.kind).toBe('error');
 * if (r2.kind !== 'error') throw new Error('expected error');
 * expect(r2.reason).toMatch(/unrecognised/i);
 * ```
 */
export function parseTarget(token: string): ParseResult<ParsedTarget> {
  if (token.toLowerCase() === 'me') return { kind: 'me' };
  return err(`Unrecognised target: "${token}". Use "me".`);
}
