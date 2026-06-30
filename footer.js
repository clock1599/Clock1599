(function () {
  var AUTH_ORIGIN = "https://auth.clock1599-official.workers.dev";

  function render(versionText) {
    var versionHtml = versionText
      ? ' <span class="footer-version">&middot; ' + versionText + '</span>'
      : '';

    var html =
      '<footer class="site-footer">' +
        'The New Brass Rail Transit Authority &middot; Maintained by <span class="accent">Clock1599</span>' +
        versionHtml +
      '</footer>';

    var placeholder = document.getElementById('site-footer');
    if (placeholder) {
      placeholder.outerHTML = html;
    }
  }

  function loadVersion() {
    fetch(AUTH_ORIGIN + '/version')
      .then(function (res) { return res.ok ? res.json() : { version: null }; })
      .then(function (data) {
        var v = data && data.version && data.version.number;
        render(v || null);
      })
      .catch(function () {
        render(null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVersion);
  } else {
    loadVersion();
  }
})();
