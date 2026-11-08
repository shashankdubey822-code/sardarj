/**
 * BEDI FASHION™ — 4-STEP INSTITUTIONAL BULK ESTIMATOR & RFQ ENGINE
 * Real-Time Discount Tiering • Instant WhatsApp Generation • Local JSON Ingestion
 */

(function () {
  'use strict';

  let currentStep = 1;
  let selectedItems = [];

  const rfqState = {
    institutionType: 'School',
    institutionName: '',
    contactPerson: '',
    phone: '',
    city: 'Faridabad / Delhi NCR',
    targetDate: '',
    customization: 'School / Corporate Crest Embroidery',
    totalQuantity: 150
  };

  function initRFQWizard() {
    setupWizardListeners();
  }

  function setupWizardListeners() {
    const openBtns = document.querySelectorAll('.btn-open-rfq');
    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openRFQModal();
      });
    });

    const closeBtn = document.getElementById('btn-close-rfq-modal');
    const overlay = document.getElementById('rfq-modal-overlay');
    if (closeBtn) closeBtn.addEventListener('click', closeRFQModal);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeRFQModal();
      });
    }

    // Step Nav buttons
    const stepBtns = document.querySelectorAll('.rfq-step-btn');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.step, 10);
        goToStep(step);
      });
    });

    // Next / Prev buttons
    const nextBtn = document.getElementById('btn-rfq-next');
    const prevBtn = document.getElementById('btn-rfq-prev');
    const submitBtn = document.getElementById('btn-rfq-submit-wa');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentStep < 4) goToStep(currentStep + 1);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentStep > 1) goToStep(currentStep - 1);
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmitRFQ);
    }

    // Live quantity input
    const qtyInput = document.getElementById('rfq-total-qty');
    if (qtyInput) {
      qtyInput.addEventListener('input', (e) => {
        rfqState.totalQuantity = parseInt(e.target.value, 10) || 0;
        updateCalculationSummary();
      });
    }
  }

  function openRFQModal() {
    const overlay = document.getElementById('rfq-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      goToStep(1);
      updateCalculationSummary();
    }
  }

  function closeRFQModal() {
    const overlay = document.getElementById('rfq-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function goToStep(step) {
    currentStep = step;

    // Update tab indicators
    document.querySelectorAll('.rfq-step-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.step, 10) === currentStep);
    });

    // Show step container
    document.querySelectorAll('.rfq-step-pane').forEach((pane) => {
      pane.style.display = parseInt(pane.dataset.step, 10) === currentStep ? 'block' : 'none';
    });

    // Update Prev / Next / Submit button visibility
    const prevBtn = document.getElementById('btn-rfq-prev');
    const nextBtn = document.getElementById('btn-rfq-next');
    const submitBtn = document.getElementById('btn-rfq-submit-wa');

    if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = currentStep < 4 ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = currentStep === 4 ? 'inline-flex' : 'none';

    if (currentStep === 4) {
      collectFormFields();
      updateCalculationSummary();
    }
  }

  function collectFormFields() {
    const instTypeEl = document.getElementById('rfq-institution-type');
    const instNameEl = document.getElementById('rfq-institution-name');
    const contactEl = document.getElementById('rfq-contact-name');
    const phoneEl = document.getElementById('rfq-contact-phone');
    const cityEl = document.getElementById('rfq-contact-city');
    const targetDateEl = document.getElementById('rfq-target-date');
    const customEl = document.getElementById('rfq-customization-select');
    const qtyEl = document.getElementById('rfq-total-qty');

    if (instTypeEl) rfqState.institutionType = instTypeEl.value;
    if (instNameEl) rfqState.institutionName = instNameEl.value.trim() || 'Premier Institution';
    if (contactEl) rfqState.contactPerson = contactEl.value.trim() || 'Procurement Incharge';
    if (phoneEl) rfqState.phone = phoneEl.value.trim();
    if (cityEl) rfqState.city = cityEl.value.trim() || 'Delhi NCR';
    if (targetDateEl) rfqState.targetDate = targetDateEl.value || 'Within 30 Days';
    if (customEl) rfqState.customization = customEl.value;
    if (qtyEl) rfqState.totalQuantity = parseInt(qtyEl.value, 10) || 100;
  }

  function updateCalculationSummary() {
    const qty = rfqState.totalQuantity || 100;
    let tierName = '';
    let tierDiscount = '';
    let tierPerks = '';

    if (qty < 100) {
      tierName = 'Tier 1: Bulk Wholesale Rate (25 – 99 Pcs)';
      tierDiscount = 'Standard Factory Wholesale Pricing';
      tierPerks = 'Ready-stock inventory dispatch in 3 – 7 business days';
    } else if (qty < 500) {
      tierName = 'Tier 2: Institutional Preferred Tier (100 – 499 Pcs)';
      tierDiscount = '12% - 18% Institutional Volume Discount';
      tierPerks = 'Complimentary institutional chest crest setup + free physical fabric swatch pack';
    } else {
      tierName = 'Tier 3: Direct Factory Contract Rate (500+ Pcs)';
      tierDiscount = '20% - 28% Maximum Direct Factory Contract Discount';
      tierPerks = 'Dedicated mill dye lots, bespoke CAD grading, on-site measurement drive, scheduled rolling delivery';
    }

    const tierTitleEl = document.getElementById('rfq-tier-title');
    const tierDiscountEl = document.getElementById('rfq-tier-discount');
    const tierPerksEl = document.getElementById('rfq-tier-perks');
    const queuedItemsEl = document.getElementById('rfq-queued-items-list');

    if (tierTitleEl) tierTitleEl.textContent = tierName;
    if (tierDiscountEl) tierDiscountEl.textContent = tierDiscount;
    if (tierPerksEl) tierPerksEl.textContent = 'Perks: ' + tierPerks;

    if (queuedItemsEl) {
      if (selectedItems.length === 0) {
        queuedItemsEl.innerHTML = `<em>General Institutional Uniform Allocation (${qty} pieces requested)</em>`;
      } else {
        queuedItemsEl.innerHTML = selectedItems.map((item, idx) => `
          <li style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #E7E5E4;">
            <span>• ${item.name} (${item.quantity || 50} pcs)</span>
            <button type="button" class="btn-remove-rfq-item" data-index="${idx}" style="background:none; border:none; color:#C25E34; cursor:pointer; font-weight:bold; font-size:14px; padding:0 6px;" title="Remove item">✕</button>
          </li>
        `).join('');

        queuedItemsEl.querySelectorAll('.btn-remove-rfq-item').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            selectedItems.splice(idx, 1);
            updateCalculationSummary();
          });
        });
      }
    }
  }

  async function handleSubmitRFQ() {
    collectFormFields();
    const qty = rfqState.totalQuantity || 100;

    // Build Formatted WhatsApp Message
    const itemsSummary = selectedItems.length > 0
      ? selectedItems.map((i) => `${i.name} (${i.quantity || 50} pcs)`).join(', ')
      : `${qty} Uniform Sets across ${rfqState.institutionType} category`;

    const waText = encodeURIComponent(
      `*🏛️ NEW INSTITUTIONAL BULK RFQ — BEDI FASHION™*\n\n` +
      `*Institution:* ${rfqState.institutionName} (${rfqState.institutionType})\n` +
      `*Contact:* ${rfqState.contactPerson} (${rfqState.phone || 'Provided on chat'})\n` +
      `*City/Region:* ${rfqState.city}\n` +
      `*Projected Quantity:* ${qty} Pieces\n` +
      `*Selected Items:* ${itemsSummary}\n` +
      `*Customization:* ${rfqState.customization}\n` +
      `*Required Delivery:* ${rfqState.targetDate}\n\n` +
      `Please provide formal factory quotation & dispatch sample fabric cards.`
    );

    const waUrl = `https://wa.me/919211825699?text=${waText}`;

    // Log Inquiry to Local API
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_name: rfqState.institutionName,
          category: rfqState.institutionType,
          contact_person: rfqState.contactPerson,
          phone: rfqState.phone,
          city: rfqState.city,
          target_date: rfqState.targetDate,
          items: selectedItems.length > 0 ? selectedItems : [{ product_name: `${rfqState.institutionType} Standard Set`, quantity: qty }],
          customization: rfqState.customization,
          status: 'Quote Generated via Web Wizard'
        })
      });
    } catch (e) {
      console.warn('Local inquiry logging handled gracefully:', e);
    }

    // Save to localStorage for client reference
    const savedInquiries = JSON.parse(localStorage.getItem('bedi_rfq_history') || '[]');
    savedInquiries.push({
      timestamp: new Date().toISOString(),
      institution: rfqState.institutionName,
      qty: qty
    });
    localStorage.setItem('bedi_rfq_history', JSON.stringify(savedInquiries));

    // Redirect to WhatsApp Direct
    window.open(waUrl, '_blank');
    closeRFQModal();
  }

  function addItemToRFQ(productId, productName) {
    const existing = selectedItems.find((i) => i.id === productId);
    if (!existing) {
      selectedItems.push({ id: productId, name: productName, quantity: 50 });
    }
    openRFQModal();
    goToStep(2);

    // Show toast
    if (window.BediApp && window.BediApp.showToast) {
      window.BediApp.showToast(`Added "${productName}" to Bulk Estimator`);
    }
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRFQModal();
  });

  // Public API
  window.BediRFQ = {
    init: initRFQWizard,
    open: openRFQModal,
    close: closeRFQModal,
    addItem: addItemToRFQ,
    removeItem: function (id) {
      selectedItems = selectedItems.filter((i) => i.id !== id);
      updateCalculationSummary();
    }
  };

  document.addEventListener('DOMContentLoaded', initRFQWizard);
})();
