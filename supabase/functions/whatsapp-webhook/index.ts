import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const VERIFY_TOKEN = Deno.env.get("VERIFY_TOKEN") || "my_whatsapp_secret_token_2026";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const PHONE_NUMBER_ID = Deno.env.get("PHONE_NUMBER_ID") || "1373460992523647";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

interface ProductRow {
  id: number;
  item_code: string;
  name: string;
  category: string;
  color: string;
  available_sizes: string;
  base_price: number;
  tax_percentage: number;
  final_price: number;
  stock_quantity: number;
  is_in_stock: boolean;
  description: string;
}

const CATEGORY_META: Record<string, { id: string; title: string; subtitle: string; fabricNote: string; moq: string }> = {
  "Coat": {
    id: "cat_coat",
    title: "🧥 Coats & Blazers",
    subtitle: "Winter blazers & tailored institutional coats",
    fabricNote: "Serge & Wool-Blend Matty",
    moq: "25 pcs"
  },
  "Belt_pant": {
    id: "cat_belt_pant",
    title: "👖 School Pants",
    subtitle: "Tailored Blue & White belt trousers",
    fabricNote: "Heavy-duty O.C. & Twill Cotton",
    moq: "50 pcs"
  },
  "T-shirt": {
    id: "cat_tshirt",
    title: "👕 School T-Shirts",
    subtitle: "100% Super-combed cotton house T-shirts",
    fabricNote: "Pre-shrunk, bio-washed cotton",
    moq: "50 pcs"
  },
  "Shoes": {
    id: "cat_shoes",
    title: "👞 School Shoes",
    subtitle: "Durable Black & White school footwear",
    fabricNote: "Action / Goldstar / Standard",
    moq: "30 pairs"
  },
  "Tunics": {
    id: "cat_tunics",
    title: "👗 Girls Tunics",
    subtitle: "Box-pleated school uniform tunics",
    fabricNote: "Wrinkle-resistant Poly-Viscose",
    moq: "30 pcs"
  },
  "Devider": {
    id: "cat_devider",
    title: "🩳 Sports Dividers",
    subtitle: "School & sports divided skirts",
    fabricNote: "Comfort stretch blend",
    moq: "50 pcs"
  },
  "Cycling_shorts": {
    id: "cat_cycling_shorts",
    title: "🩳 Cycling Shorts",
    subtitle: "Innerwear & sports cycling shorts",
    fabricNote: "Stretch cotton & Lycra blend",
    moq: "50 pcs"
  },
  "Belt": {
    id: "cat_belt",
    title: "🥋 School Belts",
    subtitle: "Official crest uniform belts",
    fabricNote: "Customized school buckle weaving",
    moq: "100 pcs"
  },
  "Tie": {
    id: "cat_tie",
    title: "👔 School Ties",
    subtitle: "Formal school crest neckties",
    fabricNote: "Woven striped micro-jacquard",
    moq: "100 pcs"
  },
  "Table": {
    id: "cat_table",
    title: "🪵 Study Tables",
    subtitle: "Institutional & home study furniture",
    fabricNote: "Heavy-duty utility build",
    moq: "10 units"
  }
};

const CUSTOMIZATION_OPTIONS: Record<string, { title: string; details: string }> = {
  cust_school: {
    title: "🏫 Customized School Uniforms",
    details: `*🏫 Customized School Uniforms (Bedi Fashion™)*

• *What We Tailor:* Crested wool/matty blazers, fused-collar shirts, box-pleated tunics, striped house T-shirts, and woven belts/ties.
• *Customization Options:* Gold bullion & machine crest embroidery, house color matching, and Junior–Senior sizing (20 to 42).
• *MOQ & Timeline:* 25 pcs (stock cuts) / 100 pcs (tailored colors) • 14–21 days delivery.

🎨 *Preview 3D Uniforms Online:*
https://sardarj.vercel.app/#studio`
  },
  cust_corporate: {
    title: "👔 Customized Corporate Uniforms",
    details: `*👔 Customized Corporate & Executive Wear*

• *What We Tailor:* Wrinkle-free formal shirts, corporate suiting blazers, tailored trousers, and monogrammed polo T-shirts.
• *Customization Options:* Embroidered company logo on pocket/sleeve, bespoke collar styling, and full sizing drives (S to 5XL).
• *MOQ & Timeline:* 25 pcs minimum • Free swatch & sizing evaluation for teams.

🎨 *Explore Styles Online:*
https://sardarj.vercel.app/#studio`
  },
  cust_hospital: {
    title: "🏥 Customized Hospital & Medical Wear",
    details: `*🏥 Customized Hospital & Medical Uniforms*

• *What We Tailor:* Silvadur™ antimicrobial OT scrub suits, doctor lab coats, nursing uniforms, and sterile patient gowns.
• *Customization Options:* Hospital logo embroidery, autoclave-safe colorfast fabrics (160–210 GSM), and fluid-barrier finishes.
• *MOQ & Timeline:* 25 pcs minimum • Priority hospital batch dispatch.

🎨 *Explore Medical Catalog:*
https://sardarj.vercel.app/#studio`
  },
  cust_industrial: {
    title: "🦺 Customized Workwear & Security",
    details: `*🦺 Customized Industrial & Security Uniforms*

• *What We Tailor:* 100% Cotton twill boiler suits (240–280 GSM), high-visibility reflective coveralls, and security epaulet uniforms.
• *Customization Options:* 2-inch certified reflective bands, bar-tacked stress seams, and embroidered agency badges.
• *MOQ & Timeline:* 25 pcs minimum • Bulk annual contracts welcome.

🎨 *Explore Workwear Specs:*
https://sardarj.vercel.app/#studio`
  },
  cust_fabric: {
    title: "🎨 Fabric, Embroidery & Sample Kits",
    details: `*🎨 Customized Fabric Shades & Crest Embroidery*

• *What We Provide:* Custom yarn dyeing, bullion gold crest badges, machine crest stitching, and woven jacquard ties/belts.
• *Complimentary Service:* We dispatch physical fabric swatch cards and finished sample garments for institutional approval.

📞 *Speak Directly With Our Desk:*
+91 9310825699 | +91 9811825699 | +91 9899114052`
  }
};

function getCategoryMeta(rawCat: string) {
  if (CATEGORY_META[rawCat]) return CATEGORY_META[rawCat];
  const slug = rawCat.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return {
    id: `cat_${slug}`,
    title: `🛍️ ${rawCat.replace(/_/g, " ")}`.slice(0, 24),
    subtitle: `${rawCat.replace(/_/g, " ")} institutional collection`,
    fabricNote: "Premium Bedi Fashion™ quality",
    moq: "25 pcs"
  };
}

// Fetch live products quietly behind the scenes
async function fetchLiveProducts(): Promise<ProductRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, item_code, name, category, color, available_sizes, base_price, tax_percentage, final_price, stock_quantity, is_in_stock, description")
      .order("id", { ascending: true })
      .limit(500);
    if (error) {
      console.warn("Catalog query error:", error.message);
      return [];
    }
    return (data || []) as ProductRow[];
  } catch (err) {
    console.warn("Failed fetching live products:", err);
    return [];
  }
}

// Format clean customer-facing rate card (zero technical jargon)
function buildDynamicCategoryCard(rawCat: string, items: ProductRow[]): string {
  const meta = getCategoryMeta(rawCat);
  const lines = [
    `*${meta.title}* (Bedi Fashion™)`,
    `${meta.subtitle} (5% GST incl.)\n`,
    `📏 *Available Sizes & Rates:*`
  ];

  for (const p of items.slice(0, 14)) {
    const price = Number(p.final_price || p.base_price || 0).toFixed(2);
    const colorNote = p.color && p.color !== "Standard" ? ` (${p.color})` : "";
    const stockTag = Number(p.stock_quantity || 0) > 0 && p.is_in_stock !== false
      ? `✅ ${p.stock_quantity} pcs ready`
      : `⏳ Made to Order`;
    lines.push(`• *${p.name}*${colorNote} — Size ${p.available_sizes}: *₹${price}* [${stockTag}]`);
  }

  if (items.length > 14) {
    lines.push(`• ...plus ${items.length - 14} more sizes available.`);
  }

  lines.push(`\n✨ *Fabric Spec:* ${meta.fabricNote}`);
  lines.push(`📦 *Wholesale MOQ:* ${meta.moq}`);
  return lines.join("\n");
}

async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  headerText: string = "Bedi Fashion™",
  footerText: string = "Faridabad & Noida • Est. 1987"
) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      header: { type: "text", text: headerText.slice(0, 60) },
      body: { text: bodyText.slice(0, 1024) },
      footer: { text: footerText.slice(0, 60) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) }
        }))
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log("Interactive Buttons Response:", result);
  } catch (err) {
    console.error("Error sending interactive buttons:", err);
  }
}

async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  headerText: string = "Official Product Catalog",
  footerText: string = "Tap an option to continue"
) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: headerText.slice(0, 60) },
      body: { text: bodyText.slice(0, 1024) },
      footer: { text: footerText.slice(0, 60) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: sections.slice(0, 10).map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            description: (r.description || "").slice(0, 72)
          }))
        }))
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log("Interactive List Response:", result);
  } catch (err) {
    console.error("Error sending interactive list:", err);
  }
}

function extractInteractionText(data: any): string {
  if (!data) return "";
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (Array.isArray(data.steps)) {
    const parts: string[] = [];
    for (const step of data.steps) {
      if (step?.type === "model_output" && Array.isArray(step.content)) {
        for (const c of step.content) {
          if (c?.type === "text" && typeof c.text === "string") parts.push(c.text);
        }
      }
    }
    if (parts.length > 0) return parts.join("\n").trim();
  }
  return "";
}

async function getGeminiCatalogAnswer(userMessage: string, historyContext: string, products: ProductRow[]): Promise<string> {
  const inventoryLines = products.map((p) => {
    const stockNote = Number(p.stock_quantity || 0) > 0 ? `Ready:${p.stock_quantity}pcs` : "MadeToOrder";
    return `${p.name} (${p.category}, Size:${p.available_sizes}, Price:₹${Number(p.final_price || p.base_price).toFixed(2)}, ${stockNote})`;
  });

  if (GEMINI_API_KEY) {
    const systemInstruction = `You are BediBot, the warm, generous, and articulate client advisor for Bedi Fashion™.
BUSINESS PROFILE:
- Proprietor: Mr. Guru Charan Singh Bedi (Established 1987 — 39+ years heritage)
- Contact Mobile Numbers: +91 9310825699 | +91 9811825699 | +91 9899114052
- Official WhatsApp Desk: +91 9211825699
- Email: info@bedifashion.in
- Head Office: Plot No - 125, Sector-18, Faridabad, Haryana - 121002
- Shop (Bedi Creation): Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303
- Customize Uniforms: Tailored institutional uniforms with custom school crest embroidery, fabric colors & sizes (14–21 days delivery). Inspect live at https://sardarj.vercel.app/#studio.
- NEVER mention internal systems, databases, architecture, Supabase, APIs, or factories. Speak naturally as a showroom representative.

OFFICIAL PRODUCT CATALOG (${products.length} items, rates incl. 5% GST):
${inventoryLines.join("\n")}

RULES:
1. Be generous, gracious, warm, and grammatically spotless (2–4 concise WhatsApp lines).
2. Always refer to customization as "Customize Uniforms" or "Customized Uniforms" (never "Custom Uniform").
3. Quote exact live rates and availability from the Official Product Catalog above.
4. Guide the user smoothly to tap Browse Products, Customize Uniforms, or Contact Direct below.`;

    const inputPrompt = historyContext
      ? `Recent Conversation Context: ${historyContext}\n\nCustomer Message: ${userMessage}`
      : userMessage;

    for (const model of ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"]) {
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
            "Api-Revision": "2026-05-20"
          },
          body: JSON.stringify({
            model,
            system_instruction: systemInstruction,
            input: inputPrompt,
            generation_config: { max_output_tokens: 380 }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = extractInteractionText(data);
          if (text) return text;
        } else if (res.status === 401 || res.status === 403) {
          break;
        }
      } catch (err) {
        console.warn(`WhatsApp Gemini (${model}) error:`, err);
      }
    }
  }

  // Dynamic live catalog fallback without exposing internal words
  const m = userMessage.toLowerCase();
  const stopWords = new Set(["want", "some", "need", "price", "rate", "cost", "buy", "from", "have", "what", "with", "this", "that", "size", "uniform", "uniforms", "school"]);
  const words = m.replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w) && !/^(is|am|are|the|for|can|you|get|all|any|do|me|my)$/.test(w));
  const matched = words.length > 0
    ? products.filter((p) => {
        const hay = `${p.name} ${p.category} ${p.color} ${p.available_sizes} ${p.description}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : [];

  if (matched.length > 0 && matched.length <= 12) {
    const itemsText = matched.slice(0, 6).map((p) => `• *${p.name}* (Size ${p.available_sizes}): *₹${Number(p.final_price || p.base_price).toFixed(2)}*`).join("\n");
    return `We would be glad to help! Here are live rates from our collection:\n${itemsText}\n\nTap *Browse Products* or *Customize Uniforms* below for full details.`;
  }

  return "Thank you for reaching out to *Bedi Fashion™* (Proprietor: *Mr. Guru Charan Singh Bedi*, Est. 1987)! Tap an option below to explore live prices, *Customize Uniforms*, or reach us directly:";
}

async function handleIncomingMessage(msg: any) {
  const from = msg.from;
  const msgId = msg.id;
  const timestamp = Number(msg.timestamp || 0);

  if (timestamp > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
    if (ageSeconds > 120) {
      console.log(`[STALE_DROP] Discarding message ${msgId} from ${from} (age: ${ageSeconds}s)`);
      return;
    }
  }

  if (supabase && msgId) {
    try {
      const { data: existing } = await supabase
        .from("b2b_inquiries")
        .select("id")
        .eq("status", `msg_${msgId}`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[DEDUP_DROP] Message ${msgId} was already processed. Skipping.`);
        return;
      }
    } catch (dbCheckErr) {
      console.warn("Deduplication check error:", dbCheckErr);
    }
  }

  let userAction = "";
  let userText = "";

  if (msg.type === "interactive") {
    if (msg.interactive?.type === "button_reply") {
      userAction = msg.interactive.button_reply.id || "";
      userText = msg.interactive.button_reply.title || "";
    } else if (msg.interactive?.type === "list_reply") {
      userAction = msg.interactive.list_reply.id || "";
      userText = msg.interactive.list_reply.title || "";
    }
  } else if (msg.type === "text") {
    userText = (msg.text?.body || "").trim();
  } else {
    return;
  }

  if (!userAction && userText.length <= 1 && !["hi", "ok"].includes(userText.toLowerCase())) {
    console.log(`[NOISE_DROP] Ignoring single-character noise: "${userText}"`);
    return;
  }

  if (from && (userAction || userText)) {
    console.log(`[PROCESSING] From: ${from} | Action: "${userAction}" | Text: "${userText}"`);

    const products = await fetchLiveProducts();
    const byCategory = new Map<string, ProductRow[]>();
    for (const p of products) {
      const cat = p.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }

    let sessionHistoryText = "";
    let hasActiveSession = false;

    if (supabase) {
      try {
        const { data: pastRows } = await supabase
          .from("b2b_inquiries")
          .select("requirement, created_at")
          .eq("sender_id", from)
          .order("created_at", { ascending: false })
          .limit(4);

        if (pastRows && pastRows.length > 0) {
          const lastCreatedAt = new Date(pastRows[0].created_at).getTime();
          if (Date.now() - lastCreatedAt < 2 * 60 * 60 * 1000) {
            hasActiveSession = true;
          }
          sessionHistoryText = pastRows
            .map((r: any) => r.requirement)
            .filter(Boolean)
            .slice(0, 3)
            .join(" | ");
        }
      } catch (histErr) {
        console.warn("Could not fetch session history:", histErr);
      }
    }

    const lower = userText.toLowerCase().replace(/[.,!?;:]/g, "").trim();
    const isAck = ["ok", "okay", "thanks", "thank you", "sure", "done", "got it", "theek hai", "thik hai", "accha"].includes(lower);

    if (!userAction) {
      if (isAck) {
        userAction = "acknowledgement";
      } else if (
        lower.includes("catalog") ||
        lower.includes("product") ||
        lower.includes("rate") ||
        lower.includes("price") ||
        lower.includes("menu") ||
        lower.includes("category") ||
        lower.includes("view")
      ) {
        if (lower.includes("coat") || lower.includes("blazer")) userAction = "cat_coat";
        else if (lower.includes("pant") || lower.includes("trouser")) userAction = "cat_belt_pant";
        else if (lower.includes("tshirt") || lower.includes("t-shirt") || lower.includes("polo")) userAction = "cat_tshirt";
        else if (lower.includes("shoe")) userAction = "cat_shoes";
        else if (lower.includes("tunic") || lower.includes("skirt")) userAction = "cat_tunics";
        else if (lower.includes("divider")) userAction = "cat_devider";
        else if (lower.includes("cycling") || lower.includes("short")) userAction = "cat_cycling_shorts";
        else if (lower.includes("belt")) userAction = "cat_belt";
        else if (lower.includes("tie")) userAction = "cat_tie";
        else if (lower.includes("table")) userAction = "cat_table";
        else userAction = "btn_catalog";
      } else if (
        lower.includes("customiz") ||
        lower.includes("custom") ||
        lower.includes("tailor") ||
        lower.includes("embroid") ||
        lower.includes("bulk") ||
        lower.includes("swatch")
      ) {
        userAction = "btn_customize";
      } else if (
        lower.includes("contact") ||
        lower.includes("call") ||
        lower.includes("phone") ||
        lower.includes("mobile") ||
        lower.includes("address") ||
        lower.includes("location") ||
        lower.includes("shop") ||
        lower.includes("noida") ||
        lower.includes("faridabad") ||
        lower.includes("owner") ||
        lower.includes("bedi")
      ) {
        userAction = "btn_contact";
      } else if (
        lower === "hi" ||
        lower === "hello" ||
        lower === "hey" ||
        lower === "namaste" ||
        lower.startsWith("hi ") ||
        lower.startsWith("hello ")
      ) {
        userAction = "greeting";
      }
    }

    // Legacy compatibility mapping
    const legacyMap: Record<string, string> = {
      cat_coats: "cat_coat",
      cat_pants: "cat_belt_pant",
      cat_tshirts: "cat_tshirt",
      cat_bottoms: "cat_devider",
      cat_accessories: "cat_tie",
      btn_services: "btn_customize"
    };
    if (legacyMap[userAction]) {
      userAction = legacyMap[userAction];
    }

    // Parallel crystal-clear button titles (all <= 20 UTF-16 code units!)
    const STD_BUTTONS = [
      { id: "btn_catalog", title: "🛍️ Browse Products" },
      { id: "btn_customize", title: "Customize Uniforms" },
      { id: "btn_contact", title: "📞 Contact Direct" }
    ];

    if (userAction === "btn_catalog") {
      const rows: Array<{ id: string; title: string; description: string }> = [];
      for (const [rawCat, items] of byCategory.entries()) {
        const meta = getCategoryMeta(rawCat);
        const prices = items.map((i) => Number(i.final_price || i.base_price || 0)).filter((v) => v > 0);
        const minPrice = prices.length ? Math.min(...prices).toFixed(0) : "—";
        const sizes = Array.from(new Set(items.map((i) => i.available_sizes).filter(Boolean))).slice(0, 4).join(", ");
        rows.push({
          id: meta.id,
          title: meta.title,
          description: `${items.length} variants • Sizes: ${sizes || "Std"} • From ₹${minPrice}`
        });
      }

      if (rows.length === 0) {
        rows.push({ id: "btn_customize", title: "Customize Uniforms", description: "Explore customized uniform sectors" });
      }

      await sendWhatsAppList(
        from,
        "Please select a product category below to view live rates, available sizes, and stock:",
        "Select Category",
        [
          {
            title: "Uniforms & Accessories",
            rows: rows.slice(0, 10)
          }
        ],
        "Bedi Fashion™ Catalog",
        "All rates include 5% GST"
      );
    } else if (userAction.startsWith("cat_")) {
      let matchedCat = "";
      let matchedItems: ProductRow[] = [];
      for (const [rawCat, items] of byCategory.entries()) {
        if (getCategoryMeta(rawCat).id === userAction) {
          matchedCat = rawCat;
          matchedItems = items;
          break;
        }
      }

      const cardBody = matchedItems.length > 0
        ? buildDynamicCategoryCard(matchedCat, matchedItems)
        : "Items for this category are currently being updated. Tap *Customize Uniforms* to configure a bespoke order!";

      await sendWhatsAppButtons(
        from,
        cardBody,
        [
          { id: "btn_catalog", title: "🛍️ Other Products" },
          { id: "btn_customize", title: "Customize Uniforms" }
        ],
        "Bedi Fashion™ Live Rates",
        "Tap an option below"
      );
    } else if (userAction === "btn_customize") {
      await sendWhatsAppList(
        from,
        "We tailor *Customized Uniforms* with school crest embroidery, custom fabric colors, and full size sets. Choose your sector below to view customization options:",
        "Customize Sector",
        [
          {
            title: "Customize Your Uniform",
            rows: [
              { id: "cust_school", title: "🏫 School Uniforms", description: "Crest embroidery, custom checks, sizes 20–42" },
              { id: "cust_corporate", title: "👔 Corporate Wear", description: "Logo shirts, blazers, ties & trousers" },
              { id: "cust_hospital", title: "🏥 Hospital & Medical", description: "Antimicrobial scrubs, lab coats & OT gowns" },
              { id: "cust_industrial", title: "🦺 Workwear & Security", description: "Boiler suits, 3M coveralls & guard wear" },
              { id: "cust_fabric", title: "🎨 Fabric & Swatches", description: "Custom dye shades, bullion crests & sample kit" }
            ]
          }
        ],
        "Customize Uniforms",
        "Est. 1987 • Tailored for Institutions"
      );
    } else if (userAction.startsWith("cust_") && CUSTOMIZATION_OPTIONS[userAction]) {
      const cust = CUSTOMIZATION_OPTIONS[userAction];
      await sendWhatsAppButtons(
        from,
        cust.details,
        [
          { id: "btn_catalog", title: "🛍️ View Products" },
          { id: "btn_contact", title: "📞 Contact Direct" }
        ],
        "Customized Uniforms",
        "Faridabad & Noida • Est. 1987"
      );
    } else if (userAction === "btn_contact") {
      const contactMsg = `📞 *Bedi Fashion™ Contact Coordinates*

• *Proprietor:* Mr. Guru Charan Singh Bedi (Est. 1987)
• *Contact Mobile:* +91 9310825699 | +91 9811825699 | +91 9899114052
• *WhatsApp Desk:* +91 9211825699
• *Email:* info@bedifashion.in
• *Head Office:* Plot No - 125, Sector-18, Faridabad, Haryana - 121002
• *Shop (Bedi Creation):* Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303`;

      await sendWhatsAppButtons(
        from,
        contactMsg,
        [
          { id: "btn_catalog", title: "🛍️ View Products" },
          { id: "btn_customize", title: "Customize Uniforms" }
        ],
        "Direct Assistance",
        "Faridabad & Noida • Est. 1987"
      );
    } else if (userAction === "acknowledgement") {
      await sendWhatsAppButtons(
        from,
        "Always glad to help! What would you like to explore next?",
        STD_BUTTONS,
        "Bedi Fashion™",
        "Please select an option"
      );
    } else if (userAction === "greeting") {
      const greetingText = hasActiveSession
        ? "Namaste ji! How else may *Bedi Fashion™* assist you today?"
        : "Namaste ji! Welcome to *Bedi Fashion™* (Proprietor: *Mr. Guru Charan Singh Bedi*, Est. 1987). Please choose an option below:";

      await sendWhatsAppButtons(
        from,
        greetingText,
        STD_BUTTONS,
        "Bedi Fashion™",
        "Faridabad & Noida • Est. 1987"
      );
    } else {
      const aiAnswer = await getGeminiCatalogAnswer(userText, sessionHistoryText, products);

      await sendWhatsAppButtons(
        from,
        aiAnswer,
        STD_BUTTONS,
        "Bedi Fashion™",
        "Faridabad & Noida • Est. 1987"
      );
    }

    if (supabase) {
      try {
        await supabase.from("b2b_inquiries").insert({
          sender_id: from,
          requirement: `In: "${userAction || userText}" | Mode: live_interactive`,
          status: msgId ? `msg_${msgId}` : "active_session"
        });
      } catch (dbErr) {
        console.warn("Could not save inquiry:", dbErr);
      }
    }
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Meta Webhook Verification Handshake SUCCESS");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (change?.messages && change.messages.length > 0) {
        const msg = change.messages[0];

        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
          EdgeRuntime.waitUntil(handleIncomingMessage(msg));
        } else {
          handleIncomingMessage(msg).catch((e) => console.error("Async handler error:", e));
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
