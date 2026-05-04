import type {
  IOnetimeSchedule,
  IRecurringSchedule,
} from '@rocket.chat/apps-engine/definition/scheduler';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { OneTimeSchedule, RecurringScheduleResult, Reminder } from '../reminder/Reminder.ts';
import type { ResolvedTarget } from './TargetResolver.ts';

export type RecurReminder = Reminder & { readonly cronExpression: string };

export interface ReminderFields {
  readonly message: string;
  readonly sender: IUser;
  readonly target: ResolvedTarget;
}

export function makeId(): string {
  return Date.now().toString(36);
}

function makeBaseFields(
  id: string,
  senderId: string,
  message: string,
): Pick<Reminder, 'id' | 'createdBy' | 'createdAt' | 'message' | 'status'> {
  return { id, createdBy: senderId, createdAt: new Date(), message, status: 'active' };
}

interface CronParts {
  readonly min: number;
  readonly hour: number;
  readonly dow: number;
}

function parseCronBiweekly(cron: string): CronParts {
  const [m, h, , , w] = cron.split(' ');
  return {
    min: parseInt(String(m), 10),
    hour: parseInt(String(h), 10),
    dow: parseInt(String(w), 10),
  };
}

function computeBiweeklyAnchor(cron: string, from: Date): Date {
  const { min, hour, dow } = parseCronBiweekly(cron);
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + 1);
  while (next.getUTCDay() !== dow) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(hour, min, 0, 0);
  return next;
}

type RecurExtras = Pick<Reminder, 'scheduleLabel' | 'biweeklyAnchorDate'>;

function toRecurExtras(s: RecurringScheduleResult): Partial<RecurExtras> {
  return {
    ...(s.scheduleLabel !== undefined ? { scheduleLabel: s.scheduleLabel } : {}),
    ...(s.frequency === 'biweekly'
      ? { biweeklyAnchorDate: computeBiweeklyAnchor(s.cronExpression, new Date()) }
      : {}),
  };
}

export function toReminder(s: OneTimeSchedule, fields: ReminderFields): Reminder {
  const id = makeId();
  return {
    ...makeBaseFields(id, fields.sender.id, fields.message),
    ...fields.target,
    frequency: 'once',
    fireAt: s.fireAt,
    nextFireAt: s.fireAt,
  };
}

export function toRecurringReminder(s: RecurringScheduleResult, fields: ReminderFields): Reminder {
  return {
    ...makeBaseFields(makeId(), fields.sender.id, fields.message),
    ...fields.target,
    frequency: s.frequency,
    cronExpression: s.cronExpression,
    nextFireAt: new Date(),
    ...toRecurExtras(s),
  };
}

export function makeJob(reminder: Reminder): IOnetimeSchedule {
  return { id: 'reminder-fire', when: reminder.nextFireAt, data: { reminderId: reminder.id } };
}

export function makeRecurringJob(reminder: RecurReminder): IRecurringSchedule {
  return {
    id: 'reminder-fire',
    interval: reminder.cronExpression,
    skipImmediate: true,
    data: { reminderId: reminder.id },
  };
}
