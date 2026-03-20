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
  const navLinks  = document.querySelectorAll('.nav-links a');

  if (!navLinks.length) return;

  const trackedSections = Array.from(navLinks)
    .map(link => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return null;

      const section = document.querySelector(href);
      if (!section) return null;

      return { link, section };
    })
    .filter(Boolean);

  if (!trackedSections.length) return;

  function setActiveLink(sectionId) {
    navLinks.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${sectionId}`);
    });
  }

  function syncActiveLink() {
    const focusY = window.scrollY + 140;
    let activeSectionId = trackedSections[0].section.id;

    trackedSections.forEach(({ section }) => {
      if (section.offsetTop <= focusY) {
        activeSectionId = section.id;
      }
    });

    setActiveLink(activeSectionId);
  }

  syncActiveLink();
  window.addEventListener('scroll', syncActiveLink, { passive: true });
  window.addEventListener('resize', syncActiveLink);
}
