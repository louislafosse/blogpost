// Recover path encoded by 404.html for SPA routing on GitHub Pages
(function () {
  var search = window.location.search;
  if (search && search.indexOf('?p=') === 0) {
    var p = decodeURIComponent(search.slice(3));
    var base = window.location.pathname.replace(/\/$/, '');
    window.history.replaceState(null, null, base + p || '/');
  }
})();
