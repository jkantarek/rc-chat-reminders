export type ReminderStatus = 'active' | 'completed' | 'cancelled';
export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron' | 'biweekly';
export type TargetType = 'me' | 'user' | 'channel';

export interface Reminder {
  readonly id: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly targetType: TargetType;
  readonly targetId: string;
  readonly targetName: string;
  readonly message: string;
  readonly frequency: ReminderFrequency;
  readonly cronExpression?: string;
  readonly fireAt?: Date;
  readonly biweeklyAnchorDate?: Date;
  readonly scheduleLabel?: string;
  nextFireAt: Date;
  scheduledJobId?: string;
  status: ReminderStatus;
}

export interface PersistedReminder {
  id: string;
  createdBy: string;
  createdAt: string;
  targetType: TargetType;
  targetId: string;
  targetName: string;
  message: string;
  frequency: ReminderFrequency;
  cronExpression?: string;
  fireAt?: string;
  biweeklyAnchorDate?: string;
  scheduleLabel?: string;
  nextFireAt: string;
  scheduledJobId?: string;
  status: ReminderStatus;
}

export interface OneTimeSchedule {
  readonly kind: 'once';
  readonly fireAt: Date;
}

export interface RecurringScheduleResult {
  readonly kind: 'recurring';
  readonly cronExpression: string;
  readonly frequency: Exclude<ReminderFrequency, 'once'>;
  readonly scheduleLabel?: string;
}

export type ParsedSchedule = OneTimeSchedule | RecurringScheduleResult;

export type ParsedTarget =
  | { readonly kind: 'me' }
  | { readonly kind: 'user'; readonly username: string }
  | { readonly kind: 'channel'; readonly channelName: string };

export interface ParsedCommand {
  readonly target: ParsedTarget;
  readonly message: string;
  readonly schedule: ParsedSchedule;
}

export interface ParseError {
  readonly kind: 'error';
  readonly reason: string;
}

export type ParseResult<T> = T | ParseError;
