import type { CLIOptions, Config } from '../types/index.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { GitService } from '../git/GitService.js';
import { AIService } from '../ai/AIService.js';
import { UIManager } from '../ui/UIManager.js';
import { GitRepositoryError, ConfigurationError, APIError } from '../errors/CustomErrors.js';

/**
 * Orchestrates the complete workflow of the Commit CLI
 * Coordinates between configuration, Git operations, AI generation, and user interaction
 */
export class MainOrchestrator {
  constructor(
    private readonly configManager: ConfigManager,
    private readonly gitService: GitService,
    private readonly uiManager: UIManager
  ) {}

  /**
   * Execute the complete commit workflow
   * @param options CLI options from command line
   */
  async execute(options: CLIOptions): Promise<void> {
    try {
      // Show welcome message
      this.uiManager.showWelcome();

      // Step 1: Handle configuration
      const config = await this.handleConfiguration(options.reconfigure);

      // Step 2: Find and validate repository
      const repositoryPath = options.path || '.';
      const repository = await this.findAndValidateRepository(repositoryPath);

      // Step 3: Get Git diff
      const diff = await this.getGitDiff(repository.rootPath);

      // Step 4: Generate commit suggestions
      const suggestions = await this.generateSuggestions(config, diff);

      // Step 5: Let user select a commit message
      const selectedIndex = await this.uiManager.promptForCommitSelection(suggestions);

      // Handle cancellation
      if (selectedIndex === -1) {
        this.uiManager.showInfo('Commit cancelled. No changes were made.');
        return;
      }

      // Step 6: Stage changes if needed
      await this.stageChangesIfNeeded(repository.rootPath, diff);

      // Step 7: Execute commit
      const commitHash = await this.executeCommit(
        repository.rootPath,
        suggestions[selectedIndex].message
      );

      // Step 8: Show success with more details
      const shortHash = commitHash.substring(0, 7);
      const repoName = this.gitService.getRepositoryName(repository.rootPath);
      const branch = await this.gitService.getCurrentBranch(repository.rootPath);
      this.uiManager.showSuccess(
        `Committed successfully!\n` +
        `   Repository: ${repoName}\n` +
        `   Branch: ${branch}\n` +
        `   Commit: ${this.uiManager['colors'].muted(shortHash)}`
      );
    } catch (error) {
      this.handleError(error);
      process.exit(1);
    }
  }

  /**
   * Handle configuration loading or prompting
   * @param forceReconfigure Force reconfiguration even if config exists
   * @returns Configuration object
   */
  private async handleConfiguration(forceReconfigure?: boolean): Promise<Config> {
    try {
      // Check if we need to reconfigure
      if (forceReconfigure) {
        this.uiManager.showInfo('Reconfiguring...');
        const config = await this.configManager.promptForConfig(this.uiManager);
        await this.configManager.save(config);
        this.uiManager.showSuccess('Configuration saved!');
        return config;
      }

      // Try to load existing config
      const existingConfig = await this.configManager.load();

      if (existingConfig) {
        return existingConfig;
      }

      // No config exists - prompt for first-time setup
      this.uiManager.showInfo('First-time setup required');
      const config = await this.configManager.promptForConfig(this.uiManager);
      await this.configManager.save(config);
      this.uiManager.showSuccess('Configuration saved!');
      return config;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw ConfigurationError.configSaveFailed(error as Error);
    }
  }

  /**
   * Find and validate Git repository
   * @param path Path to search for repository
   * @returns Repository information
   */
  private async findAndValidateRepository(path: string): Promise<{ rootPath: string }> {
    const spinner = this.uiManager.showLoading('Finding Git repository...');

    try {
      const repository = await this.gitService.findRepository(path);
      
      // Check if repository has commits
      const hasCommits = await this.gitService.hasCommits(repository.rootPath);
      
      if (!hasCommits) {
        spinner.fail('Repository has no commits');
        throw GitRepositoryError.noCommitsFound();
      }

      // Get repository info
      const repoName = this.gitService.getRepositoryName(repository.rootPath);
      const branch = await this.gitService.getCurrentBranch(repository.rootPath);
      const remoteUrl = await this.gitService.getRemoteUrl(repository.rootPath);

      spinner.succeed('Repository found');
      
      // Show repository info with better spacing
      this.uiManager.newLine();
      this.uiManager.showRepositoryInfo(repoName, branch, repository.rootPath, remoteUrl);

      return repository;
    } catch (error) {
      spinner.fail('Failed to find repository');
      throw error;
    }
  }

  /**
   * Get Git diff and validate changes exist
   * @param repoPath Repository root path
   * @returns Git diff
   */
  private async getGitDiff(repoPath: string) {
    const spinner = this.uiManager.showLoading('Analyzing changes...');

    try {
      const diff = await this.gitService.getDiff(repoPath);

      if (!diff.hasChanges) {
        spinner.fail('No changes to commit');
        throw GitRepositoryError.noChanges();
      }

      // Get diff statistics
      const stats = await this.gitService.getDiffStats(repoPath);
      
      spinner.succeed('Changes analyzed');
      
      // Show change statistics with better spacing
      this.uiManager.showChangeStats(stats);
      
      return diff;
    } catch (error) {
      spinner.fail('Failed to analyze changes');
      throw error;
    }
  }

  /**
   * Generate commit message suggestions using AI
   * @param config Configuration with API key
   * @param diff Git diff
   * @returns Array of suggestions
   */
  private async generateSuggestions(config: Config, diff: any) {
    this.uiManager.newLine();
    this.uiManager.showSectionHeader('🤖 AI Generation');
    this.uiManager.showAIGenerationInfo(config.model, 4);
    
    const spinner = this.uiManager.showLoading('   Generating commit messages...');

    try {
      const aiService = new AIService(config.apiKey, config.model);
      const suggestions = await aiService.generateCommitMessages(diff, 4);
      
      spinner.succeed(`   Generated ${suggestions.length} suggestions`);
      this.uiManager.newLine();
      
      return suggestions;
    } catch (error) {
      spinner.fail('   Failed to generate suggestions');
      throw error;
    }
  }

  /**
   * Stage changes if there are unstaged changes
   * @param repoPath Repository root path
   * @param diff Git diff
   */
  private async stageChangesIfNeeded(repoPath: string, diff: any): Promise<void> {
    if (diff.unstaged && diff.unstaged.length > 0) {
      this.uiManager.newLine();
      const spinner = this.uiManager.showLoading('Staging changes...');
      try {
        await this.gitService.stageAll(repoPath);
        spinner.succeed('Changes staged');
        this.uiManager.newLine();
      } catch (error) {
        spinner.fail('Failed to stage changes');
        throw error;
      }
    }
  }

  /**
   * Execute Git commit
   * @param repoPath Repository root path
   * @param message Commit message
   * @returns Commit hash
   */
  private async executeCommit(repoPath: string, message: string): Promise<string> {
    this.uiManager.newLine();
    const spinner = this.uiManager.showLoading('Committing changes...');

    try {
      const commitHash = await this.gitService.commit(repoPath, message);
      spinner.succeed('Commit created successfully');
      this.uiManager.newLine();
      return commitHash;
    } catch (error) {
      spinner.fail('Commit failed');
      throw error;
    }
  }

  /**
   * Handle errors with user-friendly messages
   * @param error Error to handle
   */
  private handleError(error: unknown): void {
    if (error instanceof GitRepositoryError || 
        error instanceof ConfigurationError || 
        error instanceof APIError) {
      this.uiManager.showErrorWithSuggestion(error.message, error.suggestion || '');
    } else {
      this.uiManager.showError(
        'An unexpected error occurred',
        (error as Error).message
      );
    }
  }
}