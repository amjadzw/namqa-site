/* ==========================================================
   NAMQA — Main interactions
   Waits for the CMS loader to inject dynamic content,
   then wires up all interactivity on the freshly-rendered DOM.
   ========================================================== */

function __namqaInit() {
  // Lucide icons
  if (window.lucide) lucide.createIcons();

  // ===== Nav show/hide on scroll =====
  const nav = document.getElementById('nav');
  let lastY = 0;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > 120 && y > lastY) nav.classList.add('nav--hidden');
        else nav.classList.remove('nav--hidden');
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ===== IntersectionObserver reveals (fallback for browsers without animation-timeline) =====
  const revealEls = document.querySelectorAll('.reveal-js');
  const supportsTimeline = CSS.supports('animation-timeline: view()');
  if (!supportsTimeline) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    // Timeline-supported browsers still need class switch for a simple fade
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ===== Benefits interactive panels =====
  const benefits = document.querySelectorAll('.benefit');
  const illusPanels = document.querySelectorAll('.b-illus');
  benefits.forEach(b => {
    b.addEventListener('click', () => {
      const idx = b.dataset.benefit;
      benefits.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      illusPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === idx));
    });
    b.addEventListener('mouseenter', () => {
      const idx = b.dataset.benefit;
      illusPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === idx));
      benefits.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // Auto-rotate benefits every 5s if user hasn't interacted
  let autoIdx = 0;
  let autoTimer;
  let userInteracted = false;
  const startAuto = () => {
    autoTimer = setInterval(() => {
      if (userInteracted) return;
      autoIdx = (autoIdx + 1) % benefits.length;
      benefits[autoIdx]?.click();
    }, 5000);
  };
  benefits.forEach(b => b.addEventListener('mouseenter', () => { userInteracted = true; }));
  startAuto();

  // ===== Testimonials carousel =====
  const track = document.getElementById('testimonials-track');
  const ctrlBtns = document.querySelectorAll('.carousel-btn');
  if (track) {
    ctrlBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir, 10);
        const card = track.querySelector('.testimonial');
        if (!card) return;
        const cardWidth = card.offsetWidth + 24; // gap
        track.scrollBy({ left: cardWidth * dir, behavior: 'smooth' });
      });
    });
  }

  // ===== Smooth scroll for anchor links =====
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });
}

if (window.__namqaContentReady) {
  __namqaInit();
} else {
  document.addEventListener('namqa:content-ready', __namqaInit, { once: true });
  // Safety net: if the loader fails to fire for any reason, still init after DOMContentLoaded + 2s
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (!window.__namqaContentReady) __namqaInit();
    }, 2500);
  });
}
