/**
 * Base error class for Commit CLI
 * Provides consistent error structure with user-friendly messages and suggestions
 */
class CommitCLIError extends Error {
  public readonly suggestion: string | null;

  constructor(message: string, suggestion: string | null = null) {
    super(message);
    this.name = this.constructor.name;
    this.suggestion = suggestion;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Git repository related errors
 * Thrown when Git operations fail or repository is invalid
 */
export class GitRepositoryError extends CommitCLIError {
  constructor(message: string, suggestion: string = 'Ensure you are in a valid Git repository or provide a correct path.') {
    super(message, suggestion);
  }

  static noRepositoryFound(path: string): GitRepositoryError {
    return new GitRepositoryError(
      `No Git repository found at: ${path}`,
      'Initialize a Git repository with "git init" or provide a valid repository path.'
    );
  }

  static noCommitsFound(): GitRepositoryError {
    return new GitRepositoryError(
      'Repository has no commits yet',
      'Create an initial commit with "git add . && git commit -m \'Initial commit\'"'
    );
  }

  static noChanges(): GitRepositoryError {
    return new GitRepositoryError(
      'No changes to commit',
      'Make some changes to your files or check "git status" to see the current state.'
    );
  }

  static commitFailed(gitError: string): GitRepositoryError {
    return new GitRepositoryError(
      `Git commit failed: ${gitError}`,
      'Check the error message above and resolve any Git issues.'
    );
  }

  static pathNotAccessible(path: string): GitRepositoryError {
    return new GitRepositoryError(
      `Path not accessible: ${path}`,
      'Ensure the path exists and you have permission to access it.'
    );
  }
}

/**
 * Configuration related errors
 * Thrown when config file operations fail or configuration is invalid
 */
export class ConfigurationError extends CommitCLIError {
  constructor(message: string, suggestion: string = 'Try reconfiguring with the --reconfigure flag.') {
    super(message, suggestion);
  }

  static noApiKey(): ConfigurationError {
    return new ConfigurationError(
      'No API key configured',
      'Run the CLI to set up your Gemini API key, or use --reconfigure to update it.'
    );
  }

  static invalidApiKey(): ConfigurationError {
    return new ConfigurationError(
      'Invalid API key format',
      'Ensure your Gemini API key is correct. Get one at https://makersuite.google.com/app/apikey'
    );
  }

  static configFileCorrupted(): ConfigurationError {
    return new ConfigurationError(
      'Configuration file is corrupted',
      'Delete ~/.commic/config.json and run the CLI again to reconfigure.'
    );
  }

  static configSaveFailed(error: Error): ConfigurationError {
    return new ConfigurationError(
      `Failed to save configuration: ${error.message}`,
      'Check file system permissions for ~/.commic/ directory.'
    );
  }
}

/**
 * Gemini API related errors
 * Thrown when API requests fail or return invalid responses
 */
export class APIError extends CommitCLIError {
  constructor(message: string, suggestion: string = 'Check your internet connection and try again.') {
    super(message, suggestion);
  }

  static requestFailed(error: Error): APIError {
    return new APIError(
      `Gemini API request failed: ${error.message}`,
      'Verify your API key is valid and you have internet connectivity.'
    );
  }

  static rateLimitExceeded(): APIError {
    return new APIError(
      'API rate limit exceeded',
      'Wait a few moments before trying again, or check your API quota at https://makersuite.google.com/'
    );
  }

  static invalidResponse(): APIError {
    return new APIError(
      'Received invalid response from Gemini API',
      'Try again. If the problem persists, the API might be experiencing issues.'
    );
  }

  static authenticationFailed(): APIError {
    return new APIError(
      'API authentication failed',
      'Your API key may be invalid or expired. Use --reconfigure to update it.'
    );
  }

  static timeout(): APIError {
    return new APIError(
      'API request timed out',
      'Check your internet connection and try again.'
    );
  }
}

/**
 * Commit message validation errors
 * Thrown when generated messages don't meet Conventional Commits specification
 */
export class ValidationError extends CommitCLIError {
  constructor(message: string, suggestion: string = 'This is likely an internal error. Please try again.') {
    super(message, suggestion);
  }

  static invalidConventionalCommit(errors: string[]): ValidationError {
    const errorList = errors.join(', ');
    return new ValidationError(
      `Generated commit message doesn't meet Conventional Commits spec: ${errorList}`,
      'Try generating new suggestions. If this persists, report it as a bug.'
    );
  }

  static noValidSuggestions(): ValidationError {
    return new ValidationError(
      'Could not generate valid commit message suggestions',
      'Try again with different changes, or check if your diff is too large.'
    );
  }
}
