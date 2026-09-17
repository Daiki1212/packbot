import { deployGlobalCommands } from './lib/deployCommands.js';

deployGlobalCommands().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
