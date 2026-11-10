/**
 * BEDI FASHION™ — OFFICIAL GEMINI + LIVE SUPABASE CHAT CONCIERGE (/api/chat)
 * Fetches real-time inventory, prices, sizes, and stock directly from Supabase,
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
- Direct Phone / WhatsApp: +91 9211825699 | +91 9811825699 | +91 9899114052
- Official Emails: info@bedifashion.in | garments@bedifashion.in

LOCATIONS:
- Head Office: Plot No - 125, Sector-18, Faridabad, Haryana - 121002
- Shop (Bedi Creation): Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303

SERVICES:
- Ready-stock supply & Customized Institutional Uniforms (Schools, Corporate, Hospitals, Security, Hospitality, Sports)
- Custom school crest embroidery, custom fabric dyeing, on-site institutional sizing drives, and complimentary swatch kits.
- Ready stock dispatch: 3–7 working days; Customized institutional orders: 14–21 working days.
`;

/**
 * Normalize Supabase category names for grammatically clear display.
 */
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

/**
 * Fetch live product rows directly from Supabase.
 */
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
    console.warn("Supabase live products fetch warning:", err.message);
    return [];
  }
}

/**
 * Format live Supabase catalog into a compact reference block for Gemini.
 */
function buildCatalogContext(products) {
  if (!products || products.length === 0) {
    return "LIVE SUPABASE INVENTORY: Catalog temporarily unavailable; offer general institutional guidance and offer to connect directly with Proprietor Mr. Guru Charan Singh Bedi (+91 9211825699).";
  }

  const lines = [`LIVE SUPABASE INVENTORY (${products.length} items, rates in INR incl. tax):`];
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
        ? `In Stock (${item.stock_quantity})`
        : "Out of Stock (available on custom order)";
      const price = Number(item.final_price || item.base_price || 0).toFixed(2);
      const color = item.color && item.color !== "Standard" ? ` | Color: ${item.color}` : "";
      lines.push(
        `  • Code ${item.item_code || "-"} | ${item.name} | Size: ${item.available_sizes || "Std"}${color} | Final Price: ₹${price} (Base ₹${item.base_price} + ${item.tax_percentage || 5}% GST) | ${stockTxt}`
      );
    }
  }
  return lines.join("\n");
}

/**
 * Extract reply text from Gemini Interactions API response steps.
 */
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

/**
 * Call Google Gemini Interactions API with live Supabase inventory context.
 */
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

  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
  for (const model of models) {
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
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        continue;
      }

      if (res.ok) {
        const reply = extractInteractionText(data);
        if (reply) {
          return { reply, interactionId: data.id || null, model };
        }
      } else {
        console.warn(`Gemini Interactions (${model}) HTTP ${res.status}:`, raw.slice(0, 200));
        if (res.status === 401 || res.status === 403) break;
      }
    } catch (err) {
      console.warn(`Gemini Interactions (${model}) error:`, err.message);
    }
  }
  return null;
}

/**
 * Dynamic fallback reply powered directly by live Supabase data (used only if Gemini key fails or is absent).
 */
function buildLiveSupabaseFallbackReply(message, products, lang) {
  const m = String(message || "").toLowerCase();
  const isHindi = lang === "hi" || /[\u0900-\u097F]/.test(message);

  // Summarize categories from live Supabase rows
  const byCategory = new Map();
  for (const p of products) {
    const label = formatCategoryLabel(p.category);
    if (!byCategory.has(label)) byCategory.set(label, []);
    byCategory.get(label).push(p);
  }

  // Contact / Location / Shop / Owner query
  if (
    m.includes("address") ||
    m.includes("location") ||
    m.includes("shop") ||
    m.includes("noida") ||
    m.includes("faridabad") ||
    m.includes("contact") ||
    m.includes("phone") ||
    m.includes("owner") ||
    m.includes("proprietor") ||
    m.includes("पता")
  ) {
    return isHindi
      ? `**बेदी फैशन™** (स्थापना 1987 • प्रोप्राइटर: **श्री गुरु चरण सिंह बेदी**) में आपका हार्दिक स्वागत है!\n\n- **मुख्य कार्यालय (Head Office):** प्लॉट नं. 125, सेक्टर-18, फरीदाबाद, हरियाणा - 121002\n- **शॉप (Bedi Creation):** गली नंबर 3, पंजाब नेशनल बैंक के सामने, RS ब्यूटी पार्लर के पास, F ब्लॉक, सेक्टर 44, नोएडा, उत्तर प्रदेश - 201303\n- **फ़ोन / व्हाट्सएप:** +91 9211825699 | +91 9811825699\n- **ईमेल:** info@bedifashion.in`
      : `You are most welcome at **Bedi Fashion™** (Established **1987** • Proprietor: **Mr. Guru Charan Singh Bedi**).\n\n• **Head Office:** Plot No - 125, Sector-18, Faridabad, Haryana - 121002\n• **Shop (Bedi Creation):** Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303\n• **Direct Phone / WhatsApp:** +91 9211825699 | +91 9811825699 | +91 9899114052\n• **Email:** info@bedifashion.in`;
  }

  // Specific product/category search in live Supabase data
  const stopWords = new Set(["want", "some", "need", "price", "rate", "cost", "buy", "from", "have", "what", "with", "this", "that", "uniform", "uniforms", "school"]);
  const keywords = m.split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
  const matched = keywords.length > 0
    ? products.filter((p) => {
        const hay = `${p.item_code} ${p.name} ${formatCategoryLabel(p.category)} ${p.category} ${p.color} ${p.description} ${p.available_sizes}`.toLowerCase();
        return keywords.some((k) => hay.includes(k));
      })
    : [];

  if (matched.length > 0 && matched.length <= 20) {
    const top = matched.slice(0, 8);
    const rows = top
      .map((p) => {
        const stockNote = Number(p.stock_quantity || 0) > 0 ? `${p.stock_quantity} in stock` : "Made to order";
        return `• **${p.name}** (${formatCategoryLabel(p.category)}, Size ${p.available_sizes}): **₹${Number(p.final_price || p.base_price).toFixed(2)}** *(incl. 5% GST • ${stockNote})*`;
      })
      .join("\n");
    return `We would be delighted to help you with that! Here are live items from our inventory:\n\n${rows}\n\nWe also fulfill **Customized Uniforms** and bulk institutional orders (Proprietor: **Mr. Guru Charan Singh Bedi**, Est. 1987). Call or WhatsApp us at **+91 9211825699** for instant dispatch or fabric swatches!`;
  }

  // General catalog or school uniform query
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
    return `Namaste! Welcome to **Bedi Fashion™** (Proprietor: **Mr. Guru Charan Singh Bedi**, Est. 1987). We would be thrilled to fulfill your uniform requirements!\n\nHere is our live range currently available:\n${catLines.join("\n")}\n\nPlease let us know which category, size, or **Customized Uniform** order you are looking for, or reach us directly on WhatsApp at **+91 9211825699**!`;
  }

  return `Namaste! Welcome to **Bedi Fashion™** (Proprietor: **Mr. Guru Charan Singh Bedi**, Est. 1987). Please let us know what uniform items or customized orders you need, and we will gladly assist you — or connect directly on WhatsApp at **+91 9211825699**.`;
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

  // Always fetch live products from Supabase so changes reflect instantaneously
  const products = await fetchLiveProducts();
  const catalogContext = buildCatalogContext(products);

  const systemInstruction = `You are "BediBot", the warm, generous, and expert client advisor for Bedi Fashion™.
Your mission is to help schools, corporate buyers, parents, and institutions with warmth, generosity, crystal-clear grammar, and accurate live database information.

${BUSINESS_PROFILE}

${catalogContext}

CONVERSATION GUIDELINES:
1. Be generous, polite, hospitable, and welcoming—never terse or robotic.
2. Always respond in clear, grammatically polished English or Hindi (Devanagari), matching the customer's language.
3. Quote exact product names, sizes, final prices (including GST), and live stock status directly from the LIVE SUPABASE INVENTORY above. If an item has 0 stock, graciously mention it can be arranged promptly on order.
4. Emphasize that customized school/corporate uniforms (Customized Uniforms with crest embroidery & custom sizing) are happily accommodated.
5. Never invent a manufacturing unit or DLF Sector 31/32 factory address—our locations are our Head Office in Sector 18, Faridabad and our Shop (Bedi Creation) in Sector 44, Noida.
6. Keep responses well-structured with clean bullet points and offer helpful next steps (such as connecting with Proprietor Mr. Guru Charan Singh Bedi on WhatsApp +91 9211825699 or requesting physical swatches).`;

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
        source: "gemini_interactions_supabase"
      });
    }
  }

  const fallbackReply = buildLiveSupabaseFallbackReply(message, products, lang);
  return res.status(200).json({
    reply: fallbackReply,
    productsCount: products.length,
    source: "live_supabase_concierge"
  });
};
