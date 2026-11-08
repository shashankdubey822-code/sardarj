const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ovdvycumqsjgvlsickjy.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHZ5Y3VtcXNqZ3Zsc2lja2p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mzk1Njc2MywiZXhwIjoyMTA5NTMyNzYzfQ.UWW-Xb-40EtxaRJ-kisvmwQCjiDj_dvfUg1r2UM4Gos";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "EABBVGoZAyqooBS8KYAZCM6iGlLAfZBJAJulpRdwlUQO7TKZCtYaBKcWidRoF5DxTGZAJd48NgSMfi8TxEMU6BrMZBiJg23FenaDxteNhUI1auZCIBT6ZCH3PiXUkTRChT3ZBpk8wScm0euy8VrUzgSOjmg8C971p1fPLZAJrYZCPh7ZAyLYu8myUFy6cCOSZAJt3C1wZDZD";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1373460992523647";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6JNRZTQJuTa3puHmniOLkk_t_6OSEyPkGO0Oo1Kc7LqiQ";

// Helper for Supabase REST requests
async function supabaseFetch(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(parsed, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsedData });
        } catch (_) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Clean and normalize phone numbers (e.g., 9211825699 -> 919211825699)
function normalizePhone(raw) {
  if (!raw) return '';
  let cleaned = String(raw).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // already valid
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.slice(1);
  }
  return cleaned;
}

module.exports = async (req, res) => {
  // Support both Express/Vercel and native Node http.ServerResponse
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action;

  // 1. GET CONTACTS LIST
  if (action === 'get_contacts' || (req.method === 'GET' && !action)) {
    try {
      const result = await supabaseFetch('customer_contacts?select=*&order=id.desc&limit=200');
      const countResult = await supabaseFetch('customer_contacts?select=count');
      const total = Array.isArray(countResult.data) ? countResult.data[0]?.count || 0 : (result.data?.length || 0);

      return res.status(200).json({
        total,
        contacts: Array.isArray(result.data) ? result.data : []
      });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  // 2. CSV BATCH UPLOAD WITH DEDUPLICATION
  if (action === 'upload_csv' && req.method === 'POST') {
    try {
      const rawContacts = req.body?.contacts || [];
      if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
        return res.status(400).json({ error: 'No contacts provided in payload' });
      }

      // De-duplicate in incoming batch first
      const uniqueMap = new Map();
      for (const item of rawContacts) {
        const phone = normalizePhone(item.phone || item.mobile || item.number || item.contact);
        const name = (item.name || item.customer_name || 'Valued Customer').trim();
        const organization = (item.organization || item.company || item.school || '').trim();

        if (phone && phone.length >= 10 && !uniqueMap.has(phone)) {
          uniqueMap.set(phone, { name, phone, organization });
        }
      }

      const cleanList = Array.from(uniqueMap.values());
      let added = 0;
      let skipped = 0;

      // Upsert into Supabase with ON CONFLICT (phone) DO NOTHING
      for (const c of cleanList) {
        try {
          const insertRes = await supabaseFetch('customer_contacts', 'POST', c);
          if (insertRes.status === 201) {
            added++;
          } else {
            // Already exists / conflict
            skipped++;
          }
        } catch (_) {
          skipped++;
        }
      }

      const countResult = await supabaseFetch('customer_contacts?select=count');
      const totalDatabase = Array.isArray(countResult.data) ? countResult.data[0]?.count || 0 : added;

      return res.status(200).json({
        success: true,
        received_rows: rawContacts.length,
        unique_submitted: cleanList.length,
        new_added: added,
        existing_skipped: skipped,
        total_database: totalDatabase
      });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  // 3. DETECT OCCASION & GENERATE 4-5 LINE GREETING NOTE
  if (action === 'detect_occasion') {
    const today = req.body?.date || new Date().toISOString().slice(0, 10);
    const customOccasion = req.body?.custom_occasion;

    let prompt = "";
    if (customOccasion) {
      prompt = `Occasion: "${customOccasion}". Write an authentic, respectful 4-5 line festive greeting in Indian business English with rich celebratory emojis (🪔✨🌟🙏🌸). Represent the sender as "Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)". Express heartfelt prayers for prosperity, health, and family happiness. Format as JSON: { "occasion": "${customOccasion}", "greeting_note": "4-5 lines note", "image_url": "/images/diwali_greeting_bedi_fashion.jpg" }`;
    } else {
      prompt = `Today's date is ${today}. 
1. Check major Indian celebrations (Hindu, Muslim, Sikh, Christian, National: Diwali, Holi, Eid, Gurpurab, New Year, Christmas, Independence Day, etc.). 
2. If there is a holiday or upcoming festival, identify it. If none, select "Auspicious Festive Greetings".
3. Write a respectful, warm 4-5 line greeting note with rich festive emojis representing "Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)" wishing prosperity, joy, and peace.
Format as JSON: { "occasion": "Festival Name", "greeting_note": "4-5 line note with emojis", "image_url": "/images/diwali_greeting_bedi_fashion.jpg" }`;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
      const payload = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 350 }
      });

      const aiRes = await new Promise((resolve, reject) => {
        const req = https.request(new URL(url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (r) => {
          let str = '';
          r.on('data', d => str += d);
          r.on('end', () => resolve(str));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      const parsed = JSON.parse(aiRes);
      let text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean JSON if returned in markdown code blocks
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let resJson = {};
      try {
        resJson = JSON.parse(text);
      } catch (_) {
        resJson = {
          occasion: customOccasion || "Diwali 🪔",
          image_url: "/images/diwali_greeting_bedi_fashion.jpg",
          greeting_note: text || `🪔✨ *शुभ दीपावली | Festive Greetings from Bedi Fashion™* ✨🪔\n\n🙏 Warmest Diwali greetings and heartfelt blessings to you and your beloved family!\n🌟 May the divine glow of Diwali fill your life with boundless joy, prosperity, peace, and vibrant health.\n🌸 We deeply cherish your trusted relationship with us.\n\n🎆 *With sincere respect, warm prayers & festive regards,*\n*Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)* 🇮🇳🙏`
        };
      }

      if (!resJson.image_url) {
        resJson.image_url = "/images/diwali_greeting_bedi_fashion.jpg";
      }

      return res.status(200).json(resJson);
    } catch (e) {
      return res.status(200).json({
        occasion: customOccasion || "Diwali 🪔",
        image_url: "/images/diwali_greeting_bedi_fashion.jpg",
        greeting_note: `🪔✨ *शुभ दीपावली | Festive Greetings from Bedi Fashion™* ✨🪔\n\n🙏 Warmest Diwali greetings and heartfelt blessings to you and your beloved family!\n🌟 May the divine glow of Diwali fill your life with boundless joy, prosperity, peace, and vibrant health.\n🌸 We deeply cherish your trusted relationship with us.\n\n🎆 *With sincere respect, warm prayers & festive regards,*\n*Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)* 🇮🇳🙏`
      });
    }
  }

  // 4. BROADCAST FESTIVE GREETINGS VIA META WHATSAPP API
  if (action === 'broadcast' && req.method === 'POST') {
    const { imageUrl, greetingNote, testPhone } = req.body || {};

    if (!greetingNote) {
      return res.status(400).json({ error: 'Greeting note is required' });
    }

    let recipients = [];
    if (testPhone) {
      recipients = [{ phone: normalizePhone(testPhone), name: 'Test User' }];
    } else {
      const contactsRes = await supabaseFetch('customer_contacts?select=phone,name');
      recipients = Array.isArray(contactsRes.data) ? contactsRes.data : [];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found to broadcast' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const r of recipients) {
      const toPhone = normalizePhone(r.phone);
      if (!toPhone) continue;

      const metaUrl = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
      const msgPayload = imageUrl
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
            type: "image",
            image: { link: imageUrl, caption: greetingNote }
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
            type: "text",
            text: { body: greetingNote }
          };

      try {
        const payloadStr = JSON.stringify(msgPayload);
        const metaRes = await new Promise((resolve) => {
          const req = https.request(new URL(metaUrl), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payloadStr)
            }
          }, (res) => {
            let str = '';
            res.on('data', d => str += d);
            res.on('end', () => resolve({ status: res.statusCode, body: str }));
          });
          req.on('error', () => resolve({ status: 500 }));
          req.write(payloadStr);
          req.end();
        });

        if (metaRes.status === 200) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (_) {
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      sent: successCount,
      failed: failCount,
      total_recipients: recipients.length
    });
  }

  return res.status(400).json({ error: 'Invalid action or method' });
};
