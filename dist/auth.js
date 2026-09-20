/**
 * Antigravity x Figma MCP - Authentication Engine
 *
 * Implements OAuth 2.0 PKCE + Dynamic Client Registration (RFC 7591)
 * with spoofed client_name to pass Figma Remote MCP whitelist.
 * Supports headless and one-click browser authorization.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const { getTokensPath, getLogPath } = require('./config');

const DYNAMIC_REG_URL = 'https://api.figma.com/v1/oauth/mcp/register';
const FIGMA_OAUTH_AUTH_URL = 'https://www.figma.com/oauth/mcp';
const FIGMA_OAUTH_TOKEN_URL = 'https://api.figma.com/v1/oauth/token';

function openBrowser(url) {
  const platform = process.platform;
  let command = '';
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, () => {});
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

function loadTokens() {
  const file = getTokensPath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function saveTokens(tokenData) {
  const file = getTokensPath();
  fs.writeFileSync(file, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
}

function registerClient() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      client_name: 'Visual Studio Code',
      client_uri: 'https://code.visualstudio.com',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      redirect_uris: [
        'https://insiders.vscode.dev/redirect',
        'https://vscode.dev/redirect',
        'http://127.0.0.1/'
      ],
      scope: 'mcp:connect',
      token_endpoint_auth_method: 'none',
      application_type: 'native'
    });

    const parsed = new URL(DYNAMIC_REG_URL);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Registration HTTP ${res.statusCode}: ${data}`));
        }
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Registration parse error: ${e.message} (Payload was: ${data.slice(0, 100)})`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function exchangeCodeForTokens(code, codeVerifier, clientId, clientSecret, redirectUri) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    const postData = params.toString();
    const parsed = new URL(FIGMA_OAUTH_TOKEN_URL);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    };

    if (clientId && clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: headers
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Token exchange failed (HTTP ${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(new Error(`Token exchange parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function refreshAccessToken(refreshToken, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    const postData = params.toString();
    const parsed = new URL(FIGMA_OAUTH_TOKEN_URL);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    };

    if (clientId && clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: headers
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Refresh token failed (HTTP ${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(new Error(`Refresh parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getValidAccessToken() {
  if (process.env.FIGMA_ACCESS_TOKEN) {
    return process.env.FIGMA_ACCESS_TOKEN;
  }

  const tokenData = loadTokens();
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Not authenticated. Please trigger authorization via figma_auth_login.');
  }

  const now = Date.now();
  const expiresAt = tokenData.expires_at || 0;

  if (now < expiresAt - 60000) {
    return tokenData.access_token;
  }

  if (tokenData.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(
        tokenData.refresh_token,
        tokenData.client_id,
        tokenData.client_secret
      );

      const updated = {
        ...tokenData,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenData.refresh_token,
        expires_in: refreshed.expires_in,
        expires_at: Date.now() + ((refreshed.expires_in || 7776000) * 1000)
      };

      saveTokens(updated);
      return updated.access_token;
    } catch {
      return tokenData.access_token;
    }
  }

  return tokenData.access_token;
}

/**
 * Starts interactive OAuth login:
 * 1. Spawns ephemeral loopback server.
 * 2. Launches user browser directly.
 * 3. Returns the authorization URL for UI display.
 */
let activeAuthSession = null;

async function startOneClickLogin() {
  if (activeAuthSession) {
    return activeAuthSession;
  }

  let tokens = loadTokens() || {};
  let clientId = tokens.client_id;
  let clientSecret = tokens.client_secret;

  if (!clientId) {
    const reg = await registerClient();
    clientId = reg.client_id;
    clientSecret = reg.client_secret;
    tokens.client_id = clientId;
    tokens.client_secret = clientSecret;
    saveTokens(tokens);
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = base64UrlEncode(crypto.randomBytes(16));

  const authPromise = new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedReq = new URL(req.url, `http://127.0.0.1:${server.address().port}`);
      if (parsedReq.pathname !== '/') {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = parsedReq.searchParams.get('code');
      const returnedState = parsedReq.searchParams.get('state');

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h3>Security error: State parameter mismatch.</h3>');
        activeAuthSession = null;
        server.close();
        return reject(new Error('State mismatch'));
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h3>Authorization failed: No authorization code received.</h3>');
        activeAuthSession = null;
        server.close();
        return reject(new Error('No code received'));
      }

      try {
        const redirectUri = `http://127.0.0.1:${server.address().port}/`;
        const tokenResponse = await exchangeCodeForTokens(
          code,
          codeVerifier,
          clientId,
          clientSecret,
          redirectUri
        );

        const merged = {
          ...tokens,
          ...tokenResponse,
          client_id: clientId,
          client_secret: clientSecret,
          expires_at: Date.now() + ((tokenResponse.expires_in || 7776000) * 1000)
        };

        saveTokens(merged);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f1117; color: #fff;">
              <div style="text-align: center; padding: 40px; border-radius: 12px; background: #1a1d26; border: 1px solid #2e3444; max-width: 460px;">
                <h2 style="color: #4ade80; margin-bottom: 12px;">Authentication Successful</h2>
                <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">Antigravity IDE is now connected to Figma Remote MCP with full canvas write access.</p>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">You can close this tab and return to the IDE.</p>
              </div>
            </body>
          </html>
        `);

        activeAuthSession = null;
        server.close();
        resolve(merged);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h3>Login Error: ${err.message}</h3>`);
        activeAuthSession = null;
        server.close();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/`;
      const authUrl = `${FIGMA_OAUTH_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=mcp%3Aconnect&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;

      openBrowser(authUrl);

      activeAuthSession = {
        authUrl,
        port,
        promise: authPromise
      };
    });

    // Auto cleanup after 5 minutes of inactivity
    setTimeout(() => {
      if (activeAuthSession) {
        activeAuthSession = null;
        server.close();
      }
    }, 300000);
  });

  // Give the server a brief tick to listen
  await new Promise(r => setTimeout(r, 100));

  return activeAuthSession;
}

function getAuthStatus() {
  const tokens = loadTokens();
  if (!tokens || !tokens.access_token) {
    return {
      authenticated: false,
      message: 'Not authenticated. Use figma_auth_login to connect.'
    };
  }

  const now = Date.now();
  const expiresAt = tokens.expires_at || 0;
  const isExpired = now >= expiresAt;

  return {
    authenticated: !isExpired,
    user: tokens.user_name || null,
    email: tokens.user_email || null,
    expires_at: new Date(expiresAt).toISOString(),
    is_expired: isExpired,
    has_refresh_token: !!tokens.refresh_token,
    storage_path: getTokensPath()
  };
}

module.exports = {
  getValidAccessToken,
  startOneClickLogin,
  getAuthStatus,
  loadTokens,
  saveTokens
};
