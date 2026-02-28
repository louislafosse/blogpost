// SPA redirect for GitHub Pages — always redirects to /?p=<path> at the root
(function () {
  var l = window.location;
  l.replace(
    l.protocol + '//' + l.host + '/?p=' +
    encodeURIComponent(l.pathname + l.search + l.hash)
  );
})();
