import type { ValidationResult, ParsedCommitMessage } from '../types/index.js';

/**
 * Validates commit messages against the Conventional Commits specification
 * https://www.conventionalcommits.org/en/v1.0.0/
 */
export class ConventionalCommitsValidator {
  private static readonly VALID_TYPES = [
    'feat',
    'fix',
    'docs',
    'style',
    'refactor',
    'test',
    'chore',
    'perf',
    'ci',
    'build'
  ];

  // Regex pattern for Conventional Commits format
  // Matches: type(scope)?: description or type(scope)?!: description
  private static readonly COMMIT_PATTERN = /^(\w+)(\([a-z0-9-]+\))?(!)?:\s(.+)$/;

  /**
   * Get list of valid commit types
   * @returns Array of valid type strings
   */
  static getValidTypes(): string[] {
    return [...this.VALID_TYPES];
  }

  /**
   * Validate a commit message against Conventional Commits spec
   * @param message Commit message to validate
   * @returns ValidationResult with valid flag and any errors
   */
  static validate(message: string): ValidationResult {
    const errors: string[] = [];

    if (!message || message.trim().length === 0) {
      errors.push('Commit message cannot be empty');
      return { valid: false, errors };
    }

    // Split into lines to check subject and body separately
    const lines = message.split('\n');
    const subject = lines[0];

    // Validate subject line format
    const match = subject.match(this.COMMIT_PATTERN);
    
    if (!match) {
      errors.push('Subject line must follow format: type(scope)?: description');
      return { valid: false, errors };
    }

    const [, type, , breaking, description] = match;

    // Validate type
    if (!this.VALID_TYPES.includes(type)) {
      errors.push(`Invalid type "${type}". Must be one of: ${this.VALID_TYPES.join(', ')}`);
    }

    // Validate description
    if (!description || description.trim().length === 0) {
      errors.push('Description cannot be empty');
    }

    // Check description starts with lowercase (Conventional Commits convention)
    if (description && /^[A-Z]/.test(description)) {
      errors.push('Description should start with lowercase letter');
    }

    // Validate subject line length (recommended max 72 characters)
    if (subject.length > 72) {
      errors.push('Subject line should be 72 characters or less');
    }

    // If multi-line, validate blank line between subject and body
    if (lines.length > 1 && lines[1].trim() !== '') {
      errors.push('There should be a blank line between subject and body');
    }

    // Check for breaking change notation
    if (breaking === '!' || message.includes('BREAKING CHANGE:')) {
      // This is valid - breaking changes are properly marked
      // No error to add
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse a commit message into its components
   * @param message Commit message to parse
   * @returns Parsed commit message structure
   */
  static parseCommitMessage(message: string): ParsedCommitMessage | null {
    const lines = message.split('\n');
    const subject = lines[0];
    const match = subject.match(this.COMMIT_PATTERN);

    if (!match) {
      return null;
    }

    const [, type, scopeWithParens, breaking, description] = match;
    
    // Extract scope without parentheses
    const scope = scopeWithParens 
      ? scopeWithParens.slice(1, -1) 
      : undefined;

    // Extract body (everything after the blank line)
    const body = lines.length > 2 
      ? lines.slice(2).join('\n').trim() 
      : undefined;

    return {
      type,
      scope,
      breaking: breaking === '!' || message.includes('BREAKING CHANGE:'),
      description,
      body
    };
  }

  /**
   * Check if a message is single-line (no body)
   * @param message Commit message to check
   * @returns true if single-line, false if multi-line
   */
  static isSingleLine(message: string): boolean {
    const lines = message.split('\n').filter(line => line.trim().length > 0);
    return lines.length === 1;
  }
}
