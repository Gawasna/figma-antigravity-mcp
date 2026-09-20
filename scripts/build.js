/**
 * Antigravity x Figma MCP - Production Build Script
 *
 * Packages clean production runtime files into dist/ directory.
 * Ensures zero external dependencies, executable permissions, and instructions.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('[Build] Cleaning dist directory...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  console.log('[Build] Copying source files to dist...');
  copyRecursiveSync(SRC_DIR, DIST_DIR);

  // Ensure dist/index.js has executable permissions
  const indexPath = path.join(DIST_DIR, 'index.js');
  if (fs.existsSync(indexPath)) {
    fs.chmodSync(indexPath, 0o755);
  }

  // Generate instructions.md for dist
  const instructionsContent = `# Antigravity x Figma MCP — Production Instructions (v1.0.0)

## Quick Start Protocol
1. **Interactive Browser Login:** Call tool \`figma_auth_login\` to automatically open default browser and get clickable authorization link.
2. **Inspect Authentication:** Call tool \`figma_auth_status\` to verify current tokens and storage path.
3. **Target File Detection:** Call \`figma_get_current_context\` to auto-detect open file in Figma desktop app.
4. **Design Structure:** Call \`get_metadata\` or \`get_design_context\` to explore nodes.
5. **Canvas Mutation:** Call \`use_figma\` to write/edit/create objects via Figma Plugin API sandbox.
6. **FigJam Diagrams:** Call \`generate_diagram\` to render Mermaid flowcharts/diagrams.
`;

  fs.writeFileSync(path.join(DIST_DIR, 'instructions.md'), instructionsContent, 'utf8');
  console.log('[Build] Production build packaged successfully into dist/.');
}

build();
