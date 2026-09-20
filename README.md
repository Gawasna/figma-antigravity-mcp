# Antigravity x Figma Remote MCP

A lightweight, zero-dependency MCP adapter that bridges **Google Antigravity IDE** (and any MCP client) to **Figma Remote MCP** (`https://mcp.figma.com/mcp`) with **native canvas write capabilities** and **1-click browser OAuth**.

---

## What It Does

- **Bypasses Figma Client Whitelist:** Enables Antigravity IDE to connect without the `OAuth app with client id ... doesn't exist` error.
- **Unlocks Full Canvas Write Access:** Allows agents to create frames, modify styles, build components, and run Figma Plugin API scripts live via `use_figma`.
- **1-Click Browser Login:** Launches your default browser for authorization; no manual terminal tokens needed.
- **Document Awareness:** Automatically detects open Figma files to prevent accidental file creation.

---

## Requirements

- [Node.js](https://nodejs.org/) >= 18.0.0

---

## Installation & Setup

### Option 1: One-Line Installer (Recommended)

Run in PowerShell:
```powershell
irm https://raw.githubusercontent.com/Gawasna/figma-antigravity-mcp/main/install.ps1 | iex
```
The script downloads distribution files to `~/.antigravity-figma-mcp` and automatically configures your Antigravity IDE `mcp_config.json`.

---

### Option 2: Pre-built Release Asset

1. Download the latest `figma-antigravity-mcp-*.zip` from [GitHub Releases](https://github.com/Gawasna/figma-antigravity-mcp/releases).
2. Extract it to any preferred directory.
3. Add the server entry to your `mcp_config.json` (`~/.gemini/config/mcp_config.json` on Antigravity IDE):

```json
{
  "mcpServers": {
    "figma-remote": {
      "command": "node",
      "args": [
        "C:/path/to/extracted/dist/index.js"
      ]
    }
  }
}
```

---

### Development: Customizing & Building from Source

If you want to modify the source code or extend tool behaviors:

1. Clone the repository:
   ```bash
   git clone https://github.com/Gawasna/figma-antigravity-mcp.git
   cd figma-antigravity-mcp
   ```
2. Edit source code under `src/`.
3. Package changes into `dist/`:
   ```bash
   npm run build
   ```
4. Run automated test suite:
   ```bash
   npm test
   ```

---

## How to Authorize

Simply ask your agent in Antigravity IDE:
> *"Connect to my Figma account"*

The agent will launch your default browser to approve access. Once approved, you are ready to read and write Figma designs directly from the IDE.

Alternatively, authenticate via CLI:
```bash
node dist/index.js --login
```

---

## Exposed Tools

This adapter exposes **39 tools** to your AI agent:
- **1 Local Awareness Tool** (`figma_get_current_context`) to inspect open documents in Figma desktop.
- **38 Upstream Figma Tools** covering native canvas mutation (`use_figma`), design inspection (`get_design_context`), Code Connect, FigJam diagrams, video export, shaders, and Weave workflows.

See [TOOLS.md](TOOLS.md) for full tool list and documentation.
