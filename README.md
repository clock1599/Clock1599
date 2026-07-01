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
Links like `href="signalling.html"` still work as written: a single click
handler on the app root intercepts any in-page `<a>` whose `href` matches a
known page and does a client-side hash navigation (`#signalling.html`)
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
