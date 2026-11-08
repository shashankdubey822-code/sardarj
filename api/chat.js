const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6JNRZTQJuTa3puHmniOLkk_t_6OSEyPkGO0Oo1Kc7LqiQ";

module.exports = async (req, res) => {
  if (!res.status) {
    res.status = (code) => { res.statusCode = code; return res; };
  }
  if (!res.json) {
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const message = body?.message || "";

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  const payload = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: message }] }],
    generationConfig: { maxOutputTokens: 250, temperature: 0.3 }
  });

  try {
    const url = new URL(endpoint);
    const apiReq = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "Namaste! Welcome to Bedi Fashion™ (Faridabad, Est. 1997). Connect with Mr. Bedi on WhatsApp: +91 9211825699.";
          return res.status(200).json({ reply, source: 'gemini' });
        } catch (_) {
          return res.status(200).json({ reply: "Namaste! Connect directly with Mr. Bedi at +91 9211825699.", source: 'fallback' });
        }
      });
    });

    apiReq.on('error', () => {
      return res.status(200).json({ reply: "Namaste! Connect with Mr. Bedi on WhatsApp: +91 9211825699.", source: 'fallback' });
    });

    apiReq.write(payload);
    apiReq.end();
  } catch (err) {
    return res.status(200).json({ reply: "Namaste! Contact us at +91 9211825699.", source: 'fallback' });
  }
};
