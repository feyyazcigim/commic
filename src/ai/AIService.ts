import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { GitDiff, CommitSuggestion } from '../types/index.js';
import { APIError, ValidationError } from '../errors/CustomErrors.js';
import { ConventionalCommitsValidator } from '../validation/ConventionalCommitsValidator.js';

/**
 * Handles AI-powered commit message generation using Google's Gemini API
 */
export class AIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(apiKey: string, modelName: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Build prompt for Gemini API to generate commit messages
   * @param diff Git diff information
   * @param count Number of suggestions to generate (3-5)
   * @returns Formatted prompt string
   */
  private buildPrompt(diff: GitDiff, count: number): string {
    // Combine staged and unstaged diffs
    const combinedDiff = [diff.staged, diff.unstaged]
      .filter(d => d.length > 0)
      .join('\n\n');

    // Truncate diff if too large (Gemini has token limits)
    const maxDiffLength = 8000;
    const truncatedDiff = combinedDiff.length > maxDiffLength
      ? combinedDiff.substring(0, maxDiffLength) + '\n\n[... diff truncated ...]'
      : combinedDiff;

    return `You are a Git commit message expert. Analyze the following Git diff and generate exactly ${count} commit messages following the Conventional Commits specification (https://www.conventionalcommits.org/).

REQUIREMENTS:
- Generate exactly ${count} commit messages
- At least 2 messages MUST be single-line (subject only, no body)
- Use valid types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Include scope when relevant: type(scope): description
- Use imperative mood: "add feature" not "added feature"
- Description must start with lowercase letter
- Keep single-line messages under 72 characters
- For multi-line messages, include a blank line between subject and body
- Use "!" after type/scope for breaking changes, or include "BREAKING CHANGE:" in body

FORMAT:
Return ONLY the commit messages, separated by "---" (three dashes on a new line).
Do not include any explanations, numbering, or additional text.

EXAMPLE OUTPUT:
feat(auth): add JWT authentication
---
fix: resolve memory leak in event handler
---
docs: update installation instructions
---
refactor(api): restructure endpoint handlers

Improve error handling and add validation
---
perf(database): optimize query performance

Add indexes and connection pooling for faster queries

GIT DIFF:
${truncatedDiff}

Generate ${count} commit messages now:`;
  }

  /**
   * Parse API response into CommitSuggestion array
   * @param response Raw response text from API
   * @returns Array of commit suggestions
   */
  private parseResponse(response: string): CommitSuggestion[] {
    // Split by separator
    const messages = response
      .split('---')
      .map(msg => msg.trim())
      .filter(msg => msg.length > 0);

    return messages.map(message => ({
      message,
      type: ConventionalCommitsValidator.isSingleLine(message) ? 'single-line' : 'multi-line'
    }));
  }

  /**
   * Validate that suggestions meet requirements
   * @param suggestions Array of suggestions to validate
   * @returns true if valid, false otherwise
   */
  private validateSuggestions(suggestions: CommitSuggestion[]): boolean {
    // Check count (3-5)
    if (suggestions.length < 3 || suggestions.length > 5) {
      return false;
    }

    // Check at least 2 are single-line
    const singleLineCount = suggestions.filter(s => s.type === 'single-line').length;
    if (singleLineCount < 2) {
      return false;
    }

    // Validate each message against Conventional Commits
    for (const suggestion of suggestions) {
      const validation = ConventionalCommitsValidator.validate(suggestion.message);
      if (!validation.valid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate commit message suggestions using Gemini API
   * @param diff Git diff information
   * @param count Number of suggestions to generate (3-5)
   * @returns Array of validated commit suggestions
   * @throws APIError if API request fails
   * @throws ValidationError if no valid suggestions generated
   */
  async generateCommitMessages(diff: GitDiff, count: number = 4): Promise<CommitSuggestion[]> {
    // Ensure count is within bounds
    const requestCount = Math.max(3, Math.min(5, count));

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Build prompt
        const prompt = this.buildPrompt(diff, requestCount);

        // Call Gemini API
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw APIError.invalidResponse();
        }

        // Parse response
        const suggestions = this.parseResponse(text);

        // Validate suggestions
        if (this.validateSuggestions(suggestions)) {
          return suggestions;
        }

        // If validation failed and we have attempts left, try again
        if (attempts < maxAttempts) {
          continue;
        }

        throw ValidationError.noValidSuggestions();
      } catch (error) {
        // Handle specific API errors
        if (error instanceof ValidationError) {
          throw error;
        }

        const errorMessage = (error as Error).message.toLowerCase();

        // Check for rate limiting
        if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          throw APIError.rateLimitExceeded();
        }

        // Check for authentication errors
        if (errorMessage.includes('api key') || errorMessage.includes('auth')) {
          throw APIError.authenticationFailed();
        }

        // Check for timeout
        if (errorMessage.includes('timeout')) {
          throw APIError.timeout();
        }

        // Generic API error
        if (attempts >= maxAttempts) {
          throw APIError.requestFailed(error as Error);
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw ValidationError.noValidSuggestions();
  }
}