# Packbot

A Discord bot built with TypeScript and discord.js for server management and utility commands.

## Description

Packbot is a lightweight Discord bot for Wolfpack.
Provides utitlity commands and server administration.

## Features

- **Red Button** (`/red-button`): Simple ping-pong command to check if the bot is responsive
- **Message Deletion** (`/delete-messages`): Bulk delete messages in a channel up to a specified date (Admin only, WIP)

## Prerequisites

- Node.js (v18 or higher recommended)
- A Discord Bot Token and Application
- TypeScript knowledge for modifications

## Setup

### 1. Discord Application Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" section and create a bot
4. Copy your bot token
5. Copy your application's Client ID from the "General Information" section
6. Enable the necessary bot permissions and intents

### 2. Project Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd packbot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Discord credentials:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here (optional, only for testing)
```

### 3. Deploy Commands

**For Testing (Guild-specific):**
```bash
npm run deploy:guild
```
This deploys commands to a specific server (defined in `DISCORD_GUILD_ID`) for immediate testing without global propagation delay.

**For Production (Global):**
```bash
npm run deploy:global
```
This deploys commands globally to all servers where the bot is present. Note: Global commands may take up to an hour to propagate.

### 4. Running the Bot

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Development

### Adding New Commands

1. Create a new command file in `src/commands/utility/`
2. Export a command object implementing the `BotCommand` interface
3. Register the command in `src/commands/index.ts`
4. Redeploy commands using the deploy scripts

### Command Deployment Strategies

- **Guild Commands**: Use for testing and development. Changes apply immediately to the specified guild.
- **Global Commands**: Use for production. Recommended for stable features accessible across all servers.

## Technologies

- **discord.js v14**: Discord API wrapper
- **TypeScript**: Type-safe development
- **tsx**: TypeScript execution for development
- **dotenv**: Environment variable management

## Author

Lukas Barth
