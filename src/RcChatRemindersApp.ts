import { App } from '@rocket.chat/apps-engine/definition/App';
import type {
  IConfigurationExtend,
  IEnvironmentRead,
} from '@rocket.chat/apps-engine/definition/accessors';

export class RcChatRemindersApp extends App {
  protected override async extendConfiguration(
    _configuration: IConfigurationExtend,
    _environmentRead: IEnvironmentRead,
  ): Promise<void> {
    // registrations added in later phases
  }
}
