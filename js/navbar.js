/* ═══════════════════════════════════════════════
   NAVBAR — Scroll state, Hamburger, Active link
   ═══════════════════════════════════════════════ */

/* ─── Scrolled class on navbar ─── */
function setupNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const syncNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 40);

  syncNavbar();
  window.addEventListener('scroll', syncNavbar, { passive: true });
}

/* ─── Mobile hamburger ─── */
function setupMenu() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

/* ─── Active nav link highlight on scroll ─── */
function setupActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-links a');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        /* Reset all */
        navLinks.forEach(link => {
          link.style.color      = '';
          link.style.background = '';
        });

        /* Highlight current */
        const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.style.color = '#fff';
      });
    },
    { threshold: 0.42 }
  );

  sections.forEach(section => observer.observe(section));
}
