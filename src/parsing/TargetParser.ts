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
 *
 * @example
 * ```ts @import.meta.vitest
 * const r3 = parseTarget('@alice');
 * expect(r3.kind).toBe('user');
 * if (r3.kind !== 'user') throw new Error('expected user');
 * expect(r3.username).toBe('alice');
 *
 * const r4 = parseTarget('#general');
 * expect(r4.kind).toBe('channel');
 * if (r4.kind !== 'channel') throw new Error('expected channel');
 * expect(r4.channelName).toBe('general');
 *
 * const r5 = parseTarget('foobar');
 * expect(r5.kind).toBe('error');
 * if (r5.kind !== 'error') throw new Error('expected error');
 * expect(r5.reason).toMatch(/unrecognised/i);
 * ```
 */
export function parseTarget(token: string): ParseResult<ParsedTarget> {
  if (token.toLowerCase() === 'me') return { kind: 'me' };
  if (token.startsWith('@')) return { kind: 'user', username: token.slice(1) };
  if (token.startsWith('#')) return { kind: 'channel', channelName: token.slice(1) };
  return err(`Unrecognised target: "${token}". Use "me", "@username", or "#channel".`);
}
