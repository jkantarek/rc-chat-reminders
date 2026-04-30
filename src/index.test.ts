import { describe, it, expect } from 'vitest';
import { formatReminderMessage, isValidFrequency } from './index.ts';

describe('formatReminderMessage', () => {
  it('formats a mention and message for the target user', () => {
    expect(formatReminderMessage('Alice', 'Stand-up time!')).toBe(
      '@Alice — Reminder: Stand-up time!',
    );
  });

  it('handles usernames with dots', () => {
    expect(formatReminderMessage('bob.smith', 'Submit report')).toBe(
      '@bob.smith — Reminder: Submit report',
    );
  });
});

describe('isValidFrequency', () => {
  it('accepts all valid frequency values', () => {
    expect(isValidFrequency('once')).toBe(true);
    expect(isValidFrequency('daily')).toBe(true);
    expect(isValidFrequency('weekly')).toBe(true);
    expect(isValidFrequency('monthly')).toBe(true);
  });

  it('rejects unknown frequency values', () => {
    expect(isValidFrequency('hourly')).toBe(false);
    expect(isValidFrequency('')).toBe(false);
    expect(isValidFrequency('DAILY')).toBe(false);
  });
});
