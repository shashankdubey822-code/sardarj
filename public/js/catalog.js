/**
 * BEDI FASHION™ — SECTOR-SPECIFIC PRODUCT CATALOG ENGINE
 * No "All Sectors" option — users choose a specific sector to explore.
 */

(function () {
  'use strict';

  let allProducts = [];
  let currentSector = null; // null = prompts user to choose specifically
  let searchQuery = '';
  let readyStockOnly = false;
  let activeLanguage = 'en';

  const sectorMetadata = {
    school: {
      en: '🎒 School',
      hi: '🎒 स्कूल',
      color: '#0A192F',
      accent: '#D97706',
      psychology_en: 'Academic Navy & Bullion Gold: Stimulates student cognitive focus, instills mutual respect for institutional heritage, and minimizes peer behavioral friction.',
      psychology_hi: 'एकेडेमिक नेवी और गोल्ड: एकाग्रता बढ़ाता है, अनुशासन और संस्थागत प्रतिष्ठा की भावना मजबूत करता है।',
      psychology_badge_en: 'Discipline & Cognitive Focus',
      psychology_badge_hi: 'अनुशासन एवं एकाग्रता',
      desc_en: 'Oxford shirts, pleated skirts, crested blazers, Cashmilon sweaters, and house sports wear.',
      desc_hi: 'ऑक्सफोर्ड शर्ट, प्लीटेड स्कर्ट, ब्लेज़र, स्वेटर और स्पोर्ट्स ट्रैकसूट।'
    },
    corporate: {
      en: '💼 Corporate Executive',
      hi: '💼 कॉर्पोरेट परिधान',
      color: '#0F2A4A',
      accent: '#2563EB',
      psychology_en: 'Authority Midnight Navy: Activates parasympathetic calmness, communicating steadfast competence and commanding 89% higher executive trust.',
      psychology_hi: 'अथॉरिटी नेवी: बोर्डरूम में 89% उच्च विश्वास, स्थिरता और व्यावसायिक दृढ़ता का प्रतीक।',
      psychology_badge_en: 'Authority & Boardroom Trust',
      psychology_badge_hi: 'अधिकार एवं कॉर्पोरेट विश्वास',
      desc_en: 'Giza-cotton business shirts, formal poly-viscose trousers, 2-piece tailored suits, and polos.',
      desc_hi: 'गिज़ा-कॉटन शर्ट, फॉर्मल ट्राउजर, बिजनेस सूट और कॉर्पोरेट पोलो टी-शर्ट।'
    },
    industrial: {
      en: '⚙️ Industrial Safety',
      hi: '⚙️ औद्योगिक वर्कवियर',
      color: '#EA580C',
      accent: '#0F172A',
      psychology_en: 'EN ISO High-Vis Orange: Engages peripheral photoreceptors instantaneously in low-light workshops, reducing plant machinery collision risks by 74%.',
      psychology_hi: 'हाई-विज़ ऑरेंज: कम रोशनी में तुरंत सतर्कता बढ़ाता है और कारखाने में दुर्घटनाओं को 74% तक कम करता है।',
      psychology_badge_en: 'Zero-Accident Vigilance',
      psychology_badge_hi: 'दुर्घटना-मुक्त सुरक्षा सतर्कता',
      desc_en: 'Heavy 100% cotton drill boiler suits, 3M reflective coveralls, cargo pants, and workshop aprons.',
      desc_hi: 'हेवी कॉटन बॉयलर सूट, 3M रिफ्लेक्टिव कवरऑल और सुरक्षा जैकेट।'
    },
    hospital: {
      en: '🏥 Medical Doctor',
      hi: '🏥 चिकित्सा और डॉक्टर',
      color: '#0284C7',
      accent: '#059669',
      psychology_en: 'Surgical Ceil Blue & Sterile Green: Neutralizes red hemoglobin optical after-images under intense surgical luminaires and reduces patient anxiety.',
      psychology_hi: 'सर्जिकल सील ब्लू: ऑपरेशन थिएटर की रोशनी में आंखों की थकान मिटाता है और मरीजों के तनाव को कम करता है।',
      psychology_badge_en: 'Clinical Sanctuary & Low Fatigue',
      psychology_badge_hi: 'क्लिनिकल शांति एवं कम थकान',
      desc_en: 'Silvadur™ anti-microbial OT scrubs, autoclavable surgeon gowns, doctor lab coats, and bedsheets.',
      desc_hi: 'ओटी सर्जिकल स्क्रब, डॉक्टर लैब कोट, सर्जन गाउन और 200 टीसी बेडशीट।'
    },
    hotel: {
      en: '🍽️ Hotel Culinary',
      hi: '🍽️ होटल और शेफ',
      color: '#C25E34',
      accent: '#18181B',
      psychology_en: 'Culinary Pure White & Saffron: Projects uncompromising Michelin-level hygiene and cleanliness while activating sensory appetite and dining hospitality.',
      psychology_hi: 'प्योर व्हाइट एवं सैफरन: मिशेलिन-स्तरीय शुद्धता और स्वच्छता का भरोसा तथा भोजन के प्रति रुचि जगाता है।',
      psychology_badge_en: 'Michelin Hygiene & Appetite',
      psychology_badge_hi: 'मिशेलिन स्वच्छता एवं आतिथ्य',
      desc_en: 'Double-breasted master chef coats, banquet service uniforms, culinary aprons, and chef toques.',
      desc_hi: 'मास्टर शेफ कोट, बैंक्वेट वेटर यूनिफार्म और किचन एप्रन।'
    },
    security: {
      en: '🛡️ Security Force',
      hi: '🛡️ सुरक्षा गार्ड',
      color: '#1E293B',
      accent: '#CA8A04',
      psychology_en: 'Tactical Slate & Brass Gold: Conveys decisive physical deterrence, disciplined alertness, and unquestioned perimeter order.',
      psychology_hi: 'टैक्टिकल स्लेट एवं ब्रास: परिसर में अभेद्य सुरक्षा, सतर्कता और तुरंत पहचान योग्य अधिकार स्थापित करता है।',
      psychology_badge_en: 'Perimeter Deterrence & Vigilance',
      psychology_badge_hi: 'अभेद्य सुरक्षा एवं सतर्कता',
      desc_en: 'Epaulet guard shirts, tactical trousers, pure wool berets, commando sweaters, and metal whistles.',
      desc_hi: 'एपॉलेट गार्ड शर्ट, टैक्टिकल ट्राउजर, वूलन बेरी कैप और सीटी लैनयार्ड।'
    },
    sports: {
      en: '🏃 Sports Athletic',
      hi: '🏃 खेल और स्पोर्ट्स',
      color: '#16A34A',
      accent: '#2563EB',
      psychology_en: 'Kinetic Emerald & Cobalt: Stimulates autonomic nervous vigor, athletic endurance, and aggressive competitive team spirit on the field.',
      psychology_hi: 'काइनेटिक एमराल्ड: मैदान पर एथलेटिक ऊर्जा, स्फूर्ति और टीम भावना को तुरंत जागृत करता है।',
      psychology_badge_en: 'Kinetic Momentum & Adrenaline',
      psychology_badge_hi: 'ऊर्जा एवं एथलेटिक गतिशीलता',
      desc_en: 'Sublimated basketball team kits, moisture-wicking dry-fit tops, and flexible tracksuits.',
      desc_hi: 'सब्लिमेटेड बास्केटबॉल किट, ड्राई-फिट टी-शर्ट और एथलेटिक ट्रैकसूट।'
    }
  };

  const specificSectors = ['school', 'corporate', 'industrial', 'hospital', 'hotel', 'security', 'sports'];

  async function loadCatalog() {
    try {
      const resp = await fetch('data/products.json');
      if (resp.ok) {
        allProducts = await resp.json();
      } else {
        throw new Error('Failed to load from server');
      }
    } catch (err) {
      console.warn('Loading fallback embedded products:', err);
      if (window.__BEDI_PRODUCTS_DATA__) {
        allProducts = window.__BEDI_PRODUCTS_DATA__;
      }
    }

    renderPills();
    renderProducts();
    setupListeners();
  }

  function setupListeners() {
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderProducts();
      });
    }

    const stockCheckbox = document.getElementById('filter-ready-stock');
    if (stockCheckbox) {
      stockCheckbox.addEventListener('change', (e) => {
        readyStockOnly = e.target.checked;
        renderProducts();
      });
    }
  }

  function renderPills() {
    const pillsRow = document.getElementById('sector-pills-row');
    if (!pillsRow) return;

    const sectorCounts = {};
    allProducts.forEach((p) => {
      sectorCounts[p.category_id] = (sectorCounts[p.category_id] || 0) + 1;
    });

    pillsRow.innerHTML = '';

    specificSectors.forEach((sec) => {
      const count = sectorCounts[sec] || 0;
      const btn = document.createElement('button');
      btn.className = `sector-pill ${sec === currentSector ? 'active' : ''}`;
      btn.dataset.sector = sec;

      const meta = sectorMetadata[sec] || {};
      const title = activeLanguage === 'hi' ? (meta.hi || sec) : (meta.en || sec);
      btn.innerHTML = `${title} <span class="pill-count">${count}</span>`;

      btn.addEventListener('click', () => {
        selectSector(sec);
      });

      pillsRow.appendChild(btn);
    });
  }

  function selectSector(sectorKey) {
    currentSector = sectorKey;
    const pillsRow = document.getElementById('sector-pills-row');
    if (pillsRow) {
      pillsRow.querySelectorAll('.sector-pill').forEach((p) => {
        if (p.dataset.sector === sectorKey) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }
    renderProducts();
  }

  function renderSectorChooser(grid) {
    const sectorCounts = {};
    allProducts.forEach((p) => {
      sectorCounts[p.category_id] = (sectorCounts[p.category_id] || 0) + 1;
    });

    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px 0 40px;">
        <div style="text-align: center; max-width: 720px; margin: 0 auto 36px;">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent-saffron); display: block; margin-bottom: 8px;">
            ${activeLanguage === 'hi' ? 'विशिष्ट चयन आवश्यक • रंग मनोविज्ञान' : 'Specific Sector Selection Required • Color Psychology'}
          </span>
          <h3 style="font-family: var(--font-serif); font-size: 32px; color: var(--text-title); margin-bottom: 12px; line-height: 1.15;">
            ${activeLanguage === 'hi' ? 'कृपया अपनी संस्था के अनुसार श्रेणी चुनें' : 'Choose an Institutional Sector to Explore'}
          </h3>
          <p style="font-size: 15px; color: var(--text-muted); line-height: 1.6;">
            ${activeLanguage === 'hi' ? 'सभी 7 श्रेणियों के 56 उत्पाद संस्थागत रंग मनोविज्ञान और विशिष्ट फैब्रिक मानकों के आधार पर व्यवस्थित हैं:' : 'Each institutional sector operates on distinct behavioral color psychology, textile durability thresholds, and dispatch rhythms. Select your sector below to inspect calibrated collections:'}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
          ${specificSectors.map((sec) => {
            const count = sectorCounts[sec] || 0;
            const meta = sectorMetadata[sec] || {};
            const title = activeLanguage === 'hi' ? meta.hi : meta.en;
            const desc = activeLanguage === 'hi' ? meta.desc_hi : meta.desc_en;
            const psychBadge = activeLanguage === 'hi' ? meta.psychology_badge_hi : meta.psychology_badge_en;
            const psychNarrative = activeLanguage === 'hi' ? meta.psychology_hi : meta.psychology_en;
            const color = meta.color || '#C25E34';

            return `
              <div class="sector-choice-card sector-card-${sec}" onclick="window.BediCatalog.selectSector('${sec}')" 
                   style="background: var(--bg-card); border: 1px solid var(--border-hairline); border-top: 4px solid ${color}; border-radius: 12px; padding: 28px 24px; cursor: pointer; transition: all 0.28s cubic-bezier(0.16,1,0.3,1); display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 6px;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                      ${count} Garments
                    </span>
                    <span style="font-size: 11px; font-weight: 700; color: #64748B; background: #F1F5F9; padding: 3px 8px; border-radius: 12px;">
                      ${psychBadge}
                    </span>
                  </div>
                  <h4 style="font-family: var(--font-serif); font-size: 22px; color: var(--text-title); margin-bottom: 8px;">${title}</h4>
                  <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 14px;">${desc}</p>
                  
                  <div style="background: rgba(0,0,0,0.02); border-left: 2px solid ${color}; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
                    <span style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: ${color}; margin-bottom: 2px;">
                      ${activeLanguage === 'hi' ? 'रंग मनोविज्ञान प्रभाव' : 'Cognitive Color Impact'}
                    </span>
                    <p style="font-size: 11.5px; color: var(--text-body); line-height: 1.45; margin: 0;">
                      ${psychNarrative}
                    </p>
                  </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; color: ${color}; letter-spacing: 0.05em; text-transform: uppercase; padding-top: 12px; border-top: 1px dashed var(--border-hairline);">
                  <span>View ${count} Products Collection</span>
                  <span style="font-size: 14px; transition: transform 0.2s;">→</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const statusText = document.getElementById('catalog-status-count');
    if (statusText) {
      statusText.textContent = activeLanguage === 'hi'
        ? 'कृपया ऊपर दिए गए विकल्पों में से एक श्रेणी चुनें'
        : 'Please select a specific sector above to view uniform collections';
    }
  }

  function renderProducts() {
    const grid = document.getElementById('products-grid');
    const statusText = document.getElementById('catalog-status-count');
    if (!grid) return;

    // If no specific sector chosen and no search query, show Sector Chooser
    if (!currentSector && !searchQuery) {
      renderSectorChooser(grid);
      return;
    }

    const filtered = allProducts.filter((p) => {
      // Sector filter (strictly required unless active search query)
      if (currentSector && p.category_id !== currentSector) {
        return false;
      }

      // Ready stock filter
      if (readyStockOnly && !p.ready_stock) {
        return false;
      }

      // Search query filter
      if (searchQuery) {
        const hay = [
          p.name,
          p.hindi_name,
          p.short_desc,
          p.fabric,
          p.gsm,
          p.category_name,
          ...(p.features || []),
          ...(p.color_options || [])
        ].join(' ').toLowerCase();

        if (!hay.includes(searchQuery)) {
          return false;
        }
      }

      return true;
    });

    if (statusText) {
      const secMeta = sectorMetadata[currentSector] || {};
      const secTitle = activeLanguage === 'hi' ? secMeta.hi : secMeta.en;
      const label = currentSector
        ? (activeLanguage === 'hi'
            ? `${secTitle} के उत्पाद: ${filtered.length} आइटम`
            : `Showing ${filtered.length} garments in ${secTitle}`)
        : `Found ${filtered.length} matching garments`;
      statusText.innerHTML = `${label} &nbsp;&bull;&nbsp; <a href="javascript:void(0)" onclick="window.BediCatalog.resetSector()" style="color: var(--accent-saffron); text-decoration: underline; font-size: 12px;">Change Sector</a>`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #FFFFFF; border-radius: 12px; border: 1px dashed var(--border-hairline);">
          <div style="font-size: 36px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 22px; margin-bottom: 8px;">No garments matched your search</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Try clearing search keywords or selecting another specific sector</p>
          <button onclick="window.BediCatalog.resetSector()" style="background: var(--text-title); color: #FFF; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Choose Another Sector</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((product) => renderProductCard(product)).join('');
  }

  function renderProductCard(p) {
    const name = activeLanguage === 'hi' && p.hindi_name ? p.hindi_name : p.name;
    const desc = p.short_desc || '';
    const colors = p.color_options || [];
    const sizes = p.sizes || [];
    const imagePath = p.image || '/images/default_product.jpg';

    const cleanName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const cleanCat = (p.category_name || '').replace(/'/g, "\\'");

    return `
      <article class="product-card" data-id="${p.id}" data-sector="${p.category_id}">
        <div class="product-image-wrap">
          <img src="${imagePath}" alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/400x480/FAF9F5/111827?text=${encodeURIComponent(p.name)}';" />
          ${p.ready_stock ? '<span class="badge-stock">Ready Stock ✅</span>' : '<span class="badge-custom">Bespoke Only</span>'}
          ${p.is_3d_available ? '<span class="badge-3d" title="Inspect in 3D">3D Available</span>' : ''}
        </div>

        <div class="product-info">
          <span class="product-sector-tag">${p.category_name}</span>
          <h3 class="product-name font-serif">${name}</h3>
          <p class="product-desc">${desc}</p>

          <div class="product-meta-table">
            <div class="meta-row">
              <span class="meta-key">Fabric:</span>
              <span class="meta-val">${p.fabric || 'Mill Twill / Poplin'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Weight:</span>
              <span class="meta-val">${p.gsm || 'Standard GSM'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">Min Order:</span>
              <span class="meta-val"><strong>${p.min_order_qty || 25} Pieces</strong></span>
            </div>
          </div>

          <!-- Color Swatches Preview -->
          ${colors.length > 0 ? `
            <div class="card-swatches">
              <span class="swatches-label">Colors:</span>
              <div class="swatches-dots">
                ${colors.slice(0, 4).map(c => `<span class="swatch-dot" title="${c}"></span>`).join('')}
                ${colors.length > 4 ? `<span class="swatch-more">+${colors.length - 4}</span>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Size Guide Link -->
          <div class="card-size-link">
            <button type="button" class="btn-text-size" onclick="window.BediApp.openSizeGuide('${p.category_id}', '${cleanName}')">
              📏 Sizing: ${sizes.length > 0 ? sizes[0] + '...' : 'View Size Chart'}
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="product-card-actions">
            <a href="https://wa.me/919211825699?text=${encodeURIComponent(`Hello Bedi Fashion, I am inquiring about: ${p.name} (${p.category_name}). Please share wholesale quotation.`)}" target="_blank" rel="noopener noreferrer" class="btn-card-wa">
              💬 WhatsApp Quote
            </a>
            <button type="button" class="btn-card-rfq" onclick="window.BediRFQ.addToQueue('${p.id}', '${cleanName}', '${cleanCat}', ${p.min_order_qty || 25})">
              + Add to RFQ
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function setLanguage(lang) {
    activeLanguage = lang;
    renderPills();
    renderProducts();
  }

  function resetSector() {
    currentSector = null;
    const pillsRow = document.getElementById('sector-pills-row');
    if (pillsRow) {
      pillsRow.querySelectorAll('.sector-pill').forEach((p) => p.classList.remove('active'));
    }
    renderProducts();
  }

  // Export
  window.BediCatalog = {
    loadCatalog,
    setLanguage,
    selectSector,
    resetSector
  };

  // Auto-init on DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCatalog);
  } else {
    loadCatalog();
  }
})();
