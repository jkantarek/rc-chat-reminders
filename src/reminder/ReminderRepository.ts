import type { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import {
  RocketChatAssociationModel,
  RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata';
import type { Reminder, PersistedReminder, ReminderStatus } from './Reminder.ts';

const MODEL = RocketChatAssociationModel.MISC;

function idAssoc(id: string): RocketChatAssociationRecord {
  return new RocketChatAssociationRecord(MODEL, `reminder:${id}`);
}
function userAssoc(userId: string): RocketChatAssociationRecord {
  return new RocketChatAssociationRecord(MODEL, `user:${userId}`);
}

interface PersistedOptionals {
  readonly cronExpression?: string;
  readonly fireAt?: string;
  readonly scheduledJobId?: string;
  readonly biweeklyAnchorDate?: string;
  readonly scheduleLabel?: string;
}

type PCore = Pick<PersistedReminder, 'id' | 'createdBy' | 'message' | 'status'>;
type PTarget = Pick<PersistedReminder, 'targetType' | 'targetId' | 'targetName'>;
type PMeta = Pick<PersistedReminder, 'frequency' | 'createdAt' | 'nextFireAt'>;

function toPCore(r: Reminder): PCore {
  return { id: r.id, createdBy: r.createdBy, message: r.message, status: r.status };
}
function toPTarget(r: Reminder): PTarget {
  return { targetType: r.targetType, targetId: r.targetId, targetName: r.targetName };
}
function toPMeta(r: Reminder): PMeta {
  return {
    frequency: r.frequency,
    createdAt: r.createdAt.toISOString(),
    nextFireAt: r.nextFireAt.toISOString(),
  };
}
function toAnchorStr(d: Date | undefined): Partial<PersistedOptionals> {
  return d !== undefined ? { biweeklyAnchorDate: d.toISOString() } : {};
}
function fromAnchorDate(s: string | undefined): Partial<ReminderOptionals> {
  return s !== undefined ? { biweeklyAnchorDate: new Date(s) } : {};
}
function toPOptionals(r: Reminder): PersistedOptionals {
  return {
    ...(r.cronExpression !== undefined ? { cronExpression: r.cronExpression } : {}),
    ...(r.fireAt !== undefined ? { fireAt: r.fireAt.toISOString() } : {}),
    ...(r.scheduledJobId !== undefined ? { scheduledJobId: r.scheduledJobId } : {}),
    ...toAnchorStr(r.biweeklyAnchorDate),
    ...(r.scheduleLabel !== undefined ? { scheduleLabel: r.scheduleLabel } : {}),
  };
}
function toPersistedReminder(r: Reminder): PersistedReminder {
  return { ...toPCore(r), ...toPTarget(r), ...toPMeta(r), ...toPOptionals(r) };
}

interface ReminderOptionals {
  readonly cronExpression?: string;
  readonly fireAt?: Date;
  readonly scheduledJobId?: string;
  readonly biweeklyAnchorDate?: Date;
  readonly scheduleLabel?: string;
}

type RCore = Pick<Reminder, 'id' | 'createdBy' | 'message' | 'status'>;
type RTarget = Pick<Reminder, 'targetType' | 'targetId' | 'targetName'>;
type RMeta = Pick<Reminder, 'frequency' | 'createdAt' | 'nextFireAt'>;

function fromPCore(p: PersistedReminder): RCore {
  return { id: p.id, createdBy: p.createdBy, message: p.message, status: p.status };
}
function fromPTarget(p: PersistedReminder): RTarget {
  return { targetType: p.targetType, targetId: p.targetId, targetName: p.targetName };
}
function fromPMeta(p: PersistedReminder): RMeta {
  return {
    frequency: p.frequency,
    createdAt: new Date(p.createdAt),
    nextFireAt: new Date(p.nextFireAt),
  };
}
function fromPOptionals(p: PersistedReminder): ReminderOptionals {
  return {
    ...(p.cronExpression !== undefined ? { cronExpression: p.cronExpression } : {}),
    ...(p.fireAt !== undefined ? { fireAt: new Date(p.fireAt) } : {}),
    ...(p.scheduledJobId !== undefined ? { scheduledJobId: p.scheduledJobId } : {}),
    ...fromAnchorDate(p.biweeklyAnchorDate),
    ...(p.scheduleLabel !== undefined ? { scheduleLabel: p.scheduleLabel } : {}),
  };
}
function fromPersistedReminder(p: PersistedReminder): Reminder {
  return { ...fromPCore(p), ...fromPTarget(p), ...fromPMeta(p), ...fromPOptionals(p) };
}
function withJobId(r: Reminder, jobId: string): PersistedReminder {
  return { ...toPersistedReminder(r), scheduledJobId: jobId };
}

export class ReminderRepository {
  async create(persis: IPersistence, reminder: Reminder): Promise<string> {
    return persis.createWithAssociations(toPersistedReminder(reminder), [
      idAssoc(reminder.id),
      userAssoc(reminder.createdBy),
    ]);
  }

  async findById(reader: IPersistenceRead, id: string): Promise<Reminder | undefined> {
    const results = await reader.readByAssociation(idAssoc(id));
    const first = results[0];
    if (first === undefined) return undefined;
    return fromPersistedReminder(first as PersistedReminder);
  }

  async updateJobId(
    persis: IPersistence,
    reader: IPersistenceRead,
    id: string,
    jobId: string,
  ): Promise<void> {
    const existing = await this.findById(reader, id);
    if (existing === undefined) return;
    await persis.updateByAssociation(idAssoc(id), withJobId(existing, jobId));
  }

  async updateStatus(
    persis: IPersistence,
    reader: IPersistenceRead,
    id: string,
    status: ReminderStatus,
  ): Promise<void> {
    const existing = await this.findById(reader, id);
    if (existing === undefined) return;
    await persis.updateByAssociation(idAssoc(id), { ...toPersistedReminder(existing), status });
  }

  async findByUser(reader: IPersistenceRead, userId: string): Promise<Reminder[]> {
    const results = await reader.readByAssociation(userAssoc(userId));
    return results
      .map((r) => fromPersistedReminder(r as PersistedReminder))
      .filter((r) => r.status === 'active');
  }
}
