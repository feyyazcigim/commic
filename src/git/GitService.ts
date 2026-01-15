import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { type SimpleGit, simpleGit } from 'simple-git';
import { GitRepositoryError } from '../errors/CustomErrors.js';
import type { GitDiff, GitRepository } from '../types/index.js';

/**
 * Handles all Git operations including repository discovery, diff retrieval, and commits
 */
export class GitService {
  /**
   * Find Git repository by walking up the directory tree
   * @param startPath Starting path to search from
   * @returns GitRepository with path and root information
   * @throws GitRepositoryError if no repository found or path not accessible
   */
  async findRepository(startPath: string): Promise<GitRepository> {
    try {
      // Normalize and resolve the path
      const normalizedPath = this.normalizePath(startPath);
      const resolvedPath = resolve(normalizedPath);

      // Check if path exists and is accessible
      try {
        await fs.access(resolvedPath);
      } catch {
        throw GitRepositoryError.pathNotAccessible(resolvedPath);
      }

      // Walk up directory tree looking for .git folder
      let currentPath = resolvedPath;
      const root = '/';

      while (currentPath !== root) {
        const gitPath = join(currentPath, '.git');

        try {
          const stats = await fs.stat(gitPath);
          if (stats.isDirectory()) {
            // Found .git directory
            return {
              path: resolvedPath,
              rootPath: currentPath,
            };
          }
        } catch {
          // .git not found at this level, continue up
        }

        // Move up one directory
        const parentPath = dirname(currentPath);
        if (parentPath === currentPath) {
          // Reached root without finding .git
          break;
        }
        currentPath = parentPath;
      }

      // No .git directory found
      throw GitRepositoryError.noRepositoryFound(resolvedPath);
    } catch (error) {
      if (error instanceof GitRepositoryError) {
        throw error;
      }
      throw GitRepositoryError.pathNotAccessible(startPath);
    }
  }

  /**
   * Normalize path by removing trailing slashes and resolving relative paths
   * @param path Path to normalize
   * @returns Normalized path
   */
  private normalizePath(path: string): string {
    // Remove trailing slashes
    let normalized = path.replace(/\/+$/, '');

    // Handle empty string (current directory)
    if (normalized === '') {
      normalized = '.';
    }

    return normalized;
  }

  /**
   * Check if repository has any commits
   * @param repoPath Path to repository root
   * @returns true if repository has commits, false if empty
   * @throws GitRepositoryError if check fails
   */
  async hasCommits(repoPath: string): Promise<boolean> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      const log = await git.log({ maxCount: 1 });
      return log.total > 0;
    } catch (_error) {
      // If git log fails, repository likely has no commits
      return false;
    }
  }

  /**
   * Get diff between HEAD and current working state
   * @param repoPath Path to repository root
   * @returns GitDiff with staged, unstaged changes and hasChanges flag
   * @throws GitRepositoryError if diff retrieval fails
   */
  async getDiff(repoPath: string): Promise<GitDiff> {
    try {
      const git: SimpleGit = simpleGit(repoPath);

      // Get staged changes (diff --cached)
      const staged = await git.diff(['--cached']);

      // Get unstaged changes (diff)
      const unstaged = await git.diff();

      const hasChanges = staged.length > 0 || unstaged.length > 0;

      return {
        staged,
        unstaged,
        hasChanges,
      };
    } catch (error) {
      throw new GitRepositoryError(
        `Failed to retrieve Git diff: ${(error as Error).message}`,
        'Ensure you are in a valid Git repository with proper permissions.'
      );
    }
  }

  /**
   * Stage all changes in the repository
   * @param repoPath Path to repository root
   * @throws GitRepositoryError if staging fails
   */
  async stageAll(repoPath: string): Promise<void> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      await git.add('.');
    } catch (error) {
      throw new GitRepositoryError(
        `Failed to stage changes: ${(error as Error).message}`,
        'Check if you have permission to modify the repository.'
      );
    }
  }

  /**
   * Execute git commit with the provided message
   * @param repoPath Path to repository root
   * @param message Commit message
   * @returns Commit hash
   * @throws GitRepositoryError if commit fails
   */
  async commit(repoPath: string, message: string): Promise<string> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      const result = await git.commit(message);

      // Extract commit hash from result
      const commitHash = result.commit || 'unknown';

      return commitHash;
    } catch (error) {
      throw GitRepositoryError.commitFailed((error as Error).message);
    }
  }

  /**
   * Get current branch name
   * @param repoPath Path to repository root
   * @returns Current branch name
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (_error) {
      return 'unknown';
    }
  }

  /**
   * Get repository name from path
   * @param repoPath Path to repository root
   * @returns Repository name (last directory in path)
   */
  getRepositoryName(repoPath: string): string {
    const parts = repoPath.split('/').filter((p) => p.length > 0);
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Get diff statistics (files changed, insertions, deletions)
   * @param repoPath Path to repository root
   * @returns Statistics object
   */
  async getDiffStats(repoPath: string): Promise<{
    filesChanged: number;
    insertions: number;
    deletions: number;
  }> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      const diffSummary = await git.diffSummary();

      return {
        filesChanged: diffSummary.files.length,
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
      };
    } catch (_error) {
      return {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      };
    }
  }

  /**
   * Get remote repository URL
   * @param repoPath Path to repository root
   * @param remoteName Remote name (default: 'origin')
   * @returns Remote URL or null if no remote configured
   */
  async getRemoteUrl(repoPath: string, remoteName: string = 'origin'): Promise<string | null> {
    try {
      const git: SimpleGit = simpleGit(repoPath);
      const remotes = await git.getRemotes(true);
      const remote = remotes.find((r) => r.name === remoteName);

      if (remote?.refs?.fetch) {
        return remote.refs.fetch;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }
}
