import { describe, it, expect } from 'vitest';
import type { IHttp } from '@rocket.chat/apps-engine/definition/accessors';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import { ReminderProcessor } from './ReminderProcessor.ts';
import {
  makeJobContext,
  makeStore,
  makeModify,
  makeRead,
  APP_USER,
  ROOM,
  BASE_REMINDER,
} from './ReminderProcessor.test-utils.ts';

describe('ReminderProcessor', () => {
  it('sends a message and completes once-reminder', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(1);
    expect((await new ReminderRepository().findById(reader, 'rem-001'))?.status).toBe('completed');
  });
  it('does nothing when reminder is not found', async () => {
    const { persis, reader } = makeStore();
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('unknown-id'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(0);
  });
  it('does nothing when app user is not found', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, BASE_REMINDER);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, undefined, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(0);
  });
  it('sends message but keeps status active for non-once reminder', async () => {
    const { persis, reader } = makeStore();
    await new ReminderRepository().create(persis, { ...BASE_REMINDER, frequency: 'daily' });
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(1);
    expect((await new ReminderRepository().findById(reader, 'rem-001'))?.status).toBe('active');
  });
});
