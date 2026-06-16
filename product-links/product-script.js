/* ═══════════════════════════════════════════════════════
   ESSARFAB Product Pages — Interactive Script
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Scroll reveal animation ─────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ── 2. Header scroll shadow ───────────────────────── */
  const header = document.querySelector('.product-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  /* ── 3. Smooth scroll for anchor links ─────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 64;
        const targetPosition = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  /* ── 4. Button hover animation enhancement ────────── */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = btn.classList.contains('btn-primary')
        ? 'translateY(-3px)'
        : 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0px)';
    });
  });

  /* ── 5. Touch-friendly card interactions ──────────── */
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.querySelectorAll('.feature-card, .content-section ul li').forEach(el => {
      el.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });
      el.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    });
  }

  /* ── 6. Spec table row highlight on phone ─────────── */
  document.querySelectorAll('.spec-table tbody tr').forEach(row => {
    row.addEventListener('click', function() {
      this.classList.toggle('highlighted');
    });
  });

});