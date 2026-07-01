/* The New Brass Rail Transit Authority — React SPA port
 * Header/Footer are real React components (ported from nav.js / footer.js).
 * All other pages are rendered from extracted original markup/CSS/JS so
 * behavior matches the legacy multi-page site exactly, inside one page.
 */

const { useState, useEffect, useRef, useCallback } = React;

const LOGO_DATA_URI = 'data:image/png;base64,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';

const REG_PAGES = ['regulations.html', 'signalling.html', 'track-sizing.html', 'train-sizing.html'];

function normalizeRoute(hash) {
  let file = (hash || '').replace(/^#\/?/, '').trim();
  if (!file) file = 'index.html';
  if (!window.PAGES[file]) file = 'index.html';
  return file;
}

function navigate(file) {
  if (window.location.hash.replace(/^#\/?/, '') === file) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = file;
  }
  window.scrollTo(0, 0);
}

function Header({ route }) {
  const [open, setOpen] = useState(REG_PAGES.indexOf(route) !== -1);

  useEffect(() => {
    setOpen(REG_PAGES.indexOf(route) !== -1);
  }, [route]);

  const isReg = REG_PAGES.indexOf(route) !== -1;

  function linkClass(file) {
    return route === file ? 'active' : undefined;
  }

  function go(e, file) {
    e.preventDefault();
    navigate(file);
  }

  return (
    <header className="site-header">
      <div className="brand">
        <img src={LOGO_DATA_URI} alt="" />
        <span className="brand-text">The New Brass Rail Transit Authority</span>
      </div>
      <nav className="main-nav">
        <a href="index.html" className={linkClass('index.html')} onClick={(e) => go(e, 'index.html')}>Home</a>
        <div className={'nav-dropdown' + (open ? ' open' : '')} id="regDropdown">
          <button
            type="button"
            className={isReg ? 'active' : ''}
            onClick={() => setOpen((o) => !o)}
          >
            Regulations <span className="caret">&#9662;</span>
          </button>
          <div className="nav-dropdown-menu">
            <a href="regulations.html" className={linkClass('regulations.html')} onClick={(e) => go(e, 'regulations.html')}>Overview</a>
            <a href="signalling.html" className={linkClass('signalling.html')} onClick={(e) => go(e, 'signalling.html')}>Signalling</a>
            <a href="track-sizing.html" className={linkClass('track-sizing.html')} onClick={(e) => go(e, 'track-sizing.html')}>Track Sizing</a>
            <a href="train-sizing.html" className={linkClass('train-sizing.html')} onClick={(e) => go(e, 'train-sizing.html')}>Train Sizing</a>
          </div>
        </div>
        <a href="newsletter.html" className={linkClass('newsletter.html')} onClick={(e) => go(e, 'newsletter.html')}>Newsletter</a>
        <a href="credits.html" className={linkClass('credits.html')} onClick={(e) => go(e, 'credits.html')}>Credits</a>
      </nav>
    </header>
  );
}

function Footer({ route }) {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    const AUTH_ORIGIN = 'https://auth.clock1599-official.workers.dev';
    let cancelled = false;

    function loadVersion() {
      fetch(AUTH_ORIGIN + '/version')
        .then((res) => (res.ok ? res.json() : { version: null }))
        .then((data) => {
          if (cancelled) return;
          const v = data && data.version && data.version.number;
          setVersion(v || null);
        })
        .catch(() => {
          if (!cancelled) setVersion(null);
        });
    }

    // Refetch whenever we navigate (e.g. leaving Control Center after a
    // save) and instantly whenever Control Center's save succeeds, so the
    // badge updates without needing a full page reload.
    loadVersion();
    window.addEventListener('nbrt:version-updated', loadVersion);
    return () => {
      cancelled = true;
      window.removeEventListener('nbrt:version-updated', loadVersion);
    };
  }, [route]);

  return (
    <footer className="site-footer">
      The New Brass Rail Transit Authority &middot; Maintained by <span className="accent">Clock1599</span>
      {version ? <span className="footer-version"> &middot; {version}</span> : null}
    </footer>
  );
}

/* Generic renderer for legacy page content: injects the extracted markup
 * verbatim, adds any page-specific <style>, and executes any page-specific
 * inline <script> blocks (in order) after the markup is in the DOM — this
 * preserves original page behavior (countdowns, dropdowns, forms, auth
 * flows, etc.) without needing to hand-port every page. */
function LegacyPage({ page }) {
  const containerRef = useRef(null);

  useEffect(() => {
    document.title = page.title || 'The New Brass Rail Transit Authority';
  }, [page]);

  useEffect(() => {
    if (!page.css) return undefined;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-legacy-style', page.title || '');
    styleEl.textContent = page.css;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, [page]);

  useEffect(() => {
    if (!page.scripts || page.scripts.length === 0) return undefined;
    const nodes = page.scripts.map((code) => {
      const s = document.createElement('script');
      s.text = code;
      document.body.appendChild(s);
      return s;
    });
    return () => nodes.forEach((n) => n.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div
      ref={containerRef}
      className="legacy-page-root"
      dangerouslySetInnerHTML={{ __html: page.html }}
    />
  );
}

function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.hash));

  useEffect(() => {
    function onHashChange() {
      setRoute(normalizeRoute(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Global click delegation: any internal <a href="somepage.html"> anywhere
  // on the site (including inside raw legacy content) is intercepted and
  // routed client-side instead of causing a full page reload.
  const onRootClick = useCallback((e) => {
    const anchor = e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    const clean = href.replace(/^\.?\/*/, '');
    if (window.PAGES[clean]) {
      e.preventDefault();
      navigate(clean);
    }
  }, []);

  const page = window.PAGES[route];

  return (
    <div id="app-root" onClick={onRootClick}>
      <Header route={route} />
      {page ? <LegacyPage page={page} key={route} /> : null}
      <Footer route={route} />
    </div>
  );
}

const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(<App />);
