#!/usr/bin/env node

/**
 * Antigravity x Figma MCP - CLI & Stdio Server Entry Point
 *
 * Usage:
 *   npx antigravity-figma-mcp               # Start MCP Stdio Server
 *   node dist/index.js                      # Start MCP Stdio Server
 *   node dist/index.js --login              # Trigger interactive browser login
 *   node dist/index.js --status             # Check current authentication status
 *   node dist/index.js --version            # Print version
 */

const { startServer } = require('./server');
const { startOneClickLogin, getAuthStatus } = require('./auth');
const pkg = require('../package.json');

const args = process.argv.slice(2);

async function main() {
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`antigravity-figma-mcp v${pkg.version}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Antigravity x Figma Remote MCP Adapter (v${pkg.version})

Commands:
  (no args)       Start MCP Stdio server for Antigravity IDE
  --login         Launch one-click browser authorization
  --status        Show active authentication state and token storage path
  --version       Display version
  --help          Display this help message
    `);
    process.exit(0);
  }

  if (args.includes('--status')) {
    const status = getAuthStatus();
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }

  if (args.includes('--login')) {
    console.log('Initiating one-click Figma OAuth authorization...');
    const session = await startOneClickLogin();
    console.log(`Opening default browser to:\n${session.authUrl}\n`);
    console.log('Waiting for approval in browser...');
    try {
      await session.promise;
      console.log('Authentication successful! Token saved securely.');
      process.exit(0);
    } catch (err) {
      console.error('Authentication failed:', err.message);
      process.exit(1);
    }
  }

  // Default: start MCP stdio server
  startServer();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
