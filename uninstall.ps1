#Requires -Version 5.1
<#
.SYNOPSIS
    Uninstalls supertag-cli

.DESCRIPTION
    Removes supertag-cli binaries and optionally cleans up MCP configurations.
    Does NOT remove Bun or Playwright (may be used by other tools).

.PARAMETER Purge
    Also remove config files and data

.EXAMPLE
    .\uninstall.ps1

.EXAMPLE
    .\uninstall.ps1 -Purge
#>

[CmdletBinding()]
param(
    [switch]$Purge,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# =============================================================================
# Configuration
# =============================================================================

$Script:InstallDir = "$env:USERPROFILE\Tools\supertag-cli"

# =============================================================================
# Utility Functions
# =============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "  → " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Get-Confirmation {
    param(
        [string]$Prompt,
        [bool]$Default = $false
    )

    $suffix = if ($Default) { "[Y/n]" } else { "[y/N]" }
    $response = Read-Host "  $Prompt $suffix"

    if ([string]::IsNullOrWhiteSpace($response)) {
        return $Default
    }

    return $response -match "^[Yy]"
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# =============================================================================
# Uninstall Functions
# =============================================================================

function Remove-FromPath {
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

    if ($currentPath -notlike "*$Script:InstallDir*") {
        Write-Info "PATH entry not found"
        return
    }

    $pathParts = $currentPath -split ";" | Where-Object { $_ -ne $Script:InstallDir -and $_ -ne "" }
    $newPath = $pathParts -join ";"

    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Success "Removed from PATH"
}

function Remove-InstallDir {
    if (Test-Path $Script:InstallDir) {
        Remove-Item -Path $Script:InstallDir -Recurse -Force
        Write-Success "Removed $Script:InstallDir"
    } else {
        Write-Info "Installation directory not found"
    }
}

function Remove-McpConfigs {
    $removed = @()

    # Claude Desktop
    $claudeConfig = "$env:APPDATA\Claude\claude_desktop_config.json"
    if (Remove-McpFromConfig -ConfigFile $claudeConfig) {
        $removed += "Claude Desktop"
    }

    # Cursor
    $cursorConfig = "$env:APPDATA\Cursor\User\globalStorage\cursor-mcp\config.json"
    if (Remove-McpFromConfig -ConfigFile $cursorConfig) {
        $removed += "Cursor"
    }

    # Claude Code
    $claudeCodeConfig = "$env:USERPROFILE\.claude.json"
    if (Remove-McpFromConfig -ConfigFile $claudeCodeConfig) {
        $removed += "Claude Code"
    }

    if ($removed.Count -gt 0) {
        Write-Success "Removed MCP config from: $($removed -join ', ')"
    }
}

function Remove-McpFromConfig {
    param([string]$ConfigFile)

    if (-not (Test-Path $ConfigFile)) {
        return $false
    }

    try {
        $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json -AsHashtable

        if ($config.ContainsKey("mcpServers") -and $config["mcpServers"].ContainsKey("supertag")) {
            $config["mcpServers"].Remove("supertag")

            # Remove mcpServers if empty
            if ($config["mcpServers"].Count -eq 0) {
                $config.Remove("mcpServers")
            }

            # Remove file if empty
            if ($config.Count -eq 0) {
                Remove-Item -Path $ConfigFile -Force
            } else {
                $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
            }

            return $true
        }
    } catch {
        Write-Warning "Could not modify $ConfigFile"
    }

    return $false
}

function Remove-ConfigAndData {
    $configDir = "$env:USERPROFILE\.config\supertag"
    $dataDir = "$env:LOCALAPPDATA\supertag"

    if (Test-Path $configDir) {
        Remove-Item -Path $configDir -Recurse -Force
        Write-Success "Removed config: $configDir"
    }

    if (Test-Path $dataDir) {
        Remove-Item -Path $dataDir -Recurse -Force
        Write-Success "Removed data: $dataDir"
    }
}

function Remove-NodePathEntry {
    $currentNodePath = [Environment]::GetEnvironmentVariable("NODE_PATH", "User")

    if ($currentNodePath -and $currentNodePath -like "*bun*") {
        # Only remove bun-related entries
        $pathParts = $currentNodePath -split ";" | Where-Object { $_ -notlike "*bun*" -and $_ -ne "" }

        if ($pathParts.Count -eq 0) {
            [Environment]::SetEnvironmentVariable("NODE_PATH", $null, "User")
        } else {
            $newPath = $pathParts -join ";"
            [Environment]::SetEnvironmentVariable("NODE_PATH", $newPath, "User")
        }

        Write-Success "Cleaned NODE_PATH"
    }
}

# =============================================================================
# Main
# =============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "Uninstalling supertag-cli" -ForegroundColor White
    Write-Host ""
}

function Write-HelpMessage {
    Write-Host "supertag-cli uninstaller"
    Write-Host ""
    Write-Host "Usage: uninstall.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Purge   Also remove config files and data"
    Write-Host "  -Help    Show this help message"
    Write-Host ""
}

function Main {
    if ($Help) {
        Write-HelpMessage
        return
    }

    Write-Banner

    # Check if installed
    $isInstalled = (Test-Path $Script:InstallDir) -or (Test-Command "supertag")

    if (-not $isInstalled) {
        Write-Info "supertag-cli doesn't appear to be installed"
        return
    }

    Write-Host "This will remove:"
    Write-Host "  - supertag-cli binaries from $Script:InstallDir"
    Write-Host "  - PATH entry"
    if ($Purge) {
        Write-Host "  - Configuration and data files"
    }
    Write-Host ""

    if (-not (Get-Confirmation -Prompt "Continue?")) {
        Write-Host "Cancelled."
        return
    }

    Write-Host ""

    Remove-FromPath
    Remove-InstallDir
    Remove-NodePathEntry

    if (Get-Confirmation -Prompt "Remove MCP configurations?") {
        Remove-McpConfigs
    }

    if ($Purge) {
        Remove-ConfigAndData
    }

    Write-Host ""
    Write-Host "supertag-cli uninstalled" -ForegroundColor Green
    Write-Host ""
    Write-Warning "Bun and Playwright were NOT removed (may be used by other tools)"
    Write-Host ""
}

Main
