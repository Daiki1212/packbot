import type {
  Collection,
  GuildChannel,
  Message,
  Snowflake,
  TextBasedChannel,
} from 'discord.js';

const BULK_DELETE_LIMIT_DAYS = 14;
const BULK_DELETE_LIMIT_MS = BULK_DELETE_LIMIT_DAYS * 24 * 60 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBulkDeleteCutoff(): Date {
  return new Date(Date.now() - BULK_DELETE_LIMIT_MS);
}

export interface BulkDeletionChannel {
  messages: {
    fetch(options: {
      limit: number;
      before?: string;
    }): Promise<Collection<Snowflake, Message>>;
  };
  bulkDelete(
    messages: Collection<Snowflake, Message> | number | string[],
    filterOld?: boolean,
  ): Promise<Collection<Snowflake, Message>>;
}

export function isBulkDeletionChannel(
  channel: unknown,
): channel is BulkDeletionChannel {
  if (!channel || typeof channel !== 'object') {
    return false;
  }

  return 'messages' in channel && 'bulkDelete' in channel;
}

export interface DeletionResult {
  success: boolean;
  deletedCount: number;
  newChannel?: GuildChannel;
  error?: string;
}

export interface DeletionProgress {
  onProgress?: (deleted: number, phase: 'bulk' | 'individual') => Promise<void>;
  updateInterval?: number; // Update every N deletions (default: 10)
}

export class MessageDeletionService {
  /**
   * Main entry point for deleting messages in a channel.
   * @param channel - The guild channel to delete messages from
   * @param deletionPeriod - Date threshold (messages newer than this will be deleted). Ignored if deleteAll is true.
   * @param deleteAll - If true, clones and deletes the entire channel
   * @param options - Progress tracking options
   */
  async deleteMessages(
    channel: GuildChannel,
    deletionPeriod: Date | null,
    deleteAll: boolean,
    options?: DeletionProgress,
  ): Promise<DeletionResult> {
    if (deleteAll) {
      return this.deleteAllMessages(channel);
    }

    if (!deletionPeriod) {
      return {
        success: false,
        deletedCount: 0,
        error: 'Deletion period is required when deleteAll is false',
      };
    }

    if (!channel.isTextBased()) {
      return {
        success: false,
        deletedCount: 0,
        error: 'Channel is not a text-based channel',
      };
    }

    return this.deleteMessagesByDate(channel, deletionPeriod, options);
  }

  /**
   * Deletes messages from a channel based on the deletion period.
   * Automatically uses bulk delete for recent messages and individual deletion for older ones.
   */
  private async deleteMessagesByDate(
      channel: TextBasedChannel,
      deletionPeriod: Date,
      options?: DeletionProgress,
  ): Promise<DeletionResult> {
    if (!isBulkDeletionChannel(channel)) {
      return {
        success: false,
        deletedCount: 0,
        error: 'Channel does not support bulk deletion',
      };
    }

    try {
      const cutoffDate = getBulkDeleteCutoff();
      let totalDeleted = 0;

      // Bulk delete recent messages (<14 days)
      const bulkDeleted = await this.deleteBulkMessages(
          channel,
          deletionPeriod,
          options,
      );
      totalDeleted += bulkDeleted;

      // Individual delete old messages (>14 days) if needed
      if (deletionPeriod < cutoffDate) {
        const individualDeleted = await this.deleteIndividualMessages(
            channel,
            deletionPeriod,
            cutoffDate,
            options,
        );
        totalDeleted += individualDeleted;
      }

      return {
        success: true,
        deletedCount: totalDeleted,
      };
    } catch (error) {
      console.error('Error deleting messages:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deletes all messages in a channel by cloning it and deleting the original.
   * This is the fastest method for complete channel cleanup.
   */
  private async deleteAllMessages(channel: GuildChannel): Promise<DeletionResult> {
    try {
      const newChannel = await channel.clone();
      await channel.delete();

      return {
        success: true,
        deletedCount: -1, // Unknown, but all messages deleted
        newChannel,
      };
    } catch (error) {
      console.error('Error cloning and deleting channel:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deletes messages using bulk delete API (max 100 per request, only <14 days old).
   */
  private async deleteBulkMessages(
    channel: BulkDeletionChannel,
    deletionPeriod: Date,
    options?: DeletionProgress,
  ): Promise<number> {
    let totalDeleted = 0;
    let lastMessageId: string | undefined;
    const cutoffDate = getBulkDeleteCutoff();
    const updateInterval = options?.updateInterval ?? 10;
    let lastUpdate = 0;

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastMessageId && { before: lastMessageId }),
      });

      if (messages.size === 0) {
        break;
      }

      // Filter: Messages newer than deletionPeriod AND within bulk delete window
      const toDelete = messages.filter(
        (msg) => msg.createdAt > deletionPeriod && msg.createdAt >= cutoffDate,
      );

      if (toDelete.size === 0) {
        console.info(`No messages to delete ${messages.size} messages fetched, cutoff: ${cutoffDate.toISOString()}`);
        break;
      }

      const deleted = await channel.bulkDelete(toDelete, true);
      totalDeleted += deleted.size;
      console.info(`Deleted ${deleted.size} messages`);

      // Progress update every N deletions
      if (options?.onProgress && totalDeleted - lastUpdate >= updateInterval) {
        await options.onProgress(totalDeleted, 'bulk');
        console.info(`Bulk deletion progress: ${totalDeleted} messages deleted`);
        lastUpdate = totalDeleted;
      }

      // If we deleted less than fetched, we've reached the cutoff
      if (toDelete.size < messages.size) {
        console.info(`Reached cutoff ${cutoffDate.toISOString()}, stopping bulk deletion`);
        break;
      }

      lastMessageId = messages.last()?.id;
      if (!lastMessageId) {
        break;
      }

      // Rate limit protection
      await sleep(1500);
    }

    return totalDeleted;
  }

  /**
   * Deletes messages individually (for messages >14 days old).
   * This is slower but works for older messages.
   */
  private async deleteIndividualMessages(
    channel: BulkDeletionChannel,
    deletionPeriod: Date,
    cutoffDate: Date,
    options?: DeletionProgress,
  ): Promise<number> {
    let deleted = 0;
    let lastMessageId: string | undefined;
    const updateInterval = options?.updateInterval ?? 10;
    let lastUpdate = 0;

    while (true) {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastMessageId && { before: lastMessageId }),
      });

      if (messages.size === 0) {
        break;
      }

      const lastMessage = messages.last();
      if (!lastMessage) {
        break;
      }

      // Filter: Messages newer than deletionPeriod but older than cutoff (>14 days)
      const oldMessages = messages.filter(
        (msg) => msg.createdAt > deletionPeriod && msg.createdAt < cutoffDate,
      );

      for (const [_, message] of oldMessages) {
        try {
          await message.delete();
          deleted++;

          // Progress update every N deletions
          if (options?.onProgress && deleted - lastUpdate >= updateInterval) {
            await options.onProgress(deleted, 'individual');
            lastUpdate = deleted;
          }

          // Rate limit: 1 deletion per second
          await sleep(1000);
        } catch (error) {
          console.error(`Failed to delete message ${message.id}:`, error);
        }
      }

      // Stop if we've reached messages older than deletionPeriod
      if (lastMessage.createdAt <= deletionPeriod) {
        break;
      }

      lastMessageId = lastMessage.id;
    }

    return deleted;
  }
}
