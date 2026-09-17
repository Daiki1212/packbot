import { Events, type Client } from 'discord.js';

import { env } from '../env.js';

function handleGuildMemberAdd(client: Client): void {
  client.on(Events.GuildMemberAdd, async (member) => {
    if (!env.DEFAULT_ROLE_ID || !env.WELCOME_CHANNEL_ID) {
      return;
    }

    try {
      const dmChannel = await member.createDM();
      await dmChannel.send(
        `Willkommen auf dem **${member.guild.name}** Server!\n\n` +
        `Um die Community aktiv und übersichtlich zu halten, möchten wir gerne wissen, wie du zu uns gefunden hast.\n\n` +
        `**Bitte teile uns mit:**\n` +
        `• Von wem wurdest du eingeladen?\n` +
        `• Oder: Für welchen Zweck/Inhalt bist du hier?\n\n` +
        `Diese Information wird vertraulich behandelt und hilft uns dabei, aktive Mitglieder von inaktiven zu unterscheiden. ` +
        `Ohne diese Info könnten wir dich versehentlich als inaktiv einstufen und nach kurzer Zeit entfernen.\n\n` +
        `Bitte antworte einfach auf diese Nachricht!`,
      );

      const collected = await dmChannel.awaitMessages({
        max: 1,
        time: 600000,
        errors: ['time'],
      });

      const response = collected.first();
      if (!response) {
        return;
      }

      const logChannel = await member.guild.channels.fetch(env.WELCOME_CHANNEL_ID);
      if (!logChannel?.isTextBased()) {
        console.error('Log channel not found or not text-based.');
        return;
      }

      await logChannel.send(
        `**${member.user.tag}** (${member.id}) - ${response.content}`,
      );
      await member.roles.add(env.DEFAULT_ROLE_ID);
      await dmChannel.send(
        `Vielen Dank! Du wurdest erfolgreich auf dem Server registriert und hast nun Zugriff auf alle Channels. Viel Spaß! 🎮`,
      );
    } catch (error) {
      console.error(`Error in welcome flow for ${member.user.tag}:`, error);
    }
  });
}

export { handleGuildMemberAdd };
