import { describe, it, expect } from 'vitest';
import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata/IAppInfo';
import type { ILogger } from '@rocket.chat/apps-engine/definition/accessors/ILogger';
import type {
  IConfigurationExtend,
  IEnvironmentRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import type { ISlashCommand } from '@rocket.chat/apps-engine/definition/slashcommands';
import type { IProcessor } from '@rocket.chat/apps-engine/definition/scheduler';
import { RcChatRemindersApp } from './RcChatRemindersApp.ts';
import { RemindCommand } from './commands/RemindCommand.ts';
import { ReminderProcessor } from './scheduler/ReminderProcessor.ts';

interface AppUnderTest {
  extendConfiguration(c: IConfigurationExtend, e: IEnvironmentRead): Promise<void>;
}

const noop = (): void => {
  // intentional no-op for test stub
};

const fakeInfo = {
  id: 'test-id',
  name: 'Test App',
  nameSlug: 'test-app',
  version: '0.0.1',
  description: 'Test',
  requiredApiVersion: '1.0.0',
  author: { name: 'Author', homepage: '', support: '' },
  classFile: 'RcChatRemindersApp.ts',
  iconFile: 'icon.png',
  implements: [],
} as unknown as IAppInfo;

const fakeLogger = { debug: noop } as unknown as ILogger;

describe('RcChatRemindersApp', () => {
  it('extendConfiguration registers RemindCommand and ReminderProcessor', async () => {
    const cmds: ISlashCommand[] = [];
    const procs: IProcessor[][] = [];
    const config = {
      slashCommands: {
        provideSlashCommand(cmd: ISlashCommand): Promise<void> {
          cmds.push(cmd);
          return Promise.resolve();
        },
      },
      scheduler: {
        registerProcessors(ps: IProcessor[]): Promise<void> {
          procs.push(ps);
          return Promise.resolve();
        },
      },
    } as unknown as IConfigurationExtend;
    const app = new RcChatRemindersApp(fakeInfo, fakeLogger) as unknown as AppUnderTest;
    await app.extendConfiguration(config, {} as unknown as IEnvironmentRead);
    expect(cmds[0]).toBeInstanceOf(RemindCommand);
    expect(procs[0]?.[0]).toBeInstanceOf(ReminderProcessor);
  });
});
