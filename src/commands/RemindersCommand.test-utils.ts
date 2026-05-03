import { describe } from 'vitest';
import type { IHttp, IModify, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ReminderRepository } from '../reminder/ReminderRepository.ts';
import type { Reminder } from '../reminder/Reminder.ts';

export interface RemCapture {
  notified: string[];
  cancelledJobs: string[];
}

interface FakeBld {
  setRoom(_r: IRoom): FakeBld;
  setText(t: string): FakeBld;
  getMessage(): { text: string };
}

export function makeRemModify(cap: RemCapture, cancelThrows = false): IModify {
  let txt = '';
  const bld: FakeBld = {
    setRoom(_r: IRoom): FakeBld {
      return bld;
    },
    setText(t: string): FakeBld {
      txt = t;
      return bld;
    },
    getMessage(): { text: string } {
      return { text: txt };
    },
  };
  const nfy = {
    getMessageBuilder(): FakeBld {
      return bld;
    },
    notifyUser(_u: IUser, m: { text: string }): Promise<void> {
      cap.notified.push(m.text);
      return Promise.resolve();
    },
  };
  const sched = {
    scheduleOnce: (): Promise<string> => Promise.resolve(''),
    scheduleRecurring: (): Promise<string> => Promise.resolve(''),
    cancelJob(jobId: string): Promise<void> {
      if (cancelThrows) return Promise.reject(new Error('cancel failed'));
      cap.cancelledJobs.push(jobId);
      return Promise.resolve();
    },
  };
  return {
    getNotifier(): typeof nfy {
      return nfy;
    },
    getScheduler(): typeof sched {
      return sched;
    },
  } as unknown as IModify;
}

export const BASE_REMINDER: Reminder = {
  id: 'rem-001',
  createdBy: 'user-1',
  createdAt: new Date('2025-01-15T08:00:00Z'),
  targetType: 'me',
  targetId: 'user-1',
  targetName: 'me',
  message: 'Stand-up time',
  frequency: 'once',
  fireAt: new Date('2025-01-15T09:00:00Z'),
  nextFireAt: new Date('2025-01-15T09:00:00Z'),
  status: 'active',
  scheduledJobId: 'job-001',
};

export const NO_JOB_REMINDER: Reminder = {
  id: 'rem-002',
  createdBy: 'user-1',
  createdAt: new Date('2025-01-15T08:00:00Z'),
  targetType: 'me',
  targetId: 'user-1',
  targetName: 'me',
  message: 'No-job reminder',
  frequency: 'once',
  fireAt: new Date('2025-01-15T09:00:00Z'),
  nextFireAt: new Date('2025-01-15T09:00:00Z'),
  status: 'active',
};

export async function seed(persis: IPersistence, reminders: Reminder[]): Promise<void> {
  const repo = new ReminderRepository();
  for (const r of reminders) {
    await repo.create(persis, r);
  }
}

export const HTTP = {} as unknown as IHttp;

describe.todo('RemindersCommand test utilities (helper exports only)');
