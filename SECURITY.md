# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.12.x  | :white_check_mark: |
| < 0.12  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Supertag CLI, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send details to info@invisible.ch
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days

### After Resolution

- We will credit you in the release notes (unless you prefer anonymity)
- We may reach out for clarification during the fix process
- You will be notified when the fix is released

## Security Best Practices for Users

### API Token Security

- Store your Tana API token securely in `~/.config/supertag/config.json`
- Never commit your config file to version control
- The config file should have restrictive permissions (readable only by you)

### Database Security

- The SQLite database at `~/.local/share/supertag/` contains your Tana data
- Ensure appropriate file permissions
- Consider encrypting your home directory on shared systems

## Scope

This security policy applies to:

- The `supertag` CLI binary
- The `supertag-export` CLI binary
- The `supertag-mcp` MCP server
- All source code in this repository

Third-party dependencies have their own security policies.
