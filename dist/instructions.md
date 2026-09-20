# Antigravity x Figma MCP — Production Instructions (v1.0.0)

## Quick Start Protocol
1. **Interactive Browser Login:** Call tool `figma_auth_login` to automatically open default browser and get clickable authorization link.
2. **Inspect Authentication:** Call tool `figma_auth_status` to verify current tokens and storage path.
3. **Target File Detection:** Call `figma_get_current_context` to auto-detect open file in Figma desktop app.
4. **Design Structure:** Call `get_metadata` or `get_design_context` to explore nodes.
5. **Canvas Mutation:** Call `use_figma` to write/edit/create objects via Figma Plugin API sandbox.
6. **FigJam Diagrams:** Call `generate_diagram` to render Mermaid flowcharts/diagrams.
