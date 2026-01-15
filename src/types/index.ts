/**
 * Configuration structure stored in ~/.commit-cli/config.json
 */
export interface Config {
  apiKey: string;
  model: string;
  version: string;
}

/**
 * Git repository information
 */
export interface GitRepository {
  path: string;
  rootPath: string;
}

/**
 * Git diff information
 */
export interface GitDiff {
  staged: string;
  unstaged: string;
  hasChanges: boolean;
}

/**
 * Commit message suggestion
 */
export interface CommitSuggestion {
  message: string;
  type: 'single-line' | 'multi-line';
}

/**
 * Validation result for commit messages
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parsed commit message structure
 */
export interface ParsedCommitMessage {
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
  body?: string;
}

/**
 * CLI options from command line arguments
 */
export interface CLIOptions {
  path?: string;
  reconfigure?: boolean;
}
