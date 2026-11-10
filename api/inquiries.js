/** @version 2.1.0 - Supabase institutional_rfqs live integration
 *
 * BEDI FASHION™ — INSTITUTIONAL RFQ DATABASE API (/api/inquiries)
 * Stores Website Instant Institutional RFQ & Google Form submissions into Supabase (`institutional_rfqs`).
 * Also serves dynamic RFQ configuration (`GET /api/inquiries?config=1`) for Google Form / Web Form routing.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ovdvycumqsjgvlsickjy.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  "";

const DEFAULT_WEB_RFQ_URL = "https://sardarj.vercel.app/?open=rfq";
const DEFAULT_GOOGLE_FORM_URL = "";

function computeDiscountTier(qty) {
  const n = Number(qty) || 0;
  if (n < 100) return "Tier 1: Bulk Wholesale Rate (25–99 Pcs)";
  if (n < 500) return "Tier 2: Institutional Preferred Tier (100–499 Pcs • 12%–18% Off)";
  return "Tier 3: Direct Factory Contract Rate (500+ Pcs • 20%–28% Off)";
}

function generateRfqRef() {
  const yr = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-6);
  return `BF-RFQ-${yr}-${suffix}`;
}

async function insertInstitutionalRfq(record) {
  const endpoint = `${SUPABASE_URL}/rest/v1/institutional_rfqs`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(record)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed (${res.status}): ${text}`);
  }
  return record;
}

async function notifyWhatsAppLeadAlert(record) {
  const waToken = process.env.WHATSAPP_TOKEN || "";
  const phoneId = process.env.PHONE_NUMBER_ID || "";
  const ownerWa = process.env.WHATSAPP_OWNER_ALERT || "";
  if (!waToken || !phoneId || !ownerWa) return false;

  try {
    const bodyText =
      `🏛️ *NEW INSTITUTIONAL RFQ (${record.rfq_ref})*\n` +
      `• *Source:* ${record.source_channel}\n` +
      `• *Institution:* ${record.institution_name} (${record.institution_category})\n` +
      `• *Contact:* ${record.contact_person} | ${record.phone}\n` +
      `• *City:* ${record.city}\n` +
      `• *Qty:* ${record.total_quantity} pcs (${record.discount_tier})\n` +
      `• *Customization:* ${record.customization_type}\n` +
      `• *Swatches Needed:* ${record.swatch_sample_needed ? "Yes" : "No"}\n` +
      `• *Deadline:* ${record.target_delivery_date || "Flexible"}`;

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${waToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: ownerWa.replace(/\D/g, ""),
        type: "text",
        text: { body: bodyText }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("WhatsApp alert skipped:", err.message);
    return false;
  }
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

  const configuredGoogleForm = (process.env.RFQ_FORM_URL || DEFAULT_GOOGLE_FORM_URL).trim();
  const activeRfqUrl = configuredGoogleForm || DEFAULT_WEB_RFQ_URL;

  if (req.method === "GET") {
    const query = req.query || {};
    if (query.config === "1") {
      return res.status(200).json({
        status: "ok",
        rfq_form_url: activeRfqUrl,
        google_form_url: configuredGoogleForm,
        database_table: "institutional_rfqs"
      });
    }

    try {
      const endpoint = `${SUPABASE_URL}/rest/v1/institutional_rfqs?select=*&order=created_at.desc&limit=50`;
      const dbRes = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const rows = dbRes.ok ? await dbRes.json() : [];
      return res.status(200).json({
        status: "ok",
        rfq_form_url: activeRfqUrl,
        total: Array.isArray(rows) ? rows.length : 0,
        inquiries: Array.isArray(rows) ? rows : []
      });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch (_) {
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }
    body = body || {};

    const instName = String(body.institution_name || body.institutionName || "").trim();
    const instCat = String(body.institution_category || body.category || "School Uniforms").trim();
    const contactPerson = String(body.contact_person || body.contactPerson || "Procurement Lead").trim();
    const phone = String(body.phone || "").trim();

    if (!instName || !phone) {
      return res.status(400).json({
        error: "Institution name and phone number are required."
      });
    }

    const totalQty = Math.max(
      1,
      parseInt(body.total_quantity || body.estimated_quantity || (Array.isArray(body.items) ? body.items.reduce((s, i) => s + (Number(i.quantity) || 50), 0) : 150), 10) || 150
    );

    const swatchVal =
      typeof body.swatch_sample_needed === "boolean"
        ? body.swatch_sample_needed
        : String(body.swatch_sample_needed || "yes").toLowerCase().includes("yes");

    const record = {
      rfq_ref: generateRfqRef(),
      source_channel: String(body.source_channel || "website").slice(0, 32),
      institution_category: instCat.slice(0, 128),
      institution_name: instName.slice(0, 200),
      contact_person: contactPerson.slice(0, 160),
      phone: phone.slice(0, 64),
      email: body.email ? String(body.email).trim().slice(0, 160) : null,
      city: String(body.city || "Faridabad / Delhi NCR").trim().slice(0, 160),
      total_quantity: totalQty,
      discount_tier: computeDiscountTier(totalQty),
      queued_items: Array.isArray(body.items) ? body.items : [],
      customization_type: String(body.customization || body.customization_type || "Standard Institutional Customization").slice(0, 200),
      swatch_sample_needed: swatchVal,
      requirement_notes: body.requirement_notes ? String(body.requirement_notes).trim() : null,
      target_delivery_date: body.target_date || body.target_delivery_date ? String(body.target_date || body.target_delivery_date).trim().slice(0, 120) : null,
      google_form_response_id: body.google_form_response_id ? String(body.google_form_response_id).slice(0, 128) : null,
      status: String(body.status || "new").slice(0, 48)
    };

    try {
      const saved = await insertInstitutionalRfq(record);
      await notifyWhatsAppLeadAlert(saved || record);
      return res.status(201).json({
        success: true,
        status: "success",
        inquiry_id: saved?.rfq_ref || record.rfq_ref,
        id: saved?.id || null,
        discount_tier: record.discount_tier,
        message: "Institutional RFQ saved to database successfully"
      });
    } catch (err) {
      console.error("RFQ DB insert error:", err);
      return res.status(500).json({ error: "Database save failed", detail: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
