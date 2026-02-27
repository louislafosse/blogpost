// SPA redirect for GitHub Pages — moves the current path into a query param
// so index.html + spa-redirect.js can restore it via history.replaceState
(function () {
  var pathSegments = window.location.pathname.split('/');
  var base = '/';
  if (pathSegments.length > 1 && pathSegments[1] !== '') {
    base = '/' + pathSegments[1] + '/';
  }
  var redirect =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (window.location.port ? ':' + window.location.port : '') +
    base +
    '?p=' +
    encodeURIComponent(
      '/' + pathSegments.slice(2).join('/') + window.location.search + window.location.hash
    );
  window.location.replace(redirect);
})();
