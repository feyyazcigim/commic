import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import type { CommitSuggestion } from '../types/index.js';

/**
 * Manages terminal UI rendering and visual feedback
 * Provides consistent, colorful interface with emojis and loading indicators
 */
export class UIManager {
  private readonly colors = {
    primary: chalk.cyan,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    muted: chalk.gray
  };

  /**
   * Display welcome message with branding
   */
  showWelcome(): void {
    const welcomeText = chalk.bold.cyan('Commic') + '\n' +
      chalk.gray('AI-powered commit messages with Conventional Commits');
    
    console.log('\n' + boxen(welcomeText, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }));
  }

  /**
   * Display success message with checkmark emoji
   * @param message Success message to display
   */
  showSuccess(message: string): void {
    console.log('\n' + this.colors.success('✨ ' + message) + '\n');
  }

  /**
   * Display error message with cross emoji
   * @param message Error message to display
   * @param details Optional detailed error information
   */
  showError(message: string, details?: string): void {
    console.log('\n' + this.colors.error('❌ Error: ' + message));
    if (details) {
      console.log(this.colors.muted('   ' + details));
    }
    console.log();
  }

  /**
   * Display error with suggestion
   * @param message Error message
   * @param suggestion Actionable suggestion for user
   */
  showErrorWithSuggestion(message: string, suggestion: string): void {
    console.log('\n' + this.colors.error('❌ Error: ' + message));
    console.log(this.colors.info('💡 Suggestion: ' + suggestion) + '\n');
  }

  /**
   * Display informational message with bulb emoji
   * @param message Info message to display
   */
  showInfo(message: string): void {
    console.log('\n' + this.colors.info('💡 ' + message) + '\n');
  }

  /**
   * Display warning message
   * @param message Warning message to display
   */
  showWarning(message: string): void {
    console.log('\n' + this.colors.warning('⚠️  ' + message) + '\n');
  }

  /**
   * Create and start a loading spinner
   * @param message Loading message to display
   * @returns Ora spinner instance
   */
  showLoading(message: string): Ora {
    return ora({
      text: message,
      color: 'cyan',
      spinner: 'dots'
    }).start();
  }

  /**
   * Display a section header
   * @param title Section title
   */
  showSectionHeader(title: string): void {
    console.log('\n' + this.colors.primary.bold(title));
    console.log(this.colors.muted('─'.repeat(title.length)));
  }

  /**
   * Display formatted commit message preview
   * @param message Commit message to preview
   * @param index Optional index number
   */
  showCommitPreview(message: string, index?: number): void {
    const prefix = index !== undefined ? `${index + 1}. ` : '  ';
    const lines = message.split('\n');
    
    console.log(this.colors.muted(prefix) + this.colors.primary(lines[0]));
    
    if (lines.length > 1) {
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          console.log(this.colors.muted('   ' + line));
        }
      });
    }
  }

  /**
   * Clear the console
   */
  clear(): void {
    console.clear();
  }

  /**
   * Display a blank line
   */
  newLine(): void {
    console.log();
  }

  /**
   * Prompt user for API key
   * @returns Entered API key
   */
  async promptForApiKey(): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Gemini API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'API key cannot be empty';
          }
          if (input.length < 20) {
            return 'API key seems too short. Please check and try again.';
          }
          return true;
        }
      }
    ]);
    
    return answer.apiKey.trim();
  }

  /**
   * Prompt user to select a Gemini model
   * @param models Available model options
   * @returns Selected model
   */
  async promptForModel(models: string[]): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Select Gemini model:',
        choices: models.map(model => ({
          name: model === 'gemini-2.5-flash' 
            ? `${model} ${chalk.gray('(recommended)')}`
            : model,
          value: model
        })),
        default: 'gemini-2.5-flash'
      }
    ]);
    
    return answer.model;
  }

  /**
   * Prompt user to select a commit message from suggestions
   * @param suggestions Array of commit message suggestions
   * @returns Index of selected suggestion, or -1 if cancelled
   */
  async promptForCommitSelection(suggestions: CommitSuggestion[]): Promise<number> {
    this.showSectionHeader('📝 Select a commit message');
    this.newLine();

    const choices = suggestions.map((suggestion, index) => {
      const lines = suggestion.message.split('\n');
      const firstLine = lines[0];
      const hasBody = lines.length > 1;
      
      return {
        name: hasBody 
          ? `${firstLine} ${chalk.gray('(multi-line)')}`
          : firstLine,
        value: index,
        short: firstLine
      };
    });

    // Add cancel option
    choices.push({
      name: chalk.red('✖ Cancel (don\'t commit)'),
      value: -1,
      short: 'Cancelled'
    });

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: 'Choose a commit message:',
        choices,
        pageSize: 10,
        loop: false
      }
    ]);

    // Show preview of selected message if not cancelled
    if (answer.selection !== -1) {
      this.newLine();
      this.showSectionHeader('Selected commit message:');
      console.log(this.colors.muted('─'.repeat(50)));
      console.log(this.colors.primary(suggestions[answer.selection].message));
      console.log(this.colors.muted('─'.repeat(50)));
      this.newLine();
    }

    return answer.selection;
  }

  /**
   * Prompt for confirmation
   * @param message Confirmation message
   * @returns true if confirmed, false otherwise
   */
  async promptForConfirmation(message: string): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: true
      }
    ]);
    
    return answer.confirmed;
  }
}
