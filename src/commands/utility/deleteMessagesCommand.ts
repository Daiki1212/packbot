import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction, GuildChannel } from 'discord.js';

import { MessageDeletionService } from '../../services/messageDeletionService.js';
import type { BotCommand } from '../../types/command.js';

const DELETE_ALL_CONFIRM_ID = 'confirm-delete-all';
const DELETE_ALL_CANCEL_ID = 'cancel-delete-all';
const CONFIRMATION_TIMEOUT_MS = 60_000;
const PROGRESS_UPDATE_INTERVAL = 5;

type DeletionOptions = {
  deleteAll: boolean;
  deletionPeriod: Date | null;
};

export const deleteMessagesCommand = {
  data: createDeleteMessagesCommandData(),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await replyEphemeral(
          interaction,
          'Dieser Command funktioniert nur auf einem Server.',
      );
      return;
    }

    const options = parseDeletionOptions(interaction);
    if (typeof options === 'string') {
      await replyEphemeral(interaction, options);
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await replyEphemeral(
          interaction,
          'Du hast keine Berechtigung, diesen Befehl zu verwenden.',
      );
      return;
    }

    if (!interaction.channel) {
      await replyEphemeral(interaction, 'Channel konnte nicht gefunden werden.');
      return;
    }

    const shouldContinue = await initializeProgressReply(
        interaction,
        options.deleteAll,
    );
    if (!shouldContinue) {
      return;
    }

    const result = await runDeletion(
        interaction,
        interaction.channel as GuildChannel,
        options,
    );

    if (!result.success) {
      await interaction.editReply(
          `Fehler beim Loeschen: ${result.error || 'Unbekannter Fehler'}`,
      );
      return;
    }

    if (result.newChannel) {
      if (!result.newChannel.isTextBased()) {
        console.error('New channel is not a text-based channel');
        return;
      }
      return;
    }

    await interaction.editReply(
        `${result.deletedCount} Nachrichten erfolgreich geloescht.`,
    );
  },
} satisfies BotCommand;

/**
 Creates the slash command data for the delete-messages command.
 */
function createDeleteMessagesCommandData() {
  return new SlashCommandBuilder()
    .setName('delete-messages')
    .setDescription('Loescht Nachrichten im aktuellen Channel bis zu einem Datum')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName('delete-all')
        .setDescription('Alle Nachrichten im Channel loeschen')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('delete-till')
        .setDescription('ISO-Datum bis zu dem Nachrichten geloescht werden')
        .setRequired(false),
    );

}

/**
 * Parses the deletion options from the interaction.
 * @param interaction - The interaction object containing the options.
 * @returns An object containing the deletion options or an error message.
 */
function parseDeletionOptions(
  interaction: ChatInputCommandInteraction,
): DeletionOptions | string {
  const deleteAll = interaction.options.getBoolean('delete-all', true);

  const dateString = interaction.options.getString('delete-till');
  if (deleteAll) {
    return { deleteAll, deletionPeriod: null };

  }
  if (!dateString) {
    return 'Bitte gib ein Datum an oder aktiviere "delete-all".';

  }
  const deletionPeriod = new Date(Date.parse(dateString));
  if (Number.isNaN(deletionPeriod.valueOf())) {
    return 'Ungueltiges Datum angegeben.';

  }
  return { deleteAll, deletionPeriod };
}

/**
 * Initializes the progress reply for the deletion process.
 * @param interaction
 * @param deleteAll
 */
async function initializeProgressReply(
    interaction: ChatInputCommandInteraction,
    deleteAll: boolean,
): Promise<boolean> {
  if (deleteAll) {
    return confirmDeleteAll(interaction);

  }
  await replyEphemeral(interaction, 'Loeschung laeuft...');
  return true;
}

/**
 * Confirms the deletion of all messages in the channel.
 * @param interaction - The interaction object.
 * @returns A promise that resolves to true if the deletion is confirmed, false otherwise.
 */
async function confirmDeleteAll(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {

  const response = await interaction.reply({
    content:
      '**WARNUNG**: Du bist dabei, den Channel komplett zu loeschen und neu zu erstellen.\n' +
      '- Alle Nachrichten werden unwiderruflich geloescht\n' +
      '- Die Channel-ID aendert sich\n' +
      '- Dieser Vorgang kann NICHT rueckgaengig gemacht werden!\n\n' +
      'Bist du sicher?',
    components: [createDeleteAllConfirmationRow()],
    flags: [MessageFlags.Ephemeral],
    withResponse: true,
  });
  try {
    const confirmation = await response.resource?.message?.awaitMessageComponent(
      {
        filter: (componentInteraction) =>
          componentInteraction.user.id === interaction.user.id,
        time: CONFIRMATION_TIMEOUT_MS,
      },
    );

    if (confirmation?.customId !== DELETE_ALL_CONFIRM_ID) {
      await interaction.editReply({
        content: 'Loeschung abgebrochen.',
        components: [],
      });
      return false;
    }

    await confirmation.deferUpdate();
    await interaction.editReply({
      content: 'Loeschung laeuft...',
      components: [],
    });
    return true;
  } catch {
    await interaction.editReply({
      content: 'Keine Bestaetigung innerhalb von 1 Minute erhalten. Abbruch.',
      components: [],
    });
    return false;
  }
}

/**
 * Creates a confirmation button row for the delete-all confirmation.
 * @returns An ActionRowBuilder containing the confirmation button.
 */
function createDeleteAllConfirmationRow(): ActionRowBuilder<ButtonBuilder> {

  const confirmation = new ButtonBuilder()
      .setCustomId(DELETE_ALL_CONFIRM_ID)
      .setLabel('Ja, ALLES loeschen')
      .setStyle(ButtonStyle.Danger);

  const cancellation = new ButtonBuilder()
      .setCustomId(DELETE_ALL_CANCEL_ID)
      .setLabel('Nein, abbrechen')
      .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
      confirmation,
      cancellation,
  );
}

/**
 * Runs the deletion process for the specified channel.
 * @param interaction
 * @param channel
 * @param options
 */
async function runDeletion(
  interaction: ChatInputCommandInteraction,
  channel: GuildChannel,
  options: DeletionOptions,
) {

  const deletionService = new MessageDeletionService();
  return deletionService.deleteMessages(
    channel,
    options.deletionPeriod,
    options.deleteAll,
    {
      updateInterval: PROGRESS_UPDATE_INTERVAL,
      onProgress: async (count, phase) => {
        console.info(`Progress: ${count} messages deleted in ${phase} phase`);
        await interaction.editReply(
          `${count} Nachrichten geloescht... (${phase === 'bulk' ? 'Bulk-Loeschung' : 'Einzelloeschung'})`,
        );
      },
    },
  );

}

/**
 * Replies to the interaction with an ephemeral message.
 * @param interaction
 * @param content
 */
async function replyEphemeral(
    interaction: ChatInputCommandInteraction,
    content: string,
): Promise<void> {
  await interaction.reply({
    content,
    flags: [MessageFlags.Ephemeral],
  });

}
