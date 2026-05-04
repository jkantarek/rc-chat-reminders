import type {
  IRead,
  IModify,
  IHttp,
  IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { IProcessor, IJobContext } from '@rocket.chat/apps-engine/definition/scheduler';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { Reminder } from '../reminder/Reminder.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';

interface FireContext {
  readonly read: IRead;
  readonly modify: IModify;
  readonly persis: IPersistence;
}

const repo = new ReminderRepository();

function fetchReminder(ctx: FireContext, reminderId: string): Promise<Reminder | undefined> {
  return repo.findById(ctx.read.getPersistenceReader(), reminderId);
}

function resolveRoom(reminder: Reminder, appUser: IUser, read: IRead): Promise<IRoom | undefined> {
  if (reminder.targetType === 'channel') {
    return read.getRoomReader().getByName(reminder.targetName);
  }
  return read.getRoomReader().getDirectByUsernames([appUser.username, reminder.targetName]);
}

async function sendMessage(
  room: IRoom,
  appUser: IUser,
  text: string,
  modify: IModify,
): Promise<void> {
  const creator = modify.getCreator();
  await creator.finish(creator.startMessage().setRoom(room).setSender(appUser).setText(text));
}

async function updateOnce(reminder: Reminder, ctx: FireContext): Promise<void> {
  if (reminder.frequency !== 'once') return;
  await repo.updateStatus(ctx.persis, ctx.read.getPersistenceReader(), reminder.id, 'completed');
}

async function fireReminder(
  reminder: Reminder,
  room: IRoom,
  appUser: IUser,
  ctx: FireContext,
): Promise<void> {
  await sendMessage(room, appUser, reminder.message, ctx.modify);
  await updateOnce(reminder, ctx);
}

export function shouldFireBiweekly(reminder: Reminder, now: Date): boolean {
  if (reminder.frequency !== 'biweekly') return true;
  const anchor = reminder.biweeklyAnchorDate ?? reminder.createdAt;
  const ms = now.getTime() - anchor.getTime();
  return ms >= 0 && Math.floor(ms / 604_800_000) % 2 === 0;
}

async function processReminder(jobContext: IJobContext, ctx: FireContext): Promise<void> {
  const { reminderId } = jobContext as unknown as { reminderId: string };
  const reminder = await fetchReminder(ctx, reminderId);
  if (reminder === undefined || !shouldFireBiweekly(reminder, new Date())) return;
  const appUser = await ctx.read.getUserReader().getAppUser();
  if (appUser === undefined) return;
  const room = await resolveRoom(reminder, appUser, ctx.read);
  if (room === undefined) return;
  await fireReminder(reminder, room, appUser, ctx);
}

export class ReminderProcessor implements IProcessor {
  public readonly id = 'reminder-fire';

  async processor(
    jobContext: IJobContext,
    read: IRead,
    modify: IModify,
    _http: IHttp,
    persis: IPersistence,
  ): Promise<void> {
    await processReminder(jobContext, { read, modify, persis });
  }
}
