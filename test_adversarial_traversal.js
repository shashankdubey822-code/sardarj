/**
 * BEDI FASHION™ — ADVERSARIAL DIRECTORY TRAVERSAL TEST HARNESS
 * Author: challenger_1 (Empirical Challenger)
 * 
 * Empirically challenges frontend/server.js directory traversal defenses
 * via raw TCP/HTTP requests:
 *   - Direct dot-dot (/../)
 *   - URL-encoded dot-dot (/%2e%2e/)
 *   - Slash-encoded dot-dot (/..%2f)
 *   - Full-encoded (/%2e%2e%2f)
 *   - Double-encoded (/%252e%252e/)
 *   - Windows backslash dot-dot (/..\ and /%2e%2e%5c)
 *   - Deep system traversal (/../../../../windows/win.ini)
 *   - Null-byte injection (/..%00/package.json)
 *   - Non-existent static files
 *   - Legitimate static file delivery
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function record(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name} ${detail}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name} ${detail}`);
  }
}

console.log('='.repeat(75));
console.log('🛡️ ADVERSARIAL VERIFICATION: FRONTEND DIRECTORY TRAVERSAL DEFENSES');
console.log('='.repeat(75));

const BASE_DIR = path.resolve(__dirname, 'frontend');
const serverPath = path.join(BASE_DIR, 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error(`server.js not found at ${serverPath}`);
  process.exit(1);
}

const TEST_PORT = 3991;
process.env.PORT = TEST_PORT;

const serverModule = require(serverPath);

function sendRawGet(requestPath) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: requestPath,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', (err) => {
      resolve({ status: null, error: err.message, body: '' });
    });
    req.end();
  });
}

setTimeout(async () => {
  try {
    console.log('\n[1] Probing Traversal Attacks Against frontend/server.js:');

    const attackVectors = [
      { path: '/../package.json', desc: 'Direct dot-dot (/../package.json)' },
      { path: '/../../start.py', desc: 'Two-level dot-dot (/../../start.py)' },
      { path: '/../../../.env', desc: 'Three-level dot-dot to root environment (/../../../.env)' },
      { path: '/../backend/app/main.py', desc: 'Cross-directory traversal to backend (/../backend/app/main.py)' },
      { path: '/%2e%2e/package.json', desc: 'URL-encoded dot-dot (/%2e%2e/package.json)' },
      { path: '/%2e%2e%2fpackage.json', desc: 'Fully URL-encoded dot-dot and slash (/%2e%2e%2fpackage.json)' },
      { path: '/..%2fpackage.json', desc: 'Encoded slash (..%2fpackage.json)' },
      { path: '/%2e%2e%5cpackage.json', desc: 'Encoded Windows backslash (/%2e%2e%5cpackage.json)' },
      { path: '/..\\package.json', desc: 'Literal Windows backslash (/..\\package.json)' },
      { path: '/..\\..\\..\\.env', desc: 'Multiple Windows backslashes (/..\\..\\..\\.env)' },
      { path: '/%252e%252e/package.json', desc: 'Double URL-encoded dot-dot (/%252e%252e/package.json)' },
      { path: '/....//package.json', desc: 'Quad-dot traversal variant (/....//package.json)' },
      { path: '/..%00/package.json', desc: 'Null-byte poisoned traversal (/..%00/package.json)' },
      { path: '/../../../../../../../../Windows/win.ini', desc: 'Deep Windows path traversal' },
      { path: '/../../../../../../../../etc/passwd', desc: 'Deep UNIX path traversal' },
    ];

    for (const attack of attackVectors) {
      const res = await sendRawGet(attack.path);
      console.log(`    Payload: GET ${attack.path}`);
      console.log(`    Response: HTTP ${res.status}, Body length: ${res.body.length}`);

      // The server MUST reject directory traversal attempts (403 Forbidden or 400 Bad Request or 404 Not Found), NEVER 200 OK
      const isBlocked = (res.status === 403 || res.status === 400 || res.status === 404);
      record(
        `Blocked ${attack.desc}`,
        isBlocked && res.status !== 200,
        `(HTTP ${res.status})`
      );

      // Verify no sensitive tokens or strings are ever leaked
      const noLeak = !res.body.includes('ovdvycumqsjgvlsickjy') &&
                     !res.body.includes('sbp_fc45407d08801028ae8658159e2dcc2eb4619c6c') &&
                     !res.body.includes('"name": "adventurous-raman"');
      record(`Zero credential/code leakage for ${attack.desc}`, noLeak);
    }

    console.log('\n[2] Probing Legitimate Static Assets & 404 Handling:');

    // Test legitimate files
    const legitimatePaths = [
      { path: '/', expectedContent: 'Bedi Fashion', desc: 'Root GET / serves index.html' },
      { path: '/index.html', expectedContent: 'Bedi Fashion', desc: 'GET /index.html' },
      { path: '/css/milanese-maison.css', expectedContent: '#FDFBF7', desc: 'GET /css/milanese-maison.css' },
      { path: '/js/app.js', expectedContent: 'DOMContentLoaded', desc: 'GET /js/app.js' },
      { path: '/data/products.json', expectedContent: 'School Blazer', desc: 'GET /data/products.json' },
    ];

    for (const leg of legitimatePaths) {
      const res = await sendRawGet(leg.path);
      record(
        `Legitimate asset ${leg.desc} returns 200 OK`,
        res.status === 200,
        `(HTTP ${res.status})`
      );
      record(
        `Legitimate asset ${leg.desc} content verified`,
        res.body.includes(leg.expectedContent)
      );
    }

    // Test non-existent file
    const res404 = await sendRawGet('/nonexistent_adversarial_probe_file.glb');
    record(
      'Nonexistent asset returns 404 Not Found',
      res404.status === 404,
      `(HTTP ${res404.status})`
    );

    console.log('\n' + '='.repeat(75));
    console.log(`🏁 FRONTEND TRAVERSAL ADVERSARIAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(75));

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}, 600);
