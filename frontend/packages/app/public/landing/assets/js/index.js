(() => {
  let hoverTimer;

  const roles = document.querySelector('.roles');
  const roleItems = [...document.querySelectorAll('[data-role]')];
  const roleDots = [...document.querySelectorAll('[data-reveal]')];
  const roleLines = [...document.querySelectorAll('.role-line')];
  let activeRole = -2;

  const syncRoles = () => {
    if (window.innerWidth < 1024) return;
    const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
    const stickyHeight = window.innerHeight - headerHeight;
    const distance = Math.max(roles.offsetHeight - stickyHeight, 1);
    const travelled = Math.min(Math.max(headerHeight - roles.getBoundingClientRect().top, 0), distance);
    const index = travelled === 0 ? -1 : Math.min(Math.floor((travelled / distance) * roleItems.length), roleItems.length - 1);
    if (index === activeRole) return;
    activeRole = index;
    roleItems.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;
      item.classList.toggle('active', isActive);
      item.toggleAttribute('aria-current', isActive);
    });
    roleDots.forEach((dot) => dot.classList.toggle('visible', Number(dot.dataset.reveal) <= index));
    roleLines.forEach((line) => line.classList.toggle('visible', index === roleItems.length - 1));
  };

  let frame;
  const scheduleRoleSync = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = null; syncRoles(); });
  };
  window.addEventListener('scroll', scheduleRoleSync, { passive: true });
  window.addEventListener('resize', scheduleRoleSync, { passive: true });
  syncRoles();

  const scenarioCards = [...document.querySelectorAll('[data-scenario]')];
  const activateScenario = (card) => {
    if (card.classList.contains('active')) return;

    scenarioCards.forEach((item) => {
      item.classList.remove('active', 'is-opening');
    });

    void card.offsetWidth;
    card.classList.add('active', 'is-opening');
    card.querySelector('img').addEventListener('transitionend', (event) => {
      if (event.propertyName === 'clip-path') card.classList.remove('is-opening');
    }, { once: true });
  };
  scenarioCards.forEach((card) => {
    card.addEventListener('mouseenter', () => { window.clearTimeout(hoverTimer); hoverTimer = window.setTimeout(() => activateScenario(card), 150); });
    card.addEventListener('mouseleave', () => window.clearTimeout(hoverTimer));
    card.addEventListener('focus', () => activateScenario(card));
  });
  const footerStars = [...document.querySelectorAll('.footer-stars i')];
  footerStars.forEach((star, index) => {
    const slotWidth = 92 / footerStars.length;
    const duration = 3 + Math.random() * 2;
    const size = 9 + Math.random() * 10;
    const maxScale = 1.1 + Math.random() * 0.22;
    star.style.left = `${4 + (index + Math.random()) * slotWidth}%`;
    star.style.top = `${8 + Math.random() * 60}%`;
    star.style.setProperty('--star-size', `${size}px`);
    star.style.setProperty('--star-duration', `${duration}s`);
    star.style.setProperty('--star-delay', `${-Math.random() * duration}s`);
    star.style.setProperty('--star-max-scale', `${maxScale}`);
  });

  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
})();
