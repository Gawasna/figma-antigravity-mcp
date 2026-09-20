# Antigravity x Figma Remote MCP Installer
# Usage:
#   irm https://raw.githubusercontent.com/Gawasna/figma-antigravity-mcp/main/install.ps1 | iex
#   or locally: .\install.ps1

$ErrorActionPreference = 'Stop'

function Get-YesNoChoice {
    param(
        [string]$PromptMessage,
        [string]$DefaultChoice = 'Y'
    )

    $defaultDisplay = if ($DefaultChoice -eq 'Y') { "[Y/n]" } else { "[y/N]" }

    while ($true) {
        $inputStr = Read-Host "$PromptMessage $defaultDisplay"
        $clean = $inputStr.Trim()

        if ($clean -eq '') {
            return ($DefaultChoice -eq 'Y')
        }

        if ($clean -match '^(y|yes)$') {
            return $true
        }

        if ($clean -match '^(n|no)$') {
            return $false
        }

        Write-Host "Invalid input '$clean'. Please enter 'y' or 'n'." -ForegroundColor Yellow
    }
}

# 1. Environment Check
try {
    $nodeVer = node -v 2>$null
    if ($nodeVer) {
        $major = [int]($nodeVer -replace '^v(\d+)\..*$', '$1')
        if ($major -lt 18) {
            Write-Host "Notice: Node.js $nodeVer detected. Version 18+ is recommended." -ForegroundColor Yellow
        } else {
            Write-Host "Node.js $nodeVer verified." -ForegroundColor Green
        }
    } else {
        Write-Host "Notice: Node.js is not in PATH. Please install Node 18+ before running the server." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Notice: Could not verify Node.js version." -ForegroundColor Yellow
}

# 2. Target Directory & Source Resolution
$targetDir = Join-Path $HOME ".antigravity-figma-mcp"
$installToHome = Get-YesNoChoice -PromptMessage "Install to user directory ($targetDir)?" -DefaultChoice 'Y'
if (-not $installToHome) {
    $targetDir = (Get-Location).Path
}

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$localDist = Join-Path (Get-Location).Path "dist"
if (Test-Path $localDist) {
    Copy-Item -Path $localDist -Destination $targetDir -Recurse -Force
    $localPkg = Join-Path (Get-Location).Path "package.json"
    if (Test-Path $localPkg) {
        Copy-Item -Path $localPkg -Destination $targetDir -Force
    }
} else {
    Write-Host "Downloading release archive from GitHub..." -ForegroundColor Cyan
    $zipUrl = "https://github.com/Gawasna/figma-antigravity-mcp/archive/refs/heads/main.zip"
    $tempZip = Join-Path $env:TEMP "figma-antigravity-mcp.zip"
    $tempDir = Join-Path $env:TEMP "figma-antigravity-mcp-extract"

    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
    Invoke-RestMethod -Uri $zipUrl -OutFile $tempZip
    Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force

    $srcDist = Join-Path $tempDir "figma-antigravity-mcp-main\dist"
    $srcPkg = Join-Path $tempDir "figma-antigravity-mcp-main\package.json"

    Copy-Item -Path $srcDist -Destination $targetDir -Recurse -Force
    if (Test-Path $srcPkg) { Copy-Item -Path $srcPkg -Destination $targetDir -Force }

    Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

$entryPoint = (Join-Path $targetDir "dist\index.js").Replace('\', '/')
Write-Host "Installed files to: $targetDir" -ForegroundColor Green

# 3. Antigravity IDE Configuration
$mcpConfigPath = Join-Path $HOME ".gemini\config\mcp_config.json"
$autoConfig = Get-YesNoChoice -PromptMessage "Auto-configure Antigravity IDE ($mcpConfigPath)?" -DefaultChoice 'Y'
if ($autoConfig) {
    if (Test-Path $mcpConfigPath) {
        try {
            $json = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
            if (-not $json.mcpServers) {
                $json | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
            }

            $serverConfig = [PSCustomObject]@{
                command = "node"
                args = @($entryPoint)
            }

            $json.mcpServers | Add-Member -MemberType NoteProperty -Name "figma-remote" -Value $serverConfig -Force
            Set-Content -Path $mcpConfigPath -Value ($json | ConvertTo-Json -Depth 10) -Encoding utf8
            Write-Host "Configured 'figma-remote' in $mcpConfigPath" -ForegroundColor Green
        } catch {
            Write-Host "Could not auto-write to $mcpConfigPath. Add manually:" -ForegroundColor Yellow
            Write-Host "`"figma-remote`": { `"command`": `"node`", `"args`": [`"$entryPoint`"] }" -ForegroundColor Cyan
        }
    } else {
        Write-Host "Config file not found at $mcpConfigPath. Add manually:" -ForegroundColor Yellow
        Write-Host "`"figma-remote`": { `"command`": `"node`", `"args`": [`"$entryPoint`"] }" -ForegroundColor Cyan
    }
}

# 4. Optional 1-Click Login
$login = Get-YesNoChoice -PromptMessage "Authorize Figma in browser right now?" -DefaultChoice 'Y'
if ($login) {
    Write-Host "Opening browser for one-click authorization..." -ForegroundColor Cyan
    & node "$entryPoint" --login
} else {
    Write-Host "Ready to use. You can authorize later inside IDE chat by asking: 'Connect to Figma'." -ForegroundColor DarkGray
}
