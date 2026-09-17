import { REST, Routes } from 'discord.js';

import { commands } from '../commands/index.js';
import { env } from '../env.js';

function createRestClient(): REST {
  return new REST().setToken(env.DISCORD_TOKEN);
}

function createCommandPayload() {
  return commands.map((command) => command.data.toJSON());
}

export async function deployGuildCommands(guildId: string): Promise<void> {
  const rest = createRestClient();
  const payload = createCommandPayload();

  console.log(
    `Started refreshing ${payload.length} guild application (/) commands for guild ${guildId}.`,
  );

  const deployedCommands = (await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId),
    { body: payload },
  )) as unknown[];

  console.log(
    `Successfully reloaded ${deployedCommands.length} guild application (/) commands for guild ${guildId}.`,
  );
}

export async function deployGlobalCommands(): Promise<void> {
  const rest = createRestClient();
  const payload = createCommandPayload();

  console.log(`Started refreshing ${payload.length} global application (/) commands.`);

  const deployedCommands = (await rest.put(
    Routes.applicationCommands(env.DISCORD_CLIENT_ID),
    { body: payload },
  )) as unknown[];

  console.log(
    `Successfully reloaded ${deployedCommands.length} global application (/) commands.`,
  );
}
