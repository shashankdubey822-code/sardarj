/**
 * BEDI FASHION™ — DYNAMIC HERITAGE YEAR ENGINE (FOUNDED 1987)
 * Automatically computes operating years from founding year 1987 across all UI text,
 * counters, document metadata, and bilingual prompts — zero annual manual edits needed.
 */
(function (global) {
  'use strict';

  var FOUNDING_YEAR = 1987;
  var currentYear = new Date().getFullYear();
  var years = Math.max(1, currentYear - FOUNDING_YEAR);

  var ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  var TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function numberToTitleWords(n) {
    if (n <= 0) return String(n);
    if (n < 20) return ONES[n];
    if (n < 100) {
      var ten = Math.floor(n / 10);
      var rem = n % 10;
      return rem > 0 ? TENS[ten] + '-' + ONES[rem] : TENS[ten];
    }
    return String(n);
  }

  var yearsWords = numberToTitleWords(years);

  function applyHeritage(root) {
    if (typeof document === 'undefined') return;
    var scope = root || document;

    // Document title & OpenGraph title
    if (document.title && document.title.indexOf('Bedi Fashion') !== -1) {
      document.title = 'Bedi Fashion™ — ' + years + '+ Years Premier Institutional Uniform Outfitters | Faridabad & Noida, Delhi NCR';
    }
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', 'Bedi Fashion™ — ' + years + '+ Years Premier Uniform Outfitters');
    }

    // Dynamic [data-heritage] tokens across DOM
    var nodes = scope.querySelectorAll('[data-heritage]');
    nodes.forEach(function (el) {
      var kind = el.getAttribute('data-heritage');
      if (kind === 'years') {
        el.textContent = String(years);
      } else if (kind === 'years-plus') {
        el.textContent = years + '+';
      } else if (kind === 'years-badge') {
        el.textContent = years + ' YEARS';
      } else if (kind === 'years-hero-badge') {
        el.textContent = yearsWords + ' Years of Excellence & Trust (Est. ' + FOUNDING_YEAR + ')';
      } else if (kind === 'years-compare-title') {
        el.textContent = 'Cheap Market Uniforms vs. Bedi Fashion ' + years + '-Year Standard';
      } else if (kind === 'years-compare-badge') {
        el.textContent = 'Bedi Fashion Standard (' + years + '+ Years)';
      } else if (kind === 'years-testimonial') {
        el.textContent = 'We have partnered with Bedi Fashion, Faridabad for over ' + years + ' years. For our school of 2,400 students, their punctuality in delivering seasonal batches before the April session, combined with colorfast fabrics that last the entire academic year, makes them indispensable.';
      } else if (kind === 'partner-since') {
        el.textContent = 'Partner Since ' + FOUNDING_YEAR + ' (' + years + '+ Years)';
      } else if (kind === 'yr-concierge') {
        el.textContent = 'Ask BediBot AI • ' + years + '-Yr Concierge';
      } else if (kind === 'footer-copyright') {
        el.textContent = '© ' + FOUNDING_YEAR + ' – ' + currentYear + ' Bedi Fashion™. All Rights Reserved. Faridabad & Noida, Delhi NCR, India.';
      }
    });

    // Dynamic metric counter target derived strictly from currentYear - 1987
    var counters = scope.querySelectorAll('[data-heritage-counter]');
    counters.forEach(function (el) {
      el.setAttribute('data-target', String(years));
      el.textContent = years + (el.getAttribute('data-suffix') || '');
    });
  }

  var api = {
    foundingYear: FOUNDING_YEAR,
    currentYear: currentYear,
    years: years,
    yearsPlus: years + '+',
    yearsWords: yearsWords,
    numberToTitleWords: numberToTitleWords,
    apply: applyHeritage
  };

  global.BEDI_HERITAGE = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        applyHeritage(document);
      });
    } else {
      applyHeritage(document);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
