import { App } from '@rocket.chat/apps-engine/definition/App';
import type {
  IConfigurationExtend,
  IEnvironmentRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { RemindCommand } from './commands/RemindCommand.ts';
import { RemindersCommand } from './commands/RemindersCommand.ts';
import { ReminderProcessor } from './scheduler/ReminderProcessor.ts';

export class RcChatRemindersApp extends App {
  protected override async extendConfiguration(
    configuration: IConfigurationExtend,
    _environmentRead: IEnvironmentRead,
  ): Promise<void> {
    await configuration.slashCommands.provideSlashCommand(new RemindCommand());
    await configuration.slashCommands.provideSlashCommand(new RemindersCommand());
    await configuration.scheduler.registerProcessors([new ReminderProcessor()]);
  }
}
