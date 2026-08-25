(() => {
  const links = [...document.querySelectorAll('.docs-toc a')];
  const sidebarLinks = [...document.querySelectorAll('.docs-sidebar a[href^="#"]')];
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  let navigationTarget = null;
  let navigationStartedAt = 0;

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.hash === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    sidebarLinks.forEach((link) => {
      const isActive = link.hash === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const updateActive = () => {
    if (navigationTarget) {
      const targetTop = navigationTarget.getBoundingClientRect().top;
      const isStillScrolling = Math.abs(targetTop - 96) > 12 && performance.now() - navigationStartedAt < 1000;
      if (isStillScrolling) return;
      navigationTarget = null;
    }

    const current = sections.reduce((active, section) => {
      return section.offsetTop <= window.scrollY + 140 ? section : active;
    }, sections[0]);
    setActive(current.id);
  };

  [...links, ...sidebarLinks].forEach((link) => link.addEventListener('click', () => {
    navigationTarget = document.querySelector(link.hash);
    navigationStartedAt = performance.now();
    setActive(link.hash.slice(1));
  }));
  document.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
})();