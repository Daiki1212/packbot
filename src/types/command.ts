import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

type CommandData = {
  name: string;
  toJSON(): ReturnType<SlashCommandBuilder['toJSON']>;
};

export interface BotCommand {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
