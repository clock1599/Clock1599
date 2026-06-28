/* ============================================================
   NBRTA Control Center
   ------------------------------------------------------------
   Shared, self-contained module included on every site page.
   It:
     - Turns the "Clock1599" footer credit into a button that
       opens a sign-in / admin control center modal.
     - Handles GitHub OAuth sign-in, sign-out, and session checks.
     - Shows a pending-approval message for newly signed-in,
       not-yet-approved accounts.
     - Gives the admin (Clock1599) a panel to approve/deny
       pending requests and view the last 7 days of activity.
     - Exposes window.NBRTAControlCenter so other page scripts
       (e.g. the newsletter editor) can read the current session
       without re-implementing any of this.

   Include with: <script src="control-center.js"></script>
   No other markup is required -- this script injects its own
   modal into the page and wires up the footer credit itself.
   ============================================================ */

(function () {
  const AUTH_ORIGIN = "https://auth.clock1599-official.workers.dev";

  let currentUser = null; // { username, avatarUrl, isAdmin } | null
  let sessionChecked = false;
  const userChangeListeners = [];

  function notifyUserChange() {
    userChangeListeners.forEach(function (cb) {
      try { cb(currentUser); } catch (e) { /* listener errors shouldn't break us */ }
    });
  }

  // ---------- Public API ----------

  window.NBRTAControlCenter = {
    getCurrentUser: function () { return currentUser; },
    isSessionChecked: function () { return sessionChecked; },
    onUserChange: function (cb) {
      userChangeListeners.push(cb);
      if (sessionChecked) cb(currentUser); // fire immediately if we already know
    },
    open: function () { openModal(); },
  };

  // ---------- Inject CSS ----------

  const style = document.createElement('style');
  style.textContent = `
    .cc-footer-btn {
      background: none;
      border: none;
      color: var(--blue);
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
      padding: 0;
      text-decoration: none;
    }
    .cc-footer-btn:hover { text-decoration: underline; }

    .cc-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .cc-overlay.open { display: flex; }

    .cc-modal {
      width: 100%;
      max-width: 480px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--text);
    }

    .cc-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--line);
      font-family: 'Space Mono', monospace;
      font-size: 0.85rem;
      color: var(--gold);
    }

    .cc-modal-close {
      background: none;
      border: none;
      color: var(--text-dim);
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 0.25rem;
    }
    .cc-modal-close:hover { color: var(--text); }

    .cc-modal-body {
      overflow-y: auto;
      padding: 1.25rem;
    }

    .cc-btn {
      font-family: 'Space Mono', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text);
      background: var(--bg-raised);
      border: 1px solid var(--line);
      padding: 0.7rem 1.1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;
    }
    .cc-btn:hover { border-color: var(--blue); color: var(--blue); }

    .cc-gh-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.85rem;
      color: var(--bg);
      background: var(--text);
      border: 1px solid var(--text);
      padding: 0.75rem 1.4rem;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      justify-content: center;
    }
    .cc-gh-btn:hover { opacity: 0.85; }
    .cc-gh-btn svg { width: 18px; height: 18px; fill: currentColor; flex-shrink: 0; }

    .cc-spinner-note {
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 1rem;
      text-align: center;
    }

    .cc-pending-box {
      border: 1px solid var(--gold);
      background: var(--bg-raised);
      border-radius: 6px;
      padding: 1rem 1.1rem;
      margin-top: 1.25rem;
      text-align: left;
    }
    .cc-pending-box .cc-pb-title {
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      font-size: 0.82rem;
      color: var(--gold);
      margin-bottom: 0.4rem;
    }
    .cc-pending-box p { font-size: 0.85rem; line-height: 1.55; color: var(--text-dim); margin: 0; }

    .cc-error-box {
      border: 1px solid var(--red);
      background: var(--bg-raised);
      border-radius: 6px;
      padding: 0.85rem 1.1rem;
      margin-top: 1.25rem;
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    .cc-session-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      border: 1px solid var(--line);
      background: var(--bg-raised);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
    }
    .cc-session-who {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.78rem;
      color: var(--text-dim);
    }
    .cc-session-who img { width: 22px; height: 22px; border-radius: 50%; }
    .cc-session-who strong { color: var(--text); }

    .cc-admin-tag {
      font-family: 'Space Mono', monospace;
      font-size: 0.6rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gold);
      border: 1px solid var(--gold);
      padding: 0.15em 0.5em;
      border-radius: 3px;
    }

    .cc-section-title {
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--gold);
      margin: 1.5rem 0 0.85rem;
    }
    .cc-section-title:first-child { margin-top: 0; }

    .cc-empty {
      font-family: 'Space Mono', monospace;
      font-size: 0.8rem;
      color: var(--text-dim);
      padding: 0.75rem 0;
    }

    .cc-pending-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--line);
    }
    .cc-pending-row:last-child { border-bottom: none; }
    .cc-pending-row .cc-pr-who {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.82rem;
    }
    .cc-pending-row .cc-pr-who img { width: 24px; height: 24px; border-radius: 50%; }
    .cc-pr-actions { display: flex; gap: 0.5rem; }

    .cc-pr-btn {
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.4em 0.75em;
      border-radius: 5px;
      cursor: pointer;
      border: 1px solid var(--line);
      background: var(--bg-raised);
      color: var(--text-dim);
    }
    .cc-pr-btn.approve { border-color: #4CAF50; color: #4CAF50; }
    .cc-pr-btn.approve:hover { background: #4CAF50; color: var(--text); }
    .cc-pr-btn.deny { border-color: var(--red); color: var(--red); }
    .cc-pr-btn.deny:hover { background: var(--red); color: var(--text); }

    .cc-log-row {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--line);
    }
    .cc-log-row:last-child { border-bottom: none; }
    .cc-log-row .cc-log-main { font-family: 'Space Mono', monospace; font-size: 0.78rem; color: var(--text); }
    .cc-log-row .cc-log-main strong { color: var(--blue); }
    .cc-log-row .cc-log-time { font-family: 'Space Mono', monospace; font-size: 0.65rem; color: var(--text-dim); }
  `;
  document.head.appendChild(style);

  // ---------- Inject modal markup ----------

  const overlay = document.createElement('div');
  overlay.className = 'cc-overlay';
  overlay.id = 'ccOverlay';
  overlay.innerHTML = `
    <div class="cc-modal">
      <div class="cc-modal-header">
        <span>Control Center</span>
        <button type="button" class="cc-modal-close" id="ccCloseBtn" aria-label="Close">&times;</button>
      </div>
      <div class="cc-modal-body" id="ccModalBody">
        <div id="ccLockArea">
          <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:1.25rem;">
            Sign in with GitHub to edit the newsletter or manage the site. New accounts need approval from Clock1599.
          </p>
          <button type="button" class="cc-gh-btn" id="ccGithubLoginBtn">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.02 1.93-.02 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>
            Sign in with GitHub
          </button>
          <div class="cc-spinner-note" id="ccSpinnerNote"></div>
        </div>

        <div id="ccSignedInArea" style="display:none;">
          <div class="cc-session-bar">
            <div class="cc-session-who">
              <img id="ccSessionAvatar" src="" alt="">
              <span>Signed in as <strong id="ccSessionUsername"></strong></span>
              <span class="cc-admin-tag" id="ccSessionAdminTag" style="display:none;">Admin</span>
            </div>
            <button type="button" class="cc-btn" id="ccLogoutBtn">Sign out</button>
          </div>

          <div id="ccContributorNote" style="display:none;">
            <p style="font-size:0.85rem; color:var(--text-dim);">
              You're approved. Head to the <a href="newsletter-editor.html" style="color:var(--blue);">newsletter editor</a> to write or edit an article.
            </p>
          </div>

          <div id="ccAdminSection" style="display:none;">
            <div class="cc-section-title">Pending access requests</div>
            <div id="ccPendingList"><div class="cc-empty">Loading&hellip;</div></div>

            <div class="cc-section-title">Activity &mdash; last 7 days</div>
            <button type="button" class="cc-btn" id="ccViewLogsBtn" style="margin-bottom:0.85rem;">Load activity logs</button>
            <div id="ccLogsList"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ---------- Element references ----------

  const lockArea = document.getElementById('ccLockArea');
  const signedInArea = document.getElementById('ccSignedInArea');
  const spinnerNote = document.getElementById('ccSpinnerNote');
  const githubLoginBtn = document.getElementById('ccGithubLoginBtn');
  const logoutBtn = document.getElementById('ccLogoutBtn');
  const sessionAvatar = document.getElementById('ccSessionAvatar');
  const sessionUsername = document.getElementById('ccSessionUsername');
  const sessionAdminTag = document.getElementById('ccSessionAdminTag');
  const contributorNote = document.getElementById('ccContributorNote');
  const adminSection = document.getElementById('ccAdminSection');
  const pendingList = document.getElementById('ccPendingList');
  const viewLogsBtn = document.getElementById('ccViewLogsBtn');
  const logsList = document.getElementById('ccLogsList');
  const closeBtn = document.getElementById('ccCloseBtn');

  // ---------- Modal open/close ----------

  function openModal() {
    overlay.classList.add('open');
  }
  function closeModal() {
    overlay.classList.remove('open');
  }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  // ---------- Wire the footer credit into a button ----------

  function wireFooterButton() {
    const accentSpan = document.querySelector('.site-footer .accent');
    if (!accentSpan) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cc-footer-btn';
    btn.textContent = accentSpan.textContent;
    btn.addEventListener('click', openModal);
    accentSpan.replaceWith(btn);
  }
  wireFooterButton();

  // ---------- Messages ----------

  function showPendingMessage() {
    let box = document.getElementById('ccPendingMessageBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ccPendingMessageBox';
      box.className = 'cc-pending-box';
      box.innerHTML = '<div class="cc-pb-title">Access request sent</div>'
        + '<p>You signed in with GitHub, but this account hasn\'t been approved yet. Clock1599 needs to approve you first. Check back later, or ask them directly.</p>';
      lockArea.appendChild(box);
    }
    openModal();
  }

  function showErrorMessage() {
    let box = document.getElementById('ccErrorMessageBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ccErrorMessageBox';
      box.className = 'cc-error-box';
      box.textContent = 'Something went wrong signing in with GitHub. Please try again.';
      lockArea.appendChild(box);
    }
    openModal();
  }

  // ---------- Login / logout ----------

  githubLoginBtn.addEventListener('click', function () {
    const returnTo = window.location.pathname.split('/').pop() || 'index.html';
    window.location.href = AUTH_ORIGIN + '/login?return_to=' + encodeURIComponent(returnTo);
  });

  logoutBtn.addEventListener('click', async function () {
    try {
      await fetch(AUTH_ORIGIN + '/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore network errors on logout, just reset the UI
    }
    currentUser = null;
    notifyUserChange();
    showSignedOutUI();
  });

  function showSignedOutUI() {
    lockArea.style.display = 'block';
    signedInArea.style.display = 'none';
  }

  function showSignedInUI() {
    lockArea.style.display = 'none';
    signedInArea.style.display = 'block';
  }

  // ---------- Activity logs (admin only) ----------

  function escapeHtmlCC(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function describeLog(entry) {
    const who = '<strong>' + escapeHtmlCC(entry.username || 'unknown') + '</strong>';
    switch (entry.type) {
      case 'login': return who + ' signed in';
      case 'logout': return who + ' signed out';
      case 'access_requested': return who + ' requested access';
      case 'user_approved': return who + ' approved ' + escapeHtmlCC(entry.details || '');
      case 'user_denied': return who + ' denied ' + escapeHtmlCC(entry.details || '');
      case 'draft_saved': return who + ' saved a draft' + (entry.details ? (': "' + escapeHtmlCC(entry.details) + '"') : '');
      case 'published_now': return who + ' published "' + escapeHtmlCC(entry.details || '') + '" immediately';
      case 'published_scheduled': return who + '\u2019s scheduled article "' + escapeHtmlCC(entry.details || '') + '" went live';
      case 'publish_scheduled': return who + ' scheduled "' + escapeHtmlCC(entry.details || '') + '" for next Friday';
      case 'scheduled_publish_cancelled': return who + ' cancelled a scheduled publish';
      case 'publish_failed': return who + '\u2019s publish attempt failed';
      default: return who + ' ' + escapeHtmlCC(entry.type);
    }
  }

  function formatLogTimestamp(ts) {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  async function loadLogs() {
    if (!currentUser || !currentUser.isAdmin) return;
    logsList.innerHTML = '<div class="cc-empty">Loading&hellip;</div>';
    try {
      const res = await fetch(AUTH_ORIGIN + '/logs', { credentials: 'include' });
      const data = await res.json();
      renderLogsList(data.logs || []);
    } catch (e) {
      logsList.innerHTML = '<div class="cc-empty">Could not load activity logs.</div>';
    }
  }

  function renderLogsList(logs) {
    if (!logs.length) {
      logsList.innerHTML = '<div class="cc-empty">No activity in the last 7 days.</div>';
      return;
    }
    logsList.innerHTML = '';
    logs.forEach(function (entry) {
      const row = document.createElement('div');
      row.className = 'cc-log-row';
      const main = document.createElement('div');
      main.className = 'cc-log-main';
      main.innerHTML = describeLog(entry);
      const time = document.createElement('div');
      time.className = 'cc-log-time';
      time.textContent = formatLogTimestamp(entry.timestamp);
      row.appendChild(main);
      row.appendChild(time);
      logsList.appendChild(row);
    });
  }

  viewLogsBtn.addEventListener('click', loadLogs);

  // ---------- Admin approval panel ----------

  async function loadPendingRequests() {
    if (!currentUser || !currentUser.isAdmin) return;
    try {
      const res = await fetch(AUTH_ORIGIN + '/pending', { credentials: 'include' });
      const data = await res.json();
      renderPendingList(data.pending || []);
    } catch (e) {
      pendingList.innerHTML = '<div class="cc-empty">Couldn\'t load pending requests.</div>';
    }
  }

  function renderPendingList(pending) {
    if (!pending.length) {
      pendingList.innerHTML = '<div class="cc-empty">No pending requests right now.</div>';
      return;
    }
    pendingList.innerHTML = '';
    pending.forEach(function (p) {
      const row = document.createElement('div');
      row.className = 'cc-pending-row';

      const who = document.createElement('div');
      who.className = 'cc-pr-who';
      const img = document.createElement('img');
      img.src = p.avatarUrl || '';
      img.alt = '';
      const name = document.createElement('span');
      name.textContent = p.username;
      who.appendChild(img);
      who.appendChild(name);

      const actions = document.createElement('div');
      actions.className = 'cc-pr-actions';
      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'cc-pr-btn approve';
      approveBtn.textContent = 'Approve';
      approveBtn.addEventListener('click', function () {
        respondToRequest(p.username, 'approve');
      });
      const denyBtn = document.createElement('button');
      denyBtn.type = 'button';
      denyBtn.className = 'cc-pr-btn deny';
      denyBtn.textContent = 'Deny';
      denyBtn.addEventListener('click', function () {
        respondToRequest(p.username, 'deny');
      });
      actions.appendChild(approveBtn);
      actions.appendChild(denyBtn);

      row.appendChild(who);
      row.appendChild(actions);
      pendingList.appendChild(row);
    });
  }

  async function respondToRequest(username, action) {
    try {
      await fetch(AUTH_ORIGIN + '/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, action }),
      });
    } catch (e) {
      alert('Could not reach the server. Try again.');
      return;
    }
    loadPendingRequests();
  }

  // ---------- Session check on page load ----------

  async function checkSession() {
    const params = new URLSearchParams(window.location.search);
    const loginStatus = params.get('login');

    if (loginStatus === 'pending') {
      showPendingMessage();
    }
    if (loginStatus === 'error') {
      showErrorMessage();
    }
    if (loginStatus) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    spinnerNote.textContent = 'Checking sign-in status\u2026';
    try {
      const res = await fetch(AUTH_ORIGIN + '/me', { credentials: 'include' });
      const data = await res.json();
      spinnerNote.textContent = '';

      if (!data.loggedIn) {
        currentUser = null;
        showSignedOutUI();
        sessionChecked = true;
        notifyUserChange();
        return;
      }

      currentUser = {
        username: data.username,
        avatarUrl: data.avatarUrl,
        isAdmin: !!data.isAdmin,
      };

      sessionUsername.textContent = currentUser.username;
      sessionAvatar.src = currentUser.avatarUrl || '';
      sessionAdminTag.style.display = currentUser.isAdmin ? 'inline-block' : 'none';

      if (currentUser.isAdmin) {
        adminSection.style.display = 'block';
        contributorNote.style.display = 'none';
        loadPendingRequests();
      } else {
        adminSection.style.display = 'none';
        contributorNote.style.display = 'block';
      }

      showSignedInUI();
    } catch (e) {
      spinnerNote.textContent = 'Could not reach the sign-in server. Check your connection and reload.';
      currentUser = null;
      showSignedOutUI();
    } finally {
      sessionChecked = true;
      notifyUserChange();
    }
  }

  checkSession();
})();
