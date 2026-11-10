/**
 * BEDI FASHION™ — PRODUCTION HTTP & GEMINI API SERVER
 * Zero External Database • Local JSON Data Ingestion • Google Gemini BediBot API Route
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Base directory for static files and data (serves from frontend/ if present, or __dirname)
const BASE_DIR = fs.existsSync(path.join(__dirname, 'frontend', 'index.html'))
  ? path.resolve(__dirname, 'frontend')
  : path.resolve(__dirname);

const DATA_DIR = path.join(BASE_DIR, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm'
};

const HERITAGE_YEARS = Math.max(1, new Date().getFullYear() - 1987);

const BEDIBOT_SYSTEM_PROMPT = `You are "BediBot", the senior technical sales consultant at Bedi Fashion™ (Faridabad & Noida, Delhi NCR, India).

Founded in 1987 by Proprietor Mr. Guru Charan Singh Bedi, Bedi Fashion is North India's trusted institutional uniform outfitter with ${HERITAGE_YEARS}+ years of operational trust.

BUSINESS COORDINATES:
- Head Office: Plot No - 125, Sec-18, Faridabad, Haryana - 121002
- Shop (Bedi Creation): Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303
- Contact Mobile: +91 9310825699 | +91 9811825699 | +91 9899114052
- WhatsApp Desk: +91 9211825699
- Email Addresses: info@bedifashion.in | garments@bedifashion.in
- Proprietor: Mr. Guru Charan Singh Bedi (Est. 1987)

CORE CAPABILITIES:
1. School Uniforms (10 products): Shirts, trousers, pleated skirts, crested blazers, tracksuits, winter sweaters, house sports kits, PE polos, cardigans.
2. Corporate Wear (7 products): Formal wrinkle-free shirts, trousers, business suits, polo t-shirts with embroidered monograms, corporate blazers.
3. Industrial & Safety (8 products): 100% cotton twill boiler suits (240-280 GSM), EN 471 high-visibility reflective coveralls, leather welding aprons.
4. Medical & Healthcare (10 products): Silvadur™ antimicrobial surgeon scrubs, fluid-barrier gowns, doctor coats, patient gowns, 200 TC hospital linens, ICU isolation gowns.
5. Hotel & Culinary (6 products): Double-breasted chef coats, waiter uniforms, bar aprons, executive chef caps, houndstooth kitchen trousers.
6. Security Gear (11 products): Epaulet security shirts, safari suits, wool berets, metal whistle cords, belts, ties.
7. Sports & Athletic (4 products): Basketball kits, athletic tracksuits, dry-fit training tops, windcheaters.

COMMUNICATION GUIDELINES:
1. Tone: Highly polite, authoritative, industrial, hospitable, and business-focused.
2. Language: Seamlessly respond in English or Hindi (हिंदी) matching the customer's language.
3. Pricing Rules: Do not quote rigid single-unit prices. Explain that prices depend on order volume (25 pcs wholesale vs. 500+ institutional contracts) and fabric GSM.
4. Free Sample Offer: Always highlight that Bedi Fashion sends physical fabric swatches and sample garment sets to schools and hospitals for committee evaluation.
5. Lead Capture Handoff: Conclude product discussions with a clear WhatsApp trigger:
   "I can immediately share our fabric swatches and wholesale quotation with your purchase team. Would you like to connect directly with Mr. Bedi on WhatsApp (+91 9211825699)?"`;

const chatHandler = require('./api/chat.js');

function handleChatAPI(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      req.body = body ? JSON.parse(body) : {};
      await chatHandler(req, res);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
}

function httpsRequest(targetUrl, options, callback) {
  const parsed = new URL(targetUrl);
  const https = require('https');
  const req = https.request({
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.pathname + parsed.search,
    method: options.method || 'GET',
    headers: options.headers || {}
  }, callback);
  return req;
}

function fallbackLocal(userMessage, res) {
  const reply = generateSmartLocalReply(userMessage);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ reply: reply, source: 'local_concierge' }));
}

function generateSmartLocalReply(msg) {
  const m = msg.toLowerCase();
  const isHindi = /[\u0900-\u097F]/.test(msg) || m.includes('namaste') || m.includes('kaise') || m.includes('kripya') || m.includes('bataiye');

  if (m.includes('school') || m.includes('blazer') || m.includes('skirt') || m.includes('shirt') || m.includes('स्कूल')) {
    if (isHindi) {
      return `नमस्ते! बेदी फैशन™ फरीदाबाद 10+ स्कूल यूनिफॉर्म श्रेणियों का निर्माण करता है। हम डीएवी, डीपीएस और अन्य प्रतिष्ठित स्कूलों के लिए कस्टमाइज्ड स्कूल ब्लेजर (280-320 GSM वूल-ब्लेंड), क्रस्टेड शर्ट, और स्कर्ट तैयार करते हैं। स्कूल परचेज कमेटी के लिए हम तुरंत फ्री फैब्रिक सैंपल किट भेज सकते हैं। क्या आप श्री बेदी जी से व्हाट्सएप (+91 9211825699) पर कोटेशन लेना चाहेंगे?`;
    }
    return `Greetings from Bedi Fashion™! We manufacture complete school uniform solutions (280–320 GSM blazers, crested shirts, skirts, house jerseys) for 100+ schools. Minimum wholesale batch starts at 50 units. We provide complimentary sample kits for purchase committees. Would you like me to connect you with Mr. Bedi on WhatsApp (+91 9211825699)?`;
  }

  if (m.includes('corporate') || m.includes('suit') || m.includes('executive') || m.includes('कंपनी') || m.includes('ऑफिस')) {
    if (isHindi) {
      return `बेदी फैशन कॉर्पोरेट यूनिफॉर्म में प्रीमियम रिंकल-फ्री शर्ट, फॉर्मल ट्राउजर्स और ब्रांडेड एम्ब्रॉयडरी वाले ब्लेजर तैयार करता है। क्या आप अपनी कंपनी के लिए बल्क कोटेशन और फैब्रिक स्वैचेस देखना चाहते हैं? श्री बेदी जी से सीधे व्हाट्सएप (+91 9211825699) पर संपर्क करें।`;
    }
    return `Bedi Fashion provides executive corporate attire: premium poly-cotton shirts, Raymond-blend suiting, and custom logo embroidery. For institutional orders (25–5,000 pcs), we offer tailored fitting trials. Shall I connect you with Mr. Bedi on WhatsApp (+91 9211825699)?`;
  }

  if (m.includes('boiler') || m.includes('suit') || m.includes('industrial') || m.includes('safety') || m.includes('factory') || m.includes('कारखाना')) {
    if (isHindi) {
      return `हम 100% कॉटन टवील (240-280 GSM) बॉयलर सूट और 3M रिफ्लेक्टिव स्ट्रिप वाले हाई-विजिबिलिटी सेफ्टी कवरऑल बनाते हैं। फरीदाबाद और दिल्ली एनसीआर की निर्माण इकाइयों के लिए कस्टमाइज्ड लोगो उपलब्ध हैं। क्या आप फैब्रिक सैंपल चाहते हैं? व्हाट्सएप पर संपर्क करें: +91 9211825699।`;
    }
    return `Our industrial safety division produces EN-compliant 100% cotton twill boiler suits (240–280 GSM) and 3M reflective coveralls. Tested for durability across heavy engineering and chemical plants. Would you like physical swatches dispatched to your plant via WhatsApp (+91 9211825699)?`;
  }

  if (m.includes('hospital') || m.includes('scrub') || m.includes('doctor') || m.includes('nurse') || m.includes('अस्पताल')) {
    if (isHindi) {
      return `हम Silvadur™ एंटीमाइक्रोबियल सर्जिकल स्क्रब, डॉक्टर कोट (100% कॉटन 210 GSM), और 200 TC हॉस्पिटल लिनन बनाते हैं। सभी वस्त्र 70°C+ ऑटोक्लेव वॉश-प्रतिरोधी हैं। कोटेशन के लिए श्री बेदी जी (+91 9211825699) से व्हाट्सएप पर जुड़ें।`;
    }
    return `Bedi Fashion manufactures Silvadur™ antimicrobial scrubs, lab coats, and patient linen rated for 100+ industrial autoclave cycles. We supply top hospital networks across North India. Would you like hospital sample sets arranged via WhatsApp (+91 9211825699)?`;
  }

  if (m.includes('hotel') || m.includes('chef') || m.includes('waiter') || m.includes('restaurant') || m.includes('होटल')) {
    if (isHindi) {
      return `हमारी हॉस्पिटैलिटी रेंज में डबल-ब्रेस्टेड शेफ कोट, वेटर वेस्टकोट, बार एप्रन और कैफे यूनिफॉर्म शामिल हैं। फैब्रिक स्टेन-रेसिस्टेंट और हवादार होता है। जानकारी हेतु व्हाट्सएप करें: +91 9211825699।`;
    }
    return `We craft premium culinary uniforms: stain-resistant double-breasted chef coats, front-desk blazers, and ergonomic aprons. Bulk institutional delivery within 7-14 days. Contact Mr. Bedi directly on WhatsApp (+91 9211825699) for samples.`;
  }

  if (m.includes('security') || m.includes('guard') || m.includes('safari') || m.includes('सुरक्षा')) {
    if (isHindi) {
      return `सिक्योरिटी गार्ड्स के लिए एपॉलेट शर्ट, सफारी सूट, ऊनी बेरे कैप और व्हिसल कॉर्ड्स हमारे कारखाने में तैयार होते हैं। हैवी-ड्यूटी सिलाई और सटीक फिटिंग। थोक ऑर्डर के लिए व्हाट्सएप करें: +91 9211825699।`;
    }
    return `We outfit security agencies with rugged epaulet shirts, heavy safari suits, berets, and brass accessories. Built for rigorous all-weather duty. Speak with Mr. Bedi directly on WhatsApp (+91 9211825699) for agency rates.`;
  }

  if (m.includes('price') || m.includes('cost') || m.includes('rate') || m.includes('कीमत') || m.includes('दाम')) {
    if (isHindi) {
      return `बेदी फैशन संस्थागत विनिर्माता है। हमारे दाम ऑर्डर की संख्या (25 पीस बनाम 1000+ पीस) और फैब्रिक जीएसएम (GSM) पर निर्भर करते हैं। सटीक थोक दर सूची और फ्री सैंपल के लिए श्री बेदी जी से सीधे व्हाट्सएप (+91 9211825699) पर संपर्क करें।`;
    }
    return `As an OEM manufacturer, our tiered wholesale pricing depends on order volume and fabric GSM specifications. We guarantee North India's most competitive institutional rates. Connect with Mr. Bedi directly on WhatsApp (+91 9211825699) for an instant formal quote.`;
  }

  if (m.includes('sample') || m.includes('swatch') || m.includes('सैंपल')) {
    if (isHindi) {
      return `जी हाँ! बेदी फैशन स्कूलों, हॉस्पिटलों और कॉर्पोरेट टीमों को निरीक्षण हेतु निःशुल्क फैब्रिक स्वैच और रेडी गारमेंट सैंपल कूरियर करता है। सैंपल बुक करने के लिए व्हाट्सएप पर मैसेज भेजें: +91 9211825699।`;
    }
    return `Absolutely! We dispatch physical fabric swatches and fully finished sample garments free of charge to purchasing committees. Simply WhatsApp your delivery address to Mr. Bedi at +91 9211825699.`;
  }

  if (m.includes('moq') || m.includes('minimum') || m.includes('कम से कम')) {
    if (isHindi) {
      return `हमारी न्यूनतम थोक ऑर्डर मात्रा (MOQ) मानक वर्दी के लिए 25-50 पीस तथा कस्टम वीविंग/डाइंग के लिए 100 पीस है। हम छोटे और बड़े दोनों संस्थानों का स्वागत करते हैं। संपर्क: +91 9211825699।`;
    }
    return `Our standard MOQ is 25–50 pieces for in-stock catalog cuts and 100 pieces for bespoke mill dye batches. What quantities is your institution planning? Let's discuss on WhatsApp: +91 9211825699.`;
  }

  if (m.includes('contact') || m.includes('phone') || m.includes('address') || m.includes('location') || m.includes('shop') || m.includes('noida') || m.includes('factory') || m.includes('पता') || m.includes('फोन')) {
    if (isHindi) {
      return `बेदी फैशन™ के संपर्क निर्देशांक:\n• मुख्य कार्यालय: प्लॉट नं. 125, सेक्टर-18, फरीदाबाद, हरियाणा - 121002\n• शॉप (Bedi Creation): गली नंबर 3, पंजाब नेशनल बैंक के सामने, RS ब्यूटी पार्लर के पास, F ब्लॉक, सेक्टर 44, नोएडा, उत्तर प्रदेश - 201303\n• प्रोप्राइटर: श्री गुरु चरण सिंह बेदी (स्थापना 1987)\n• संपर्क मोबाइल: +91 9310825699 | +91 9811825699 | +91 9899114052\n• व्हाट्सएप: +91 9211825699\n• ईमेल: info@bedifashion.in`;
    }
    return `Bedi Fashion™ Coordinates:\n• Head Office: Plot No - 125, Sector-18, Faridabad, Haryana - 121002\n• Shop (Bedi Creation): Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303\n• Proprietor: Mr. Guru Charan Singh Bedi (Est. 1987)\n• Contact Mobile: +91 9310825699 | +91 9811825699 | +91 9899114052\n• WhatsApp Desk: +91 9211825699\n• Email: info@bedifashion.in | garments@bedifashion.in`;
  }

  if (isHindi) {
    return `बेदी फैशन™ (स्थापना 1987, प्रोप्राइटर: श्री गुरु चरण सिंह बेदी) ${HERITAGE_YEARS}+ वर्षों से प्रीमियम संस्थागत वर्दी प्रदाता है। क्या आप अपनी संस्था के लिए श्री बेदी जी से सीधे व्हाट्सएप (+91 9211825699) पर बात करना और फैब्रिक सैंपल प्राप्त करना चाहेंगे?`;
  }
  return `Bedi Fashion™ (Founded 1987, Proprietor: Mr. Guru Charan Singh Bedi) has ${HERITAGE_YEARS}+ years of institutional uniform heritage. Would you like to connect directly with Mr. Guru Charan Singh Bedi on WhatsApp (+91 9211825699) to discuss your institutional requirements and receive physical fabric swatches?`;
}

function handleInquiriesPost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const newInquiry = JSON.parse(body || '{}');
      newInquiry.id = 'rfq-' + Date.now();
      newInquiry.timestamp = new Date().toISOString();

      let currentInquiries = [];
      if (fs.existsSync(INQUIRIES_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf-8'));
          if (Array.isArray(parsed)) currentInquiries = parsed;
        } catch (_) {}
      }

      currentInquiries.unshift(newInquiry);
      fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(currentInquiries, null, 2), 'utf-8');

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, inquiry_id: newInquiry.id }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Failed to record inquiry' }));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (pathname === '/api/chat' && req.method === 'POST') {
    handleChatAPI(req, res);
    return;
  }

  if (pathname === '/api/inquiries' && req.method === 'POST') {
    handleInquiriesPost(req, res);
    return;
  }

  if (pathname === '/api/products' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'products.json'), res);
    return;
  }

  if (pathname === '/api/categories' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'categories.json'), res);
    return;
  }

  if (pathname === '/api/fabrics' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'fabrics.json'), res);
    return;
  }

  if (pathname === '/api/size_guides' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'size_guides.json'), res);
    return;
  }

  if (pathname === '/api/testimonials' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'testimonials.json'), res);
    return;
  }

  if (pathname === '/api/faq' && req.method === 'GET') {
    serveJsonFile(path.join(DATA_DIR, 'faq.json'), res);
    return;
  }

  if (pathname === '/api/inquiries' && req.method === 'GET') {
    serveJsonFile(INQUIRIES_FILE, res);
    return;
  }

  // Admin API Gateway
  if (pathname.startsWith('/api/admin')) {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (_) {
        req.body = {};
      }
      req.query = parsedUrl.query || {};
      const adminHandler = require('./api/admin.js');
      adminHandler(req, res);
    });
    return;
  }

  // Admin Web Portal
  if (pathname === '/admin') {
    const adminPath = path.join(BASE_DIR, 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(adminPath).pipe(res);
      return;
    }
  }

  // Favicon Route
  if (pathname === '/favicon.ico') {
    const faviconPath = path.join(BASE_DIR, 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=86400'
      });
      fs.createReadStream(faviconPath).pipe(res);
    } else {
      res.writeHead(204);
      res.end();
    }
    return;
  }

  // Static File Serving
  if (pathname === '/') pathname = '/index.html';
  let decodedPath = '/index.html';
  try {
    decodedPath = decodeURIComponent(pathname);
    if (decodedPath.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // Prevent Directory Traversal
  const safePath = path.resolve(BASE_DIR, '.' + decodedPath);
  if (!safePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden - Access Denied');
    return;
  }

  try {
    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - Bedi Fashion Platform');
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      fs.createReadStream(safePath).pipe(res);
    });
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
  }
});

function serveJsonFile(filePath, res) {
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'File not found' }));
  }
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🧵 BEDI FASHION™ — MILANESE LUXURY MAISON PLATFORM`);
    console.log(`🚀 Live on: http://localhost:${PORT}`);
    console.log(`📍 Head Office: Plot No - 125, Sector-18, Faridabad`);
    console.log(`🏬 Shop (Bedi Creation): Sector 44, Noida, UP - 201303`);
    console.log(`=======================================================`);
  });
} else {
  server.listen(PORT);
}

module.exports = server;
