# NBRT Site — React SPA port

This is a one-page (single `index.html`) React port of the original multi-page
static site. Same design, same content, same behavior — just client-side
routed instead of separate `.html` files.

## Files
- `index.html` — the only HTML file. Loads React/ReactDOM/Babel from a CDN
  (no build step needed) and the two files below.
- `app.js` — the app shell: `Header`/`Footer` components (ported from
  `nav.js`/`footer.js`), a hash-based router (`#index.html`,
  `#newsletter.html`, etc.), and a generic `LegacyPage` renderer.
- `pages-data.js` — every original page's markup/CSS/inline-script, extracted
  verbatim and bundled as data. `LegacyPage` injects a page's HTML, adds its
  scoped `<style>`, and re-executes its original `<script>` on route change —
  so the countdown timer, the Regulations dropdown, the Newsletter Editor
  (GitHub-auth flow, autosave, publish/export) and the Control Center all work
  exactly as before, unmodified.
- `styles.css` — copied byte-for-byte from the original.

## How routing works
Links like `href="newsletter.html"` still work as written: a single click
handler on the app root intercepts any in-page `<a>` whose `href` matches a
known page and does a client-side hash navigation (`#newsletter.html`)
instead of a full reload — so both old-style links inside content and the
nav bar work without edits. Two small script patches were applied so the
Editor → Control Center handoff and Control Center's "which page am I on"
check use the hash instead of `window.location.pathname`.

## Running it
No build step — it's plain HTML/JS with in-browser Babel. Just serve the
folder statically, e.g.:

```
npx serve .
# or
python3 -m http.server 8080
```

Then open the served URL. Deploy anywhere that serves static files
(GitHub Pages, Cloudflare Pages, Netlify, S3, etc.) — just make sure all four
files stay together in the same folder.

## Note
The Editor and Control Center still call out to
`https://auth.clock1599-official.workers.dev` for GitHub sign-in and the
footer version number, exactly as the original site did — no auth logic was
changed, only how the pages are mounted.

## Making GitHub sign-in work (`404.html`)

The auth worker finishes its OAuth flow with a real, full-page redirect to
a literal URL — e.g. `https://clock1599.github.io/Clock1599/control-center.html?login=success`.
That's how the original multi-page site worked, since that file used to
exist. In the SPA it doesn't anymore — everything is routed through
`index.html` via a `#hash`, so that URL 404s.

`404.html` fixes this. GitHub Pages automatically serves it for any path
it can't find, so when the browser lands on that dead link, `404.html`
rewrites it into the SPA's format and redirects again:

```
/Clock1599/control-center.html?login=success
        → /Clock1599/?login=success#control-center.html
```

The query string (`?login=success`) is kept as a real query string and the
page name moves into the hash — so `index.html` loads normally, the
router picks up `#control-center.html`, and the page's own script (which
calls `/me` with `credentials: 'include'` on mount) picks up the new
session cookie right away.

**This means `404.html` must be uploaded to the repo alongside the other
four files** — GitHub Pages only looks for it at the repo root. Without
it, sign-in will complete on GitHub's side (the cookie gets set) but the
browser will be stuck on a 404 page instead of bouncing back into the app.

This also means any other deep link to an old filename (e.g. someone's old
bookmark to an old page name) now gets caught by the same file and
redirected into the correct hash route.
