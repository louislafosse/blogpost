// Recover path encoded by 404-redirect.js for SPA routing on GitHub Pages
(function () {
  var search = window.location.search;
  if (search && search.indexOf('?p=') === 0) {
    var p = decodeURIComponent(search.slice(3));
    window.history.replaceState(null, null, p || '/');
  }
})();
