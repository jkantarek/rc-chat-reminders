import type {
  IHttp,
  IModify,
  IPersistence,
  IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import type {
  IOnetimeSchedule,
  IRecurringSchedule,
} from '@rocket.chat/apps-engine/definition/scheduler';
import type {
  ISlashCommand,
  SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type {
  OneTimeSchedule,
  RecurringScheduleResult,
  ParsedCommand,
  Reminder,
} from '../reminder/Reminder.ts';
import { formatConfirmation, formatError } from '../reminder/ReminderFormatter.ts';
import { parseRemindCommand } from '../parsing/RemindCommandParser.ts';
import { replyEphemeral } from './replyEphemeral.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';

interface ExecCtx {
  readonly read: IRead;
  readonly modify: IModify;
  readonly persis: IPersistence;
  readonly context: SlashCommandContext;
}

const repo = new ReminderRepository();

function makeId(): string {
  return Date.now().toString(36);
}

function makeMeTarget(
  id: string,
  username: string,
): { targetType: 'me'; targetId: string; targetName: string } {
  return { targetType: 'me', targetId: id, targetName: username };
}

function makeBaseFields(
  id: string,
  senderId: string,
  message: string,
): Pick<Reminder, 'id' | 'createdBy' | 'createdAt' | 'message' | 'status'> {
  return { id, createdBy: senderId, createdAt: new Date(), message, status: 'active' };
}

function makeJob(reminder: Reminder): IOnetimeSchedule {
  return { id: 'reminder-fire', when: reminder.nextFireAt, data: { reminderId: reminder.id } };
}

type RecurReminder = Reminder & { readonly cronExpression: string };

function makeRecurringJob(reminder: RecurReminder): IRecurringSchedule {
  return {
    id: 'reminder-fire',
    interval: reminder.cronExpression,
    skipImmediate: true,
    data: { reminderId: reminder.id },
  };
}

function toReminder(s: OneTimeSchedule, message: string, sender: IUser): Reminder {
  const id = makeId();
  return {
    ...makeBaseFields(id, sender.id, message),
    ...makeMeTarget(sender.id, sender.username),
    frequency: 'once',
    fireAt: s.fireAt,
    nextFireAt: s.fireAt,
  };
}

function toRecurringReminder(s: RecurringScheduleResult, message: string, sender: IUser): Reminder {
  const id = makeId();
  return {
    ...makeBaseFields(id, sender.id, message),
    ...makeMeTarget(sender.id, sender.username),
    frequency: s.frequency,
    cronExpression: s.cronExpression,
    nextFireAt: new Date(),
  };
}

async function createAndSchedule(reminder: Reminder, ctx: ExecCtx): Promise<void> {
  await repo.create(ctx.persis, reminder);
  const scheduler = ctx.modify.getScheduler();
  const jobId = await scheduler.scheduleOnce(makeJob(reminder));
  const reader = ctx.read.getPersistenceReader();
  await repo.updateJobId(ctx.persis, reader, reminder.id, jobId ?? reminder.id);
}

async function createAndScheduleRecurring(reminder: Reminder, ctx: ExecCtx): Promise<void> {
  await repo.create(ctx.persis, reminder);
  const scheduler = ctx.modify.getScheduler();
  const recur = reminder as RecurReminder;
  const jobId = await scheduler.scheduleRecurring(makeRecurringJob(recur));
  const reader = ctx.read.getPersistenceReader();
  await repo.updateJobId(ctx.persis, reader, reminder.id, jobId ?? reminder.id);
}

async function buildAndSchedule(cmd: ParsedCommand, ctx: ExecCtx): Promise<Reminder> {
  const s = cmd.schedule;
  const u = ctx.context.getSender();
  const m = cmd.message;
  const r = s.kind === 'once' ? toReminder(s, m, u) : toRecurringReminder(s, m, u);
  await (s.kind === 'once' ? createAndSchedule : createAndScheduleRecurring)(r, ctx);
  return r;
}

async function handleCommand(cmd: ParsedCommand, ctx: ExecCtx): Promise<void> {
  const reminder = await buildAndSchedule(cmd, ctx);
  await replyEphemeral(ctx.modify, ctx.context, formatConfirmation(reminder));
}

async function runRemindCommand(ctx: ExecCtx): Promise<void> {
  const args = ctx.context.getArguments();
  const result = parseRemindCommand(args, new Date());
  if ('kind' in result) {
    await replyEphemeral(ctx.modify, ctx.context, formatError(result.reason));
    return;
  }
  await handleCommand(result, ctx);
}

export class RemindCommand implements ISlashCommand {
  readonly command = 'remind';
  readonly i18nParamsExample = '';
  readonly i18nDescription = '';
  readonly providesPreview = false;

  async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    _http: IHttp,
    persis: IPersistence,
  ): Promise<void> {
    await runRemindCommand({ read, modify, persis, context });
  }
}
