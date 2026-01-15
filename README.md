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
   - Currently supports: Gemini 2.5 Flash

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
2. 🤖 **Generates** 3-5 commit message suggestions using AI
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
  "model": "gemini-2.5-flash",
  "version": "1.0.0"
}
```

## Requirements

- Node.js >= 18.0.0
- Git installed and configured
- Google Gemini API key

## License

MIT
