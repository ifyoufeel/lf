/* Runs before first paint: gates the reveal animations on script, and restores the viewer's saved theme. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  d.setAttribute('data-host-theme', d.getAttribute('data-theme') || '');
  try {
    var t = localStorage.getItem('lf-theme');
    if (t === 'dark' || t === 'light') d.setAttribute('data-theme', t);
  } catch (e) { /* storage blocked: follow the viewer */ }
})();
