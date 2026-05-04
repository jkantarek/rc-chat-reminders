import type {
  IHttp,
  IModify,
  IPersistence,
  IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import type {
  ISlashCommand,
  SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { ParsedCommand, ParseError, Reminder } from '../reminder/Reminder.ts';
import { formatConfirmation, formatError } from '../reminder/ReminderFormatter.ts';
import { parseRemindCommand } from '../parsing/RemindCommandParser.ts';
import { replyEphemeral } from './replyEphemeral.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import type { ResolvedTarget } from './TargetResolver.ts';
import { resolveTarget } from './TargetResolver.ts';
import type { RecurReminder } from './ReminderFactory.ts';
import { toReminder, toRecurringReminder, makeJob, makeRecurringJob } from './ReminderFactory.ts';

interface ExecCtx {
  readonly read: IRead;
  readonly modify: IModify;
  readonly persis: IPersistence;
  readonly context: SlashCommandContext;
}

const repo = new ReminderRepository();

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

async function dispatch(r: Reminder, ctx: ExecCtx): Promise<void> {
  await (r.frequency === 'once' ? createAndSchedule : createAndScheduleRecurring)(r, ctx);
}

function buildReminder(cmd: ParsedCommand, sender: IUser, target: ResolvedTarget): Reminder {
  const fields = { message: cmd.message, sender, target };
  const s = cmd.schedule;
  return s.kind === 'once' ? toReminder(s, fields) : toRecurringReminder(s, fields);
}

async function buildAndSchedule(cmd: ParsedCommand, ctx: ExecCtx): Promise<Reminder | ParseError> {
  const sender = ctx.context.getSender();
  const target = await resolveTarget(cmd.target, sender, ctx.read);
  if ('kind' in target) return target;
  const r = buildReminder(cmd, sender, target);
  await dispatch(r, ctx);
  return r;
}

async function handleCommand(cmd: ParsedCommand, ctx: ExecCtx): Promise<void> {
  const result = await buildAndSchedule(cmd, ctx);
  if ('kind' in result) {
    await replyEphemeral(ctx.modify, ctx.context, formatError(result.reason));
    return;
  }
  await replyEphemeral(ctx.modify, ctx.context, formatConfirmation(result));
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
  readonly i18nParamsExample = 'remind_command_params';
  readonly i18nDescription = 'remind_command_description';
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
