import { Events, type Client } from 'discord.js';

export function handleClientReady(client: Client): void {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot ist online als ${readyClient.user.tag}!`);
  });
}
