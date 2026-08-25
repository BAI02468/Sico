(() => {
  const links = [...document.querySelectorAll('.markdown-toc a')];
  const headings = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  let navigationTarget = null;
  let navigationStartedAt = 0;

  const setActiveLink = (id) => {
    links.forEach((link) => {
      const isActive = link.hash === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const updateActiveLink = () => {
    if (navigationTarget) {
      const targetTop = navigationTarget.getBoundingClientRect().top;
      const isStillScrolling = Math.abs(targetTop - 96) > 12 && performance.now() - navigationStartedAt < 1000;
      if (isStillScrolling) return;
      navigationTarget = null;
    }

    const current = headings.reduce((active, heading) => {
      return heading.offsetTop <= window.scrollY + 140 ? heading : active;
    }, headings[0]);
    setActiveLink(current.id);
  };

  links.forEach((link) => link.addEventListener('click', () => {
    navigationTarget = document.querySelector(link.hash);
    navigationStartedAt = performance.now();
    setActiveLink(link.hash.slice(1));
  }));
  document.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();
})();