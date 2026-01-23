#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { ConfigManager } from './config/ConfigManager.js';
import { GitService } from './git/GitService.js';
import { MainOrchestrator } from './orchestrator/MainOrchestrator.js';
import type { CLIOptions } from './types/index.js';
import { UIManager } from './ui/UIManager.js';

// Get package.json version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

/**
 * Main entry point for the Commit CLI
 */
async function main() {
  const program = new Command();

  program
    .name('commic')
    .description('AI-powered Git commit message generator with Conventional Commits support')
    .version(version, '-v, --version')
    .argument('[path]', 'Path to Git repository', '.')
    .option('-r, --reconfigure', 'Reconfigure API key and model settings')
    .action(async (path: string, options: { reconfigure?: boolean }) => {
      try {
        // Create service instances
        const configManager = new ConfigManager();
        const gitService = new GitService();
        const uiManager = new UIManager();

        // Create orchestrator
        const orchestrator = new MainOrchestrator(configManager, gitService, uiManager);

        // Build CLI options
        const cliOptions: CLIOptions = {
          path,
          reconfigure: options.reconfigure,
        };

        // Execute workflow
        await orchestrator.execute(cliOptions);
      } catch (_error) {
        // Top-level error handler
        // Orchestrator already handles and displays errors
        // This is just to ensure we exit with error code
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
