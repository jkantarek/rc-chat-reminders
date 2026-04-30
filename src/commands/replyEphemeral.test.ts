import { describe, it, expect } from 'vitest';
import type { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import type { IMessage } from '@rocket.chat/apps-engine/definition/messages';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { replyEphemeral } from './replyEphemeral.ts';

interface FakeBuilder {
  setRoom: (r: IRoom) => FakeBuilder;
  setText: (t: string) => FakeBuilder;
  getMessage: () => IMessage;
}

interface FakeNotifier {
  getMessageBuilder: () => FakeBuilder;
  notifyUser: (user: IUser, msg: IMessage) => Promise<void>;
}

interface FakeModify {
  getNotifier: () => FakeNotifier;
}

describe('replyEphemeral', () => {
  it('notifies the sender with the given text in the current room', async () => {
    const room = { id: 'room-1' } as unknown as IRoom;
    const sender = { id: 'user-1' } as unknown as IUser;
    let capturedUser: IUser | undefined;
    let capturedMessage: IMessage | undefined;
    let builtRoom: IRoom = room;
    let builtText = '';

    const fakeBuilder: FakeBuilder = {
      setRoom(r: IRoom): FakeBuilder {
        builtRoom = r;
        return fakeBuilder;
      },
      setText(t: string): FakeBuilder {
        builtText = t;
        return fakeBuilder;
      },
      getMessage(): IMessage {
        return { room: builtRoom, sender, text: builtText };
      },
    };

    const fakeNotifier: FakeNotifier = {
      getMessageBuilder(): FakeBuilder {
        return fakeBuilder;
      },
      notifyUser(user: IUser, msg: IMessage): Promise<void> {
        capturedUser = user;
        capturedMessage = msg;
        return Promise.resolve();
      },
    };

    const fakeModify: FakeModify = {
      getNotifier(): FakeNotifier {
        return fakeNotifier;
      },
    };

    const context = new SlashCommandContext(sender, room, []);
    await replyEphemeral(fakeModify as unknown as IModify, context, 'Hello!');

    expect(capturedUser).toBe(sender);
    expect(capturedMessage?.text).toBe('Hello!');
    expect(capturedMessage?.room).toBe(room);
  });
});
