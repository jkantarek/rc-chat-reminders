import type { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import type { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

export async function replyEphemeral(
  modify: IModify,
  context: SlashCommandContext,
  text: string,
): Promise<void> {
  const notifier = modify.getNotifier();
  const msg = notifier.getMessageBuilder().setRoom(context.getRoom()).setText(text);
  await notifier.notifyUser(context.getSender(), msg.getMessage());
}
