/**
 * BEDI FASHION™ — 1-CLICK GOOGLE FORM + SUPABASE AUTO-SYNC SCRIPT
 *
 * HOW TO RUN (60 seconds):
 * 1. Open https://script.google.com while signed into your Google account and click "New project".
 * 2. Delete the starter code, paste this entire file, and press Ctrl+S to save.
 * 3. Select `setupBediFashionRFQForm` from the top function dropdown and click ▶ Run (approve permissions once).
 * 4. Copy the `Published Form URL` printed in the Execution Log below.
 * 5. Add that URL as `RFQ_FORM_URL` in Vercel Environment Variables and Supabase Edge Function Secrets!
 *
 * Every response submitted on your Google Form will automatically be stored inside:
 * - Your linked Google Sheet ("Bedi Fashion™ — Institutional RFQ Responses")
 * - Your live Supabase table `institutional_rfqs` via https://sardarj.vercel.app/api/inquiries
 */

const BEDI_RFQ_WEBHOOK_URL = "https://sardarj.vercel.app/api/inquiries";

function setupBediFashionRFQForm() {
  const form = FormApp.create("Bedi Fashion™ — Institutional Bulk Order & Customization RFQ");
  form.setDescription(
    "Official Institutional Request for Quotation (Est. 1987 • Proprietor: Mr. Guru Charan Singh Bedi).\n" +
    "Head Office: Plot No - 125, Sector-18, Faridabad, Haryana - 121002\n" +
    "Retail Shop: Bedi Creation, Gali Number 3, Opp. Punjab National Bank, F Block, Sector 44, Noida - 201303\n" +
    "Direct Mobile: +91 9310825699 | +91 9811825699 | +91 9899114052 • WhatsApp Desk: +91 9211825699"
  );
  form.setCollectEmail(true);

  // Step 1: Institution Profile (matches Website RFQ Step 1)
  form.addSectionHeaderItem().setTitle("1. Institution Profile");

  form.addListItem()
    .setTitle("Institution Category")
    .setChoiceValues([
      "K-12 School / Academy",
      "Hospital / Healthcare Network",
      "Industrial Manufacturing Plant",
      "Corporate House / Bank",
      "Hotel / Restaurant Chain",
      "Security Agency / Facility Team",
      "Sports Academy / College"
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle("Institution / Organization Name")
    .setHelpText("e.g., Modern Senior Secondary School")
    .setRequired(true);

  form.addTextItem()
    .setTitle("Contact Person & Designation")
    .setHelpText("e.g., Dr. Rajesh Sharma (Principal / Procurement Head)")
    .setRequired(true);

  form.addTextItem()
    .setTitle("Phone / WhatsApp Number")
    .setHelpText("Include 10-digit mobile number with country code if outside India")
    .setRequired(true);

  form.addTextItem()
    .setTitle("City / Delivery Location")
    .setHelpText("e.g., Faridabad / Noida / Delhi NCR")
    .setRequired(true);

  // Step 2: Items & Quantity (matches Website RFQ Step 2)
  form.addSectionHeaderItem().setTitle("2. Uniform Items & Bulk Quantity Tiers");

  form.addCheckboxItem()
    .setTitle("Garment Categories Needed")
    .setChoiceValues([
      "School Shirts & Blouses",
      "School Trousers / Belts / Pants",
      "Girls Uniform Tunics / Skirts",
      "Wool Serge Coats & Blazers",
      "House & Sports T-Shirts / Dividers",
      "Uniform Ties, Belts & Shoes",
      "Corporate Shirts / Suits",
      "Hospital OT Scrubs & Lab Coats",
      "Industrial Boiler Suits & 3M Coveralls",
      "Bulk Fabric / Unstitched Cloth Supply"
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Projected Quantity & Bulk Discount Tier")
    .setChoiceValues([
      "25 – 99 Pcs (Tier 1: Wholesale Rate)",
      "100 – 499 Pcs (Tier 2: Institutional Preferred • 12%–18% Off + Free Crest Setup & Swatches)",
      "500+ Pcs (Tier 3: Direct Contract • 20%–28% Off + Mill Dye Lots & On-Site Sizing)"
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle("Exact Estimated Quantity (Number of Pieces)")
    .setHelpText("Enter numeric count, e.g., 150 (Minimum MOQ: 25 ready stock / 100 customized)")
    .setRequired(true);

  // Step 3: Customization, Swatches & Timeline (matches Website RFQ Step 3)
  form.addSectionHeaderItem().setTitle("3. Crest Embroidery, Bulk Fabric & Delivery Specs");

  form.addListItem()
    .setTitle("Institutional Customization Requirements")
    .setChoiceValues([
      "Customized School Crest Bullion Machine Embroidery",
      "Silkscreen / Woven Corporate House Logo Print",
      "3M Certified High-Visibility Reflective Tape Application",
      "Custom Fabric Dyeing & Special GSM Weaving",
      "Standard Plain Uniforms (Ready Stock)"
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Do you require Physical Fabric Swatch Kit & Sizing Set?")
    .setChoiceValues([
      "Yes — Dispatch complimentary fabric shade cards & sizing set",
      "No — Only formal quotation required right now"
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle("Target Delivery Deadline")
    .setHelpText("e.g., Before 15th April 2027 Session")
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle("Crest Details, Fabric GSM, Color & Size Breakdown Notes")
    .setHelpText("Share color codes, cloth GSM (e.g., 240 GSM twill / 180 GSM pique), size range (20–54), or embroidery notes.")
    .setRequired(false);

  form.setConfirmationMessage(
    "Thank you! Your Institutional RFQ has been logged with Bedi Fashion™ (Est. 1987).\n" +
    "Our Proprietor Mr. Guru Charan Singh Bedi & Sales Desk will contact you shortly.\n" +
    "For urgent queries: +91 9310825699 | +91 9811825699 | +91 9899114052 • WhatsApp: +91 9211825699"
  );

  // Link response spreadsheet
  const ss = SpreadsheetApp.create("Bedi Fashion™ — Institutional RFQ Responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Install onFormSubmit webhook sync trigger -> Supabase database
  ScriptApp.newTrigger("onBediRfqFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("✅ Published Form URL (share / set as RFQ_FORM_URL): " + form.getPublishedUrl());
  Logger.log("✏️ Edit Form URL: " + form.getEditUrl());
  Logger.log("📊 Linked Google Sheet URL: " + ss.getUrl());
}

function onBediRfqFormSubmit(e) {
  try {
    const response = e.response;
    const items = response.getItemResponses();
    const map = {};
    for (let i = 0; i < items.length; i++) {
      map[items[i].getItem().getTitle()] = items[i].getResponse();
    }

    const qtyRaw = String(map["Exact Estimated Quantity (Number of Pieces)"] || map["Projected Quantity & Bulk Discount Tier"] || "150");
    const qtyMatch = qtyRaw.match(/\d+/);
    const qtyNum = qtyMatch ? parseInt(qtyMatch[0], 10) : 150;

    const categories = Array.isArray(map["Garment Categories Needed"])
      ? map["Garment Categories Needed"].map((name) => ({ product_name: name, quantity: qtyNum }))
      : [];

    const payload = {
      source_channel: "google_form",
      google_form_response_id: response.getId(),
      institution_category: String(map["Institution Category"] || "School Uniforms"),
      institution_name: String(map["Institution / Organization Name"] || "Google Form Institution"),
      contact_person: String(map["Contact Person & Designation"] || "Procurement Officer"),
      phone: String(map["Phone / WhatsApp Number"] || ""),
      email: response.getRespondentEmail() || "",
      city: String(map["City / Delivery Location"] || "Delhi NCR"),
      total_quantity: qtyNum,
      items: categories,
      customization: String(map["Institutional Customization Requirements"] || "Customized Institutional Order"),
      swatch_sample_needed: String(map["Do you require Physical Fabric Swatch Kit & Sizing Set?"] || "Yes").toLowerCase().indexOf("yes") !== -1,
      target_date: String(map["Target Delivery Deadline"] || "Within 30 Days"),
      requirement_notes: String(map["Crest Details, Fabric GSM, Color & Size Breakdown Notes"] || ""),
      status: "submitted_via_google_form"
    };

    const res = UrlFetchApp.fetch(BEDI_RFQ_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log("Synced RFQ to Supabase API: " + res.getResponseCode() + " -> " + res.getContentText());
  } catch (err) {
    Logger.log("RFQ Sync Error: " + err);
  }
}

// Redirects any browser visiting the Web App URL directly to the live Google Form
function doGet(e) {
  try {
    const files = DriveApp.getFilesByName("Bedi Fashion™ — Institutional Bulk Order & Customization RFQ");
    if (files.hasNext()) {
      const file = files.next();
      const form = FormApp.openById(file.getId());
      const formUrl = form.getPublishedUrl();
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head>' +
        '<meta http-equiv="refresh" content="0; url=' + formUrl + '">' +
        '<script>window.location.replace("' + formUrl + '");</script>' +
        '</head><body style="font-family:sans-serif; text-align:center; padding:40px; color:#1C1917;">' +
        '<h2>Redirecting to Bedi Fashion™ Institutional RFQ...</h2>' +
        '<p><a href="' + formUrl + '" style="color:#DA251C; font-weight:bold; font-size:1.1rem;">Click here to open form</a></p>' +
        '</body></html>'
      );
    }
  } catch (err) {
    return HtmlService.createHtmlOutput("<p>Error redirecting to form: " + err + "</p>");
  }
  return HtmlService.createHtmlOutput("<p>Bedi Fashion™ RFQ Form ready. Open via forms.google.com</p>");
}
