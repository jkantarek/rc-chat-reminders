import type { IRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { ParsedTarget, ParseError, TargetType } from '../reminder/Reminder.ts';

export interface ResolvedTarget {
  readonly targetType: TargetType;
  readonly targetId: string;
  readonly targetName: string;
}

function err(reason: string): ParseError {
  return { kind: 'error', reason };
}

function resolveMe(sender: IUser): Promise<ResolvedTarget> {
  return Promise.resolve({ targetType: 'me', targetId: sender.id, targetName: sender.username });
}

async function resolveUser(username: string, read: IRead): Promise<ResolvedTarget | ParseError> {
  const user = (await read.getUserReader().getByUsername(username)) as unknown as IUser | null;
  if (!user) return err(`Unknown user: @${username}`);
  return { targetType: 'user', targetId: user.id, targetName: username };
}

async function resolveChannel(
  channelName: string,
  read: IRead,
): Promise<ResolvedTarget | ParseError> {
  const room = await read.getRoomReader().getByName(channelName);
  if (!room) return err(`Unknown channel: #${channelName}`);
  return { targetType: 'channel', targetId: room.id, targetName: channelName };
}

export function resolveTarget(
  parsed: ParsedTarget,
  sender: IUser,
  read: IRead,
): Promise<ResolvedTarget | ParseError> {
  if (parsed.kind === 'me') return resolveMe(sender);
  if (parsed.kind === 'user') return resolveUser(parsed.username, read);
  return resolveChannel(parsed.channelName, read);
}
