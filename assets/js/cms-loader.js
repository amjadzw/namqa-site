/* =============================================================
   Namqa Studio — Dynamic content loader
   Fetches JSON from /content/*.json and renders each section
   into the existing DOM shells in index.html.
   Runs BEFORE main.js + phone3d.js init, via a 'namqa:content-ready' event.
============================================================= */

(function () {
  "use strict";

  // Small helpers
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const q = (sel, root = document) => root.querySelector(sel);

  const checkIcon = '<span class="check"><i data-lucide="check" style="width:14px;height:14px;stroke-width:3;"></i></span>';
  const checkIconSm = '<span class="check"><i data-lucide="check" style="width:12px;height:12px;stroke-width:3;"></i></span>';

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  // ---------------- NAV ----------------
  function renderNav(data) {
    const menu = q("#nav .nav__menu");
    if (menu) {
      menu.innerHTML = data.menu
        .map(m => `<li><a href="${esc(m.href)}">${esc(m.label)}</a></li>`)
        .join("");
    }
    const phone = q("#nav .nav__phone");
    if (phone) {
      phone.setAttribute("href", data.phone_href);
      phone.innerHTML =
        `<i data-lucide="phone" style="width:16px;height:16px;"></i>` +
        `<span>${esc(data.phone_display)}</span>`;
    }
    const cta = q("#nav .nav__actions .btn--primary");
    if (cta) {
      cta.setAttribute("href", data.cta_href);
      cta.innerHTML = `${esc(data.cta_label)} <span class="btn__arrow">→</span>`;
    }
  }

  // ---------------- HERO ----------------
  function renderHero(data) {
    const content = q(".hero .hero__content");
    if (content) {
      content.innerHTML = `
        <span class="eyebrow hero__eyebrow">${esc(data.eyebrow)}</span>
        <h1 class="hero__title">
          ${esc(data.title_before)} <span class="accent">${esc(data.title_accent)}</span><br>
          ${esc(data.title_after)}
        </h1>
        <ul class="hero__bullets">
          ${data.bullets.map(b => `
            <li>${checkIcon}<span>${esc(b)}</span></li>
          `).join("")}
        </ul>
        <div class="hero__ctas">
          <a href="${esc(data.cta_primary_href)}" class="btn btn--primary btn--lg">
            ${esc(data.cta_primary_label)}
            <span class="btn__arrow">→</span>
          </a>
          <a href="${esc(data.cta_secondary_href)}" class="btn btn--ghost btn--lg">
            ${esc(data.cta_secondary_label)}
            <i data-lucide="play" style="width:14px;height:14px;"></i>
          </a>
        </div>
      `;
    }

    const notif = q(".hero__notif");
    if (notif) {
      notif.innerHTML = `
        <div class="hero__notif__icon">
          <i data-lucide="bell" style="width:18px;height:18px;"></i>
        </div>
        <div>
          <div class="hero__notif__title">${esc(data.notif_title)}</div>
          <div class="hero__notif__text">${esc(data.notif_text)}</div>
        </div>
      `;
    }

    const badge = q(".hero__badge");
    if (badge) {
      badge.innerHTML = `
        <div class="hero__badge__label">${esc(data.badge_label)}</div>
        <div class="hero__badge__value">${esc(data.badge_value)} <span class="unit">${esc(data.badge_unit)}</span></div>
      `;
    }

    const hint = q(".hero__hint");
    if (hint) {
      hint.innerHTML = `
        <i data-lucide="move" style="width:12px;height:12px;"></i>
        ${esc(data.hint_text)}
      `;
    }
  }

  // ---------------- MARQUEE ----------------
  function renderMarquee(data) {
    const label = q(".logos__label");
    if (label) {
      label.innerHTML = `<strong>${esc(data.label_strong)}</strong> ${esc(data.label_rest)}`;
    }
    const track = q(".marquee__track");
    if (track) {
      // duplicate for seamless loop
      const items = [...data.items, ...data.items]
        .map(name => `<span class="marquee__item">${esc(name)}</span>`)
        .join("");
      track.innerHTML = items;
    }
  }

  // ---------------- FEATURES ----------------
  function renderFeatures(data) {
    const head = q("#fonctionnalites .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const wrap = q("#fonctionnalites .features");
    if (wrap) {
      wrap.innerHTML = data.items.map(f => `
        <div class="feature reveal-js">
          <div class="feature__icon"><i data-lucide="${esc(f.icon)}" style="width:28px;height:28px;"></i></div>
          <h3 class="feature__title">${esc(f.title)}</h3>
          <p class="feature__text">${esc(f.text)}</p>
        </div>
      `).join("");
    }
  }

  // ---------------- BENEFITS ----------------
  function renderBenefits(data) {
    const head = q("#solution .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const list = q("#solution .benefits__list");
    if (list) {
      list.innerHTML = data.items.map((b, i) => `
        <div class="benefit${i === 0 ? " active" : ""}" data-benefit="${i}">
          <div class="benefit__number">${esc(b.number)}</div>
          <h3 class="benefit__title">${esc(b.title)}</h3>
          <p class="benefit__text">${esc(b.text)}</p>
        </div>
      `).join("");
    }
    // Visual panels stay as-is (SVG illustrations in HTML);
    // we just ensure only the first is active.
    document.querySelectorAll("#solution .b-illus").forEach((el, i) => {
      el.classList.toggle("active", i === 0);
    });
  }

  // ---------------- PRICING ----------------
  function renderPricing(data) {
    const head = q("#tarifs .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const wrap = q("#tarifs .pricing");
    if (wrap) {
      wrap.innerHTML = data.plans.map(p => {
        const featClass = p.featured ? "price-card price-card--featured reveal-js" : "price-card reveal-js";
        const tag = p.featured && p.tag ? `<span class="price-card__tag">${esc(p.tag)}</span>` : "";
        const prefix = p.price_prefix
          ? `<span style="font-size:22px;color:var(--orange);margin-right:4px;">${esc(p.price_prefix)}</span>`
          : "";
        const ctaClass = p.featured ? "btn btn--primary" : "btn btn--white";
        const ctaStyle = p.featured ? "" : ' style="border:1.5px solid var(--violet-soft);"';
        // Detect custom-quote pricing (non-numeric amount)
        const isCustomPrice = p.amount && !/\d/.test(String(p.amount));
        const priceBlock = isCustomPrice
          ? `<div class="price-card__price price-card__price--custom">
               <span class="price-card__custom">${esc(p.amount)}</span>
             </div>`
          : `<div class="price-card__price">
               ${prefix}
               <span class="price-card__amount">${esc(p.amount)}</span>
               <span class="price-card__period">${esc(p.period)}</span>
             </div>`;
        return `
          <div class="${featClass}">
            ${tag}
            <div class="price-card__name">${esc(p.name)}</div>
            <div class="price-card__subtitle">${esc(p.subtitle)}</div>
            ${priceBlock}
            <ul class="price-card__features">
              ${p.features.map(f => `<li>${checkIconSm}${esc(f)}</li>`).join("")}
            </ul>
            <a href="${esc(p.cta_href)}" class="${ctaClass}"${ctaStyle}>${esc(p.cta_label)} <span class="btn__arrow">→</span></a>
          </div>
        `;
      }).join("");
    }
  }

  // ---------------- STEPS + CTA BANNER ----------------
  function renderSteps(data) {
    const head = q("#how .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const wrap = q("#how .steps");
    if (wrap) {
      wrap.innerHTML = data.items.map(s => `
        <div class="step reveal-js">
          <div class="step__num">${esc(s.number)}</div>
          <h3 class="step__title">${esc(s.title)}</h3>
          <p class="step__text">${esc(s.text)}</p>
        </div>
      `).join("");
    }
    const banner = q(".cta-banner");
    if (banner) {
      banner.innerHTML = `
        <h2>${esc(data.cta_banner_title_before)} <span style="color:var(--orange)">${esc(data.cta_banner_title_accent)}</span></h2>
        <a href="${esc(data.cta_banner_href)}" class="btn btn--primary btn--lg">${esc(data.cta_banner_label)} <span class="btn__arrow">→</span></a>
      `;
    }
  }

  // ---------------- TESTIMONIALS + REVIEWS ----------------
  function renderTestimonials(data) {
    const head = q("#temoignages .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const track = q("#testimonials-track");
    if (track) {
      track.innerHTML = data.items.map(t => `
        <article class="testimonial">
          <p class="testimonial__quote">${esc(t.quote)}</p>
          <div class="testimonial__author">
            <div class="testimonial__avatar">${esc(t.initials)}</div>
            <div>
              <div class="testimonial__brand">${esc(t.brand)}</div>
              <div class="testimonial__role">${esc(t.role)}</div>
            </div>
          </div>
        </article>
      `).join("");
    }
    // (Reviews 5/5 block removed — replaced by Solutions section)
  }

  // ---------------- SOLUTIONS COMPLÉMENTAIRES ----------------
  function renderSolutions(data) {
    const head = q("#solutions .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const wrap = q("#solutions .solutions");
    if (wrap) {
      const svgs = window.__NAMQA_SOLUTIONS_SVG__ || {};
      wrap.innerHTML = data.items.map(item => {
        const svg = svgs[item.illustration] || "";
        return `
          <div class="solution-card reveal-js">
            <h3 class="solution-card__title">${esc(item.title)}</h3>
            <div class="solution-card__illus">${svg}</div>
            <p class="solution-card__text">${esc(item.text)}</p>
          </div>
        `;
      }).join("");
    }
  }

  // ---------------- FAQ ----------------
  function renderFaq(data) {
    const head = q("#faq .section__head");
    if (head) {
      head.innerHTML = `
        <span class="eyebrow">${esc(data.eyebrow)}</span>
        <h2 class="section__title">${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span></h2>
        <p class="section__subtitle">${esc(data.subtitle_before)} <a href="${esc(data.subtitle_link_href)}" style="color:var(--orange);font-weight:600;">${esc(data.subtitle_link_label)}</a> ${esc(data.subtitle_after)}</p>
      `;
      head.classList.add("reveal-js");
    }
    const wrap = q("#faq .faq");
    if (wrap) {
      wrap.innerHTML = data.items.map(item => `
        <details class="faq-item">
          <summary>
            ${esc(item.question)}
            <span class="faq-item__icon"><i data-lucide="plus" style="width:16px;height:16px;"></i></span>
          </summary>
          <div class="faq-item__content">${esc(item.answer)}</div>
        </details>
      `).join("");
    }
  }

  // ---------------- FINAL CTA ----------------
  function renderFinalCta(data) {
    const el = q(".final-cta");
    if (el) {
      el.innerHTML = `
        <h2>${esc(data.title_before)} <span style="color:var(--orange)">${esc(data.title_accent)}</span>${esc(data.title_after)}</h2>
        <a href="${esc(data.cta_href)}" class="btn btn--primary btn--lg">${esc(data.cta_label)} <span class="btn__arrow">→</span></a>
        <p style="margin-top:24px;color:rgba(255,255,255,0.6);font-size:14px;">${esc(data.microcopy)}</p>
      `;
    }
  }

  // ---------------- CONTACT ----------------
  function renderContact(data) {
    if (!data) return;
    const intro = q(".contact-intro");
    if (intro) {
      intro.innerHTML = `
        <h2 class="contact-intro__title">
          <span>${esc(data.title_line1)}</span>
          <span class="contact-intro__soft">${esc(data.title_line2)}</span>
        </h2>
        <p class="contact-intro__sub">${esc(data.subtitle)}</p>
      `;
    }
    // Fill sectors dropdown
    const sectorSel = document.getElementById("cf-secteur");
    if (sectorSel && Array.isArray(data.sectors)) {
      data.sectors.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        sectorSel.appendChild(opt);
      });
    }
    // Submit button label
    const submitLabel = q(".btn--submit .btn__label");
    if (submitLabel) submitLabel.textContent = data.submit_label || "Contactez-nous";
  }

  // ---------------- FOOTER ----------------
  function renderFooter(data) {
    const top = q(".footer__top");
    if (top) {
      top.innerHTML = `
        <div class="footer__brand">
          <img src="assets/images/namqa-logo-white.png" alt="Namqa Studio" style="height:42px;" />
          <p>${esc(data.tagline)}</p>
        </div>
        ${data.columns.map(col => `
          <div class="footer__col">
            <h4>${esc(col.heading)}</h4>
            <ul>
              ${col.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}
            </ul>
          </div>
        `).join("")}
      `;
    }
    const bottom = q(".footer__bottom");
    if (bottom) {
      bottom.innerHTML = `
        <div>${esc(data.copyright)}</div>
        <div class="footer__legal">
          ${data.legal_links.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}
        </div>
      `;
    }
  }

  // ---------------- MAIN ----------------
  async function init() {
    try {
      const [nav, hero, marquee, features, benefits, pricing, steps, testimonials, solutions, faq, finalCta, contact, footer] = await Promise.all([
        loadJSON("content/nav.json"),
        loadJSON("content/hero.json"),
        loadJSON("content/marquee.json"),
        loadJSON("content/features.json"),
        loadJSON("content/benefits.json"),
        loadJSON("content/pricing.json"),
        loadJSON("content/steps.json"),
        loadJSON("content/testimonials.json"),
        loadJSON("content/solutions.json"),
        loadJSON("content/faq.json"),
        loadJSON("content/final_cta.json"),
        loadJSON("content/contact.json"),
        loadJSON("content/footer.json"),
      ]);

      renderNav(nav);
      renderHero(hero);
      renderMarquee(marquee);
      renderFeatures(features);
      renderBenefits(benefits);
      renderPricing(pricing);
      renderSteps(steps);
      renderTestimonials(testimonials);
      renderSolutions(solutions);
      renderFaq(faq);
      renderFinalCta(finalCta);
      renderContact(contact);
      renderFooter(footer);

      // Re-init Lucide icons after DOM changes
      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }

      // Signal main.js & phone3d.js that content is ready
      document.dispatchEvent(new CustomEvent("namqa:content-ready"));
      window.__namqaContentReady = true;
    } catch (err) {
      console.error("[Namqa] Content load failed:", err);
      // Even on failure, emit the event so interactivity has a chance
      document.dispatchEvent(new CustomEvent("namqa:content-ready"));
      window.__namqaContentReady = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
