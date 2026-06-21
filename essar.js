/* ═══════════════════════════════════════════════════════
   ESSARFAB GREEN INDIA — Main Script
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Mobile menu toggle ──────────────────────────── */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('show');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── 2. Navbar scroll shadow ────────────────────────── */
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    }
  }, { passive: true });

  /* ── 3. Active nav link on scroll ──────────────────── */
  const sections  = document.querySelectorAll('section[id]');
  const allLinks  = document.querySelectorAll('.nav-link');

  const activateNav = () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top    = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id     = section.getAttribute('id');
      if (scrollY >= top && scrollY < bottom) {
        allLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  };

  window.addEventListener('scroll', activateNav, { passive: true });
  activateNav();

  /* ── 4. Scroll reveal (Intersection Observer) ───────── */
  const revealEls = document.querySelectorAll(
    '.reveal-up, .reveal-left, .reveal-right'
  );

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ── 5. Animated number counters ───────────────────── */
  const counters = document.querySelectorAll('.counter');
  let countersDone = false;

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step     = Math.ceil(target / (duration / 16));
    let current    = 0;

    const tick = () => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current < target) requestAnimationFrame(tick);
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

  /* ── 6. Back to top ─────────────────────────────────── */
  const backToTop = document.getElementById('backToTop');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── 7. Contact form submission ─────────────────────── */
  const form = document.getElementById('contactForm');

  if (form) {
    const btnText    = form.querySelector('.btn-text');
    const btnLoading = form.querySelector('.btn-loading');
    const submitBtn  = form.querySelector('.submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Show loading state
      if (btnText && btnLoading) {
        btnText.hidden    = true;
        btnLoading.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = 'thankyou.html';
        } else {
          throw new Error(result.message || 'Submission failed');
        }
      } catch (err) {
        console.error('Form error:', err);
        alert('Something went wrong. Please try again or call us directly at +91-96286 65656.');

        // Restore button
        if (btnText && btnLoading) {
          btnText.hidden    = false;
          btnLoading.hidden = true;
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

});
