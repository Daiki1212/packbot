import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  DISCORD_TOKEN: requireEnv('DISCORD_TOKEN'),
  DISCORD_CLIENT_ID: requireEnv('DISCORD_CLIENT_ID'),
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DEFAULT_ROLE_ID: process.env.DEFAULT_ROLE_ID,
  WELCOME_CHANNEL_ID: process.env.WELCOME_CHANNEL_ID,
  THORSTEN_ID: process.env.THORSTEN_ID,
};
