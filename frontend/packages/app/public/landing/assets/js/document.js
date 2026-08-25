(() => {
  const content = document.querySelector('[data-markdown]');
  const toc = document.querySelector('.docs-toc nav');
  const localDocuments = new Map([
    ['overview.md', './overview.html'],
    ['docs/overview.md', './overview.html'],
    ['quickstart.md', './quick-start.html'],
    ['docs/quickstart.md', './quick-start.html'],
    ['technical_report.md', './technical-report.html'],
    ['docs/technical_report.md', './technical-report.html'],
    ['readme.md', './introduction.html']
  ]);

  const normalizePath = (path) => {
    const parts = [];
    path.split('/').forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });
    return parts.join('/');
  };

  const slugify = (text, used) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';
    let slug = base;
    let suffix = 1;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    used.add(slug);
    return slug;
  };

  const rewriteResources = () => {
    const repoBase = content.dataset.repoBase;
    content.querySelectorAll('table').forEach((table) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'markdown-table-wrap';
      table.before(wrapper);
      wrapper.append(table);
    });

    content.querySelectorAll('img').forEach((image) => {
      const source = image.getAttribute('src');
      if (!source || /^(?:https?:|data:)/i.test(source)) return;
      const path = normalizePath(`${repoBase}${source}`);
      image.src = `https://raw.githubusercontent.com/microsoft/Sico/main/${path}`;
    });

    content.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (/^(?:https?:|mailto:)/i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return;
      }
      const [path, hash = ''] = href.split('#');
      const normalized = normalizePath(`${repoBase}${path}`).toLowerCase();
      const local = localDocuments.get(normalized) || localDocuments.get(normalizePath(path).toLowerCase());
      link.href = local ? `${local}${hash ? `#${hash}` : ''}` : `https://github.com/microsoft/Sico/blob/main/${normalizePath(`${repoBase}${path}`)}${hash ? `#${hash}` : ''}`;
      if (!local) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  };

  const buildToc = () => {
    const used = new Set();
    const headings = [...content.querySelectorAll('h1, h2, h3')];
    let navigationTarget = null;
    let navigationStartedAt = 0;
    headings.forEach((heading) => {
      heading.id = heading.id || slugify(heading.textContent, used);
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      if (heading.tagName === 'H3') link.className = 'toc-child';
      toc.append(link);
    });

    const links = [...toc.querySelectorAll('a')];
    const setActive = (id) => links.forEach((link) => {
      const active = link.hash === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const updateActive = () => {
      if (navigationTarget) {
        const targetTop = navigationTarget.getBoundingClientRect().top;
        const stillScrolling = Math.abs(targetTop - 96) > 12 && performance.now() - navigationStartedAt < 1000;
        if (stillScrolling) return;
        navigationTarget = null;
      }
      const current = headings.reduce((active, heading) => heading.offsetTop <= window.scrollY + 140 ? heading : active, headings[0]);
      if (current) setActive(current.id);
    };
    links.forEach((link) => link.addEventListener('click', () => {
      navigationTarget = document.querySelector(link.hash);
      navigationStartedAt = performance.now();
      setActive(link.hash.slice(1));
    }));
    document.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  };

  fetch(content.dataset.markdown)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load document (${response.status})`);
      return response.text();
    })
    .then((markdown) => {
      content.innerHTML = marked.parse(markdown, { gfm: true });
      rewriteResources();
      buildToc();
    })
    .catch((error) => {
      content.innerHTML = `<h1>Document unavailable</h1><p>${error.message}</p>`;
    });
})();