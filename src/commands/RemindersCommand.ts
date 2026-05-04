import type {
  IHttp,
  IModify,
  IPersistence,
  IPersistenceRead,
  IRead,
  ISchedulerModify,
} from '@rocket.chat/apps-engine/definition/accessors';
import type {
  ISlashCommand,
  SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import type { Reminder } from '../reminder/Reminder.ts';
import { formatReminderList } from '../reminder/ReminderFormatter.ts';
import { replyEphemeral } from './replyEphemeral.ts';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';

interface ExecCtx {
  readonly read: IRead;
  readonly modify: IModify;
  readonly persis: IPersistence;
  readonly context: SlashCommandContext;
}

const repo = new ReminderRepository();

async function handleList(ctx: ExecCtx): Promise<void> {
  const reader = ctx.read.getPersistenceReader();
  const sender = ctx.context.getSender();
  const reminders = await repo.findByUser(reader, sender.id);
  const sorted = [...reminders].sort((a, b) => a.nextFireAt.getTime() - b.nextFireAt.getTime());
  await replyEphemeral(ctx.modify, ctx.context, formatReminderList(sorted));
}

async function cancelJobSafe(scheduler: ISchedulerModify, jobId: string): Promise<void> {
  try {
    await scheduler.cancelJob(jobId);
  } catch {
    /* idempotent */
  }
}

function cancelledMsg(r: Reminder): string {
  return `✅ Reminder cancelled: "${r.message}" [id: ${r.id}]`;
}

async function doCancel(ctx: ExecCtx, r: Reminder): Promise<void> {
  const reader = ctx.read.getPersistenceReader();
  if (r.scheduledJobId !== undefined) {
    await cancelJobSafe(ctx.modify.getScheduler(), r.scheduledJobId);
  }
  await repo.updateStatus(ctx.persis, reader, r.id, 'cancelled');
  await replyEphemeral(ctx.modify, ctx.context, cancelledMsg(r));
}

function notFoundMsg(id: string): string {
  return `❌ No active reminder found with id "${id}".`;
}

function alreadyCancelledMsg(r: Reminder): string {
  return `❌ Reminder "${r.message}" [id: ${r.id}] is already cancelled.`;
}

type CancelResult = { kind: 'ok'; reminder: Reminder } | { kind: 'err'; msg: string };

async function findCancel(p: IPersistenceRead, id: string, uid: string): Promise<CancelResult> {
  const r = await repo.findById(p, id);
  if (r === undefined) return { kind: 'err', msg: notFoundMsg(id) };
  if (r.createdBy !== uid) return { kind: 'err', msg: notFoundMsg(id) };
  if (r.status !== 'active') return { kind: 'err', msg: alreadyCancelledMsg(r) };
  return { kind: 'ok', reminder: r };
}

async function handleCancel(ctx: ExecCtx, id: string): Promise<void> {
  const p = ctx.read.getPersistenceReader();
  const result = await findCancel(p, id, ctx.context.getSender().id);
  if (result.kind === 'err') {
    await replyEphemeral(ctx.modify, ctx.context, result.msg);
    return;
  }
  await doCancel(ctx, result.reminder);
}

const HELP_TEXT = [
  'RC Chat Reminders — Commands:',
  '',
  '/remind <target> <message> <schedule>',
  '  target:   me | @username | #channel',
  '  schedule: in 15 minutes | at 3pm | every Monday at 9am | …',
  '',
  '/reminders             — list your active reminders',
  '/reminders cancel <id> — cancel a reminder',
  '/reminders help        — show this help',
].join('\n');

async function handleHelp(ctx: ExecCtx): Promise<void> {
  await replyEphemeral(ctx.modify, ctx.context, HELP_TEXT);
}

async function runRemindersCommand(ctx: ExecCtx, args: readonly string[]): Promise<void> {
  const [sub, id] = args;
  if (sub === 'cancel') return id !== undefined ? handleCancel(ctx, id) : handleHelp(ctx);
  return sub === 'help' ? handleHelp(ctx) : handleList(ctx);
}

export class RemindersCommand implements ISlashCommand {
  public readonly command = 'reminders';
  public readonly i18nParamsExample = 'reminders_command_params';
  public readonly i18nDescription = 'reminders_command_description';
  public readonly providesPreview = false;

  public async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    _http: IHttp,
    persis: IPersistence,
  ): Promise<void> {
    await runRemindersCommand({ read, modify, persis, context }, context.getArguments());
  }
}
