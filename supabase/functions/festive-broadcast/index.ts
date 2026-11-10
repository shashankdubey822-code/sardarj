import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const PHONE_NUMBER_ID = Deno.env.get("PHONE_NUMBER_ID") || "1373460992523647";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Clean phone numbers
function normalizePhone(raw: string): string {
  let cleaned = String(raw || "").replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  else if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "91" + cleaned.slice(1);
  return cleaned;
}

// AI Occasion & Greeting Note Generator
async function detectOccasionAndCraftGreeting(occasionName?: string, dateStr?: string): Promise<{ occasion: string; note: string }> {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const prompt = occasionName
    ? `Occasion: "${occasionName}". Write an authentic, respectful 4-5 line festive greeting in Indian business English with rich celebratory emojis (🪔✨🌟🙏). Represent the sender as "Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)". Express heartfelt wishes for prosperity, health, and family happiness.`
    : `Today's date is ${date}. Identify if there is an Indian festival (Hindu, Muslim, Sikh, Christian, National: Diwali, Holi, Eid, Gurpurab, New Year, Christmas, Independence Day, etc.). If none, pick general auspicious blessings. Write a 4-5 line greeting note representing "Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)" with rich festive emojis. Format as JSON: { "occasion": "Name", "note": "4-5 lines" }`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 350 }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        const parsed = JSON.parse(text);
        return { occasion: parsed.occasion || occasionName || "Festive Celebration", note: parsed.note };
      } catch (_) {
        return {
          occasion: occasionName || "Auspicious Celebrations",
          note: text || `🪔✨ *शुभ दीपावली | Festive Greetings from Bedi Fashion™* ✨🪔\n\n🙏 Warmest festive greetings and heartfelt blessings to you and your beloved family!\n🌟 May the divine glow bring boundless prosperity, joyful peace, and vibrant health into your home.\n🌸 We express our deepest gratitude for your continued trust and cherished relationship with us.\n\n🎆 *With sincere respect & warm prayers,*\n*Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)* 🇮🇳🙏`
        };
      }
    }
  } catch (err) {
    console.error("AI occasion error:", err);
  }

  return {
    occasion: occasionName || "Auspicious Celebrations",
    note: `🪔✨ *शुभ दीपावली | Festive Greetings from Bedi Fashion™* ✨🪔\n\n🙏 Warmest festive greetings and heartfelt blessings to you and your beloved family!\n🌟 May this divine occasion illuminate your life with boundless prosperity, joyful peace, and vibrant good health.\n🌸 We express our deepest gratitude for your continued trust and valued partnership with us.\n\n🎆 *With sincere respect, love & festive prayers,*\n*Sardar Guru Charan Singh Bedi & The Entire Family at Bedi Fashion™ (Faridabad)* 🇮🇳🙏`
  };
}

// Background Dispatcher
async function runBroadcast(recipients: Array<{ phone: string; name: string }>, imageUrl: string, captionText: string, occasion: string) {
  let successCount = 0;
  let failCount = 0;

  for (const r of recipients) {
    const phone = normalizePhone(r.phone);
    if (!phone) continue;

    const metaUrl = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
    const payload = imageUrl
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "image",
          image: { link: imageUrl, caption: captionText }
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { body: captionText }
        };

    try {
      const res = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) successCount++;
      else failCount++;
    } catch (_) {
      failCount++;
    }
  }

  // Record Campaign in Supabase
  if (supabase) {
    try {
      await supabase.from("broadcast_campaigns").insert({
        title: `${occasion} Broadcast`,
        occasion: occasion,
        greeting_text: captionText,
        image_url: imageUrl,
        total_recipients: recipients.length,
        sent_count: successCount,
        status: failCount === 0 ? "completed" : `partial_${successCount}_sent`
      });
    } catch (dbErr) {
      console.warn("Could not record campaign in DB:", dbErr);
    }
  }

  console.log(`[BROADCAST_COMPLETE] Sent: ${successCount} | Failed: ${failCount} | Total: ${recipients.length}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { occasion, date, customNote, imageUrl, testPhone, dryRun } = body;

    // 1. Detect occasion & craft message
    const { occasion: finalOccasion, note: aiNote } = await detectOccasionAndCraftGreeting(occasion, date);
    const greetingText = customNote || aiNote;
    const finalImage = imageUrl || "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800&auto=format&fit=crop";

    // 2. Fetch recipients
    let recipients: Array<{ phone: string; name: string }> = [];
    if (testPhone) {
      recipients = [{ phone: normalizePhone(testPhone), name: "Test Contact" }];
    } else if (supabase) {
      const { data: contacts } = await supabase.from("customer_contacts").select("phone, name");
      if (contacts && contacts.length > 0) {
        recipients = contacts;
      }
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        status: "no_recipients",
        message: "No customer contacts found in database. Upload CSV first.",
        preview: { occasion: finalOccasion, greetingText, imageUrl: finalImage }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        status: "dry_run",
        total_recipients: recipients.length,
        preview: { occasion: finalOccasion, greetingText, imageUrl: finalImage },
        sample_recipients: recipients.slice(0, 3)
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 3. Dispatch broadcast in background
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(runBroadcast(recipients, finalImage, greetingText, finalOccasion));
    } else {
      runBroadcast(recipients, finalImage, greetingText, finalOccasion).catch(console.error);
    }

    return new Response(JSON.stringify({
      status: "queued",
      message: `Broadcast initiated for ${recipients.length} customer(s).`,
      occasion: finalOccasion,
      preview: { greetingText, imageUrl: finalImage }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    console.error("Broadcast handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 400 });
  }
});
