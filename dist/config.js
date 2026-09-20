/**
 * Antigravity x Figma MCP - Configuration & OS Storage Paths
 *
 * Adheres to standard OS application data conventions:
 * - Windows: %APPDATA%/antigravity-figma-mcp
 * - POSIX/macOS: ~/.config/antigravity-figma-mcp (or XDG_CONFIG_HOME)
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

function getConfigDir() {
  if (process.env.FIGMA_MCP_CONFIG_DIR) {
    return process.env.FIGMA_MCP_CONFIG_DIR;
  }

  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'antigravity-figma-mcp');
  }

  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'antigravity-figma-mcp');
}

function ensureConfigDir() {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

function getTokensPath() {
  return path.join(ensureConfigDir(), 'tokens.json');
}

function getLogPath() {
  return path.join(ensureConfigDir(), 'mcp-traffic.log');
}

/**
 * Automatically migrates existing tokens from legacy prototype directory
 * if the production storage file does not exist yet.
 */
function migrateLegacyTokens() {
  const dest = getTokensPath();
  if (fs.existsSync(dest)) return;

  const legacyPaths = [
    path.join(__dirname, '..', 'prototype', 'tokens.json'),
    path.join(process.cwd(), 'prototype', 'tokens.json')
  ];

  for (const legacy of legacyPaths) {
    if (fs.existsSync(legacy)) {
      try {
        const raw = fs.readFileSync(legacy, 'utf8');
        fs.writeFileSync(dest, raw, { mode: 0o600 });
        break;
      } catch {}
    }
  }
}

// Auto-run migration check on require
migrateLegacyTokens();

module.exports = {
  getConfigDir,
  getTokensPath,
  getLogPath,
  migrateLegacyTokens
};
