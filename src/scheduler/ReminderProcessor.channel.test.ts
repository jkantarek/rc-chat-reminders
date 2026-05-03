import { describe, it, expect } from 'vitest';
import type { IHttp } from '@rocket.chat/apps-engine/definition/accessors';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { Reminder } from '../reminder/Reminder.ts';
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

describe('ReminderProcessor – channel targets', () => {
  it('sends a message to a channel target', async () => {
    const channelRoom = { id: 'ch-001' } as unknown as IRoom;
    const { persis, reader } = makeStore();
    const channelReminder: Reminder = {
      ...BASE_REMINDER,
      targetType: 'channel',
      targetName: 'general',
      targetId: 'ch-001',
    };
    await new ReminderRepository().create(persis, channelReminder);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM, channelRoom),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(1);
  });

  it('does nothing when channel room is not found', async () => {
    const { persis, reader } = makeStore();
    const channelReminder: Reminder = {
      ...BASE_REMINDER,
      targetType: 'channel',
      targetName: 'unknown-channel',
      targetId: 'ch-999',
    };
    await new ReminderRepository().create(persis, channelReminder);
    const msgs: unknown[] = [];
    await new ReminderProcessor().processor(
      makeJobContext('rem-001'),
      makeRead(reader, APP_USER, ROOM),
      makeModify(msgs),
      {} as unknown as IHttp,
      persis,
    );
    expect(msgs).toHaveLength(0);
  });
});
