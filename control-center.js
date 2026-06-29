/* ============================================================
   NBRTA Control Center -- shared session engine
   ------------------------------------------------------------
   Included on every site page. It:
     - Turns the "Clock1599" footer credit into a link to
       control-center.html (the real dashboard page).
     - Checks the current GitHub-OAuth-backed session on load.
     - Exposes window.NBRTAControlCenter so other page scripts
       (the newsletter editor, control-center.html itself) can
       read the current session and react to it, and can trigger
       sign-in / sign-out, without re-implementing any of this.

   Include with: <script src="control-center.js"></script>
   The actual sign-in screen, applications list, and activity
   logs live on control-center.html, not in this file.
   ============================================================ */

(function () {
  const AUTH_ORIGIN = "https://auth.clock1599-official.workers.dev";

  let currentUser = null; // { username, avatarUrl, role, isAdmin, isEditor } | null
  let sessionChecked = false;
  const userChangeListeners = [];

  function notifyUserChange() {
    userChangeListeners.forEach(function (cb) {
      try { cb(currentUser); } catch (e) { /* listener errors shouldn't break us */ }
    });
  }

  function currentPageFilename() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function login() {
    const returnTo = currentPageFilename();
    window.location.href = AUTH_ORIGIN + '/login?return_to=' + encodeURIComponent(returnTo);
  }

  async function logout() {
    try {
      await fetch(AUTH_ORIGIN + '/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore network errors on logout, just reset local state
    }
    currentUser = null;
    notifyUserChange();
  }

  // ---------- Public API ----------

  window.NBRTAControlCenter = {
    AUTH_ORIGIN: AUTH_ORIGIN,
    getCurrentUser: function () { return currentUser; },
    isSessionChecked: function () { return sessionChecked; },
    onUserChange: function (cb) {
      userChangeListeners.push(cb);
      if (sessionChecked) cb(currentUser); // fire immediately if we already know
    },
    login: login,
    logout: logout,
    // Kept for older callers that still navigate visitors to the dashboard
    // rather than opening anything in-page.
    open: function () { window.location.href = 'control-center.html'; },
  };

  // ---------- Footer credit -> link to the dashboard ----------

  function wireFooterLink() {
    const accentSpan = document.querySelector('.site-footer .accent');
    if (!accentSpan) return;
    const link = document.createElement('a');
    link.href = 'control-center.html';
    link.style.color = 'var(--blue)';
    link.textContent = accentSpan.textContent;
    accentSpan.replaceWith(link);
  }
  wireFooterLink();

  // ---------- Session check on page load ----------

  async function checkSession() {
    try {
      const res = await fetch(AUTH_ORIGIN + '/me', { credentials: 'include' });
      const data = await res.json();

      if (!data.loggedIn) {
        currentUser = null;
        return;
      }

      currentUser = {
        username: data.username,
        avatarUrl: data.avatarUrl,
        role: data.role || 'visitor',
        isAdmin: !!data.isAdmin,
        isEditor: !!data.isEditor,
      };
    } catch (e) {
      currentUser = null;
    } finally {
      sessionChecked = true;
      notifyUserChange();
    }
  }

  checkSession();
})();
