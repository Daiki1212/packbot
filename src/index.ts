import { Client, GatewayIntentBits } from 'discord.js';

import { env } from "./env.js";
import { registerEvents } from './events/index.js';

async function startBot(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
  });

  registerEvents(client);
  await client.login(env.DISCORD_TOKEN);
}

startBot().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
