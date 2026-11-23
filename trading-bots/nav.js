/* AFT Trading Bots: the top bar's Menu button (row E804), on every page of the section. Under 1040 px the button
   opens the bar's six links in a panel under the bar (nav.css shows the panel while aria-expanded is "true").
   It closes on a link tap, on Escape (focus goes back to the button), on a tap or focus outside the bar, when the
   screen widens past the phone layout, and when a page comes back from the browser's back-forward cache. */
(function () {
  var bar = document.querySelector('header.tbn');
  if (!bar) return;
  var btn = bar.querySelector('.tbn-btn'), menu = bar.querySelector('.tbn-links');
  if (!btn || !menu) return;

  function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
  function set(open) { btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }

  btn.addEventListener('click', function () { set(!isOpen()); });
  menu.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) { set(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (isOpen() && !bar.contains(e.target)) set(false);
  });
  bar.addEventListener('focusout', function (e) {
    if (isOpen() && e.relatedTarget && !bar.contains(e.relatedTarget)) set(false);
  });
  window.addEventListener('pageshow', function () { set(false); });
  var wide = window.matchMedia('(min-width: 1040px)');
  function onWide() { if (wide.matches) set(false); }
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);
})();
