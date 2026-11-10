/**
 * BEDI FASHION™ — GEMINI BEDIBOT AI CONCIERGE
 * Dual-Mode Execution: Google Gemini API (/api/chat) with High-Fidelity Offline Knowledge Base Fallback
 * Bilingual English / Hindi (हिंदी) • Lead Qualification • Direct WhatsApp Handoff
 */

(function () {
  'use strict';

  let isOpen = false;
  let chatHistory = [];
  let userLang = 'en';
  let previousInteractionId = null;

  const _heritage = (typeof window !== 'undefined' && window.BEDI_HERITAGE) || {
    foundingYear: 1987,
    years: Math.max(1, new Date().getFullYear() - 1987)
  };
  const HERITAGE_YEARS = _heritage.years;

  const KNOWLEDGE_BASE = {
    founder: 'Mr. Guru Charan Singh Bedi',
    heritage: `${HERITAGE_YEARS}+ years of institutional uniform heritage (Est. 1987)`,
    head_office: 'Plot No - 125, Sector-18, Faridabad, Haryana - 121002',
    shop_address: 'Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303',
    phones: ['+91 9310825699', '+91 9811825699', '+91 9899114052'],
    primary_wa: '919211825699',
    email: 'info@bedifashion.in',
    moq_stock: '25 pieces for ready-made standard stock inventory',
    moq_custom: '100 pieces for customized institutional orders (custom dyes, patterns, and bullion crest embroidery)',
    lead_time: '3 to 7 working days for ready stock; 14 to 21 days for customized institutional contracts'
  };

  const initialGreetingEn = `Namaste! I am **BediBot**, client advisor at Bedi Fashion™ (Proprietor: Mr. Guru Charan Singh Bedi). 

With **${HERITAGE_YEARS}+ years of heritage (est. 1987)**, we supply schools, hospitals, corporate teams, and institutions across Delhi NCR and India.

How may I assist your institution today? Ask about our **56+ products, live prices, Customize Uniforms, fabric GSM, MOQ, or sample swatches**.`;

  const initialGreetingHi = `नमस्ते! मैं **बेदीबॉट (BediBot)** हूँ, बेदी फैशन™ (प्रोप्राइटर: श्री गुरु चरण सिंह बेदी) का सलाहकार।

**${HERITAGE_YEARS}+ वर्षों के अनुभव (स्थापना 1987)** के साथ, हम दिल्ली एनसीआर और पूरे भारत में स्कूलों, अस्पतालों, कॉर्पोरेट्स और संस्थानों को सर्वोत्तम यूनिफार्म प्रदान करते हैं।

मैं आपकी क्या सहायता कर सकता हूँ? आप हमारे **उत्पादों, लाइव रेट्स, कस्टम यूनिफॉर्म, फैब्रिक GSM या सैंपल स्वाच** के बारे में पूछ सकते हैं।`;

  function initBediBot() {
    setupChatElements();
    setupEventListeners();
  }

  function setupChatElements() {
    const launcher = document.getElementById('bedibot-launcher');
    const windowEl = document.getElementById('bedibot-window');
    if (!launcher || !windowEl) return;

    // Set initial greeting
    appendMessage('bot', userLang === 'hi' ? initialGreetingHi : initialGreetingEn);
  }

  function setupEventListeners() {
    const toggleBtn = document.getElementById('btn-toggle-bedibot');
    const closeBtn = document.getElementById('btn-close-bedibot');
    const sendBtn = document.getElementById('btn-send-bedibot');
    const chatInput = document.getElementById('bedibot-input');
    const promptChips = document.querySelectorAll('.quick-chip');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleChatWindow);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => toggleChatWindow(false));
    }

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => handleUserSend());
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserSend();
      });
    }

    promptChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt') || chip.textContent;
        if (chatInput) chatInput.value = text;
        handleUserSend();
      });
    });

    const msgContainer = document.getElementById('bedibot-messages');
    if (msgContainer) {
      msgContainer.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        const hashMatch = href.match(/^(?:https?:\/\/sardarj\.vercel\.app\/?)?(#.+)$/);
        if (hashMatch) {
          const targetEl = document.querySelector(hashMatch[1]);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    }
  }

  function toggleChatWindow(forceState) {
    const windowEl = document.getElementById('bedibot-window');
    const bubblePrompt = document.getElementById('bedibot-bubble-prompt');
    if (!windowEl) return;

    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (isOpen) {
      windowEl.classList.add('active');
      if (bubblePrompt) bubblePrompt.style.display = 'none';
      const input = document.getElementById('bedibot-input');
      if (input) setTimeout(() => input.focus(), 250);
    } else {
      windowEl.classList.remove('active');
      if (bubblePrompt) bubblePrompt.style.display = 'block';
    }
  }

  async function handleUserSend() {
    const input = document.getElementById('bedibot-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    appendMessage('user', message);
    chatHistory.push({ role: 'user', content: message });

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
      // 1. Try Live Gemini + Supabase API Route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: chatHistory,
          lang: userLang,
          previousInteractionId: previousInteractionId
        })
      });

      removeTypingIndicator(typingId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          if (data.interactionId) {
            previousInteractionId = data.interactionId;
          }
          appendMessage('bot', data.reply);
          chatHistory.push({ role: 'assistant', content: data.reply });
          return;
        }
      }
      throw new Error('Fallback to local intelligence');
    } catch (err) {
      // 2. Offline Smart Knowledge Engine
      removeTypingIndicator(typingId);
      const localReply = generateSmartLocalReply(message);
      appendMessage('bot', localReply);
      chatHistory.push({ role: 'assistant', content: localReply });
    }
  }

  function showTypingIndicator() {
    const container = document.getElementById('bedibot-messages');
    if (!container) return null;
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'chat-bubble bot';
    div.style.color = '#78716C';
    div.style.fontStyle = 'italic';
    div.innerHTML = 'BediBot is checking live rates...';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function formatInlineMarkdown(str) {
    // Handle Markdown links [Label](url) before bare URLs
    let out = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[a-zA-Z0-9_-]+)\)/g, function (_, label, url) {
      if (url.startsWith('#')) {
        return `<a href="${url}" class="chat-anchor-link">${label}</a>`;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    // Linkify bare https:// URLs that aren't already inside an href attribute
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, function (_, prefix, url) {
      return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // **bold** and safe single-line *italic* (ignoring trailing/currency asterisks)
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[\s(])\*([^*\s₹\n][^*\n]*?)\*(?=[.,!?\s)]|$)/g, '$1<em>$2</em>');
    return out;
  }

  function appendMessage(role, text) {
    const container = document.getElementById('bedibot-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-bubble ${role}`;

    const rawText = String(text || '').trim();
    // Preserve intentional offline CTA HTML links cleanly if preformatted
    if (/<a\s+href=/i.test(rawText)) {
      div.innerHTML = rawText
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    } else {
      const escaped = rawText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const lines = escaped.split(/\r?\n/);
      const htmlParts = [];
      let prevBlank = false;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed || /^-{3,}$/.test(trimmed)) {
          if (!prevBlank && htmlParts.length > 0) {
            htmlParts.push('<div style="height:6px;"></div>');
          }
          prevBlank = true;
          continue;
        }
        prevBlank = false;

        if (/^#{1,4}\s+/.test(trimmed)) {
          const title = trimmed.replace(/^#{1,4}\s+/, '');
          htmlParts.push(`<div class="chat-heading">${formatInlineMarkdown(title)}</div>`);
        } else if (/^[-*•]\s+/.test(trimmed)) {
          const item = trimmed.replace(/^[-*•]\s+/, '');
          htmlParts.push(`<div class="chat-bullet"><span class="chat-dot">•</span><span>${formatInlineMarkdown(item)}</span></div>`);
        } else if (/^\d+\.\s+/.test(trimmed)) {
          const m = trimmed.match(/^(\d+\.)\s+(.*)$/);
          htmlParts.push(`<div class="chat-bullet"><span class="chat-num-badge">${m[1]}</span><span>${formatInlineMarkdown(m[2])}</span></div>`);
        } else {
          htmlParts.push(`<div>${formatInlineMarkdown(trimmed)}</div>`);
        }
      }

      div.innerHTML = htmlParts.join('');
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // Specialized Offline NLP Knowledge Engine
  function generateSmartLocalReply(query) {
    const q = query.toLowerCase();
    const isHindi = /[\u0900-\u097F]/.test(query) || q.includes('kya') || q.includes('hai') || q.includes('kripya');

    // 1. Minimum Order Quantity (MOQ)
    if (q.includes('moq') || q.includes('minimum order') || q.includes('kitna piece') || q.includes('न्यूनतम')) {
      if (isHindi) {
        return `बेदी फैशन में हमारे ऑर्डर नियम अत्यंत सुविधाजनक हैं:
- **तैयार इन्वेंटरी (Ready Stock)**: न्यूनतम सिर्फ **25 पीस** प्रति श्रेणी।
- **कस्टम सिलाई व स्कूल लोगो (Bespoke)**: न्यूनतम **100 पीस** (कस्टम डाइंग, कढ़ाई व साइजिंग सहित)।

क्या आप श्री बेदी जी से सीधे व्हाट्सएप पर बात करना चाहेंगे? <a href="https://wa.me/919211825699?text=Namaste%20Mr.%20Bedi,%20I%20want%20to%20discuss%20uniform%20MOQ%20and%20rates." target="_blank">व्हाट्सएप पर संपर्क करें (+91 9211825699)</a>`;
      }
      return `Our order tiers are built for institutional flexibility:
- **Ready Stock Inventory**: Minimum Order is just **25 pieces** per category.
- **Customized Institutional Orders**: MOQ starts at **100 pieces** for custom Pantone dyes, tailored patterns, and gold bullion crest embroidery.

Would you like to connect directly with Proprietor Mr. Guru Charan Singh Bedi? <a href="https://wa.me/919211825699?text=Hello%20Mr.%20Guru%20Charan%20Singh%20Bedi,%20inquiring%20about%20MOQ%20and%20institutional%20pricing." target="_blank">Chat with Proprietor on WhatsApp (+91 9211825699)</a>`;
    }

    // 2. School Uniforms
    if (q.includes('school') || q.includes('blazer') || q.includes('skirt') || q.includes('tracksuit') || q.includes('स्कूल')) {
      if (isHindi) {
        return `बेदी फैशन ${HERITAGE_YEARS}+ वर्षों से दिल्ली-एनसीआर के 500+ प्रतिष्ठित स्कूलों को वर्दी प्रदान कर रहा है:
- **शर्ट**: 65/35 पॉली-कॉटन पॉपलिन (150 GSM), रिंकल-फ्री कॉलर।
- **ट्राउजर व स्कर्ट**: 240 GSM हैवी टेरी-कॉटन ट्विल, डबल-नीडल सिलाई।
- **ब्लेज़र**: प्रीमियम वूल-सर्ज फैब्रिक, हैंड-एम्ब्रॉयडर्ड बुलियन क्रेस्ट।
- **हाउस टी-शर्ट्स**: 180 GSM कॉम्बड पिक, बायो-वॉश।

हम आपकी स्कूल प्रबंध समिति को **मुफ्त फैब्रिक स्वाच व साइजिंग सेट** भेज सकते हैं। <a href="https://wa.me/919211825699?text=Hello%20Bedi%20Fashion,%20we%20need%20School%20Uniform%20samples%20for%20our%20management%20committee." target="_blank">स्कूल सैंपल मँगवाएं →</a>`;
      }
      return `Bedi Fashion is a trusted school uniform supplier in North India with ${HERITAGE_YEARS}+ years of school trust (Est. 1987):
- **Oxford & Poplin Shirts**: 65/35 Poly-Cotton (150 GSM), fused permanent collar.
- **Trousers & Skirts**: 240 GSM high-durability Terry-Cotton, Teflon stain resist.
- **Wool Serge Blazers**: Hand-finished bullion institutional monograms and gold crest buttons.
- **House Kits & Tracksuits**: Micro-peach athletic wear with moisture management.

We provide **complimentary fabric swatch books and fitting sets** directly to your School Board or Purchase Committee. <a href="https://wa.me/919211825699?text=Hello%20Bedi%20Fashion,%20please%20send%20school%20uniform%20sample%20swatches." target="_blank">Request School Swatches on WhatsApp →</a>`;
    }

    // 3. Hospital / Medical
    if (q.includes('hospital') || q.includes('doctor') || q.includes('scrub') || q.includes('nurse') || q.includes('अस्पताल') || q.includes('डॉक्टर')) {
      return `Our healthcare apparel meets strict institutional hygiene protocols:
- **OT Scrub Suits & Gowns**: Silvadur™ silver-ion antimicrobial poplin (160 GSM), autoclavable up to 50+ commercial cycles without fluid breakdown.
- **Doctor Lab Coats**: Full-length anti-bacterial coats with side pass-through pockets.
- **Hospital Linens**: 200–240 Thread Count bleach-resistant sheets and patient gowns.

Would you like us to dispatch an autoclave test sample to your Infection Control team? <a href="https://wa.me/919211825699?text=Hello%20Bedi%20Fashion,%20please%20send%20OT%20Scrub%20and%20Doctor%20Coat%20samples%20for%20our%20hospital." target="_blank">Connect on WhatsApp (+91 9211825699) →</a>`;
    }

    // 4. Industrial & Safety
    if (q.includes('industrial') || q.includes('boiler') || q.includes('coverall') || q.includes('reflective') || q.includes('safety') || q.includes('फैक्ट्री')) {
      return `We manufacture heavy-duty protective workwear for manufacturing plants across Haryana:
- **Boiler Suits**: 100% heavy cotton drill (260–280 GSM), spark and abrasion resistant.
- **High-Visibility Coveralls**: Certified with 2-inch 3M™ Scotchlite reflective bands (EN ISO 20471).
- **Stress-Point Reinforcement**: Pocket corners and crotch seams bar-tacked with high-tensile core thread.

Ready stock is available for quick dispatch. <a href="https://wa.me/919211825699?text=Hello%20Bedi%20Fashion,%20inquiring%20about%20industrial%20boiler%20suits%20and%203M%20coveralls." target="_blank">Inquire Industrial Workwear on WhatsApp →</a>`;
    }

    // 5. Locations, Shop & Contact Coordinates
    if (q.includes('address') || q.includes('location') || q.includes('kahan') || q.includes('shop') || q.includes('noida') || q.includes('faridabad') || q.includes('factory') || q.includes('कहाँ') || q.includes('पता')) {
      if (isHindi) {
        return `हमारे कार्यालय और शॉप के पते:
- **मुख्य कार्यालय (Head Office)**: प्लॉट नं. 125, सेक्टर-18, फरीदाबाद, हरियाणा - 121002
- **शॉप (Bedi Creation)**: बेदी क्रिएशन, गली नंबर 3, पंजाब नेशनल बैंक के सामने, RS ब्यूटी पार्लर के पास, F ब्लॉक, सेक्टर 44, नोएडा, उत्तर प्रदेश - 201303
- **प्रोप्राइटर**: श्री गुरु चरण सिंह बेदी (स्थापना 1987)
- **संपर्क मोबाइल (Contact Mobile)**: +91 9310825699 | +91 9811825699 | +91 9899114052
- **आधिकारिक व्हाट्सएप (WhatsApp)**: +91 9211825699
- **ईमेल**: info@bedifashion.in

<a href="https://wa.me/919211825699?text=Hello%20Mr.%20Guru%20Charan%20Singh%20Bedi,%20we%20would%20like%20to%20visit%20your%20office%20or%20shop." target="_blank">व्हाट्सएप पर अपॉइंटमेंट शेड्यूल करें →</a>`;
      }
      return `Our Office & Retail Shop Locations across Delhi NCR:
- **Head Office**: Plot No - 125, Sector-18, Faridabad, Haryana - 121002
- **Shop (Bedi Creation)**: Bedi Creation, Gali Number 3, Opposite Punjab National Bank, Beside RS Beauty Parlour, F Block, Sector 44, Noida, Uttar Pradesh - 201303
- **Proprietor**: Mr. Guru Charan Singh Bedi (Est. 1987)
- **Contact Mobile**: +91 9310825699 | +91 9811825699 | +91 9899114052
- **WhatsApp Concierge**: +91 9211825699
- **Email**: info@bedifashion.in

Procurement heads are welcome to visit our Head Office or Noida Shop. <a href="https://wa.me/919211825699?text=Hello%20Mr.%20Guru%20Charan%20Singh%20Bedi,%20we%20want%20to%20visit%20your%20Head%20Office%20or%20Noida%20Shop." target="_blank">Schedule a Visit on WhatsApp →</a>`;
    }

    // 6. Sizing & Custom Measurements
    if (q.includes('size') || q.includes('measurement') || q.includes('fit') || q.includes('chart') || q.includes('साइज')) {
      return `We maintain complete Indian Anthropometric Sizing runs:
- **Junior School**: Ages 3 to 14 (Sizes 20 to 36)
- **Adult & Corporate**: Sizes 36 (S) to 54 (5XL)
- **On-Site Sizing Drives**: For large schools and corporate contracts (500+ employees), our master tailors visit your premises to take individual millimeter measurements.

You can also view our digital matrix via the **"Size Guide"** button above!`;
    }

    // 7. General Inquiry & Lead Capture
    return `Thank you for your inquiry regarding Bedi Fashion's capabilities. 

We specialize in precision institutional bulk contracts with **${HERITAGE_YEARS}+ years of operational trust (est. 1987)** across Faridabad and Noida.

To provide you with an exact wholesale quotation and dispatch physical fabric swatches to your office, may I connect you directly with Proprietor **Mr. Guru Charan Singh Bedi**?

<a href="https://wa.me/919211825699?text=Hello%20Mr.%20Guru%20Charan%20Singh%20Bedi,%20I%20am%20inquiring%20about%20uniform%20requirements%20for%20our%20institution.%20Please%20guide%20us." target="_blank" style="display:inline-block; margin-top:8px; background:#25D366; color:#FFF; padding:8px 16px; border-radius:6px; font-weight:700; text-decoration:none;">💬 Chat with Mr. Guru Charan Singh Bedi on WhatsApp (+91 9211825699)</a>`;
  }

  // Public API
  window.BediBot = {
    init: initBediBot,
    open: () => toggleChatWindow(true),
    close: () => toggleChatWindow(false),
    setLanguage: function (lang) {
      userLang = lang;
    }
  };

  document.addEventListener('DOMContentLoaded', initBediBot);
})();
