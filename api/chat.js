/**
 * BEDI FASHION™ — OFFICIAL GEMINI + LIVE CATALOG CONCIERGE (/api/chat)
 * Fetches real-time inventory, prices, sizes, and stock directly from live catalog,
 * and powers generous conversational responses via the Google Gemini Interactions API.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ovdvycumqsjgvlsickjy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHZ5Y3VtcXNqZ3Zsc2lja2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NTY3NjMsImV4cCI6MjEwOTUzMjc2M30.5p8Mjo8WViCHWYeZ7i9qsJZ1ZVw9FaegYBtySvolnfs";

const BUSINESS_PROFILE = `
BRAND & LEADERSHIP:
- Firm: Bedi Fashion™ (Established 1987 — 39+ Years of Heritage)
- Proprietor: Mr. Guru Charan Singh Bedi
- Contact Mobile Numbers: +91 9310825699 | +91 9811825699 | +91 9899114052
- Official WhatsApp Desk: +91 9211825699
- Official Emails: info@bedifashion.in | garments@bedifashion.in

LOCATIONS:
- Head Office: Plot No - 125, Sector-18, Faridabad, Haryana - 121002
- Shop (Bedi Creation): Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303

CUSTOMIZE UNIFORMS & SERVICES:
- Ready-stock supply & Customized Institutional Uniforms (Schools, Corporate, Hospitals, Security, Hospitality, Sports)
- Customers can interactively customize fabrics, collars, house stripes, bullion school crest embroidery, and custom sizing via our 3D Uniform Studio (https://sardarj.vercel.app/#studio) or Institutional Bulk Estimator.
- Ready stock dispatch: 3–7 working days; Customized institutional orders: 14–21 working days with complimentary swatch kits and on-site sizing drives.
`;

function formatCategoryLabel(rawCat) {
  const map = {
    "T-shirt": "School & House T-Shirts",
    "Tunics": "Girls Uniform Tunics",
    "Coat": "Coats & Blazers",
    "Belt_pant": "School Pants & Trousers",
    "Shoes": "Uniform Shoes (Black & White)",
    "Devider": "Sports Dividers",
    "Cycling_shorts": "Cycling Shorts",
    "Belt": "School Uniform Belts",
    "Tie": "School Uniform Ties",
    "Table": "Study Tables"
  };
  return map[rawCat] || String(rawCat || "Other Items").replace(/_/g, " ");
}

async function fetchLiveProducts() {
  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/products?select=item_code,name,category,color,available_sizes,base_price,tax_percentage,final_price,stock_quantity,is_in_stock,description&order=id.asc&limit=500`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Live catalog fetch warning:", err.message);
    return [];
  }
}

function buildCatalogContext(products) {
  if (!products || products.length === 0) {
    return "LIVE PRODUCT CATALOG: Catalog temporarily unavailable; offer general guidance and invite the visitor to call Proprietor Mr. Guru Charan Singh Bedi on +91 9310825699, +91 9811825699, or +91 9899114052.";
  }

  const lines = [`BEDI FASHION™ OFFICIAL PRODUCT CATALOG (${products.length} items, prices in INR incl. GST):`];
  const byCategory = new Map();

  for (const p of products) {
    const cat = formatCategoryLabel(p.category);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  }

  for (const [catName, items] of byCategory.entries()) {
    lines.push(`\n[${catName}] (${items.length} variants):`);
    for (const item of items) {
      const stockTxt = Number(item.stock_quantity || 0) > 0 && item.is_in_stock !== false
        ? `In Stock (${item.stock_quantity} pcs)`
        : "Available on Customized Order";
      const price = Number(item.final_price || item.base_price || 0).toFixed(2);
      const color = item.color && item.color !== "Standard" ? ` | Color: ${item.color}` : "";
      lines.push(
        `  • Code ${item.item_code || "-"} | ${item.name} | Size: ${item.available_sizes || "Std"}${color} | Final Price: ₹${price} (Base ₹${item.base_price} + ${item.tax_percentage || 5}% GST) | ${stockTxt}`
      );
    }
  }
  return lines.join("\n");
}

function extractInteractionText(data) {
  if (!data) return "";
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (Array.isArray(data.steps)) {
    const chunks = [];
    for (const step of data.steps) {
      if (step?.type === "model_output" && Array.isArray(step.content)) {
        for (const c of step.content) {
          if (c?.type === "text" && typeof c.text === "string") {
            chunks.push(c.text);
          }
        }
      }
    }
    if (chunks.length > 0) return chunks.join("\n").trim();
  }
  if (Array.isArray(data.outputs)) {
    const chunks = data.outputs
      .filter((o) => o?.type === "text" && typeof o.text === "string")
      .map((o) => o.text);
    if (chunks.length > 0) return chunks.join("\n").trim();
  }
  return "";
}

async function callGeminiInteractions(apiKey, systemInstruction, message, history, previousInteractionId) {
  const historyLines = Array.isArray(history)
    ? history
        .slice(-8, -1)
        .map((m) => `${m.role === "user" ? "Customer" : "BediBot"}: ${m.content}`)
        .join("\n")
    : "";

  const inputPrompt = !previousInteractionId && historyLines
    ? `Recent Conversation Context:\n${historyLines}\n\nLatest Customer Message:\n${message}`
    : message;

  // Put responsive gemini-3.5-flash-lite first with seamless fallback to 3.8 / 3.1
  const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"];

  for (const model of models.slice(0, 3)) {
    try {
      const payload = {
        model,
        system_instruction: systemInstruction,
        input: inputPrompt,
        generation_config: {
          max_output_tokens: 700
        }
      };
      if (previousInteractionId) {
        payload.previous_interaction_id = previousInteractionId;
      }

      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      if (res.ok) {
        try {
          const data = JSON.parse(raw);
          const reply = extractInteractionText(data);
          if (reply) {
            return { reply, interactionId: data.id || null, model };
          }
        } catch (_) {}
      } else {
        console.warn(`Gemini Interactions (${model}) HTTP ${res.status}:`, raw.slice(0, 140));
        if (res.status === 401 || res.status === 403) return null;
      }
    } catch (err) {
      console.warn(`Gemini Interactions (${model}) error:`, err.message);
    }
  }

  return null;
}

function buildLiveCatalogFallbackReply(message, products, lang) {
  const m = String(message || "").toLowerCase();
  const isHindi = lang === "hi" || /[\u0900-\u097F]/.test(message);

  const byCategory = new Map();
  for (const p of products) {
    const label = formatCategoryLabel(p.category);
    if (!byCategory.has(label)) byCategory.set(label, []);
    byCategory.get(label).push(p);
  }

  if (
    m.includes("address") ||
    m.includes("location") ||
    m.includes("shop") ||
    m.includes("noida") ||
    m.includes("faridabad") ||
    m.includes("contact") ||
    m.includes("phone") ||
    m.includes("mobile") ||
    m.includes("owner") ||
    m.includes("proprietor") ||
    m.includes("पता")
  ) {
    return isHindi
      ? `**बेदी फैशन™** (स्थापना **1987** • प्रोप्राइटर: **श्री गुरु चरण सिंह बेदी**) में आपका हार्दिक स्वागत है!\n\n• **मुख्य कार्यालय (Head Office):** प्लॉट नं. 125, सेक्टर-18, फरीदाबाद, हरियाणा - 121002\n• **शॉप (Bedi Creation):** गली नंबर 3, पंजाब नेशनल बैंक के सामने, RS ब्यूटी पार्लर के पास, F ब्लॉक, सेक्टर 44, नोएडा, उत्तर प्रदेश - 201303\n• **संपर्क मोबाइल:** +91 9310825699 | +91 9811825699 | +91 9899114052\n• **व्हाट्सएप:** +91 9211825699\n• **ईमेल:** info@bedifashion.in`
      : `You are most welcome at **Bedi Fashion™** (Established **1987** • Proprietor: **Mr. Guru Charan Singh Bedi**).\n\n• **Head Office:** Plot No - 125, Sector-18, Faridabad, Haryana - 121002\n• **Shop (Bedi Creation):** Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303\n• **Contact Mobile:** +91 9310825699 | +91 9811825699 | +91 9899114052\n• **WhatsApp Desk:** +91 9211825699\n• **Email:** info@bedifashion.in`;
  }

  if (m.includes("customiz") || m.includes("custom") || m.includes("embroider") || m.includes("tailor") || m.includes("logo")) {
    return `We would be delighted to tailor **Customized Uniforms** to your institution's exact specifications!\n\n• **What You Can Customize:** School crest bullion embroidery, custom house stripes/Pantone dye colors, bespoke collar cuts, and sizes from 20 (Junior) to 54 (5XL).\n• **MOQ & Turnaround:** 25 pcs for stocked customization; 100 pcs for bespoke fabric runs (14–21 days), with complimentary fabric swatch kits.\n• **Try Online Now:** Inspect fabrics in our **3D Uniform Studio** on this page or open the **Bulk Estimator & RFQ**.\n\nCall or message us directly on **+91 9310825699**, **+91 9811825699**, **+91 9899114052** *(WhatsApp: +91 9211825699)*.`;
  }

  const stopWords = new Set(["want", "some", "need", "price", "rate", "rates", "cost", "buy", "from", "have", "what", "with", "this", "that", "size", "sizes", "uniform", "uniforms", "school", "show", "tell", "give", "much", "available", "stock"]);
  const words = m.replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w) && !/^(is|am|are|the|for|can|you|get|all|any|do|me|my|of|in|on|to)$/.test(w));
  let matched = [];
  if (words.length > 0) {
    const strictMatched = products.filter((p) => {
      const hay = `${p.item_code} ${p.name} ${formatCategoryLabel(p.category)} ${p.category} ${p.color} ${p.description} ${p.available_sizes}`.toLowerCase();
      return words.every((k) => hay.includes(k));
    });
    matched = strictMatched.length > 0
      ? strictMatched
      : products.filter((p) => {
          const hay = `${p.item_code} ${p.name} ${formatCategoryLabel(p.category)} ${p.category} ${p.color} ${p.description} ${p.available_sizes}`.toLowerCase();
          return words.some((k) => hay.includes(k));
        });
  }

  if (matched.length > 0 && matched.length <= 20) {
    const top = matched.slice(0, 8);
    const rows = top
      .map((p) => {
        const stockNote = Number(p.stock_quantity || 0) > 0 ? `${p.stock_quantity} pcs ready` : "Available on customized order";
        return `• **${p.name}** (${formatCategoryLabel(p.category)}, Size ${p.available_sizes}): **₹${Number(p.final_price || p.base_price).toFixed(2)}** *(incl. 5% GST • ${stockNote})*`;
      })
      .join("\n");
    return `We would be delighted to help you with that! Here are live items currently available:\n\n${rows}\n\nWe also craft **Customized Uniforms** tailored to your institutional requirements (**Mr. Guru Charan Singh Bedi**, Est. 1987). Reach us on **+91 9310825699**, **+91 9811825699**, **+91 9899114052** *(WhatsApp: +91 9211825699)*!`;
  }

  if (products.length > 0) {
    const catLines = [];
    for (const [cat, items] of byCategory.entries()) {
      const prices = items.map((i) => Number(i.final_price || i.base_price || 0)).filter((v) => v > 0);
      const minP = prices.length ? Math.min(...prices).toFixed(2) : "—";
      const maxP = prices.length ? Math.max(...prices).toFixed(2) : "—";
      const optLabel = items.length === 1 ? "1 option" : `${items.length} options`;
      const rangeStr = minP === maxP ? `₹${minP}` : `₹${minP} – ₹${maxP}`;
      catLines.push(`• **${cat}** (${optLabel}): **${rangeStr}** *(incl. GST)*`);
    }
    return `Namaste! Welcome to **Bedi Fashion™** (Proprietor: **Mr. Guru Charan Singh Bedi**, Est. 1987). We would be thrilled to assist with your uniform needs!\n\nHere is our current range:\n${catLines.join("\n")}\n\nLet us know which product, size, or **Customized Uniforms** requirement you have — or call **+91 9310825699 | +91 9811825699 | +91 9899114052**!`;
  }

  return `Namaste! Welcome to **Bedi Fashion™** (Proprietor: **Mr. Guru Charan Singh Bedi**, Est. 1987). Please let us know what uniform items or **Customized Uniforms** requirements we can help with — call **+91 9310825699**, **+91 9811825699**, or **+91 9899114052** *(WhatsApp: +91 9211825699)*.`;
}

module.exports = async (req, res) => {
  if (!res.status) {
    res.status = (code) => { res.statusCode = code; return res; };
  }
  if (!res.json) {
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(data));
      return res;
    };
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const message = String(body?.message || "").trim();
  const history = Array.isArray(body?.history) ? body.history : [];
  const lang = body?.lang || "en";
  const previousInteractionId = body?.previousInteractionId || null;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const products = await fetchLiveProducts();
  const catalogContext = buildCatalogContext(products);

  const systemInstruction = `You are "BediBot", the warm, generous, and articulate client advisor for Bedi Fashion™.
Your goal is to delight institutional buyers, schools, businesses, and parents with gracious service, clear grammar, and accurate product rates.

${BUSINESS_PROFILE}

${catalogContext}

CONVERSATION GUIDELINES:
1. Be warm, generous, welcoming, and polite in English or Hindi (Devanagari) matching the customer's language.
2. NEVER mention internal backend systems, databases, architecture, Supabase, APIs, or technical words. Speak naturally as a showroom representative of Bedi Fashion™.
3. Always use "Customized Uniforms" / "Customize Uniforms" (never "Custom Uniform") with crystal-clear grammar.
4. Quote exact product names, sizes, final GST-inclusive prices, and stock availability directly from the official catalog above. If an item is currently out of stock, kindly note it is available via Customized Order.
5. For Customize Uniform inquiries, walk the customer through sector choice (School/Corporate/Hospital/Industrial), embroidery/fabric swatches, sizing, and invite them to try the 3D Uniform Studio or contact us.
6. Never reference any factory or Sector 31/32 unit—share our Faridabad Sector 18 Head Office, Noida Sector 44 Shop (Bedi Creation), Contact Mobile (+91 9310825699, +91 9811825699, +91 9899114052), and WhatsApp (+91 9211825699).`;

  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  if (geminiApiKey) {
    const aiResult = await callGeminiInteractions(
      geminiApiKey,
      systemInstruction,
      message,
      history,
      previousInteractionId
    );
    if (aiResult && aiResult.reply) {
      return res.status(200).json({
        reply: aiResult.reply,
        interactionId: aiResult.interactionId,
        model: aiResult.model,
        productsCount: products.length,
        source: "gemini"
      });
    }
  }

  const fallbackReply = buildLiveCatalogFallbackReply(message, products, lang);
  return res.status(200).json({
    reply: fallbackReply,
    productsCount: products.length,
    source: "catalog_concierge"
  });
};
