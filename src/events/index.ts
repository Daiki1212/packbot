import type { Client } from 'discord.js';

import { handleClientReady } from './clientReady.js';
import { handleInteractionCreate } from './interactionCreate.js';
import { handleGuildMemberAdd } from './guildMemberAdd.js';

export function registerEvents(client: Client): void {
  handleClientReady(client);
  handleInteractionCreate(client);
  handleGuildMemberAdd(client);
}
