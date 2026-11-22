/* AFT Trading Bots: the cart (row E806). One cart on every Trading Bots page, kept in localStorage, opened from the count
   in the top bar (nav.css's bar; the count is added here). It needs no server and holds no key: Whop's plan ids are public.
   - What can be added: each tier, Lifetime, and each released strategy with a price (never a coming-soon one). The prices,
     names and tiers come from data/catalog.js; each item's Whop checkout link from bots-config.js (checkout,
     strategyCheckout), and its plan id is the last part of that link.
   - The rules: a tier takes out the single strategies it already includes, and says so; one tier at a time (a second
     replaces the first); Lifetime is checked out alone (adding it replaces the cart; adding anything to a Lifetime cart asks
     first); when the singles cost at least as much as the lowest tier that holds them all, one line says so with a button to
     switch. With bots-config.js multiCart off, the cart holds one item and says why.
   - Checkout: Whop's embedded checkout (cdn.whop.com elements, loaded only when Checkout is pressed) is mounted in the cart
     panel with every plan in the cart as one charge (items), returning to /trading-bots/thanks/. Items are fixed when it is
     made, so any change to the cart takes it down. If it does not load, each item links to its own Whop checkout.
   - Where it hooks in: the tier cards' buttons and the bar at the bottom of the bots page and the Strategy Library (bots.js
     calls window.AFT_CART.bar after each of its redraws), the strategy cards, the Library's lines and open cards. */
(function () {
  'use strict';

  var KEY = 'aft-bots-cart';
  var PLACED = 'aft-bots-placed';   // row E827: the time a Lifetime order was placed, for the thanks page (used once there)
  var WHOP_JS = 'https://cdn.whop.com/elements/amber/elements.js';
  var THANKS = '/trading-bots/thanks/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function per(it) { return it.t === 'life' ? ' once' : ' a month'; }
  function list(names) { return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]; }

  /* ---------- data: config and catalog (loaded here on pages that do not load them) ---------- */
  function cfg() { return window.AFT_BOTS_CONFIG || null; }
  function cat() { return window.AFT_BOTS_CATALOG || null; }
  function load(src) {
    return new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = ok;
      document.head.appendChild(s);
    });
  }
  var ready = null;
  function data() {
    if (!ready) ready = Promise.all([cfg() ? 0 : load('/trading-bots/bots-config.js'), cat() ? 0 : load('/trading-bots/data/catalog.js')]);
    return ready;
  }
  function link(it) {
    var c = cfg() || {}, m = it.t === 'strat' ? (c.strategyCheckout || {}) : (c.checkout || {});
    var u = m[it.t === 'life' ? 'lifetime' : it.id];
    return typeof u === 'string' && /^https:\/\/whop\.com\/checkout\/plan_[A-Za-z0-9]+\/?$/.test(u) ? u : '';
  }
  function plan(it) { var u = link(it); return u ? u.match(/plan_[A-Za-z0-9]+/)[0] : ''; }
  function multi() { var c = cfg(); return !c || c.multiCart !== false; }
  // Row E832: the free trial's length (bots-config.js trialDays; BRAND-62). Every monthly item starts with it; Lifetime has none.
  function trialDays() { var c = cfg(), d = c && c.trialDays; return typeof d === 'number' && d > 0 ? Math.floor(d) : 0; }
  function tiers() { return ((cat() || {}).tiers || []).slice().sort(function (a, b) { return a.rank - b.rank; }); }
  function tierById(id) { return tiers().filter(function (t) { return t.id === id; })[0] || null; }
  function strat(slug) { return ((cat() || {}).strategies || []).filter(function (s) { return s && s.slug === slug; })[0] || null; }
  // A strategy's tier, as bots.js places it: a grade that is set decides it (1 the top tier, 4 the lowest)
  function tierOf(s) {
    var ts = tiers();
    if (s && [1, 2, 3, 4].indexOf(s.grade) >= 0 && ts[ts.length - s.grade]) return ts[ts.length - s.grade].id;
    return s && tierById(s.tier) ? s.tier : null;
  }
  function sellable(s) { return !!s && s.named === true && s.coming_soon !== true && typeof s.price === 'number' && s.price > 0 && !!link({ t: 'strat', id: s.slug }); }
  function rankOf(it) {
    if (it.t === 'tier') { var t = tierById(it.id); return t ? t.rank : 0; }
    if (it.t === 'strat') { var tr = tierById(tierOf(strat(it.id))); return tr ? tr.rank : Infinity; }
    return Infinity;
  }
  // An item as the cart shows it. The catalog's name and price win over the copy kept with the item.
  function fresh(it) {
    var o = { t: it.t, id: it.id, name: it.name, price: it.price };
    if (it.t === 'tier') { var t = tierById(it.id); if (t) { o.name = t.name; o.price = t.price; } }
    if (it.t === 'strat') { var s = strat(it.id); if (s) { o.name = s.name; o.price = s.price; } }
    return o;
  }
  function valid(it) {
    if (!it || ['tier', 'strat', 'life'].indexOf(it.t) < 0) return false;
    if (!cat() || !cfg()) return typeof it.name === 'string' && typeof it.price === 'number';
    if (it.t === 'tier') return !!tierById(it.id) && !!link(it);
    if (it.t === 'strat') return sellable(strat(it.id));
    return cfg().lifetime === true && !!link(it) && typeof it.price === 'number';
  }

  /* ---------- the cart itself ---------- */
  var cart = [];
  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); cart = v && Array.isArray(v.items) ? v.items.filter(valid).map(fresh) : []; }
    catch (e) { cart = cart.filter(valid).map(fresh); }   // private mode: the cart lives for this page only
  }
  function write() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, items: cart })); } catch (e) { /* ignore */ } }
  function has(t, id) { return cart.some(function (x) { return x.t === t && (t === 'life' || x.id === id); }); }
  function tierIn() { return cart.filter(function (x) { return x.t === 'tier'; })[0] || null; }
  function lifeIn() { return has('life'); }
  // What already holds a strategy: the tier in the cart that includes it, or Lifetime
  function holder(slug) {
    if (lifeIn()) return 'Lifetime';
    var t = tierIn(), s = strat(slug), r = rankOf({ t: 'strat', id: slug });
    return t && s && rankOf(t) >= r ? t.name : '';
  }
  function total() { return cart.reduce(function (a, x) { return a + x.price; }, 0); }
  // The lowest tier that holds every single in the cart (and the tier in it), when it costs no more than the cart
  function cheaper() {
    if (lifeIn() || !multi()) return null;
    var singles = cart.filter(function (x) { return x.t === 'strat'; });
    if (!singles.length) return null;
    var need = Math.max.apply(null, cart.map(rankOf));
    var t = tiers().filter(function (x) { return x.rank === need; })[0];
    if (!t || !link({ t: 'tier', id: t.id }) || has('tier', t.id) || t.price > total()) return null;
    return t;
  }

  var note = '', ask = null;     // the one line about the last change; a pending question (Lifetime)
  function add(it, fromPanel) {
    it = fresh(it);
    note = ''; ask = null;
    if (it.t === 'strat') {
      if (has('strat', it.id)) { open(); return; }
      var h = lifeIn() ? '' : holder(it.id);   // Lifetime holds every strategy too, but the rule for it is to ask (below)
      if (h) { note = it.name + ' is already in ' + h + ', in your cart.'; open(); return; }
    }
    if (!multi()) {
      if (cart.length && !(cart.length === 1 && cart[0].t === it.t && cart[0].id === it.id)) note = 'Checkout takes one item at a time for now, so ' + it.name + ' replaced ' + cart[0].name + '.';
      cart = [it];
    } else if (it.t === 'life') {
      if (cart.length) note = 'Lifetime is checked out on its own, so it replaced the rest of your cart.';
      cart = [it];
    } else if (lifeIn()) {
      ask = it;
      open();
      return draw();
    } else if (it.t === 'tier') {
      var old = tierIn(), out = cart.filter(function (x) { return x.t === 'strat' && rankOf(x) <= rankOf(it); });
      var parts = [];
      if (old && old.id !== it.id) parts.push(it.name + ' replaced ' + old.name + ': one plan at a time');
      if (out.length) parts.push(it.name + ' includes ' + list(out.map(function (x) { return x.name; })) + ', so ' + (out.length > 1 ? 'they came' : 'it came') + ' out of your cart');
      if (parts.length) note = parts.join('. ') + '.';
      cart = cart.filter(function (x) { return x.t !== 'tier' && out.indexOf(x) < 0; }).concat([it]);
    } else {
      cart.push(it);
    }
    write();
    draw();
    announce(it.name + ' added to your cart.');
    if (note || cheaper() || fromPanel) open();
    else bump();
  }
  function remove(i) { note = ''; ask = null; cart.splice(i, 1); write(); draw(); }
  function clear() { cart = []; note = ''; ask = null; write(); draw(); }

  /* ---------- the count in the top bar ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 7h12l-1.2 12.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var tb = $('.tbn .tbn-in'), countBtn = null;
  if (tb) {
    tb.classList.add('has-cart');
    var menu = $('.tbn-btn', tb);   // before the Menu button, so under 960 px it sits beside it at the right
    (menu || tb).insertAdjacentHTML(menu ? 'beforebegin' : 'beforeend', '<button class="tbn-cart" type="button" aria-haspopup="dialog" aria-controls="crt-panel" aria-label="Cart">' + ICON + '<span class="tbn-cart-n" aria-hidden="true">0</span></button>');
    countBtn = $('.tbn-cart', tb);
    countBtn.addEventListener('click', function () { open(countBtn); });
  }
  function bump() {
    if (!countBtn) return;
    countBtn.classList.remove('is-bump');
    void countBtn.offsetWidth;
    countBtn.classList.add('is-bump');
  }

  /* ---------- the panel ---------- */
  document.body.insertAdjacentHTML('beforeend',
    '<div class="crt-back" id="crt-back" hidden></div>' +
    '<aside class="crt" id="crt-panel" role="dialog" aria-modal="true" aria-labelledby="crt-h" hidden>' +
      '<div class="crt-head"><h2 class="crt-h" id="crt-h" tabindex="-1">Your cart</h2>' +
      '<button class="crt-x" type="button" id="crt-x" aria-label="Close the cart"><span aria-hidden="true">&times;</span></button></div>' +
      '<div class="crt-body" id="crt-body"></div>' +
    '</aside>' +
    '<p class="crt-vh" id="crt-live" aria-live="polite"></p>');
  var panel = $('#crt-panel'), back = $('#crt-back'), body = $('#crt-body'), live = $('#crt-live');
  var opener = null, mode = 'cart';
  function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
  function open(from) {
    if (from && from.nodeType === 1) opener = from;
    else if (!opener) opener = document.activeElement;
    data().then(draw);
    panel.hidden = false; back.hidden = false;
    document.documentElement.classList.add('crt-lock');
    $('#crt-h').focus({ preventScroll: true });
  }
  function close() {
    if (panel.hidden) return;
    takeDown();
    panel.hidden = true; back.hidden = true;
    document.documentElement.classList.remove('crt-lock');
    note = ''; ask = null; draw();
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  $('#crt-x').addEventListener('click', close);
  back.addEventListener('click', close);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); close(); }
  }, true);
  // Row E816: while the cart is open, keyboard focus stays in it. Tab from its last control goes to its first and Shift+Tab
  // from its first (or its heading) to its last; focus that lands outside it (out of Whop's checkout frame, say) comes back
  // to its first control. Closing it returns focus to the control that opened it (close(), above).
  var STOPS = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';
  function stops() { return $$(STOPS, panel).filter(function (x) { return x.getClientRects().length > 0 && !x.closest('[hidden]'); }); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || panel.hidden) return;
    var s = stops(), a = document.activeElement, h = $('#crt-h');
    if (!s.length) { e.preventDefault(); h.focus({ preventScroll: true }); return; }
    if (e.shiftKey && (a === s[0] || a === h || !panel.contains(a))) { e.preventDefault(); s[s.length - 1].focus({ preventScroll: true }); }
    else if (!e.shiftKey && (a === s[s.length - 1] || !panel.contains(a))) { e.preventDefault(); s[0].focus({ preventScroll: true }); }
  });
  document.addEventListener('focusin', function (e) {
    if (panel.hidden || panel.contains(e.target)) return;
    var s = stops();
    (s[0] || $('#crt-h')).focus({ preventScroll: true });
  });

  function itemSub(x) {
    if (x.t === 'life') return 'Every strategy in every plan, paid once';
    if (x.t === 'tier') return 'Monthly plan';   // row E811: the catalog's line named tiers
    var tr = tierById(tierOf(strat(x.id)));
    return 'Strategy' + (tr ? ' · ' + tr.name : '');   // row E811: the plan it comes in; row E827: the plan alone
  }
  var BILLING = {
    month: 'Billed monthly through Whop. You can cancel any time in your Whop account. No refunds once charged. Every figure on these pages is a hypothetical backtest, and trading futures involves substantial risk of loss.',
    life: 'Lifetime is one payment by bank transfer or wire through Whop (no card), with no monthly charge. No refunds once charged. Every figure on these pages is a hypothetical backtest, and trading futures involves substantial risk of loss.'
  };
  // Row E832: by the checkout button of a monthly cart, BRAND-62's full statement with the cart's own monthly sum; a Lifetime
  // cart keeps its own words (it has no trial)
  function terms() {
    if (lifeIn()) return BILLING.life;
    var d = trialDays();
    if (!d) return BILLING.month;
    return d + '-day free trial. Cancel inside the ' + d + ' days and you\'re never charged. After that, ' + money(total()) + ' a month until you cancel. No refunds once charged. ' +
      'You can cancel any time in your Whop account. Every figure on these pages is a hypothetical backtest, and trading futures involves substantial risk of loss.';
  }
  function fallback() {
    return '<div class="crt-fb" id="crt-fb" hidden><p>Checkout did not load here. Check out each item on Whop instead:</p><ul>' +
      cart.map(function (x) {
        return '<li><a class="crt-fb-a" href="' + esc(link(x)) + '" data-ev="checkout" data-kind="purchase" data-name="bots-cart-whop-' + esc(x.t === 'life' ? 'lifetime' : x.id) + '" data-value="' + x.price + '" rel="noopener" target="_blank">' +
          esc(x.name) + ' · ' + esc(money(x.price) + per(x)) + '</a></li>';
      }).join('') + '</ul></div>';
  }
  function draw() {
    var n = cart.length;
    if (countBtn) {
      $('.tbn-cart-n', countBtn).textContent = String(n);
      countBtn.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' item' : ' items'));
      countBtn.classList.toggle('has-items', n > 0);
    }
    marks();
    bar();
    if (mode === 'checkout') return;
    var h = '';
    if (note) h += '<p class="crt-note" role="status">' + esc(note) + '</p>';
    if (ask) h += '<div class="crt-ask" role="alert"><p>Lifetime already includes ' + esc(ask.name) + ', and it is checked out on its own. Replace Lifetime with ' + esc(ask.name) + '?</p>' +
      '<p class="crt-ask-b"><button class="crt-btn crt-btn-red" type="button" data-crt="replace">Replace Lifetime</button><button class="crt-btn" type="button" data-crt="keep">Keep Lifetime</button></p></div>';
    if (!multi() && !note) h += '<p class="crt-one">Checkout takes one item at a time for now.</p>';
    if (!n) {
      body.innerHTML = h + '<p class="crt-empty">Your cart is empty. Add a plan or a strategy.</p>' +
        '<p class="crt-links"><a href="/trading-bots/#plans">See the plans</a><a href="/trading-bots/strategies/">Strategy Library</a></p>';
      return;
    }
    h += '<ul class="crt-items">' + cart.map(function (x, i) {
      return '<li class="crt-item"><div class="crt-item-t"><b>' + esc(x.name) + '</b><small>' + esc(itemSub(x)) + '</small></div>' +
        '<span class="crt-item-p">' + esc(money(x.price)) + '<small>' + esc(per(x)) + '</small></span>' +
        '<button class="crt-rm" type="button" data-crt="rm" data-i="' + i + '" aria-label="Remove ' + esc(x.name) + '">Remove</button></li>';
    }).join('') + '</ul>';
    var c = cheaper();
    if (c) {
      var saved = total() - c.price;
      h += '<div class="crt-tip"><p>' + esc(c.name) + ' includes ' + (n > 1 ? 'all of these' : 'it') + ' for ' + esc(money(c.price)) + ' a month' + (saved > 0 ? ', ' + esc(money(saved)) + ' less' : '') + '.</p>' +
        '<button class="crt-btn" type="button" data-crt="switch" data-id="' + esc(c.id) + '">Switch to ' + esc(c.name) + '</button></div>';
    }
    var life = lifeIn(), td = life ? 0 : trialDays();
    // row E832: a monthly cart starts with the free trial: $0 is due today, and the monthly sum is charged after the trial
    h += (td ? '<p class="crt-total crt-today"><span>Due today</span><b>' + esc(money(0)) + '</b></p>' +
        '<p class="crt-total crt-after"><span>After the ' + td + ' days</span><b>' + esc(money(total())) + '<small> a month</small></b></p>'
      : '<p class="crt-total"><span>' + (life ? 'Total' : 'Monthly total') + '</span><b>' + esc(money(total())) + '<small>' + (life ? ' once' : ' a month') + '</small></b></p>') +
      // row E827 item 14: every bots plan and Lifetime collects tax on top of its price (Whop, exclusive tax)
      '<p class="crt-sum">Prices do not include sales tax. Whop adds any tax that applies and shows the final amount before you pay.</p>' +
      '<a class="crt-btn crt-btn-red crt-go" href="' + esc(link(cart[0])) + '" data-ev="checkout" data-kind="purchase" data-name="bots-cart-checkout" data-value="' + total() + '" role="button">Checkout</a>' +
      '<p class="crt-fine">' + esc(terms()) + '</p>';
    body.innerHTML = h;
  }

  /* ---------- Whop's embedded checkout ---------- */
  var handle = null, el = null, failTimer = null, whopLoad = null;
  function whop() {
    if (window.WhopElements) return Promise.resolve(window.WhopElements);
    if (!whopLoad) whopLoad = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = WHOP_JS; s.setAttribute('data-whop-elements', '');
      s.onerror = function () { whopLoad = null; no(new Error('script')); };
      s.onload = function () {
        var n = 0;
        (function wait() { if (window.WhopElements) ok(window.WhopElements); else if (++n > 100) no(new Error('no WhopElements')); else setTimeout(wait, 100); })();
      };
      document.head.appendChild(s);
    });
    return whopLoad;
  }
  function takeDown() {
    clearTimeout(failTimer);
    try { if (el) el.destroy(); } catch (e) { /* gone */ }
    try { if (handle) handle.destroy(); } catch (e) { /* gone */ }
    el = handle = null;
    if (mode === 'checkout') { mode = 'cart'; panel.classList.remove('is-pay'); $('#crt-h').textContent = 'Your cart'; }
  }
  function fail() {
    clearTimeout(failTimer);
    var fb = $('#crt-fb'), ld = $('#crt-load');
    if (fb) fb.hidden = false;
    if (ld) ld.hidden = true;
  }
  function pay() {
    if (!cart.length) return;
    var items = cart.map(function (x) { return { plan: plan(x), quantity: 1 }; });
    if (items.some(function (x) { return !x.plan; })) return;
    mode = 'checkout';
    panel.classList.add('is-pay');
    body.innerHTML = '<p class="crt-paybar"><button class="crt-back-b" type="button" data-crt="back">‹ Back to cart</button><span>' + cart.length + (cart.length === 1 ? ' item' : ' items') + ' · ' + esc(lifeIn() ? money(total()) + ' once' : (trialDays() ? trialDays() + ' days free, then ' : '') + money(total()) + ' a month') + '</span></p>' +
      '<p class="crt-load" id="crt-load">Loading Whop’s secure checkout…</p>' +
      '<div class="crt-embed" id="crt-embed"></div>' + fallback() +
      '<p class="crt-fine">' + esc(terms()) + '</p>';
    $('#crt-h').textContent = 'Checkout';
    failTimer = setTimeout(fail, 25000);
    var life = lifeIn();   // row E815: fixed with the checkout's items
    whop().then(function (W) {
      if (mode !== 'checkout') return;
      handle = W({ appearance: { theme: { appearance: 'dark', accentColor: 'red' } } }).checkout.create({
        items: items,
        // row E815 (E814 F2): Lifetime is paid by bank wire, so a finished Lifetime checkout has paid nothing yet: the thanks
        // page is told the order is pending (its wire block); a monthly cart is paid.
        returnUrl: location.origin + THANKS + (life ? '?status=pending' : ''),
        onComplete: function (p) {
          // row E832 (addendum A): Whop's docs name the results that stand when a checkout completes (payment,
          // waitlist_entry, setup) and none for the start of a free trial, which takes no payment. So every completion
          // leaves the cart, whatever its result, unless that result is an error or a cancel (the docs fire onComplete
          // only for a result that stands; the guard is for a result they do not list).
          var res = p && p.result != null ? String(p.result) : '';
          if (/^(error|failed|cancel|canceled|cancelled)$/i.test(res)) return;
          // row E827: a placed order leaves the cart either way, so a Lifetime order is not an unpaid item on a later visit.
          // A Lifetime order also leaves its time (PLACED) for the thanks page, which shows the wire block from it once.
          // Whop calls this before it takes the tab to returnUrl (docs.whop.com, the embedded checkout's onComplete).
          if (life) { try { localStorage.setItem(PLACED, String(Date.now())); } catch (e) { /* ignore */ } }
          clear();
          // Whop takes the tab to returnUrl itself; this only covers a checkout that stays on its own success view
          setTimeout(function () { location.assign(THANKS + (life ? '?status=pending' : '?status=succeeded')); }, 4000);
        }
      });
      el = handle.create('checkout', {
        onReady: function () { clearTimeout(failTimer); var ld = $('#crt-load'); if (ld) ld.hidden = true; },
        onError: function () { fail(); }
      });
      el.mount('#crt-embed');
    }).catch(fail);
  }

  /* ---------- clicks: the panel, and every Add to cart on the pages ---------- */
  function itemFrom(b) { return itemOf(b.getAttribute('data-crt-t'), b.getAttribute('data-crt-id')); }
  function itemOf(t, id) {
    if (t === 'strat') { var s = strat(id); return s && sellable(s) ? { t: 'strat', id: id, name: s.name, price: s.price } : null; }
    if (t === 'tier') { var tr = tierById(id); return tr && link({ t: 'tier', id: id }) ? { t: 'tier', id: id, name: tr.name, price: tr.price } : null; }
    if (t === 'life') { var card = $('.bx-plan[data-plan="lifetime"]'), p = card ? Number(card.getAttribute('data-price')) : NaN; return p > 0 && link({ t: 'life' }) ? { t: 'life', id: 'lifetime', name: 'Lifetime', price: p } : null; }
    return null;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-crt],.bx-choose,#bar-btn[data-act^="cart"],#bar-alt[data-act^="cart"]') : null;
    if (!b) return;
    // the tier cards' buttons and the bar's cart buttons are the cart's: bots.js's own listeners on them do not run
    if (b.classList.contains('bx-choose')) {
      var id = b.getAttribute('data-choose'), it = itemOf(id === 'lifetime' ? 'life' : 'tier', id);
      if (!it) return;   // no checkout link for it: bots.js keeps the button as it was
      e.preventDefault(); e.stopPropagation();
      if (inCart(it)) open(b); else { opener = b; add(it); }
      return;
    }
    if (b.id === 'bar-btn' || b.id === 'bar-alt') {
      e.preventDefault(); e.stopPropagation();
      if (b.getAttribute('data-act') === 'cart') open(b);
      else { var bi = itemFrom(b); if (bi) { opener = b; add(bi); } }
      return;
    }
    var act = b.getAttribute('data-crt');
    if (act === 'add') {
      e.preventDefault();
      var ai = itemFrom(b);
      if (ai) { if (inCart(ai)) open(b); else { opener = b; add(ai); } }
    } else if (act === 'rm') { remove(Number(b.getAttribute('data-i'))); $('#crt-h').focus({ preventScroll: true }); }
    else if (act === 'switch') { var st = tierById(b.getAttribute('data-id')); if (st) add({ t: 'tier', id: st.id, name: st.name, price: st.price }, true); }
    else if (act === 'replace') { var r = ask; ask = null; cart = []; if (r) add(r, true); }
    else if (act === 'keep') { ask = null; note = ''; draw(); }
    else if (act === 'back') { takeDown(); draw(); $('#crt-h').focus({ preventScroll: true }); }
  }, true);
  // Checkout: the link opens the hosted checkout of the first item only if this script is not running; here it mounts the embed
  document.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('a.crt-go') : null;
    if (!g) return;
    e.preventDefault();
    pay();
  });
  function inCart(it) { return it.t === 'life' ? lifeIn() : has(it.t, it.id); }

  /* ---------- the Add to cart buttons on the pages ---------- */
  function addBtn(s, cls) {
    return '<button class="crt-add ' + cls + '" type="button" data-crt="add" data-crt-t="strat" data-crt-id="' + esc(s.slug) + '"></button>';
  }
  function label(b) {
    var t = b.getAttribute('data-crt-t'), id = b.getAttribute('data-crt-id'), s = strat(id), small = b.classList.contains('crt-add-sm');
    if (t !== 'strat' || !s) return;
    var h = holder(id), inc = has('strat', id);
    b.classList.toggle('is-in', inc || !!h);
    put(b, inc ? 'In cart ✓' : (h ? 'In ' + h + ' ✓' : (small ? 'Add to cart' : 'Add to cart · ' + money(s.price) + ' a month')),
      inc ? s.name + ' is in your cart. Open the cart' : (h ? s.name + ' is included in ' + h + ', in your cart. Open the cart' : 'Add ' + s.name + ' to your cart, ' + money(s.price) + ' a month'));
  }
  // writes only what changed, so the Library's watcher on its table is not woken by these writes
  function put(b, text, aria) {
    if (b.textContent !== text) b.textContent = text;
    if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
  }
  function marks() {
    $$('.crt-add[data-crt-t="strat"]').forEach(label);
    $$('.bx-choose').forEach(function (b) {
      var id = b.getAttribute('data-choose'), it = id === 'lifetime' ? { t: 'life' } : { t: 'tier', id: id };
      var on = inCart(it), card = b.closest('.bx-plan');
      if (it.t === 'tier' && !link(it)) return;
      if (it.t === 'life' && !link(it)) return;
      var nm = id === 'lifetime' ? 'Lifetime' : (tierById(id) || {}).name;
      put(b, on ? 'In cart ✓' : 'Add to cart', on ? nm + ' is in your cart. Open the cart' : 'Add ' + nm + ' to your cart');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (card) card.classList.toggle('is-chosen', on);
    });
  }
  // The bots page's strategy cards: each card is a link, so its button sits under it in a wrapper of its own
  function decorateGrid() {
    $$('#strat-grid > a.bx-strat[data-slug]').forEach(function (a) {
      var s = strat(a.getAttribute('data-slug'));
      var w = document.createElement('div');
      w.className = 'crt-cardw';
      a.parentNode.insertBefore(w, a);
      w.appendChild(a);
      if (sellable(s)) w.insertAdjacentHTML('beforeend', addBtn(s, 'crt-add-card'));
    });
  }
  // The Strategy Library: a button under each line's price and in each open card (strategies.js redraws both)
  function decorateLibrary() {
    $$('#rows tr.bx-row[data-slug]').forEach(function (tr) {
      var td = $('.bx-c-price', tr), s = strat(tr.getAttribute('data-slug')), slot = td && $('.crt-slot', td);
      if (slot) slot.parentNode.removeChild(slot);   // row E827: the room strategies.js kept for the button
      if (td && sellable(s) && !$('.crt-add', td)) td.insertAdjacentHTML('beforeend', addBtn(s, 'crt-add-sm'));
    });
    $$('#rows .bx-c-buy').forEach(function (box) {
      var tr = box.closest('tr.bx-det'), row = tr && tr.previousElementSibling, s = row && strat(row.getAttribute('data-slug'));
      if (sellable(s) && !$('.crt-add', box)) box.innerHTML = addBtn(s, 'crt-add-open');
    });
    marks();
  }

  /* ---------- the bar at the bottom of the bots page and the Library ---------- */
  function setBar(btn, act, text, slug) {
    btn.textContent = text;
    btn.setAttribute('data-act', act);
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('rel');
    if (slug) { btn.setAttribute('data-crt-t', 'strat'); btn.setAttribute('data-crt-id', slug); }
    else { btn.removeAttribute('data-crt-t'); btn.removeAttribute('data-crt-id'); }
    if (btn.tagName === 'A') { btn.setAttribute('href', act === 'tiers' ? '#plans' : '#cart'); btn.setAttribute('role', 'button'); }
  }
  var openSlug = null;
  function bar(slug) {
    if (arguments.length) openSlug = slug || null;
    var b = $('#bar'), plan = $('#bar-plan'), det = $('#bar-detail'), price = $('#bar-price'), main = $('#bar-btn'), alt = $('#bar-alt');
    if (!b || !plan || !main || !alt) return;
    var n = cart.length, s = openSlug ? strat(openSlug) : null, two = false;
    var canAdd = s && sellable(s) && !has('strat', s.slug) && !holder(s.slug);
    b.classList.toggle('has-sel', n > 0);
    alt.hidden = true;
    if (n) {
      plan.textContent = list(cart.map(function (x) { return x.name; }));
      price.hidden = false;
      price.innerHTML = esc(money(total())) + '<small>' + (lifeIn() ? 'once' : 'a month') + '</small>';
    } else {
      plan.textContent = 'Your cart is empty';
      price.hidden = true;
    }
    if (s && sellable(s)) {
      det.textContent = has('strat', s.slug) ? '✓ ' + s.name + ' is in your cart'
        : (holder(s.slug) ? '✓ ' + s.name + ' is in ' + holder(s.slug) + ', in your cart' : s.name + ' · ' + money(s.price) + ' a month');
    } else {
      det.textContent = n ? n + (n === 1 ? ' item' : ' items') + ' · ' + money(total()) + (lifeIn() ? ' once' : ' a month') : 'Add a plan or a strategy';
    }
    if (canAdd) {
      setBar(main, 'cart-add', 'Add to cart', s.slug);
      if (n) { setBar(alt, 'cart', 'View cart'); alt.hidden = false; two = true; }
    } else if (n) {
      setBar(main, 'cart', 'View cart');
    } else {
      setBar(main, 'tiers', 'See plans');   // as before: bots.js scrolls to the plans
    }
    document.body.classList.toggle('bx-bar-two', two);
  }

  /* ---------- start ---------- */
  window.AFT_CART = { bar: bar, add: add, open: open, clear: clear };
  read();
  // Row E832: the pages' own sentences carry the trial's length in <span data-trial-days>, set here from bots-config.js
  function fillTrial() { var d = trialDays(); if (d) $$('[data-trial-days]').forEach(function (el) { if (el.textContent !== String(d)) el.textContent = String(d); }); }
  data().then(function () {
    fillTrial();
    read();
    if ($('#strat-grid')) decorateGrid();
    var rows = $('#rows');
    if (rows) {
      decorateLibrary();
      if (window.MutationObserver) new MutationObserver(function () { decorateLibrary(); }).observe(rows, { childList: true, subtree: true });
    }
    var sh = $('#sheet');
    if (sh && !sh.hidden) { try { openSlug = decodeURIComponent(location.hash.slice(1)) || null; } catch (e) { openSlug = null; } }
    draw();
    if (location.hash === '#cart') { history.replaceState(null, '', location.pathname + location.search); open(); }
  });
  draw();
  // another tab changed the cart
  window.addEventListener('storage', function (e) { if (e.key === KEY) { read(); takeDown(); draw(); } });
})();
