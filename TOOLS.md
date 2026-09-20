# Exposed Tools Reference

Antigravity x Figma Remote MCP exposes **39 tools** to the agent: **1 local context-awareness tool** plus the **38 native Figma Remote MCP upstream tools**.

---

## Tool Index

| # | Tool Name | Type | Purpose |
|---|---|---|---|
| 1 | `figma_get_current_context` | Local | Auto-detect open Figma desktop file and selection |
| 2 | `use_figma` | Upstream (Write) | Execute JavaScript sandbox commands to create/edit any design |
| 3 | `create_new_file` | Upstream (Write) | Create new Figma Design, FigJam, or Slides files |
| 4 | `upload_assets` | Upstream (Write) | Upload images and SVGs into canvas |
| 5 | `generate_diagram` | Upstream (Write) | Generate FigJam diagrams from Mermaid syntax |
| 6 | `generate_figma_design` | Upstream (Write) | Capture live web pages by URL into Figma |
| 7 | `get_design_context` | Upstream (Read) | Primary layout, tokens, code snippets, and screenshot extraction |
| 8 | `get_screenshot` | Upstream (Read) | Visual screenshot rendering of any canvas node |
| 9 | `get_metadata` | Upstream (Read) | XML outline and structure of document or page |
| 10 | `get_variable_defs` | Upstream (Read) | Design tokens and color/variable definitions |
| 11 | `get_motion_context` | Upstream (Read) | Keyframe animations, easing curves, and CSS @keyframes |
| 12 | `get_figjam` | Upstream (Read) | UI code generation for FigJam nodes |
| 13 | `download_assets` | Upstream (Read) | Export nodes and download original source images |
| 14 | `get_libraries` | Upstream (Read) | Subscribed and available design libraries |
| 15 | `search_design_system` | Upstream (Read) | Search components, variables, and styles in libraries |
| 16 | `whoami` | Upstream (Read) | User seat, email, and team plan keys |
| 17 | `get_code_connect_map` | Code Connect | Mapping between Figma nodes and code components |
| 18 | `add_code_connect_map` | Code Connect | Map a node to a code component in codebase |
| 19 | `get_code_connect_suggestions` | Code Connect | AI-suggested Code Connect linking strategies |
| 20 | `send_code_connect_mappings` | Code Connect | Bulk save approved Code Connect mappings |
| 21 | `get_context_for_code_connect` | Code Connect | Component metadata, properties, and variant tree |
| 22 | `list_file_components_for_code_connect` | Code Connect | Published component dependency graph |
| 23 | `export_video` | Media | Export timeline node as MP4 video |
| 24 | `get_figma_skill` | Skills | Read skill resources and references |
| 25 | `list_file_shaders` | Shaders | List shader effects and shader fills in file |
| 26 | `list_shaders` | Shaders | List shaders in user account library |
| 27 | `get_shader` | Shaders | Read shader effect or fill source code |
| 28 | `create_shader` | Shaders | Create procedural shader effect or fill scaffold |
| 29 | `update_shader` | Shaders | Update, revise, or republish existing shader |
| 30 | `list_generative_plugins` | Plugins | List generative plugins in account library |
| 31 | `get_generative_plugin` | Plugins | Read generative plugin source files |
| 32 | `create_generative_plugin` | Plugins | Create a generative plugin starter scaffold |
| 33 | `update_generative_plugin` | Plugins | Update, compile, and deploy generative plugin |
| 34 | `weave_list_tools` | Weave | List available Weave workflows in workspace |
| 35 | `weave_get_tool_inputs` | Weave | Get input parameters and schema for Weave tool |
| 36 | `weave_run_tool` | Weave | Execute a Weave workflow with input data |
| 37 | `weave_upload_asset` | Weave | Upload local media to Weave pipeline |
| 38 | `weave_get_tool_run_output` | Weave | Poll progress and fetch outputs of Weave run |
| 39 | `weave_cancel_tool_run` | Weave | Cancel in-progress Weave workflow execution |

---

## Detailed Tool Specifications

### 1. `figma_get_current_context`
- **Scope:** Local Tool
- **Description:** Call this FIRST before any other Figma tool when the user has not explicitly provided a Figma URL or fileKey.
- **Outputs:** `{ authentication, figma_desktop_open_file: { fileKey, fileName, nodeId, url }, instructions[] }`
- **Behavior:** Queries local Figma desktop app state to detect the currently active document and selection. Prevents accidental blank file creation.

### 2. `get_screenshot`
- **Scope:** Upstream (Read)
- **Description:** Renders a PNG screenshot of any node and returns a short-lived CDN URL + curl download command.
- **Parameters:** `fileKey` (required), `nodeId` (required), `maxDimension` (optional, default 1024), `contentsOnly` (optional), `enableBase64Response` (optional).

### 3. `get_design_context`
- **Scope:** Upstream (Read)
- **Description:** Primary READ tool for design-to-code workflows. Returns layout, styles, component properties, reference code snippet, screenshot, and asset URLs.
- **Parameters:** `fileKey` (required), `nodeId` (required), `clientFrameworks`, `clientLanguages`, `excludeScreenshot`.

### 4. `get_motion_context`
- **Scope:** Upstream (Read)
- **Description:** Returns keyframe animation data for a Figma node including animated-node inventory, easing curves, pre-computed CSS `@keyframes`, and timeline coordination hints.
- **Parameters:** `fileKey` (required), `nodeId` (required).

### 5. `get_metadata`
- **Scope:** Upstream (Read)
- **Description:** Returns XML document outline for a Figma design file — node IDs, layer names, types, positions, and sizes. When `nodeId` is omitted, lists top-level pages.
- **Parameters:** `fileKey` (required), `nodeId` (optional).

### 6. `get_variable_defs`
- **Scope:** Upstream (Read)
- **Description:** Returns all design variables (tokens) referenced by a node — colors, spacing, typography values with their names and resolved values.
- **Parameters:** `fileKey` (required), `nodeId` (required).

### 7. `get_figjam`
- **Scope:** Upstream (Read)
- **Description:** Generates UI code for a given FigJam node in Figma. Only works on FigJam files (`/board/`).
- **Parameters:** `fileKey` (required), `nodeId` (optional, default `0:1`).

### 8. `generate_figma_design`
- **Scope:** Upstream (Write)
- **Description:** Captures a live web page by URL into an existing Figma design file. Returns capture script and captureId; polls until completed.
- **Parameters:** `fileKey` (required), `url`, `captureId`.

### 9. `generate_diagram`
- **Scope:** Upstream (Write)
- **Description:** Creates a flowchart, sequence diagram, state diagram, gantt chart, or ER diagram in FigJam from Mermaid.js syntax.
- **Parameters:** `name` (required), `mermaidSyntax` (required), `planKey`, `fileKey`.

### 10. `get_code_connect_map`
- **Scope:** Upstream (Code Connect)
- **Description:** Returns a mapping of node IDs to code component paths and names in the codebase.
- **Parameters:** `fileKey` (required), `nodeId` (required).

### 11. `whoami`
- **Scope:** Upstream (Read)
- **Description:** Returns the authenticated user identity (handle, email), all plans/teams the user belongs to, and available plan seats.
- **Parameters:** None.

### 12. `weave_list_tools`
- **Scope:** Upstream (Weave)
- **Description:** Lists published Weave workflow tools available in the user's active Weave workspace.
- **Parameters:** None.

### 13. `weave_get_tool_inputs`
- **Scope:** Upstream (Weave)
- **Description:** Inspects input contract and schema for a published Weave workflow tool.
- **Parameters:** `recipeId` (required).

### 14. `weave_run_tool`
- **Scope:** Upstream (Weave)
- **Description:** Executes a Weave tool workflow and returns run IDs for status polling.
- **Parameters:** `recipeId` (required), `inputs` (required), `acknowledgedCost`.

### 15. `weave_upload_asset`
- **Scope:** Upstream (Weave)
- **Description:** Uploads a local image or video file to Weave and returns the asset object for workflow execution.
- **Parameters:** None (returns presigned `submitUrl` and upload token).

### 16. `weave_get_tool_run_output`
- **Scope:** Upstream (Weave)
- **Description:** Polls status and outputs (images, videos, data) of Weave workflow runs.
- **Parameters:** `recipeId` (required), `runIds`.

### 17. `weave_cancel_tool_run`
- **Scope:** Upstream (Weave)
- **Description:** Cancels an in-progress Weave workflow execution.
- **Parameters:** `recipeId` (required), `runIds`.

### 18. `add_code_connect_map`
- **Scope:** Upstream (Code Connect)
- **Description:** Maps a Figma node to a code component in codebase.
- **Parameters:** `fileKey` (required), `nodeId` (required), `codeConnectSrc`, `codeConnectName`.

### 19. `get_code_connect_suggestions`
- **Scope:** Upstream (Code Connect)
- **Description:** Returns AI-suggested strategies for linking Figma nodes to codebase components.
- **Parameters:** `fileKey` (required), `nodeId` (required).

### 20. `send_code_connect_mappings`
- **Scope:** Upstream (Code Connect)
- **Description:** Saves multiple Code Connect mappings in bulk after user approval.
- **Parameters:** `fileKey` (required), `mappings` (required).

### 21. `export_video`
- **Scope:** Upstream (Media)
- **Description:** Renders and exports a Figma timeline frame as an MP4 video file.
- **Parameters:** `fileKey` (required), `nodeId` or `jobId`, `quality`.

### 22. `get_context_for_code_connect`
- **Scope:** Upstream (Code Connect)
- **Description:** Extracts structured component metadata, variants, properties, and descendant trees.
- **Parameters:** `fileKey` (required), `nodeId` (required).

### 23. `list_file_components_for_code_connect`
- **Scope:** Upstream (Code Connect)
- **Description:** Lists every published library component and component set in a file with cross-component dependencies.
- **Parameters:** `fileKey` (required).

### 24. `use_figma`
- **Scope:** Upstream (Native Write)
- **Description:** Primary write tool. Executes arbitrary JavaScript against the Figma Plugin API sandbox to create, edit, delete, style, or query any design element live on the canvas.
- **Parameters:** `fileKey` (required), `code` (required JS string), `description` (required intent).

### 25. `get_libraries`
- **Scope:** Upstream (Read)
- **Description:** Retrieves subscribed and available design libraries associated with a Figma file.
- **Parameters:** `fileKey` (required).

### 26. `search_design_system`
- **Scope:** Upstream (Read)
- **Description:** Searches for design system assets (components, variables, styles) across libraries.
- **Parameters:** `fileKey` (required), `queries` (array of query objects).

### 27. `create_new_file`
- **Scope:** Upstream (Write)
- **Description:** Creates a blank Figma Design, FigJam, or Slides document in drafts or project folder.
- **Parameters:** `fileName` (required), `planKey` (required), `editorType` (required: `"design"`, `"figjam"`, `"slides"`).

### 28. `upload_assets`
- **Scope:** Upstream (Write)
- **Description:** Uploads raster images (PNG, JPG, WebP) and SVGs into a Figma canvas.
- **Parameters:** `fileKey` (required), `count`, `nodeIds`, `scaleMode`.

### 29. `download_assets`
- **Scope:** Upstream (Read)
- **Description:** Downloads rendered exports and raw embedded source images/SVGs for a node.
- **Parameters:** `fileKey` (required), `nodeId` (required), `defaultFormat`, `defaultScale`.

### 30. `get_figma_skill`
- **Scope:** Upstream (Skills)
- **Description:** Reads skill guides and instruction resources via `skill://` URIs.
- **Parameters:** `uri` (required).

### 31. `list_file_shaders`
- **Scope:** Upstream (Shaders)
- **Description:** Lists shader effects and shader fills referenced in a Figma file.
- **Parameters:** `fileKey` (required).

### 32. `list_shaders`
- **Scope:** Upstream (Shaders)
- **Description:** Lists shader effects and shader fills in user's account library.
- **Parameters:** None.

### 33. `get_shader`
- **Scope:** Upstream (Shaders)
- **Description:** Reads authored GLSL/HLSL source code and manifest of a shader.
- **Parameters:** `id` (required), `version`, `includeSource`.

### 34. `list_generative_plugins`
- **Scope:** Upstream (Plugins)
- **Description:** Lists generative plugins available in the user account library.
- **Parameters:** None.

### 35. `get_generative_plugin`
- **Scope:** Upstream (Plugins)
- **Description:** Reads manifest and source code of a generative plugin.
- **Parameters:** `id` (required), `version`, `includeSource`.

### 36. `create_generative_plugin`
- **Scope:** Upstream (Plugins)
- **Description:** Creates a runnable starter plugin scaffold in the account library.
- **Parameters:** `name` (required), `planKey` (required).

### 37. `create_shader`
- **Scope:** Upstream (Shaders)
- **Description:** Creates a procedural shader effect or fill scaffold in the account library.
- **Parameters:** `name` (required), `kind` (required: `"effect"` or `"fill"`), `planKey` (required).

### 38. `update_generative_plugin`
- **Scope:** Upstream (Plugins)
- **Description:** Compiles, versions, and deploys updated code for an existing generative plugin.
- **Parameters:** `id` (required), `files` (required), `commitMessage` (required).

### 39. `update_shader`
- **Scope:** Upstream (Shaders)
- **Description:** Compiles, versions, and deploys updated code for an existing shader.
- **Parameters:** `id` (required), `kind` (required), `files` (required), `commitMessage` (required).
