# Commic ✨

AI-powered Git commit message generator that creates beautiful, Conventional Commits compliant messages using Google's Gemini API.

## Features

🤖 **AI-Powered**: Leverages Google Gemini to analyze your changes and generate contextual commit messages  
📝 **Conventional Commits**: All messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification  
🎨 **Beautiful UI**: Colorful, emoji-enhanced terminal interface  
⚡ **Fast & Easy**: Interactive selection from 3-5 AI-generated suggestions  
🔧 **Flexible**: Works with any Git repository, supports custom paths  

## Installation

### Global Installation

```bash
npm install -g commic
```

### Local Development

```bash
git clone <repository-url>
cd commic
npm install
npm link
```

## First-Time Setup

On your first run, Commic will guide you through a quick setup:

1. **API Key**: You'll be prompted to enter your Google Gemini API key
   - Get your free API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
   
2. **Model Selection**: Choose your preferred Gemini model
   - Currently supports: Gemini 3 Flash Preview

Your configuration is saved to `~/.commic/config.json` for future use.

## Usage

### Basic Usage

Run in your current Git repository:

```bash
commic .
```

### Specify a Repository Path

Commit to a different repository:

```bash
# Relative path
commic ../other-repo/

# Absolute path
commic /path/to/repository/
```

### Reconfigure

Update your API key or model preference:

```bash
commic --reconfigure
```

## How It Works

1. 🔍 **Analyzes** your Git changes (staged and unstaged)
2. 🤖 **Generates** 5 commit message suggestions using AI
3. 🎯 **Validates** all messages against Conventional Commits spec
4. ✨ **Presents** an interactive menu for selection
5. 🚀 **Commits** automatically with your chosen message

## Conventional Commits Format

All generated messages follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```
feat(auth): add JWT authentication

fix: resolve memory leak in event handler

docs: update installation instructions

refactor(api)!: restructure endpoint handlers

BREAKING CHANGE: API endpoints now require authentication
```

## Troubleshooting

### "No Git repository found"

Make sure you're running the command in a Git repository or providing a valid path to one.

```bash
git init  # Initialize a new repository if needed
```

### "Repository has no commits"

Create an initial commit first:

```bash
git add .
git commit -m "Initial commit"
```

### "API key invalid"

Reconfigure with a valid API key:

```bash
commic --reconfigure
```

### "No changes to commit"

Make some changes to your files first, or check if everything is already committed:

```bash
git status
```

## Configuration

Configuration is stored at `~/.commic/config.json`:

```json
{
  "apiKey": "your-api-key",
  "model": "gemini-3-flash-preview",
  "version": "1.0.0"
}
```

## Requirements

- Node.js >= 18.0.0
- Git installed and configured
- Google Gemini API key

## Contributing

We welcome contributions from the open-source community! This guide will help you get started.

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/commic.git
   cd commic
   ```

2. **Install dependencies and set up Git hooks**
   ```bash
   npm install
   ```
   
   > **Note**: `npm install` automatically runs the `prepare` script which sets up Git hooks via Husky. If Git hooks don't work after installation, manually run `npm run prepare` to set them up.

3. **Link the package locally for testing**
   ```bash
   npm link
   ```

### Code Quality & Linting

This project uses [Biome](https://biomejs.dev/) for linting and formatting to ensure consistent code quality.

#### Automatic Linting on Commit

We use [Husky](https://typicode.github.io/husky/) to automatically run linting and auto-fix issues before each commit. This ensures all code follows our standards:

- **Pre-commit hook**: Automatically runs `biome check --write --unsafe` before every commit
- **Auto-fix**: Automatically fixes linting issues that can be auto-fixed
- **Commit blocked**: If there are unfixable errors, the commit will be blocked

> **Setup**: Git hooks are automatically set up when you run `npm install` (via the `prepare` script). If hooks don't work, run `npm run prepare` manually.

You don't need to do anything special - just commit as normal, and the hook will handle the rest!

#### Manual Linting Commands

You can also run linting manually:

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code only
npm run format
```

#### Linting Rules

Our Biome configuration enforces:
- ✅ **Code formatting**: Consistent indentation, spacing, and line breaks
- ✅ **Import organization**: Automatic import sorting
- ✅ **Unused code detection**: Flags unused variables and imports
- ✅ **Best practices**: Enforces const usage, template literals, and more
- ⚠️ **TypeScript**: Warns on explicit `any` types

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code patterns
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   npm run build
   npm run link  # Test locally
   ```

4. **Commit your changes**
   ```bash
   commic .
   ```
   
   The pre-commit hook will automatically:
   - Format your code
   - Fix linting issues
   - Organize imports
   
   If there are errors that can't be auto-fixed, fix them manually and try again.

5. **Push and create a Pull Request**
   ```bash
   git push origin feat/your-feature-name
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes
- `build:` - Build system changes

### Pull Request Process

1. Ensure your code passes all linting checks (handled automatically)
2. Update documentation if needed
3. Write clear commit messages
4. Reference any related issues in your PR description
5. Wait for code review and address feedback

### Questions?

If you have questions or need help, feel free to:
- Open an issue for discussion
- Check existing issues and PRs
- Review the codebase to understand patterns

Thank you for contributing! 🎉

## License

MIT
