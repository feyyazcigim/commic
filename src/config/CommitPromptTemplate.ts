import type { GitDiff } from '../types/index.js';

/**
 * Builds the prompt template for generating commit messages
 * @param diff Git diff information
 * @param customInstruction Optional custom instruction from user
 * @returns Formatted prompt string
 */
export function buildCommitPrompt(diff: GitDiff, customInstruction?: string): string {
  // Combine staged and unstaged diffs
  const combinedDiff = [diff.staged, diff.unstaged].filter((d) => d.length > 0).join('\n\n');

  // Truncate diff if too large (Gemini input token limit: 1,048,576 tokens)
  // Using ~800K characters (approx 200K-266K tokens) leaves plenty of room for prompt
  // 1 token ≈ 3-4 characters on average, so 800K chars ≈ 200K-266K tokens
  const maxDiffLength = 800000;
  const truncatedDiff =
    combinedDiff.length > maxDiffLength
      ? combinedDiff.substring(0, maxDiffLength) +
        '\n\n[... diff truncated due to size limit ...]'
      : combinedDiff;

  return `You are an expert Git commit message writer. Analyze the ENTIRE Git diff below and generate exactly 5 commit messages that summarize ALL changes together. Each commit message should cover the complete set of changes, not individual features.

IMPORTANT:
- Analyze ALL changes in the diff as a single commit
- Each suggested message should describe the complete set of changes
- Do NOT create separate messages for different parts of the diff
- Consider all file changes, additions, deletions, and modifications together
- Provide different perspectives/styles for the SAME set of changes

LANGUAGE:
- Output must be in English only.
- Commit subjects and bodies must be English, even if the diff content or comments are in another language.
- Do NOT include any non-English words unless they are proper nouns or exact identifiers from the diff.

FILE CONTEXT FIRST (NEW / RENAMED FILES):
- Treat added, removed, or renamed files as high-signal context.
- When a new file is added, first infer its purpose from:
  1) file path and directory (e.g., docs/, .github/, scripts/, src/, config/)
  2) file name and extension (e.g., CHANGELOG.md, README.md, package.json, *.yml)
  3) how or where it is referenced by other changes in the diff
- Only after that, use the file contents for details.
- Do NOT let incidental values inside the file override the primary change.

CONTEXT PRIORITY EXAMPLES:
- If CHANGELOG.md (or similar release notes) is added or newly introduced, the message must mention adding or updating the changelog as a primary change.
- For generated or aggregated artifacts (changelog entries, lockfiles, snapshots), summarize the artifact-level change rather than listing internal values.

ADDITIONAL CRITICAL RULE (TYPE CONSISTENCY):
- First, determine ONE primary commit type that best matches the ENTIRE diff.
- Then, ALL 5 suggested commit messages MUST use the SAME chosen type.
- Do NOT vary the type across suggestions.
- Vary only wording, style, emphasis, and optionally scope.

Type selection guidance (pick the single best fit for the whole diff):
- feat: new user-facing capability or new behavior
- fix: bug fix or incorrect behavior
- refactor: internal restructuring without behavior change
- perf: performance improvements
- docs: documentation-only changes (README, CHANGELOG, /docs)
- test: test-only changes
- ci: CI pipeline or workflow changes
- build: build system or dependency changes
- chore: maintenance, tooling, or non-functional changes
- style: formatting-only changes (no logic change)
If multiple apply, choose the most user-impacting one.
If unclear, choose chore.
Type selection must prioritize file context over content details.

Avoid overfitting to literal values (versions, numbers, dates) unless the main purpose of the diff is to change those values.

CRITICAL RULES:
1. Format: <CHOSEN_TYPE>(scope)?: description
2. Valid types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
3. Use imperative mood (add, fix, update — NOT added, fixed, updated)
4. Description must start with lowercase
5. Single-line messages: max 72 characters, no body
6. Multi-line messages: blank line between subject and body
7. Output must include exactly:
   - 3 single-line commit messages
   - 2 multi-line commit messages
8. Each message must summarize ALL changes in the diff
9. Do NOT output the chosen type separately; it must only appear in the messages.

OUTPUT FORMAT:
- Separate each commit message with exactly "---" on its own line.
- Return ONLY the commit messages, no explanations, no numbering.

${customInstruction ? `USER INSTRUCTION:\n${customInstruction}\n\n` : ''}GIT DIFF:
${truncatedDiff}

Generate exactly 5 commit messages that each describe ALL the changes above:`;
}
