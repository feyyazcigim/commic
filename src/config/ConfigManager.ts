import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { ConfigurationError } from '../errors/CustomErrors.js';
import type { Config } from '../types/index.js';
import type { UIManager } from '../ui/UIManager.js';

/**
 * Manages persistent configuration for the Commit CLI
 * Handles loading, saving, and validation of API key and model preferences
 */
export class ConfigManager {
  private readonly configPath: string;
  private readonly configDir: string;
  private static readonly CONFIG_VERSION = '1.0.0';

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.commic', 'config.json');
    this.configDir = dirname(this.configPath);
  }

  /**
   * Load configuration from disk
   * @returns Config object or null if not found
   * @throws ConfigurationError if config file is corrupted
   */
  async load(): Promise<Config | null> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as Config;

      // Validate config structure
      if (!config.apiKey || !config.model) {
        throw ConfigurationError.configFileCorrupted();
      }

      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist yet - this is fine on first run
        return null;
      }

      if (error instanceof SyntaxError) {
        throw ConfigurationError.configFileCorrupted();
      }

      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw ConfigurationError.configSaveFailed(error as Error);
    }
  }

  /**
   * Save configuration to disk
   * Creates config directory if it doesn't exist
   * @param config Configuration to save
   * @throws ConfigurationError if save fails
   */
  async save(config: Config): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Add version to config
      const configWithVersion: Config = {
        ...config,
        version: ConfigManager.CONFIG_VERSION,
      };

      // Write config file with pretty formatting
      await fs.writeFile(this.configPath, JSON.stringify(configWithVersion, null, 2), 'utf-8');
    } catch (error) {
      throw ConfigurationError.configSaveFailed(error as Error);
    }
  }

  /**
   * Check if configuration file exists
   * @returns true if config exists, false otherwise
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the configuration file path
   * @returns Absolute path to config file
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Validate API key format
   * Basic validation - checks if it looks like a Gemini API key
   * @param apiKey API key to validate
   * @returns true if valid format
   */
  static validateApiKeyFormat(apiKey: string): boolean {
    // Gemini API keys typically start with "AIza" and are around 39 characters
    // This is a basic check - actual validation happens when making API calls
    return apiKey.length > 20 && apiKey.trim() === apiKey;
  }

  /**
   * Prompt user for configuration (API key and model)
   * @param ui UIManager instance for prompts
   * @returns New configuration object
   */
  async promptForConfig(ui: UIManager): Promise<Config> {
    ui.showSectionHeader('🔧 Configuration Setup');
    ui.showInfo('Get your free API key at: https://aistudio.google.com/app/api-keys');
    ui.newLine();

    // Prompt for API key
    const apiKey = await ui.promptForApiKey();

    // Validate API key format
    if (!ConfigManager.validateApiKeyFormat(apiKey)) {
      throw ConfigurationError.invalidApiKey();
    }

    // Prompt for model selection
    const availableModels = ['gemini-2.5-flash', 'gemini-flash-latest'];
    const model = await ui.promptForModel(availableModels);

    return {
      apiKey,
      model,
      version: ConfigManager.CONFIG_VERSION,
    };
  }
}
