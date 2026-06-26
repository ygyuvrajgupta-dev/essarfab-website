/* ═══════════════════════════════════════════════════════
   ESSARFAB GREEN INDIA — Enhanced Script
   Features: Snowfall on scroll · Ice bg · Animations
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════
     1. SNOWFALL — canvas-based, triggers on scroll
  ══════════════════════════════════════════════════════ */
  const canvas = document.createElement('canvas');
  canvas.id = 'snow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  // Snowflake shapes — a mix of dots and ❄ symbols
  const FLAKE_CHARS = ['❄', '❅', '❆', '•', '·', '*'];
  const NUM_FLAKES = Math.min(60, Math.floor(W / 20));

  const flakes = Array.from({ length: NUM_FLAKES }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 14 + 6,       // radius / font size
    speed: Math.random() * 1.2 + 0.3,
    drift: (Math.random() - 0.5) * 0.6,
    opacity: Math.random() * 0.55 + 0.15,
    char: FLAKE_CHARS[Math.floor(Math.random() * FLAKE_CHARS.length)],
    spin: (Math.random() - 0.5) * 0.03,
    angle: Math.random() * Math.PI * 2,
  }));

  let snowActive = false;
  let animId = null;

  function drawSnow() {
    ctx.clearRect(0, 0, W, H);
    flakes.forEach(f => {
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = '#b8e8cc';
      ctx.font = `${f.r}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillText(f.char, 0, 0);
      ctx.restore();

      // Move
      f.y += f.speed;
      f.x += f.drift;
      f.angle += f.spin;

      // Reset when off screen
      if (f.y > H + 20) {
        f.y = -20;
        f.x = Math.random() * W;
      }
      if (f.x > W + 20) f.x = -20;
      if (f.x < -20) f.x = W + 20;
    });

    if (snowActive) animId = requestAnimationFrame(drawSnow);
  }

  function startSnow() {
    if (snowActive) return;
    snowActive = true;
    canvas.classList.add('active');
    drawSnow();
  }

  function stopSnow() {
    snowActive = false;
    canvas.classList.remove('active');
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    ctx.clearRect(0, 0, W, H);
  }

  // Trigger snow when user scrolls more than 100px
  let snowTimeout;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      startSnow();
      clearTimeout(snowTimeout);
      snowTimeout = setTimeout(stopSnow, 3500); // stop 3.5s after last scroll
    }
  }, { passive: true });

  // Resize canvas
  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }, { passive: true });

  /* ══════════════════════════════════════════════════════
     2. MOBILE MENU
  ══════════════════════════════════════════════════════ */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('show');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ══════════════════════════════════════════════════════
     3. NAVBAR SCROLL SHADOW
  ══════════════════════════════════════════════════════ */
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  /* ══════════════════════════════════════════════════════
     4. ACTIVE NAV LINK ON SCROLL
  ══════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id]');
  const allLinks = document.querySelectorAll('.nav-link');

  const activateNav = () => {
    const scrollY = window.scrollY + 110;
    sections.forEach(section => {
      const top    = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id     = section.getAttribute('id');
      if (scrollY >= top && scrollY < bottom) {
        allLinks.forEach(a =>
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`)
        );
      }
    });
  };
  window.addEventListener('scroll', activateNav, { passive: true });
  activateNav();

  /* ══════════════════════════════════════════════════════
     5. SCROLL REVEAL — Intersection Observer
  ══════════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ══════════════════════════════════════════════════════
     6. ANIMATED NUMBER COUNTERS (eased)
  ══════════════════════════════════════════════════════ */
  const counters = document.querySelectorAll('.counter');
  let countersDone = false;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const start    = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(easeOut(p) * target);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counterObserver = new IntersectionObserver((entries) => {
    if (countersDone) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countersDone = true;
        counters.forEach(animateCounter);
        counterObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });

  if (counters.length) {
    counterObserver.observe(counters[0].closest('.hero-stats') || counters[0]);
  }

  /* ══════════════════════════════════════════════════════
     7. BACK TO TOP
  ══════════════════════════════════════════════════════ */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }

  /* ══════════════════════════════════════════════════════
     8. CONTACT FORM SUBMISSION
  ══════════════════════════════════════════════════════ */
  const form = document.getElementById('contactForm');
  if (form) {
    const btnText    = form.querySelector('.btn-text');
    const btnLoading = form.querySelector('.btn-loading');
    const submitBtn  = form.querySelector('.submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btnText && btnLoading) { btnText.hidden = true; btnLoading.hidden = false; }
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res    = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) });
        const result = await res.json();
        if (result.success) {
          window.location.href = 'thankyou.html';
        } else {
          throw new Error(result.message || 'Submission failed');
        }
      } catch (err) {
        console.error('Form error:', err);
        alert('Something went wrong. Please call us at +91-96286 65656.');
        if (btnText && btnLoading) { btnText.hidden = false; btnLoading.hidden = true; }
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ══════════════════════════════════════════════════════
     9. HERO CARD — subtle mouse tilt on desktop
  ══════════════════════════════════════════════════════ */
  const heroCard    = document.querySelector('.hero-card');
  const heroSection = document.querySelector('.hero');
  if (heroCard && heroSection && window.innerWidth > 900) {
    heroSection.addEventListener('mousemove', e => {
      const r  = heroSection.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / r.width;
      const dy = (e.clientY - r.top  - r.height / 2) / r.height;
      heroCard.style.transform = `perspective(800px) rotateY(${dx * 9}deg) rotateX(${-dy * 6}deg) translateY(-16px)`;
    });
    heroSection.addEventListener('mouseleave', () => {
      heroCard.style.transform = '';
    });
  }

  /* ══════════════════════════════════════════════════════
     10. PRODUCT CARDS — stagger on hover entrance
  ══════════════════════════════════════════════════════ */
  const productCards = document.querySelectorAll('.product-card');
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${i * 0.05}s`;
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  productCards.forEach(c => cardObserver.observe(c));

  /* ══════════════════════════════════════════════════════
     11. FAQ — close others when one opens
  ══════════════════════════════════════════════════════ */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        document.querySelectorAll('.faq-item[open]').forEach(other => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ══════════════════════════════════════════════════════
     12. WHY CARDS — ripple effect on click
  ══════════════════════════════════════════════════════ */
  document.querySelectorAll('.why-card, .app-tile').forEach(card => {
    card.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect   = card.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      ripple.style.cssText = `
        position:absolute;border-radius:50%;
        width:${size}px;height:${size}px;
        left:${e.clientX - rect.left - size/2}px;
        top:${e.clientY  - rect.top  - size/2}px;
        background:rgba(11,93,59,.15);
        transform:scale(0);animation:ripple-anim .6s linear;
        pointer-events:none;
      `;
      card.style.position = 'relative';
      card.style.overflow = 'hidden';
      card.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  // Ripple keyframe (injected once)
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `@keyframes ripple-anim{to{transform:scale(4);opacity:0}}`;
    document.head.appendChild(style);
  }

});
