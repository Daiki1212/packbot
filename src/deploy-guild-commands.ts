import { deployGuildCommands } from './lib/deployCommands.js';

async function main(): Promise<void> {
  if (!process.env.DISCORD_GUILD_ID) {
    throw new Error('DISCORD_GUILD_ID is not set');
  }
  const guildId: string = process.env.DISCORD_GUILD_ID;
  await deployGuildCommands(guildId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
