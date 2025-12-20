# Contributing to Supertag CLI

Thank you for your interest in contributing to Supertag CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- Clear, descriptive title
- Detailed steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, Supertag version)
- Relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Clear, descriptive title
- Detailed description of the proposed functionality
- Rationale for why this enhancement would be useful
- Examples of how it would be used

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `bun install`
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Run the test suite**: `bun test`
6. **Update documentation** if needed
7. **Create a pull request** with a clear description

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.3.4 or higher
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/supertag-cli.git
cd supertag-cli

# Install dependencies
bun install

# Run tests
bun test

# Build binaries
./scripts/build.sh
```

### Project Structure

```
supertag-cli/
├── src/              # Source code
│   ├── commands/     # CLI commands
│   ├── db/           # Database layer
│   ├── mcp/          # MCP server
│   └── ...
├── tests/            # Test files
├── export/           # Browser automation for exports
└── scripts/          # Build and deployment scripts
```

## Coding Standards

### TypeScript Style

- Use TypeScript for all new code
- Follow existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the existing test structure

**Test-Driven Development (TDD) is strongly encouraged:**

1. Write failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (BLUE)

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `chore`: Build/tooling changes

**Example:**
```
feat(mcp): add semantic search tool

Add new MCP tool for semantic search using embeddings.
Supports filtering by tag and date range.

Closes #123
```

## Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/tana-parser.test.ts

# Run with coverage
bun test --coverage
```

## Building

```bash
# Build for current platform
./scripts/build.sh

# Build all platform binaries (macOS, Linux, Windows)
./release.sh
```

## Documentation

- Update README.md for user-facing changes
- Update inline comments for code changes
- Add examples for new features
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)

## Dependencies

### Adding Dependencies

- Use `bun add <package>` for runtime dependencies
- Use `bun add -d <package>` for dev dependencies
- Justify new dependencies in your PR description
- Prefer lightweight, well-maintained packages

### Resona Dependency

The project uses a local `resona` package for embeddings. When contributing:
- Ensure changes work with the local resona setup
- Document any resona-related changes
- Contact maintainers if you need resona modifications

## Questions?

- Open a discussion on GitHub
- Check existing issues and PRs
- Read the documentation in README.md

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- Project README (for major features)

Thank you for contributing to Supertag CLI!
