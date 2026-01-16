# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Project Information

**Commic** - AI-powered commit messages with Conventional Commits

- **Repository**: [feyyazcigim/commic](https://github.com/feyyazcigim/commic)
- **Description**: AI-powered commit message generator that follows Conventional Commits specification
- **Technologies**: TypeScript (97%), JavaScript (3%)

---

## [v1.0.1] - 2026-01-17

### Added

- **Custom instruction support for AI regeneration**: Users can now provide custom instructions when regenerating commit messages, allowing more control over AI-generated suggestions
  - New `promptForCustomInstruction()` method in UIManager for collecting user input
  - Added regeneration loop in MainOrchestrator to handle custom instructions
  - Custom instruction parameter added to `buildCommitPrompt()` and `generateCommitMessages()`

- **Commit prompt template system**: New dedicated module for prompt construction
  - Created `CommitPromptTemplate. ts` for centralized prompt management
  - Improved prompt with language consistency rules (English-only output)
  - Added file context prioritization logic for better change detection
  - Enhanced handling of new files, renames, and changelogs
  - Type consistency enforcement across all 5 suggestions

- **Interactive regenerate with prompt option**: New UI option to regenerate commit messages with custom instructions
  - Added "🔄 Regenerate with prompt" choice in commit selection menu
  - Selection value `-2` triggers custom instruction prompt flow

### Changed

- **Model upgrade to Gemini 3 Flash Preview**:  Updated default AI model from Gemini 2.5 Flash to Gemini 3 Flash Preview
  - Updated in ConfigManager available models list
  - Updated in README documentation and examples
  - Updated configuration version references

- **Fixed commit message count to 5**: Standardized AI-generated suggestions to always return exactly 5 commit messages
  - Changed from variable count (3-5) to fixed count of 5
  - Updated prompt to generate exactly 3 single-line and 2 multi-line messages
  - Removed `count` parameter from `generateCommitMessages()` method
  - Updated UI messaging to reflect fixed count of 5 suggestions

- **Stage changes earlier in workflow**: Restructured commit workflow to stage all changes before AI generation
  - Moved staging from step 6 to step 2. 5 (before diff analysis)
  - Renamed `stageChangesIfNeeded()` to `stageAllChanges()` - now unconditional
  - Removed conditional logic for unstaged changes
  - Updated success message from "Changes staged" to "All changes staged"

- **Improved diff statistics calculation**: Enhanced GitService to accurately track both staged and unstaged changes
  - Combined staged and unstaged file statistics
  - Fixed insertions/deletions count to include both staged and unstaged changes
  - Uses Set to deduplicate files when counting total files changed

- **Refactored AI prompt construction**: Moved prompt building logic from AIService to dedicated template file
  - `buildPrompt()` method now delegates to `buildCommitPrompt()` function
  - Improved separation of concerns and maintainability
  - Reduced AIService complexity

- **Updated UI generation info display**:  Removed dynamic suggestion count parameter
  - `showAIGenerationInfo()` now only takes model parameter
  - Hard-coded "5" in display message since count is now fixed

### Fixed

- **Selection preview logic**: Fixed preview display to skip both cancel and regenerate options
  - Changed condition from `!== -1` to `!== -1 && !== -2`
  - Prevents preview display when regenerate option is selected

---

## Notes

These changes represent enhancements to the commit message generation workflow, adding user customization capabilities, improving AI model performance, and standardizing the output format for better consistency and user experience. 