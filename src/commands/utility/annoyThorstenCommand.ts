import type {BotCommand} from "../../types/command.js";
import {InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder} from "discord.js";

import { env } from '../../env.js';

const THORSTEN_ID = env.THORSTEN_ID;

export const annoyThorstenCommand = {
    data: createDeleteMessagesCommandData(),

    async execute(interaction) {
        if (!THORSTEN_ID) {
            console.error('THORSTEN_ID is not set');
            await interaction.reply({
                content: 'Thorstens ID ist nicht gesetzt',
                flags: [MessageFlags.Ephemeral],
            })
            return;
        }

        await interaction.reply({
            content: 'Der große Rote Knopf wurde gedrückt!',
            flags: [MessageFlags.Ephemeral],
        });

        await interaction.guild?.members.fetch(THORSTEN_ID).then(
            async member => {
                let startChannel = member.voice.channel?.id
                let secondChannel = interaction.guild?.afkChannel

                if (startChannel === secondChannel || secondChannel === undefined || startChannel === undefined) {
                    throw new Error('Start Channel or AFK Channel is undefined');
                }

                for (let i = 0; i < 2; i++) {
                    await member.voice.setChannel('326429945339314186');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await member.voice.setChannel('357931043606495244');
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                await member.voice.setChannel(startChannel);
            }
        ).catch(
            error => {
                console.error('Error fetching member:', error);
                interaction.followUp({
                    content: 'Fehler beim Abrufen von Thorstens Aufenthalt. Stelle sicher das er auf dem Server ist.',
                    flags: [MessageFlags.Ephemeral],
                });
            }
        );
    }
} satisfies BotCommand;

/**
 Creates the slash command data for the delete-messages command.
 */
function createDeleteMessagesCommandData() {
    return new SlashCommandBuilder()
        .setName('red-button')
        .setDescription('Ein großer Roter Knopf, willst du ihn drücken?')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator, )
        .setContexts(InteractionContextType.Guild)
}