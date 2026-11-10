/**
 * BEDI FASHION™ — PLATFORM VERIFICATION TEST SUITE
 * Validates 56 products across 7 sectors, local JSON integrity, HTML/CSS assets, and server APIs
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let failures = 0;
let passed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failures++;
  }
}

console.log(`\n=======================================================`);
console.log(`🧵 RUNNING BEDI FASHION™ PLATFORM VERIFICATION TESTS`);
console.log(`=======================================================\n`);

// Resolve base directory: if running from root with a frontend directory, target frontend/
const BASE_DIR = fs.existsSync(path.join(__dirname, 'frontend', 'index.html'))
  ? path.join(__dirname, 'frontend')
  : __dirname;

// 1. DATA FILES INTEGRITY
console.log(`[1] Verifying Data Files Integrity:`);

const dataFiles = [
  'products.json',
  'categories.json',
  'fabrics.json',
  'size_guides.json',
  'testimonials.json',
  'faq.json',
  'inquiries.json'
];

dataFiles.forEach((file) => {
  const filePath = path.join(BASE_DIR, 'data', file);
  assert(fs.existsSync(filePath), `data/${file} exists`);
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert(Boolean(content), `data/${file} is valid JSON`);
  } catch (err) {
    assert(false, `data/${file} parse error: ${err.message}`);
  }
});

// 2. 56-PRODUCT CATALOG INTEGRITY ACROSS 7 SECTORS
console.log(`\n[2] Verifying 56-Product Catalog Across 7 Sectors:`);

const products = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data', 'products.json'), 'utf-8'));
assert(products.length === 56, `Exactly 56 products in catalog (found: ${products.length})`);

const expectedSectors = ['school', 'corporate', 'industrial', 'hospital', 'hotel', 'security', 'sports'];
const sectorCounts = {};
products.forEach((p) => {
  sectorCounts[p.category_id] = (sectorCounts[p.category_id] || 0) + 1;
});

expectedSectors.forEach((sec) => {
  assert((sectorCounts[sec] || 0) > 0, `Sector "${sec}" has products (count: ${sectorCounts[sec]})`);
});

// Check fields and images
let missingImages = 0;
let invalidProducts = 0;

products.forEach((p) => {
  if (!p.id || !p.name || !p.category_id || !p.fabric || !p.gsm || !p.sizes || !p.min_order_qty) {
    invalidProducts++;
  }
  if (p.image) {
    const cleanImgPath = path.join(BASE_DIR, p.image.replace(/^\//, ''));
    if (!fs.existsSync(cleanImgPath)) {
      missingImages++;
    }
  }
});

assert(invalidProducts === 0, `All 56 products have complete required metadata fields (invalid: ${invalidProducts})`);
assert(missingImages === 0, `All product images exist in workspace filesystem (missing: ${missingImages})`);

// Categories count matches
const categories = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data', 'categories.json'), 'utf-8'));
assert(categories.length === 7, `Exactly 7 categories defined in categories.json`);
const totalCatProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);
assert(totalCatProducts === 56, `Sum of category product_count equals 56 (found: ${totalCatProducts})`);

// 3. FRONTEND FILES & ASSETS
console.log(`\n[3] Verifying Frontend Assets & Stylesheet:`);

const indexHtmlPath = path.join(BASE_DIR, 'index.html');
assert(fs.existsSync(indexHtmlPath), `index.html exists`);
const indexContent = fs.readFileSync(indexHtmlPath, 'utf-8');

assert(indexContent.includes('Bedi Fashion'), `index.html contains brand title`);
assert(indexContent.includes('Plot No - 125, Sector-18'), `index.html contains Head Office address`);
assert(indexContent.includes('Sector 44, Noida'), `index.html contains Noida Shop address`);
assert(indexContent.includes('1987'), `index.html contains Est. 1987 founding year`);
assert(!indexContent.includes('1997'), `index.html has zero stale 1997 references`);
assert(!indexContent.includes('btn-nav-admin'), `index.html has no public Admin navbar button`);
assert(indexContent.includes('bedi_logo_3d.jpg'), `index.html uses the custom 3D logo image`);
assert(fs.existsSync(path.join(BASE_DIR, 'images/bedi_logo_3d.jpg')), `images/bedi_logo_3d.jpg exists`);
assert(indexContent.includes('bedi_emblem_3d.jpg'), `index.html uses the high-contrast 3D emblem in navbar`);
assert(fs.existsSync(path.join(BASE_DIR, 'images/bedi_emblem_3d.jpg')), `images/bedi_emblem_3d.jpg exists`);
assert(indexContent.includes('js/heritage.js'), `index.html includes automatic 1987 heritage year calculation script`);
assert(fs.existsSync(path.join(BASE_DIR, 'js/heritage.js')), `js/heritage.js exists`);
assert(indexContent.includes('+91 9310825699'), `index.html contains contact phone +91 9310825699`);
assert(indexContent.includes('+91 9811825699'), `index.html contains contact phone +91 9811825699`);
assert(indexContent.includes('+91 9899114052'), `index.html contains contact phone +91 9899114052`);
assert(indexContent.includes('+91 9211825699'), `index.html contains WhatsApp line +91 9211825699`);
assert(indexContent.includes('products-grid'), `index.html contains products-grid container`);
assert(indexContent.includes('webgl-canvas-container'), `index.html contains webgl-canvas-container`);
assert(indexContent.includes('bedibot-window'), `index.html contains bedibot-window`);
assert(indexContent.includes('size-guide-modal-overlay'), `index.html contains size-guide-modal-overlay`);
assert(indexContent.includes('rfq-modal-overlay'), `index.html contains rfq-modal-overlay`);
assert(indexContent.includes('cinematic-intro-curtain'), `index.html contains cinematic-intro-curtain`);
assert(indexContent.includes('faq-section'), `index.html contains faq-section accordion`);
assert(indexContent.includes('data-archetype="school"'), `index.html contains School tab`);
assert(indexContent.includes('Medical Doctor'), `index.html contains Medical Doctor category`);
assert(fs.existsSync(path.join(BASE_DIR, 'images', 'school_blazer_official.png')), `images/school_blazer_official.png exists`);
assert(indexContent.includes('"@type": "FAQPage"'), `index.html contains Schema.org FAQPage JSON-LD`);

const cssPath = path.join(BASE_DIR, 'css', 'milanese-maison.css');
assert(fs.existsSync(cssPath), `css/milanese-maison.css exists`);
const cssContent = fs.readFileSync(cssPath, 'utf-8');
assert(cssContent.includes('#FDFBF7'), `CSS contains Warm Ivory #FDFBF7`);
assert(cssContent.includes('#C25E34'), `CSS contains Terracotta Saffron #C25E34`);
assert(cssContent.includes('#1C1917'), `CSS contains Dark Espresso #1C1917`);
assert(cssContent.includes('Cormorant Garamond'), `CSS imports Cormorant Garamond`);
assert(cssContent.includes('Plus Jakarta Sans'), `CSS imports Plus Jakarta Sans`);
assert(cssContent.includes('.school-blazer-badge'), `CSS contains .school-blazer-badge styles`);
assert(cssContent.includes('.cinematic-intro-curtain'), `CSS contains cinematic curtain styles`);
assert(cssContent.includes('.faq-section'), `CSS contains FAQ accordion styles`);

const modelFiles = ['school_blazer_boy.glb', 'school_blazer_girl.glb', 'school_blazer_suit.glb'];
modelFiles.forEach((f) => {
  const p = path.join(BASE_DIR, 'models', f);
  assert(fs.existsSync(p), `models/${f} exists (size: ${fs.statSync(p).size} bytes)`);
});

const studio3dContent = fs.readFileSync(path.join(BASE_DIR, 'js', 'studio3d.js'), 'utf-8');
assert(studio3dContent.includes('loadSchoolBlazer'), `studio3d.js contains loadSchoolBlazer`);
assert(studio3dContent.includes('function setSchoolCutMode'), `studio3d.js defines setSchoolCutMode function`);
assert(studio3dContent.includes('function getSchoolCutMode'), `studio3d.js defines getSchoolCutMode function`);
assert(fs.existsSync(path.join(BASE_DIR, 'favicon.ico')), `favicon.ico exists in public root`);

const jsFiles = ['catalog.js', 'studio3d.js', 'bedibot.js', 'rfq-wizard.js', 'app.js', 'vendor/three.min.js'];
jsFiles.forEach((f) => {
  const p = path.join(BASE_DIR, 'js', f);
  assert(fs.existsSync(p), `js/${f} exists (size: ${fs.statSync(p).size} bytes)`);
});

// 4. SERVER & API ENDPOINT TESTS
console.log(`\n[4] Testing Server & API Routes:`);

const serverPath = path.join(BASE_DIR, 'server.js');
assert(fs.existsSync(serverPath), `server.js exists`);

const TEST_PORT = 3987;
process.env.PORT = TEST_PORT;

const serverModule = require(serverPath);

setTimeout(async () => {
  try {
    // Test 1: GET /
    const homeRes = await fetch(`http://localhost:${TEST_PORT}/`);
    assert(homeRes.status === 200, `GET / returns status 200`);
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('Bedi Fashion'), `GET / serves HTML with Bedi Fashion`);

    // Test 2: Security - Directory Traversal Prevention (Raw TCP request)
    const traversalStatus = await new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: '/../package.json',
        method: 'GET'
      }, (res) => resolve(res.statusCode));
      req.on('error', () => resolve(null));
      req.end();
    });
    assert(traversalStatus === 403, `Raw GET /../package.json returns status 403 Forbidden (Directory Traversal Blocked)`);

    // Test 3: GET /api/products
    const prodRes = await fetch(`http://localhost:${TEST_PORT}/api/products`);
    assert(prodRes.status === 200, `GET /api/products returns status 200`);
    const prods = await prodRes.json();
    assert(Array.isArray(prods) && prods.length === 56, `GET /api/products returns exactly 56 products`);

    // Test 4: GET /api/categories
    const catRes = await fetch(`http://localhost:${TEST_PORT}/api/categories`);
    assert(catRes.status === 200, `GET /api/categories returns status 200`);
    const cats = await catRes.json();
    assert(Array.isArray(cats) && cats.length === 7, `GET /api/categories returns 7 categories`);

    // Test 5: GET /api/faq
    const faqRes = await fetch(`http://localhost:${TEST_PORT}/api/faq`);
    assert(faqRes.status === 200, `GET /api/faq returns status 200`);
    const faqs = await faqRes.json();
    assert(Array.isArray(faqs) && faqs.length >= 4, `GET /api/faq returns institutional FAQ items`);

    // Test 6: POST /api/chat (BediBot Gemini route English)
    const chatRes = await fetch(`http://localhost:${TEST_PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is your school uniform MOQ and where is your factory?' })
    });
    assert(chatRes.status === 200, `POST /api/chat returns status 200`);
    const chatData = await chatRes.json();
    assert(Boolean(chatData.reply) && chatData.reply.length > 20, `POST /api/chat returns coherent BediBot reply in English`);

    // Test 7: POST /api/chat (BediBot Gemini route Hindi)
    const chatHiRes = await fetch(`http://localhost:${TEST_PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'क्या आप अस्पताल के लिए डॉक्टर कोट और स्क्रब सूट के सैंपल भेज सकते हैं?' })
    });
    assert(chatHiRes.status === 200, `POST /api/chat (Hindi) returns status 200`);
    const chatHiData = await chatHiRes.json();
    assert(Boolean(chatHiData.reply) && /[\u0900-\u097F]/.test(chatHiData.reply), `POST /api/chat replies in Devanagari Hindi for Hindi queries`);

    // Test 8: POST /api/chat with Conversation History
    const chatMultiRes = await fetch(`http://localhost:${TEST_PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can you dispatch samples before next week?',
        history: [
          { role: 'user', content: 'We need 500 boiler suits for our Faridabad plant.' },
          { role: 'assistant', content: 'We manufacture heavy-duty cotton boiler suits with 3M reflective tape.' }
        ]
      })
    });
    assert(chatMultiRes.status === 200, `POST /api/chat with multi-turn history returns status 200`);

    // Test 9: POST /api/chat invalid JSON handling
    const chatInvalidRes = await fetch(`http://localhost:${TEST_PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });
    assert(chatInvalidRes.status === 400, `POST /api/chat with invalid body returns status 400 Bad Request`);

    // Test 10: POST /api/inquiries (Local RFQ logging)
    const inqRes = await fetch(`http://localhost:${TEST_PORT}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_name: 'Test Academy Faridabad',
        category: 'School Uniforms',
        contact_person: 'Mr. Tester',
        phone: '+91 9999999999',
        city: 'Faridabad',
        items: [{ product_name: 'Oxford Shirt', quantity: 100 }],
        customization: 'Embroidered crest'
      })
    });
    assert(inqRes.status === 201, `POST /api/inquiries returns status 201 Created`);
    const inqData = await inqRes.json();
    assert(Boolean(inqData.inquiry_id), `POST /api/inquiries returns generated inquiry_id`);

    // Test 11: GET /favicon.ico (Lightweight Brand Favicon)
    const favRes = await fetch(`http://localhost:${TEST_PORT}/favicon.ico`);
    assert(favRes.status === 200, `GET /favicon.ico returns status 200`);
    assert(favRes.headers.get('content-type').includes('image/x-icon'), `GET /favicon.ico returns image/x-icon content-type`);

    console.log(`\n=======================================================`);
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failures} FAILED`);
    console.log(`=======================================================\n`);

    process.exit(failures > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}, 800);
