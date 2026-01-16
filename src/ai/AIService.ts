import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { buildCommitPrompt } from '../config/CommitPromptTemplate.js';
import { APIError, ValidationError } from '../errors/CustomErrors.js';
import type { CommitSuggestion, GitDiff } from '../types/index.js';
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
   * @param customInstruction Optional custom instruction to add to the prompt
   * @returns Formatted prompt string
   */
  private buildPrompt(diff: GitDiff, customInstruction?: string): string {
    return buildCommitPrompt(diff, customInstruction);
  }

  /**
   * Parse API response into CommitSuggestion array
   * Tries multiple parsing strategies for robustness
   * @param response Raw response text from API
   * @returns Array of commit suggestions
   */
  private parseResponse(response: string): CommitSuggestion[] {
    if (!response || response.trim().length === 0) {
      return [];
    }

    let messages: string[] = [];

    // Strategy 1: Split by "---" on its own line
    const tripleDashPattern = /\n---\n/g;
    if (tripleDashPattern.test(response)) {
      messages = response
        .split(tripleDashPattern)
        .map((msg) => msg.trim())
        .filter((msg) => msg.length > 0);
    }

    // Strategy 2: Split by "---" anywhere
    if (messages.length === 0 || messages.length === 1) {
      messages = response
        .split('---')
        .map((msg) => msg.trim())
        .filter((msg) => msg.length > 0);
    }

    // Strategy 3: Split by numbered items (1., 2., etc.)
    if (messages.length === 0 || messages.length === 1) {
      const numberedPattern = /^\d+\.\s+/gm;
      if (numberedPattern.test(response)) {
        messages = response
          .split(numberedPattern)
          .map((msg) => msg.trim())
          .filter((msg) => msg.length > 0 && !/^\d+\./.test(msg));
      }
    }

    // Strategy 4: Split by double newlines (common for multi-line messages)
    if (messages.length === 0 || messages.length === 1) {
      const doubleNewlinePattern = /\n\n+/;
      if (doubleNewlinePattern.test(response)) {
        const parts = response.split(doubleNewlinePattern);
        // Filter out parts that look like commit messages (start with type:)
        messages = parts
          .map((msg) => msg.trim())
          .filter((msg) => {
            const trimmed = msg.trim();
            return (
              trimmed.length > 0 &&
              /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\([^)]+\))?(!)?:\s/.test(
                trimmed
              )
            );
          });
      }
    }

    // Strategy 5: Try to extract commit messages by pattern matching
    if (messages.length === 0) {
      const commitPattern =
        /(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\([^)]+\))?(!)?:\s[^\n]+(?:\n(?!---|\d+\.)[^\n]+)*/g;
      const matches = response.match(commitPattern);
      if (matches) {
        messages = matches.map((msg) => msg.trim());
      }
    }

    // If still no messages, try to extract any line starting with a valid type
    if (messages.length === 0) {
      const lines = response.split('\n');
      const validTypeLines: string[] = [];
      let currentMessage = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (
          /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\([^)]+\))?(!)?:\s/.test(
            trimmed
          )
        ) {
          if (currentMessage) {
            validTypeLines.push(currentMessage.trim());
          }
          currentMessage = trimmed;
        } else if (currentMessage && trimmed.length > 0) {
          currentMessage += `\n${trimmed}`;
        } else if (currentMessage && trimmed.length === 0) {
          // Blank line - continue building message
          currentMessage += '\n';
        }
      }
      if (currentMessage) {
        validTypeLines.push(currentMessage.trim());
      }
      messages = validTypeLines;
    }

    // Clean up messages - remove any that are clearly not commit messages
    messages = messages
      .map((msg) => {
        // Remove common prefixes AI might add
        return msg
          .replace(/^(Here are|Here's|Generated|Commit messages?):?\s*/i, '')
          .replace(/^[-*•]\s*/, '')
          .trim();
      })
      .filter((msg) => {
        // Must start with a valid commit type
        return (
          msg.length > 0 &&
          /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\([^)]+\))?(!)?:\s/.test(msg)
        );
      });

    return messages.map((message) => ({
      message: message.trim(),
      type: ConventionalCommitsValidator.isSingleLine(message) ? 'single-line' : 'multi-line',
    }));
  }

  /**
   * Filter and validate suggestions, returning only valid ones
   * @param suggestions Array of suggestions to validate
   * @returns Array of valid suggestions
   */
  private filterValidSuggestions(suggestions: CommitSuggestion[]): CommitSuggestion[] {
    const validSuggestions: CommitSuggestion[] = [];

    for (const suggestion of suggestions) {
      const validation = ConventionalCommitsValidator.validate(suggestion.message);
      if (validation.valid) {
        validSuggestions.push(suggestion);
      }
    }

    return validSuggestions;
  }

  /**
   * Check if suggestions meet minimum requirements
   * @param suggestions Array of suggestions to check
   * @returns true if meets minimum requirements
   */
  private meetsMinimumRequirements(suggestions: CommitSuggestion[]): boolean {
    // Need at least 2 valid suggestions
    if (suggestions.length < 2) {
      return false;
    }

    // At least 1 should be single-line (relaxed from 2)
    const singleLineCount = suggestions.filter((s) => s.type === 'single-line').length;
    if (singleLineCount < 1) {
      return false;
    }

    return true;
  }

  /**
   * Generate commit message suggestions using Gemini API
   * @param diff Git diff information
   * @param customInstruction Optional custom instruction to add to the prompt
   * @returns Array of validated commit suggestions
   * @throws APIError if API request fails
   * @throws ValidationError if no valid suggestions generated
   */
  async generateCommitMessages(
    diff: GitDiff,
    customInstruction?: string
  ): Promise<CommitSuggestion[]> {
    let attempts = 0;
    const maxAttempts = 3;
    let bestSuggestions: CommitSuggestion[] = [];

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Build prompt
        const prompt = this.buildPrompt(diff, customInstruction);

        // Call Gemini API with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        );

        const result = await Promise.race([this.model.generateContent(prompt), timeoutPromise]);

        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          continue;
        }

        // Parse response
        const parsedSuggestions = this.parseResponse(text);

        if (parsedSuggestions.length === 0) {
          continue;
        }

        // Filter valid suggestions
        const validSuggestions = this.filterValidSuggestions(parsedSuggestions);

        // If we have valid suggestions, check if they meet requirements
        if (validSuggestions.length > 0) {
          // If we meet minimum requirements, return them
          if (this.meetsMinimumRequirements(validSuggestions)) {
            // Prioritize single-line messages
            const sorted = validSuggestions.sort((a, b) => {
              if (a.type === 'single-line' && b.type !== 'single-line') return -1;
              if (a.type !== 'single-line' && b.type === 'single-line') return 1;
              return 0;
            });
            // Return up to 5 suggestions (as per prompt)
            return sorted.slice(0, 5);
          }

          // Store best suggestions so far
          if (validSuggestions.length > bestSuggestions.length) {
            bestSuggestions = validSuggestions;
          }
        }

        // If we have some valid suggestions but not enough, try to generate more
        if (validSuggestions.length > 0 && validSuggestions.length < 2 && attempts < maxAttempts) {
          // Request more messages in next attempt
          continue;
        }

        // If we have at least 2 valid suggestions, return them even if not perfect
        if (validSuggestions.length >= 2) {
          return validSuggestions.slice(0, 5);
        }
      } catch (error) {
        const errorMessage = (error as Error).message.toLowerCase();

        // Handle specific API errors that shouldn't be retried
        if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          throw APIError.rateLimitExceeded();
        }

        if (
          errorMessage.includes('api key') ||
          errorMessage.includes('auth') ||
          errorMessage.includes('permission')
        ) {
          throw APIError.authenticationFailed();
        }

        if (errorMessage.includes('timeout') || errorMessage.includes('request timeout')) {
          if (attempts >= maxAttempts) {
            throw APIError.timeout();
          }
          // Continue to retry on timeout
          continue;
        }

        // For other errors, continue retrying
        if (attempts < maxAttempts) {
        }
      }
    }

    // If we have some valid suggestions, return them as fallback
    if (bestSuggestions.length >= 1) {
      return bestSuggestions.slice(0, 5);
    }

    // Last resort: try to generate a simple fallback message
    if (bestSuggestions.length === 0) {
      const fallbackMessage = this.generateFallbackMessage(diff);
      if (fallbackMessage) {
        return [
          {
            message: fallbackMessage,
            type: 'single-line',
          },
        ];
      }
    }

    // If all else fails, throw error with helpful message
    throw ValidationError.noValidSuggestions();
  }

  /**
   * Generate a simple fallback commit message when AI fails
   * @param diff Git diff information
   * @returns Simple commit message or null
   */
  private generateFallbackMessage(diff: GitDiff): string | null {
    const combinedDiff = `${diff.staged}\n${diff.unstaged}`.toLowerCase();

    // Simple heuristics to determine commit type
    let type = 'chore';
    if (
      combinedDiff.includes('fix') ||
      combinedDiff.includes('bug') ||
      combinedDiff.includes('error')
    ) {
      type = 'fix';
    } else if (
      combinedDiff.includes('feat') ||
      combinedDiff.includes('add') ||
      combinedDiff.includes('new')
    ) {
      type = 'feat';
    } else if (combinedDiff.includes('doc') || combinedDiff.includes('readme')) {
      type = 'docs';
    } else if (combinedDiff.includes('refactor')) {
      type = 'refactor';
    }

    // Try to extract a simple description
    const lines = combinedDiff.split('\n').slice(0, 5);
    const fileChanges = lines.filter((l) => l.startsWith('+++') || l.startsWith('---'));

    if (fileChanges.length > 0) {
      const firstFile =
        fileChanges[0]
          .replace(/^[+-]{3}\s+/, '')
          .split('/')
          .pop() || 'files';
      return `${type}: update ${firstFile}`;
    }

    return `${type}: update code`;
  }
}
