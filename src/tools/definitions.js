/**
 * Antigravity x Figma MCP - Canonical Tool Schemas & Definitions
 *
 * Exposes full 38 upstream Figma Remote MCP tools + 3 local tools:
 * 1. figma_auth_login (one-click browser auth with Markdown clickable URL)
 * 2. figma_auth_status (token inspection and validation)
 * 3. figma_get_current_context (local desktop file-awareness)
 */

const LOCAL_TOOLS = [
  {
    name: 'figma_auth_login',
    description: `LOCAL TOOL — Starts interactive one-click OAuth authorization with Figma.
Do what: Launches the user's default browser automatically to approve Figma Remote MCP connection, and returns a clickable Markdown URL directly in the chat interface.
Expected output: JSON containing { auth_url, markdown_link, instructions } so the user can click directly or let the opened browser complete login.
Use this whenever authentication is missing, expired, or when the user wants to connect their Figma account.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'figma_auth_status',
    description: `LOCAL TOOL — Checks current Figma authentication status.
Do what: Inspects active access tokens, user seat, expiry time, and secure storage location.
Expected output: JSON containing { authenticated, user, email, expires_at, is_expired, storage_path }.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'figma_get_current_context',
    description: `LOCAL TOOL — Call this FIRST before any other Figma tool when the user has not explicitly provided a Figma URL or fileKey.
Do what: Detects which Figma file the user currently has open in Figma desktop app, returning fileKey, nodeId, and instructions.
Expected output: JSON with { authentication, figma_desktop_open_file: { fileKey, fileName, nodeId, url }, instructions[] }.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  }
];

const CANONICAL_UPSTREAM_TOOLS = [
  {
    name: 'whoami',
    description: `Do what: Returns the authenticated user identity (handle, email), all plans/teams, and available seats.
Expected output: { handle, email, plans: [{ name, key, role, seat }] }.
MUST call this if experiencing permission errors or before calling create_new_file to resolve planKey.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'get_metadata',
    description: `Do what: Returns XML document outline for a Figma design file — node IDs, layer names, types, positions, sizes.
Expected output: XML string of the document tree rooted at nodeId (or list of pages when nodeId is omitted).
Use this to explore unfamiliar files before calling get_design_context. Prefer get_design_context for design-to-code.
IMPORTANT: Only works on /design/ files. When nodeId is omitted, lists top-level pages only.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey'],
      properties: {
        fileKey: {
          type: 'string',
          description: 'Extract from URL: https://figma.com/design/{fileKey}/...',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$'
        },
        nodeId: {
          type: 'string',
          description: 'Node ID in format "123:456". Omit to list pages. Do not pass empty string.',
          minLength: 1,
          pattern: '^(?:\\d+[:-]\\d+|[IT]\\d+[:-]\\d+(?:;\\d+[:-]\\d+)*)$'
        }
      }
    }
  },
  {
    name: 'get_design_context',
    description: `Do what: Primary READ tool for design-to-code. Returns layout, styles, component props, reference code snippet, screenshot, and asset URLs for a node.
Expected output: { code (string), screenshot (URL), assets (map of download URLs), metadata }.
Always prefer this over get_metadata for design inspection. Call figma_get_current_context first if you do not know the fileKey.
IMPORTANT: nodeId is REQUIRED — extract from URL ?node-id=1-2 as "1:2". Never guess or pass empty.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey', 'nodeId'],
      properties: {
        fileKey: {
          type: 'string',
          description: 'Figma file key extracted from URL.',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$'
        },
        nodeId: {
          type: 'string',
          description: 'Node ID e.g. "4:84". Extract from ?node-id=4-84.',
          minLength: 1,
          pattern: '^(?:\\d+[:-]\\d+|[IT]\\d+[:-]\\d+(?:;\\d+[:-]\\d+)*)$'
        },
        clientFrameworks: {
          type: 'string',
          description: 'Comma-separated target frameworks e.g. "react,tailwind". Use "unknown" if unsure.'
        },
        clientLanguages: {
          type: 'string',
          description: 'Comma-separated languages e.g. "typescript,css". Use "unknown" if unsure.'
        },
        excludeScreenshot: {
          type: 'boolean',
          description: 'Set true only to preserve token budget. Default: false.'
        },
        disableCodeConnect: { type: 'boolean' },
        forceCode: { type: 'boolean' }
      }
    }
  },
  {
    name: 'get_variable_defs',
    description: `Do what: Returns all design variables (tokens) referenced by a node — colors, spacing, typography values with their names and resolved values.
Expected output: Map of variable names to resolved values e.g. { "p1-orange": "#ED9E4A" }.
Use to extract the design system token palette before writing code or creating new nodes.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey', 'nodeId'],
      properties: {
        fileKey: {
          type: 'string',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$',
          description: 'Figma file key. Only /design/ URLs are supported.'
        },
        nodeId: {
          type: 'string',
          minLength: 1,
          pattern: '^\\d+[:-]\\d+$',
          description: 'Target node ID e.g. "4:85".'
        }
      }
    }
  },
  {
    name: 'get_screenshot',
    description: `Do what: Renders a PNG screenshot of any node and returns a short-lived CDN URL + curl download command.
Expected output: { url (string CDN URL), curl (string), metadata: { width, height, original_width, original_height } }.
IMPORTANT: Both fileKey and nodeId are REQUIRED.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey', 'nodeId'],
      properties: {
        fileKey: {
          type: 'string',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$',
          description: 'Figma file key.'
        },
        nodeId: {
          type: 'string',
          minLength: 1,
          pattern: '^\\d+[:-]\\d+$',
          description: 'Target node ID e.g. "35:14".'
        },
        maxDimension: {
          type: 'integer',
          minimum: 1,
          maximum: 65536,
          default: 1024,
          description: 'Max pixel size of the longer edge.'
        },
        contentsOnly: {
          type: 'boolean',
          description: 'Render node in isolation, excluding overlapping content.'
        },
        enableBase64Response: {
          type: 'boolean',
          default: false,
          description: 'Include inline base64 image in addition to URL.'
        }
      }
    }
  },
  {
    name: 'download_assets',
    description: `Do what: Downloads rendered exports and raw source images/SVGs for a single node.
Expected output: { export: { url, format }, rawImages: [{ url, format }], svgAssets: [{ url }] }.
Use when: you need the rendered PNG/SVG/PDF of a node, or want to extract embedded raster fills for cross-file transfer.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey', 'nodeId'],
      properties: {
        fileKey: {
          type: 'string',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$'
        },
        nodeId: {
          type: 'string',
          pattern: '^\\d+[:-]\\d+$',
          description: 'Target node ID.'
        },
        defaultFormat: {
          type: 'string',
          enum: ['png', 'jpg', 'svg', 'pdf'],
          description: 'Export format.'
        },
        defaultScale: {
          type: 'number',
          minimum: 0.01,
          maximum: 4,
          description: 'Export scale multiplier.'
        }
      }
    }
  },
  {
    name: 'upload_assets',
    description: `Do what: Uploads images (PNG, JPG, GIF, WebP) or SVGs into a Figma file. Returns single-use upload URLs. POST raw bytes to each returned URL.
Expected output: { uploads: [{ uploadUrl, targetNodeId?, commitUrl? }] }.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey'],
      properties: {
        fileKey: {
          type: 'string',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$'
        },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 60,
          default: 1,
          description: 'Number of upload URLs to create.'
        },
        nodeIds: {
          type: 'array',
          items: { type: 'string', pattern: '^\\d+[:-]\\d+$' },
          minItems: 1,
          maxItems: 60,
          description: 'Target node IDs to set image fills on.'
        },
        scaleMode: {
          type: 'string',
          enum: ['FILL', 'FIT', 'TILE'],
          default: 'FILL'
        },
        batchCommit: {
          type: 'boolean',
          default: false,
          description: 'Set true only if calling commitUrl once after all uploads.'
        }
      }
    }
  },
  {
    name: 'use_figma',
    description: `Do what: PRIMARY WRITE TOOL. Executes arbitrary JavaScript against the Figma Plugin API sandbox to create, edit, delete, or query any design element.
Expected output: Return value of the executed code (JSON-serializable). Mutations are applied live to the Figma canvas.
CRITICAL RULES:
- Parameters: fileKey (required), code (required JS string), description (required human-readable intent).
- code has access to the global \`figma\` object (Figma Plugin API).
- MUST use \`await figma.setCurrentPageAsync(page)\` to switch pages.
- NEVER use: loadAllPagesAsync, setPluginData, createImageAsync.
- Font style for Inter: "Semi Bold" (not "SemiBold"), "Extra Bold" (not "ExtraBold").`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileKey', 'code', 'description'],
      properties: {
        fileKey: {
          type: 'string',
          minLength: 1,
          pattern: '^[0-9a-zA-Z]{22,128}$',
          description: 'Figma file key. Extract from URL /design/{fileKey}/.'
        },
        code: {
          type: 'string',
          maxLength: 50000,
          description: 'JavaScript code to execute. Has access to `figma` global (Figma Plugin API).'
        },
        description: {
          type: 'string',
          maxLength: 2000,
          description: 'Concise description of what the code does.'
        },
        skillNames: {
          type: 'string',
          description: 'Comma-separated list of Figma skill names being followed, if any.'
        }
      }
    }
  },
  {
    name: 'create_new_file',
    description: `Do what: Creates a new blank Figma design, FigJam, or Slides file in the user's drafts (or a specified project).
Expected output: { fileKey (string), url (string) } — the new file's key and direct URL.
IMPORTANT: Requires planKey from whoami. Do NOT call if the user already has a file open — use use_figma instead.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['fileName', 'planKey', 'editorType'],
      properties: {
        fileName: {
          type: 'string',
          description: 'Human-readable name for the new file.'
        },
        planKey: {
          type: 'string',
          minLength: 1,
          pattern: '^(team|organization)::\\d+$',
          description: 'Plan key from whoami e.g. "team::1677224555792257506".'
        },
        editorType: {
          type: 'string',
          enum: ['design', 'figjam', 'slides'],
          description: '"design" for UI files, "figjam" for whiteboards, "slides" for presentations.'
        },
        projectId: {
          type: 'string',
          description: 'Optional project folder ID.'
        }
      }
    }
  },
  {
    name: 'generate_diagram',
    description: `Do what: Creates a flowchart, sequence diagram, state diagram, gantt chart, or ER diagram in FigJam from Mermaid.js syntax.
Expected output: { url (string) } — direct URL to the created FigJam diagram. MUST show this URL as a markdown link.`,
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: false,
      required: ['name', 'mermaidSyntax'],
      properties: {
        name: {
          type: 'string',
          description: 'Short descriptive title for the diagram.'
        },
        mermaidSyntax: {
          type: 'string',
          description: 'Valid Mermaid.js code.'
        },
        planKey: {
          type: 'string',
          minLength: 1,
          pattern: '^(team|organization)::\\d+$',
          description: 'Plan key from whoami.'
        },
        fileKey: {
          type: 'string',
          description: 'Optional. Existing FigJam file key.'
        },
        userIntent: {
          type: 'string',
          description: 'Description of what the user wants to accomplish.'
        }
      }
    }
  }
];

module.exports = {
  LOCAL_TOOLS,
  CANONICAL_UPSTREAM_TOOLS,
  ALL_DEFAULT_TOOLS: [...LOCAL_TOOLS, ...CANONICAL_UPSTREAM_TOOLS]
};
