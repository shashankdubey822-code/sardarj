import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const VERIFY_TOKEN = Deno.env.get("VERIFY_TOKEN") || "my_whatsapp_secret_token_2026";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const PHONE_NUMBER_ID = Deno.env.get("PHONE_NUMBER_ID") || "1373460992523647";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6JNRZTQJuTa3puHmniOLkk_t_6OSEyPkGO0Oo1Kc7LqiQ";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Send Meta Interactive Buttons
async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  headerText: string = "Bedi Fashion™",
  footerText: string = "Faridabad • Est. 1997"
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

// Send Meta Interactive List Menu
async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  headerText: string = "Product Catalog",
  footerText: string = "Tap to view rates & sizes"
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
        sections: sections.map((s) => ({
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

// Ultra-short AI helper with session context (max 20 words)
async function getConciseAIAnswer(userMessage: string, historyContext: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "Please choose an option below to proceed:";
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  const systemText = `You are BediBot at Bedi Fashion™ (Faridabad, uniform & institutional manufacturer).
Rules:
1. Answer in 1 short polite sentence (MAXIMUM 20 WORDS).
2. DO NOT greet again if already speaking.
3. DO NOT output long paragraphs, questionnaires, or lists.
4. If asked about rates or products, advise them to select from the options below.
${historyContext ? `Previous Context: ${historyContext}` : ""}`;

  const payload = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 50
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      let reply = "";
      if (data.candidates?.[0]?.content?.parts) {
        for (const p of data.candidates[0].content.parts) {
          if (p.text) reply += p.text;
        }
      }
      if (reply.trim()) return reply.trim();
    }
  } catch (err) {
    console.error("AI prompt error:", err);
  }

  return "What would you like to explore next? Please select an option:";
}

// Category Rate Cards
const CATEGORY_CARDS: Record<string, string> = {
  cat_coats: `🧥 *Coats & Blazers (Bedi Fashion™)*
Winter crested blazers & school coats (5% GST incl.)

📏 *Size & Rate Card:*
• Size 26–28: ₹1,050.00
• Size 30: ₹1,102.50
• Size 32: ₹1,181.25
• Size 34: ₹1,233.75
• Size 36: ₹1,286.25
• Size 38: ₹1,365.00
• Size 40: ₹1,443.75
• Size 42: ₹1,522.50

✨ *Fabric:* Serge / Wool-Blend Matty
📦 *Wholesale MOQ:* 25 pcs`,

  cat_pants: `👖 *School Pants & Trousers (Bedi Fashion™)*
Tailored Blue & White belt pants (5% GST incl.)

📏 *Size & Rate Card:*
• Size 34: ₹409.50 – ₹435.75
• Size 36: ₹430.50 – ₹456.75
• Size 38: ₹451.50 – ₹477.75
• Size 40: ₹472.50 – ₹498.75
• Size 42: ₹493.50 – ₹519.75

✨ *Fabric:* Heavy-duty O.C. & Twill Cotton
📦 *Wholesale MOQ:* 50 pcs`,

  cat_tshirts: `👕 *School & House T-Shirts (Bedi Fashion™)*
100% Super-combed cotton (5% GST incl.)

📏 *Size & Rate Card:*
• Size 26–28: ₹273.00 – ₹288.75
• Size 30–32: ₹304.50 – ₹320.25
• Size 34–36: ₹336.00 – ₹357.00
• Size 38–40: ₹378.00 – ₹399.00
• Size 42: ₹420.00

✨ *Features:* Pre-shrunk, bio-washed, house colors
📦 *Wholesale MOQ:* 50 pcs`,

  cat_shoes: `👞 *Uniform Shoes (Bedi Fashion™)*
Durable Black & White school shoes (5% GST incl.)

📏 *Size & Rate Card:*
• Size 10/11: ₹420.00
• Size 12/13: ₹430.50
• Size 1/2: ₹451.50
• Size 3/4: ₹467.25
• Size 5/6/7: ₹535.50
• Size 8/9/10: ₹603.75

✨ *Brands:* Action / Goldstar / Standard
📦 *Wholesale MOQ:* 30 pairs`,

  cat_tunics: `👗 *Girls Tunics & Skirts (Bedi Fashion™)*
Box-pleated school uniform tunics (5% GST incl.)

📏 *Size & Rate Card:*
• Size 24–26: ₹304.50 – ₹325.50
• Size 28–30: ₹346.50 – ₹367.50
• Size 32–34: ₹388.50 – ₹409.50
• Size 36: ₹430.50

✨ *Fabric:* Wrinkle-resistant Poly-Viscose
📦 *Wholesale MOQ:* 30 pcs`,

  cat_bottoms: `🩳 *Dividers & Cycling Shorts (Bedi Fashion™)*
Sports dividers & inner cycling shorts (5% GST incl.)

📏 *Size & Rate Card:*
• Cycling Shorts (S/M): ₹131.25
• Dividers Size 16–18: ₹325.50 – ₹346.50
• Dividers Size 20–22: ₹367.50 – ₹388.50
• Dividers Size 24: ₹409.50

✨ *Fabric:* Stretch cotton & Lycra blend
📦 *Wholesale MOQ:* 50 pcs`,

  cat_accessories: `👔 *Belts & Ties (Bedi Fashion™)*
Official school crest belts & ties (5% GST incl.)

📏 *Rate Card:*
• School Belt (Size S): ₹73.50
• School Belt (Size M): ₹84.00
• School Belt (Size L): ₹105.00
• Uniform Tie (14" / 16"): ₹63.00
• Uniform Tie (48" Full): ₹84.00

✨ *Customization:* School crest buckle & woven logo
📦 *Wholesale MOQ:* 100 pcs`
};

// Asynchronous message processor
async function handleIncomingMessage(msg: any) {
  const from = msg.from;
  const msgId = msg.id;
  const timestamp = Number(msg.timestamp || 0);

  // 1. Stale Message Guard: Drop if message was sent more than 120 seconds ago
  if (timestamp > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
    if (ageSeconds > 120) {
      console.log(`[STALE_DROP] Discarding message ${msgId} from ${from} (age: ${ageSeconds}s)`);
      return;
    }
  }

  // 2. Persistent Deduplication: Check if this Meta message ID was already processed in Supabase DB
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
    // Non-text/non-interactive event (media, reactions, etc.)
    return;
  }

  // Accidental single character noise filter (e.g. accidental "h" keypress)
  if (!userAction && userText.length <= 1 && !["hi", "ok"].includes(userText.toLowerCase())) {
    console.log(`[NOISE_DROP] Ignoring single-character noise: "${userText}"`);
    return;
  }

  if (from && (userAction || userText)) {
    console.log(`[PROCESSING] From: ${from} | Action: "${userAction}" | Text: "${userText}"`);

    // Retrieve Recent Session History from Supabase
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

    // Quick acknowledgements
    const isAck = ["ok", "okay", "thanks", "thank you", "sure", "done", "got it", "theek hai", "thik hai", "accha"].includes(lower);

    // Resolve action from text if not an explicit button/list click
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
        lower.includes("view") ||
        lower.includes("buy")
      ) {
        if (lower.includes("coat") || lower.includes("blazer")) userAction = "cat_coats";
        else if (lower.includes("pant") || lower.includes("trouser")) userAction = "cat_pants";
        else if (lower.includes("tshirt") || lower.includes("t-shirt") || lower.includes("polo")) userAction = "cat_tshirts";
        else if (lower.includes("shoe")) userAction = "cat_shoes";
        else if (lower.includes("tunic") || lower.includes("skirt")) userAction = "cat_tunics";
        else if (lower.includes("divider") || lower.includes("short")) userAction = "cat_bottoms";
        else if (lower.includes("belt") || lower.includes("tie")) userAction = "cat_accessories";
        else userAction = "btn_catalog";
      } else if (
        lower.includes("service") ||
        lower.includes("custom") ||
        lower.includes("form") ||
        lower.includes("rfq") ||
        lower.includes("bulk") ||
        lower.includes("embroidery") ||
        lower.includes("fabric")
      ) {
        userAction = "btn_services";
      } else if (
        lower.includes("contact") ||
        lower.includes("call") ||
        lower.includes("phone") ||
        lower.includes("address") ||
        lower.includes("location") ||
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

    // DISPATCH FLOW BASED ON CONTEXT & SELECTION
    if (userAction === "btn_catalog") {
      await sendWhatsAppList(
        from,
        "Please select a category below to view our instant size & wholesale rate card:",
        "Select Category",
        [
          {
            title: "Uniforms & Apparel",
            rows: [
              { id: "cat_coats", title: "🧥 Coats & Blazers", description: "Sizes 26-42 • Wool & Matty • from ₹1,050" },
              { id: "cat_pants", title: "👖 School Pants", description: "Sizes 24-42 • Blue & White • from ₹409" },
              { id: "cat_tshirts", title: "👕 School T-Shirts", description: "Sizes 26-42 • 100% Cotton • from ₹273" },
              { id: "cat_shoes", title: "👞 School Shoes", description: "Sizes 9C-11 • Action/Goldstar • from ₹399" },
              { id: "cat_tunics", title: "👗 Girls Tunics", description: "Sizes 24-36 • Tailored pleats • from ₹304" },
              { id: "cat_bottoms", title: "🩳 Dividers & Shorts", description: "Sizes 16-24 • Sports & inner • from ₹131" },
              { id: "cat_accessories", title: "👔 Belts & Ties", description: "School crest belts & ties • from ₹63" }
            ]
          }
        ],
        "Bedi Fashion™ Products",
        "Tap to select category"
      );
    } else if (userAction.startsWith("cat_") && CATEGORY_CARDS[userAction]) {
      await sendWhatsAppButtons(
        from,
        CATEGORY_CARDS[userAction],
        [
          { id: "btn_catalog", title: "🛍️ Other Products" },
          { id: "btn_services", title: "📋 Custom Order / RFQ" }
        ],
        "Bedi Fashion™ Rates",
        "Tap button to continue"
      );
    } else if (userAction === "btn_services") {
      const serviceMsg = `💼 *Custom Uniforms & Institutional Services*

For institutional orders, school crest embroidery, or bulk fabric:
👉 *Fill Requirement Form:*
https://forms.gle/BediFashionUniformsRFQ

Our team will review your specs and contact you directly with samples & wholesale quotation.`;

      await sendWhatsAppButtons(
        from,
        serviceMsg,
        [
          { id: "btn_catalog", title: "🛍️ View Products" },
          { id: "btn_contact", title: "📞 Contact Us" }
        ],
        "Bedi Fashion™ Services",
        "Tap button to choose"
      );
    } else if (userAction === "btn_contact") {
      const contactMsg = `📞 *Bedi Fashion™ Contact Coordinates*

• Phone / WhatsApp: +91 9211825699
• Email: info@bedifashion.in
• Head Office: Plot No - 125, Sec-18, Faridabad - 121002
• Factory: Sector 31-32 DLF Industrial Area, Faridabad
• Proprietor: Mr. Bedi (Est. 1997)`;

      await sendWhatsAppButtons(
        from,
        contactMsg,
        [
          { id: "btn_catalog", title: "🛍️ View Products" },
          { id: "btn_services", title: "💼 Custom Services" }
        ],
        "Direct Assistance",
        "Tap button to choose"
      );
    } else if (userAction === "acknowledgement") {
      await sendWhatsAppButtons(
        from,
        "Glad to assist! What would you like to check next?",
        [
          { id: "btn_catalog", title: "🛍️ Browse Products" },
          { id: "btn_services", title: "💼 Custom Services" },
          { id: "btn_contact", title: "📞 Contact Direct" }
        ],
        "Bedi Fashion™",
        "Please select an option"
      );
    } else if (userAction === "greeting") {
      const greetingText = hasActiveSession
        ? "Namaste ji! How else may we assist you today?"
        : "Namaste ji! Welcome to Bedi Fashion™ (Faridabad, Est. 1997). Please choose an option below:";

      await sendWhatsAppButtons(
        from,
        greetingText,
        [
          { id: "btn_catalog", title: "🛍️ Browse Products" },
          { id: "btn_services", title: "💼 Custom Services" },
          { id: "btn_contact", title: "📞 Contact Direct" }
        ],
        "Bedi Fashion™",
        "Please select an option"
      );
    } else {
      const shortAnswer = await getConciseAIAnswer(userText, sessionHistoryText);

      await sendWhatsAppButtons(
        from,
        shortAnswer,
        [
          { id: "btn_catalog", title: "🛍️ Browse Products" },
          { id: "btn_services", title: "💼 Custom Services" },
          { id: "btn_contact", title: "📞 Contact Direct" }
        ],
        "Bedi Fashion™",
        "Please select an option"
      );
    }

    // Record interaction in Supabase DB with unique message status for deduplication
    if (supabase) {
      try {
        await supabase.from("b2b_inquiries").insert({
          sender_id: from,
          requirement: `In: "${userAction || userText}" | Mode: interactive_selective`,
          status: msgId ? `msg_${msgId}` : "active_session"
        });
      } catch (dbErr) {
        console.warn("Could not save to b2b_inquiries:", dbErr);
      }
    }
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Meta Webhook Verification Handshake (GET)
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

  // 2. Incoming WhatsApp Event (POST)
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (change?.messages && change.messages.length > 0) {
        const msg = change.messages[0];

        // Process in background and return 200 OK immediately so Meta NEVER times out or retries!
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
          EdgeRuntime.waitUntil(handleIncomingMessage(msg));
        } else {
          // Fallback if EdgeRuntime.waitUntil is not available in local test environment
          handleIncomingMessage(msg).catch((e) => console.error("Async handler error:", e));
        }
      }

      // Return 200 OK immediately in <10ms
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
