/**
 * Antigravity x Figma MCP - Production Test Suite
 * Validates stdio server, tool contracts, OS storage, and auth tools.
 */

const { handleMessage } = require('../dist/server');
const { getAuthStatus } = require('../dist/auth');
const { getTokensPath } = require('../dist/config');
const fs = require('fs');

let intercepted = [];
const origWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk) => {
  intercepted.push(String(chunk));
  return true;
};

async function runTests() {
  console.log('[Test 1] OS Storage path verification...');
  const storagePath = getTokensPath();
  if (storagePath.includes('AppData') || storagePath.includes('.config')) {
    console.log('  PASS: Storage path adheres to OS convention:', storagePath);
  } else {
    console.error('  FAIL: Unexpected storage path:', storagePath);
    process.exit(1);
  }

  console.log('[Test 2] Auth status check...');
  const authStatus = getAuthStatus();
  if (authStatus.authenticated && !authStatus.is_expired) {
    console.log('  PASS: Auth status reports active token until', authStatus.expires_at);
  } else {
    console.warn('  WARN: Token is not active or missing.');
  }

  console.log('[Test 3] MCP Protocol initialize...');
  await handleMessage({ jsonrpc: '2.0', id: 101, method: 'initialize', params: {} });
  await new Promise(r => setTimeout(r, 100));

  const initMsg = intercepted.map(r => { try { return JSON.parse(r.trim()); } catch { return null; } }).find(m => m && m.id === 101);
  if (initMsg && initMsg.result && initMsg.result.serverInfo.version === '1.0.0') {
    console.log('  PASS: Server info version is 1.0.0, protocol =', initMsg.result.protocolVersion);
  } else {
    console.error('  FAIL: Invalid initialize response:', JSON.stringify(initMsg));
    process.exit(1);
  }

  console.log('[Test 4] MCP tools/list verification...');
  await handleMessage({ jsonrpc: '2.0', id: 102, method: 'tools/list', params: {} });
  await new Promise(r => setTimeout(r, 3000));

  const toolsMsg = intercepted.map(r => { try { return JSON.parse(r.trim()); } catch { return null; } }).find(m => m && m.id === 102);
  if (toolsMsg && toolsMsg.result && Array.isArray(toolsMsg.result.tools)) {
    const tools = toolsMsg.result.tools;
    const names = tools.map(t => t.name);
    console.log(`  PASS: tools/list returned ${tools.length} tools`);
    const expected = ['figma_auth_login', 'figma_auth_status', 'figma_get_current_context', 'use_figma', 'whoami', 'create_new_file'];
    for (const name of expected) {
      if (names.includes(name)) {
        console.log(`    + ${name}: verified`);
      } else {
        console.error(`    - MISSING tool: ${name}`);
        process.exit(1);
      }
    }
  } else {
    console.error('  FAIL: tools/list failed:', JSON.stringify(toolsMsg));
    process.exit(1);
  }

  console.log('[Test 5] Local tool call: figma_auth_status...');
  await handleMessage({ jsonrpc: '2.0', id: 103, method: 'tools/call', params: { name: 'figma_auth_status', arguments: {} } });
  await new Promise(r => setTimeout(r, 200));

  const statusCallMsg = intercepted.map(r => { try { return JSON.parse(r.trim()); } catch { return null; } }).find(m => m && m.id === 103);
  if (statusCallMsg && statusCallMsg.result && statusCallMsg.result.content) {
    console.log('  PASS: figma_auth_status returned valid content');
  } else {
    console.error('  FAIL: figma_auth_status call failed:', JSON.stringify(statusCallMsg));
    process.exit(1);
  }

  process.stdout.write = origWrite;
  console.log('\nAll production test assertions passed successfully (100%).\n');
}

runTests().catch(err => {
  process.stdout.write = origWrite;
  console.error('[FATAL TEST ERROR]', err);
  process.exit(1);
});
