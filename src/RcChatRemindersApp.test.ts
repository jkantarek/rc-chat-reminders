import { describe, it } from 'vitest';
import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata/IAppInfo';
import type { ILogger } from '@rocket.chat/apps-engine/definition/accessors/ILogger';
import type {
  IConfigurationExtend,
  IEnvironmentRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { RcChatRemindersApp } from './RcChatRemindersApp.ts';

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
  it('extendConfiguration resolves without error (stub phase)', async (): Promise<void> => {
    const app = new RcChatRemindersApp(fakeInfo, fakeLogger) as unknown as AppUnderTest;
    const fakeConfig = {} as unknown as IConfigurationExtend;
    const fakeEnv = {} as unknown as IEnvironmentRead;
    await app.extendConfiguration(fakeConfig, fakeEnv);
  });
});
