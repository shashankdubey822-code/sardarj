/**
 * BEDI FASHION™ — CORE APPLICATION CONTROLLER
 * Seasonal Timeline Engine • Bilingual Engine • Milestone Counters • Before/After Slider • Size Guide Modal • PDF Engine
 */

(function () {
  'use strict';

  let currentLang = 'en';

  const translations = {
    en: {
      nav_portals: 'The Portals',
      nav_studio: '3D Studio',
      nav_catalog: '56-Product Catalog',
      nav_materials: 'Materials Lab',
      nav_sizing: 'Universal Size Matrix',
      nav_rfq: 'Bulk RFQ Estimator',
      nav_faq: 'Institutional FAQ',
      nav_contact: 'Locations & Contact',
      btn_call: '📞 +91 9211825699',
      btn_wa: 'Direct WhatsApp Inquiry',
      hero_badge: 'Thirty-Nine Years of Excellence & Trust (Est. 1987)',
      hero_title_1: 'Sartorial Precision.',
      hero_title_2: 'Built For Institutions.',
      hero_lead: 'Supplying premier schools, multi-specialty healthcare networks, and corporate enterprises across Delhi NCR with over 50,000+ precision-stitched garments annually.',
      btn_browse_catalog: 'Browse 56-Product Archive',
      btn_launch_3d: 'Launch 3D Tactile Studio',
      btn_request_rfq: 'Instant Institutional RFQ',
      metric_years: 'Years Operating Heritage',
      metric_institutions: 'Institutions Dressed',
      metric_capacity: 'Annual Precision Garments',
      metric_washes: 'Commercial Wash Durability'
    },
    hi: {
      nav_portals: 'दो द्वार (Portals)',
      nav_studio: '3D स्टूडियो',
      nav_catalog: '56 उत्पाद सूची',
      nav_materials: 'कपड़ा व तकनीक',
      nav_sizing: 'साइज चार्ट',
      nav_rfq: 'थोक कोटेशन (RFQ)',
      nav_faq: 'अक्सर पूछे जाने वाले प्रश्न',
      nav_contact: 'कार्यालय व दुकान पता',
      btn_call: '📞 +91 9211825699',
      btn_wa: 'सीधे व्हाट्सएप संपर्क',
      hero_badge: '39 वर्षों का अटूट विश्वास (स्थापना 1987)',
      hero_title_1: 'संस्थागत प्रतिष्ठा।',
      hero_title_2: 'विश्वसनीय विनिर्माण।',
      hero_lead: 'फरीदाबाद से संचालित, हम दिल्ली-एनसीआर के 500+ शीर्ष स्कूलों, मल्टी-स्पेशियलिटी अस्पतालों और औद्योगिक संयंत्रों को प्रतिवर्ष 50,000+ उच्च-गुणवत्ता वाली वर्दियां प्रदान करते हैं।',
      btn_browse_catalog: '56-उत्पाद सूची देखें',
      btn_launch_3d: '3D फैब्रिक स्टूडियो देखें',
      btn_request_rfq: 'थोक ऑर्डर कोटेशन प्राप्त करें',
      metric_years: 'वर्षों का विनिर्माण अनुभव',
      metric_institutions: 'संबद्ध प्रमुख संस्थान',
      metric_capacity: 'वार्षिक उत्पादन क्षमता',
      metric_washes: 'धुलाई सहनशीलता (Washes)'
    }
  };

  function initApp() {
    setupCinematicIntro();
    setupSeasonalAlert();
    setupMilestoneCounters();
    setupComparisonSlider();
    setupSizeGuideModal();
    setupFAQAccordion();
    setupLanguageToggle();
    setupMobileMenu();
    setupSmoothScroll();
    setupSchoolBlazerViewToggle();
  }

  // 1. Seasonal Institutional Timeline Alert
  function setupSeasonalAlert() {
    const bannerEl = document.getElementById('seasonal-banner-text');
    const badgeEl = document.getElementById('seasonal-badge-text');
    const linkEl = document.getElementById('seasonal-link-cta');
    if (!bannerEl) return;

    const month = new Date().getMonth(); // 0 to 11
    let alertMsg = '';
    let badgeMsg = 'Seasonal Peak';

    // March (2) to July (6): Academic Rush
    if (month >= 2 && month <= 6) {
      badgeMsg = 'Academic Rush';
      alertMsg = 'Academic Session 2026–27 Uniform Bulk Bookings Open. Guaranteed On-Time School Batch Delivery.';
    }
    // July (6) to October (9): Industrial Contracts
    else if (month >= 7 && month <= 9) {
      badgeMsg = 'Industrial Focus';
      alertMsg = 'Corporate & Factory Workwear Annual Contracts Open. Special Mill Pricing on High-Visibility Safety Gear.';
    }
    // November (10) to February (1): Winter Uniforms
    else {
      badgeMsg = 'Winter Season';
      alertMsg = 'Winter Uniform Peak: Heavy Blazers, Anti-Pill Sweaters, and Security Commando Pullovers in Ready Stock.';
    }

    if (badgeEl) badgeEl.textContent = badgeMsg;
    if (bannerEl) bannerEl.textContent = alertMsg;
    if (linkEl) {
      linkEl.href = `https://wa.me/919211825699?text=${encodeURIComponent('Hello Bedi Fashion, inquiring about current ' + badgeMsg + ' wholesale bulk rates.')}`;
    }
  }

  // 2. Animated Live Milestone Counters
  function setupMilestoneCounters() {
    const counters = document.querySelectorAll('.counter-val');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10);
          const suffix = el.getAttribute('data-suffix') || '';
          animateCounter(el, 0, target, 1800, suffix);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    counters.forEach((c) => observer.observe(c));
  }

  function animateCounter(el, start, end, duration, suffix) {
    const startTime = performance.now();
    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const current = Math.floor(start + (end - start) * (progress * (2 - progress)));
      el.textContent = current.toLocaleString('en-IN') + suffix;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = end.toLocaleString('en-IN') + suffix;
      }
    }
    requestAnimationFrame(update);
  }

  // 3. Interactive Before & After Slider
  function setupComparisonSlider() {
    const wrapper = document.getElementById('comparison-wrapper');
    const handle = document.getElementById('slider-handle');
    const beforeImage = document.getElementById('compare-before-layer');
    if (!wrapper || !handle || !beforeImage) return;

    let isSliding = false;

    function moveSlider(clientX) {
      const rect = wrapper.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const percentage = (x / rect.width) * 100;

      handle.style.left = percentage + '%';
      beforeImage.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    }

    handle.addEventListener('mousedown', () => isSliding = true);
    window.addEventListener('mouseup', () => isSliding = false);
    window.addEventListener('mousemove', (e) => {
      if (!isSliding) return;
      moveSlider(e.clientX);
    });

    handle.addEventListener('touchstart', () => isSliding = true, { passive: true });
    window.addEventListener('touchend', () => isSliding = false);
    window.addEventListener('touchmove', (e) => {
      if (!isSliding || !e.touches.length) return;
      moveSlider(e.touches[0].clientX);
    }, { passive: true });
  }

  // 4. Universal Size Guide Modal
  function setupSizeGuideModal() {
    const overlay = document.getElementById('size-guide-modal-overlay');
    const closeBtn = document.getElementById('btn-close-size-modal');
    const triggers = document.querySelectorAll('.btn-open-size-guide');

    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openSizeGuide('school');
      });
    });

    if (closeBtn && overlay) {
      closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    }

    // Size Guide Tabs
    const tabBtns = document.querySelectorAll('.size-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.sizecat;
        document.querySelectorAll('.size-table-pane').forEach((pane) => {
          pane.style.display = pane.dataset.sizecat === cat ? 'block' : 'none';
        });
      });
    });
  }

  function openSizeGuide(categoryId) {
    const overlay = document.getElementById('size-guide-modal-overlay');
    if (!overlay) return;

    overlay.classList.add('active');

    // Select category tab - only 'school' uses junior chart, all adult workforce sectors use adult chart
    const targetCat = categoryId === 'school' ? 'school' : 'adult';

    document.querySelectorAll('.size-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sizecat === targetCat);
    });

    document.querySelectorAll('.size-table-pane').forEach((pane) => {
      pane.style.display = pane.dataset.sizecat === targetCat ? 'block' : 'none';
    });
  }

  // Escape key closes size guide modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('size-guide-modal-overlay');
      if (overlay) overlay.classList.remove('active');
    }
  });

  // 5. Cinematic Brand Loading Experience (Golden Needle & Stitch Curtain)
  function setupCinematicIntro() {
    const curtain = document.getElementById('cinematic-intro-curtain');
    if (!curtain) return;

    if (sessionStorage.getItem('bedi_intro_shown')) {
      curtain.style.display = 'none';
      return;
    }

    const skipBtn = document.getElementById('btn-skip-intro');
    let dismissed = false;

    function dismissCurtain() {
      if (dismissed) return;
      dismissed = true;
      curtain.classList.add('curtain-open');
      sessionStorage.setItem('bedi_intro_shown', 'true');
      setTimeout(() => {
        curtain.style.display = 'none';
      }, 700);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', dismissCurtain);
    }

    // Auto-open after 2.4s
    setTimeout(dismissCurtain, 2400);
  }

  // 6. Institutional FAQ Accordion
  function setupFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    faqItems.forEach((item) => {
      const btn = item.querySelector('.faq-question-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const wasActive = item.classList.contains('active');
          faqItems.forEach((other) => other.classList.remove('active'));
          if (!wasActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  // 7. Bilingual Language Engine (English / Hindi Toggle)
  function setupLanguageToggle() {
    const langBtn = document.getElementById('btn-toggle-lang');
    if (!langBtn) return;

    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'hi' : 'en';
      langBtn.innerHTML = currentLang === 'en' ? '🌐 <strong>EN</strong> / HI' : '🌐 EN / <strong>हिन्दी</strong>';
      applyLanguage(currentLang);
    });
  }

  function applyLanguage(lang) {
    const strings = translations[lang];
    if (!strings) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });

    // Translate FAQ items dynamically
    document.querySelectorAll('.faq-accordion-item').forEach((item) => {
      const qEl = item.querySelector('.faq-question-text');
      const aEl = item.querySelector('.faq-answer-text');
      if (qEl) {
        const text = qEl.getAttribute(`data-faq-${lang}`);
        if (text) qEl.textContent = text;
      }
      if (aEl) {
        const text = aEl.getAttribute(`data-faq-${lang}`);
        if (text) aEl.textContent = text;
      }
    });

    // Notify catalog and bot
    if (window.BediCatalog) window.BediCatalog.setLanguage(lang);
    if (window.BediBot) window.BediBot.setLanguage(lang);

    showToast(lang === 'hi' ? 'भाषा बदलकर हिन्दी कर दी गई है' : 'Switched language to English');
  }

  // 6. Mobile Menu Toggle
  function setupMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const nav = document.getElementById('site-nav-links');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const isVisible = nav.style.display === 'flex';
      nav.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        nav.style.flexDirection = 'column';
        nav.style.position = 'absolute';
        nav.style.top = '80px';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = '#FDFBF7';
        nav.style.padding = '20px 24px';
        nav.style.borderBottom = '1px solid var(--border-hairline)';
        nav.style.boxShadow = 'var(--shadow-card)';
      }
    });
  }

  // 7. Smooth Scroll
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId === '') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Toast Notification
  function showToast(message) {
    let toast = document.getElementById('bedi-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bedi-toast';
      toast.style.position = 'fixed';
      toast.style.top = '94px';
      toast.style.right = '24px';
      toast.style.background = '#1C1917';
      toast.style.color = '#FFFFFF';
      toast.style.padding = '12px 20px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '13px';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = 'var(--shadow-card)';
      toast.style.zIndex = '3000';
      toast.style.transition = 'all 0.25s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
    }, 2800);
  }

    // 10. School Uniform Blazer View Switcher (3D Stage vs Master Reference Photograph with Interactive Zoom)
  // 10. Standardized 3D Stage View Initialization (Full 3D Stage for all 7 Categories)
  function setupSchoolBlazerViewToggle() {
    const canvasContainer = document.getElementById('webgl-canvas-container');
    const photoContainer = document.getElementById('studio-reference-photo-container');
    if (photoContainer) photoContainer.style.display = 'none';
    if (canvasContainer) {
      canvasContainer.style.visibility = 'visible';
      canvasContainer.style.display = 'block';
    }
    const stageBadge = document.querySelector('.stage-badge');
    if (stageBadge) stageBadge.textContent = '3D Tactile Stage • WebGL';
    const orbitBtn = document.getElementById('btn-studio-orbit-toggle');
    if (orbitBtn) orbitBtn.style.display = 'flex';
    const stageHint = document.querySelector('.stage-hint');
    if (stageHint) stageHint.style.display = 'block';
  }

  // One-Click PDF Lookbook Trigger
  function downloadPDFCatalog() {
    window.print();
  }

  // Public API
  window.BediApp = {
    init: initApp,
    showToast: showToast,
    openSizeGuide: openSizeGuide,
    downloadPDF: downloadPDFCatalog,
    addToRFQ: function (id, name) {
      if (window.BediRFQ) window.BediRFQ.addItem(id, name);
    }
  };

  document.addEventListener('DOMContentLoaded', initApp);
})();
