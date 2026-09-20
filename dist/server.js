/**
 * Antigravity x Figma MCP - Stdio MCP Adapter Server v1.0.0
 *
 * Production bridge between Antigravity IDE and Figma Remote MCP.
 * Implements 1-click browser OAuth authorization and OS-standard storage.
 */

const readline = require('readline');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { getValidAccessToken, startOneClickLogin, getAuthStatus, loadTokens } = require('./auth');
const { getLogPath, getTokensPath } = require('./config');
const { LOCAL_TOOLS, CANONICAL_UPSTREAM_TOOLS, ALL_DEFAULT_TOOLS } = require('./tools/definitions');

const FIGMA_REMOTE_MCP_URL = 'https://mcp.figma.com/mcp';

function log(msg) {
  try {
    fs.appendFileSync(getLogPath(), `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch {}
}

function sendJsonRpc(response) {
  const raw = JSON.stringify(response);
  log(`[OUT] ${raw}`);
  process.stdout.write(raw + '\n');
}

function forwardToUpstream(token, method, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || {}
    });

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Accept': 'application/json, text/event-stream'
    };

    if (token.startsWith('figd_') || token.startsWith('pat_')) {
      headers['X-Figma-Token'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const parsed = new URL(FIGMA_REMOTE_MCP_URL);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let sseParsed = null;
        for (const line of data.split('\n')) {
          if (line.startsWith('data: ')) {
            try { sseParsed = JSON.parse(line.slice(6)); } catch {}
          }
        }
        if (sseParsed) return resolve(sseParsed);

        try {
          resolve(JSON.parse(data));
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ result: data });
          } else {
            reject(new Error(`Upstream HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function queryFigmaDesktopState() {
  return new Promise(resolve => {
    const req = http.get(
      { hostname: '127.0.0.1', port: 18412, path: '/api/v1/local/current', timeout: 1500 },
      res => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          try { resolve({ source: 'figma-desktop', data: JSON.parse(raw) }); }
          catch { resolve(null); }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function handleLocalTools(name, args) {
  if (name === 'figma_auth_login') {
    const session = await startOneClickLogin();
    const markdownLink = `[Nhấp vào đây để cấp quyền với Figma](${session.authUrl})`;

    return {
      status: 'waiting_user_authorization',
      message: 'Trình duyệt mặc định đã được mở để đăng nhập Figma. Nếu trình duyệt chưa tự bật, vui lòng nhấp vào liên kết bên dưới.',
      browser_opened: true,
      auth_url: session.authUrl,
      markdown_link: markdownLink,
      instructions: [
        'Nhấp vào liên kết phía trên trên trình duyệt để chấp thuận quyền cho Antigravity IDE.',
        'Sau khi màn hình Authentication Successful hiện ra, quay lại Antigravity IDE và tiếp tục làm việc.'
      ]
    };
  }

  if (name === 'figma_auth_status') {
    return getAuthStatus();
  }

  if (name === 'figma_get_current_context') {
    const status = getAuthStatus();
    const desktopState = await queryFigmaDesktopState();

    const result = {
      authentication: status,
      figma_desktop_open_file: null,
      instructions: []
    };

    if (desktopState && desktopState.data) {
      const d = desktopState.data;
      result.figma_desktop_open_file = {
        fileKey: d.fileKey || d.file_key || null,
        fileName: d.fileName || d.file_name || null,
        nodeId: d.nodeId || d.node_id || null,
        url: d.fileKey
          ? `https://www.figma.com/design/${d.fileKey}/${encodeURIComponent(d.fileName || '')}${d.nodeId ? `?node-id=${d.nodeId.replace(':', '-')}` : ''}`
          : null
      };
      result.instructions.push(
        `User currently has fileKey="${result.figma_desktop_open_file.fileKey}" open in Figma desktop.`,
        `Use this fileKey for all subsequent tool calls unless the user specifies a different file.`
      );
    } else {
      result.instructions.push(
        'Figma desktop app is not running or did not expose open file metadata.',
        'Ask user for target Figma file URL or extract fileKey from message context.'
      );
    }

    if (!status.authenticated) {
      result.instructions.push('Account not authenticated. Call figma_auth_login to connect.');
    }

    return result;
  }

  throw new Error(`Unknown local tool: ${name}`);
}

async function handleMessage(msg) {
  log(`[IN] ${JSON.stringify(msg)}`);
  const { id, method, params } = msg;

  if (method === 'initialize') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'antigravity-figma-mcp', version: '1.0.0' }
      }
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'tools/list') {
    let token;
    try {
      token = await getValidAccessToken();
    } catch {
      sendJsonRpc({ jsonrpc: '2.0', id, result: { tools: ALL_DEFAULT_TOOLS } });
      return;
    }

    let upstreamTools = [];
    try {
      const res = await forwardToUpstream(token, 'tools/list', params);
      if (res.result && Array.isArray(res.result.tools)) {
        upstreamTools = res.result.tools;
      }
    } catch (err) {
      log(`[WARN] upstream tools/list failed: ${err.message}`);
    }

    const enriched = upstreamTools.map(t => {
      const canonical = CANONICAL_UPSTREAM_TOOLS.find(l => l.name === t.name);
      if (canonical) {
        return {
          ...t,
          description: canonical.description,
          inputSchema: t.inputSchema || t.parameters || canonical.inputSchema
        };
      }
      return t;
    });

    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: { tools: [...LOCAL_TOOLS, ...enriched] }
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = params && params.name;

    const isLocal = LOCAL_TOOLS.some(t => t.name === toolName);
    if (isLocal) {
      try {
        const result = await handleLocalTools(toolName, params.arguments || {});
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false
          }
        });
      } catch (err) {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: `Local tool error: ${err.message}` }
        });
      }
      return;
    }

    let token;
    try {
      token = await getValidAccessToken();
    } catch (authErr) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: `Authentication required: ${authErr.message}. Call tool 'figma_auth_login' to connect via your browser.`
        }
      });
      return;
    }

    try {
      const upstreamRes = await forwardToUpstream(token, 'tools/call', params);
      if (upstreamRes.error) {
        sendJsonRpc({ jsonrpc: '2.0', id, error: upstreamRes.error });
      } else {
        sendJsonRpc({ jsonrpc: '2.0', id, result: upstreamRes.result });
      }
    } catch (err) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: `Upstream error: ${err.message}` }
      });
    }
    return;
  }

  sendJsonRpc({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method '${method}' not implemented` }
  });
}

function startServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      handleMessage(msg);
    } catch (e) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${e.message}` }
      });
    }
  });

  process.stderr.write('[Antigravity Figma MCP v1.0.0] Stdio server active.\n');
}

module.exports = { startServer, handleMessage };
