import { deleteMessagesCommand } from './utility/deleteMessagesCommand.js';

import type { BotCommand } from '../types/command.js';
import {annoyThorstenCommand} from "./utility/annoyThorstenCommand.js";

export const commands: BotCommand[] = [
  deleteMessagesCommand,
  annoyThorstenCommand,
];

export const commandMap = new Map<string, BotCommand>(
  commands.map((command) => [command.data.name, command]),
);
