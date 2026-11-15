/* AFT Trading Bots storefront: page script.
   No tracking of its own and no network call beyond this folder's own data files.
   - What is on the page comes from two small files: bots-config.js (the Lifetime plan, the set-up guide link,
     each tier's checkout link) and data/catalog.js (which strategies are named, and in which tier).
     A strategy that is not named there is not on the page; its tier shows the unnamed line instead.
   - Tiers and the selection bar: one choice, kept in localStorage. Tiers are bundles: each higher tier
     includes the ones below it (data-rank on each tier card). A tier with no checkout link yet shows
     "Opening soon" in the bar, and that button does nothing.
   - A tier's list: one row per named strategy, each on one line. A list longer than SHOW rows shows SHOW
     and a "Show all <count>" button that opens the rest in place. While an opened list is on screen and its
     card's own Choose button is not, the bar offers that tier.
   - The open strategy: every strategy name is a real link (#slug). The hash opens the view in place,
     Back or Close returns to the same spot, and the choice in the bar is never lost. While a strategy
     is open the bar also carries the button that chooses that strategy's tier, so one bar is pinned, not two.
   - Performance: drawn from data/<slug>.json (schema aft.strategy-performance/1, written by the importer).
     The four figures are printed exactly as the file's display strings give them. First screen: the chart,
     the four-figure bar and the monthly P&L. What it is, the test, the other figures and the proof scroll below. */
(function () {
  'use strict';

  var CFG = window.AFT_BOTS_CONFIG || {};
  var CAT = window.AFT_BOTS_CATALOG || {};
  var LINKS = CFG.checkout || {};
  var KEY = 'aft-bots-tier';
  var MINUS = '−';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- formatting ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function usd(n, signed, cents) {
    var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents === false ? 0 : 2, maximumFractionDigits: cents === false ? 0 : 2 });
    return (n < 0 ? MINUS : (signed ? '+' : '')) + '$' + abs;
  }
  function tone(n) { return n < 0 ? 'bx-neg' : (n > 0 ? 'bx-pos' : ''); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(iso) { var p = String(iso).split('-'); return MON[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0]; }
  function month(ym) { var p = ym.split('-'); return MON[Number(p[1]) - 1] + ' ' + p[0]; }
  function priceWords(p) { return '$' + p.price.toLocaleString('en-US') + (p.kind === 'lifetime' ? ' once' : ' a month'); }
  function colour(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)); }
  // The lettering ladder (bots.css): the LEVEL is the strategy's tier, the PALETTE is the strategy's own
  // three colours. Both come from the catalog, so moving a strategy to another tier there changes its
  // lettering everywhere on the page with no style edit.
  function palette(s) {          // [custom property, value] pairs for one name
    var g = s.lettering, out = [['--n', String(String(s.name).length)]];
    if (g && g.length === 3 && g.every(colour)) {
      out.push(['--c0', g[0]], ['--c1', g[1]], ['--c2', g[2]]);
    }
    return out;
  }
  function lettering(s) {        // the attributes that letter a name: its level and its palette
    return ' data-lvl="' + esc(s.tier) + '" style="' + palette(s).map(function (p) { return p[0] + ':' + p[1]; }).join(';') + '"';
  }
  // The sheen on a Supreme name (bots.css): an empty element over the name that carries the name again as data,
  // hidden from screen readers and from selection. It goes on a name only when the strategy's tier is supreme.
  function sheen(s) {
    return s.tier === 'supreme' ? '<span class="bx-sh" aria-hidden="true" data-t="' + esc(s.name) + '"></span>' : '';
  }

  /* ---------- the page's switches ---------- */
  // The one-time plan: built here and added to the page only when the config switches it on,
  // so with the switch off nothing about it is in the page at all.
  if (CFG.lifetime === true) {
    var grid = $('#plan-grid');
    if (grid) {
      grid.insertAdjacentHTML('afterend',
        '<article class="bx-plan bx-life" data-plan="lifetime" data-name="Lifetime" data-price="10000" data-kind="lifetime" data-rank="3">' +
        '<div class="bx-life-main"><header><h3>Lifetime</h3>' +
        '<p class="bx-plan-for">Pay once. Everything in Supreme, with no monthly payment.</p></header>' +
        '<ul class="bx-life-strats" data-life-list aria-label="Strategies named so far"></ul></div>' +
        '<div class="bx-life-buy"><p class="bx-price"><span class="bx-amt">$10,000</span><span class="bx-per">once</span></p>' +
        '<button class="btn btn-ghost bx-choose" type="button" data-choose="lifetime">Choose Lifetime</button></div>' +
        '</article>');
    }
  }
  // The set-up guide: a link exists only when the config switches it on.
  if (CFG.setupGuide === true && typeof CFG.setupGuideUrl === 'string' && CFG.setupGuideUrl.charAt(0) === '/') {
    var gl = $('#guide-line');
    if (gl) { gl.innerHTML = 'Setting one up: <a href="' + esc(CFG.setupGuideUrl) + '">read the set-up guide</a>.'; gl.hidden = false; }
  }
  function checkoutLink(planId) {
    var u = LINKS[planId];
    return (typeof u === 'string' && /^https:\/\//.test(u)) ? u : '';
  }

  var plans = {};
  $$('.bx-plan[data-plan]').forEach(function (el) {
    plans[el.dataset.plan] = { id: el.dataset.plan, name: el.dataset.name, price: Number(el.dataset.price), kind: el.dataset.kind, rank: Number(el.dataset.rank), el: el };
  });

  /* ---------- the named strategies, from the catalog ---------- */
  var names = {}, tiers = {}, slugs = [];
  var named = (CAT.strategies || []).filter(function (s) {
    return s && s.named === true && /^[a-z0-9-]+$/.test(String(s.slug)) && s.name && plans[s.tier] &&
      plans[s.tier].kind === 'monthly' && !document.getElementById(s.slug);
  });
  named.forEach(function (s) { names[s.slug] = s.name; tiers[s.slug] = s.tier; slugs.push(s.slug); });

  function nameSpan(s) { return '<span class="bx-sname bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span>'; }
  function chip(s) { return s.chip ? '<span class="bx-chip">' + esc(s.chip) + '</span>' : ''; }

  // Tier cards: each named strategy is a row above its tier's unnamed line, in the catalog's order.
  // A row is one line: the name, the market tag, "See it". The two empty spans are its gaps, which give way
  // before anything else does (bots.css).
  var GAP = '<span class="bx-g" aria-hidden="true"></span>', GAP2 = '<span class="bx-g bx-g2" aria-hidden="true"></span>';
  named.forEach(function (s) {
    var ul = $('[data-tier-list="' + s.tier + '"]');
    if (!ul) return;
    var li = document.createElement('li');
    li.className = 'bx-srow';
    li.setAttribute('data-lvl', s.tier);
    li.innerHTML = '<a class="bx-slink" href="#' + s.slug + '">' + nameSpan(s) + GAP + chip(s) + GAP2 +
      '<span class="bx-see"><span>See it</span></span><span class="bx-arw" aria-hidden="true">›</span></a>';
    var last = ul.lastElementChild;
    ul.insertBefore(li, last && !$('.bx-slink', last) ? last : null);   // above the unnamed line, when there is one
  });

  // A long list: SHOW rows and one button that opens the rest in place. The button is made only for a tier
  // with more than SHOW named strategies, so it appears by itself when the catalog grows.
  var SHOW = 5;
  var planGrid = $('#plan-grid');
  var openedAt = {};            // tier -> when its list was last opened
  function namedRows(ul) { return $$('li', ul).filter(function (li) { return !!$('.bx-slink', li); }); }
  function setList(ul, open) {
    var rows = namedRows(ul), btn = $('.bx-all', ul.parentNode);
    rows.forEach(function (li, i) { li.hidden = !open && i >= SHOW; });
    if (!btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.firstChild.textContent = open ? 'Show fewer' : 'Show all ' + rows.length;
    if (open) openedAt[ul.dataset.tierList] = Date.now(); else delete openedAt[ul.dataset.tierList];
  }
  // Cards stay level: while any list is open each card keeps the height it had with every list closed,
  // so opening one list neither stretches its neighbours nor moves anything inside them.
  function holdCards(hold) {
    if (!planGrid) return;
    var cards = $$('.bx-plan', planGrid);
    if (hold && !planGrid.classList.contains('has-open')) {
      var hs = cards.map(function (c) { return getComputedStyle(c).height; });   // the used height, to the fraction
      cards.forEach(function (c, i) { c.style.minHeight = hs[i]; });
      planGrid.classList.add('has-open');
    } else if (!hold) {
      planGrid.classList.remove('has-open');
      cards.forEach(function (c) { c.style.minHeight = ''; });
    }
  }
  $$('[data-tier-list]').forEach(function (ul) {
    var rows = namedRows(ul);
    if (rows.length <= SHOW) return;
    if (!ul.id) ul.id = 'tier-list-' + ul.dataset.tierList;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bx-all';
    btn.setAttribute('aria-controls', ul.id);
    btn.appendChild(document.createTextNode(''));
    ul.parentNode.insertBefore(btn, ul.nextSibling);
    setList(ul, false);
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      var before = btn.getBoundingClientRect().top;
      if (open) holdCards(true);
      setList(ul, open);
      if (!Object.keys(openedAt).length) holdCards(false);
      // closing: the button stays where the buyer pressed it, whatever the browser does about the rows above it
      var moved = btn.getBoundingClientRect().top - before;
      if (!open && Math.abs(moved) > 1) window.scrollBy({ top: moved, left: 0, behavior: 'instant' });
      watchLists();
    });
  });
  // The one-time plan lists every named strategy.
  var lifeList = $('[data-life-list]');
  if (lifeList) {
    lifeList.innerHTML = named.map(function (s) {
      return '<li><a class="bx-slink bx-slink-pill" href="#' + s.slug + '">' + nameSpan(s) + chip(s) + '</a></li>';
    }).join('');
  }
  // The strategy cards.
  var stratGrid = $('#strat-grid');
  if (stratGrid) {
    stratGrid.innerHTML = named.map(function (s) {
      return '<a class="bx-strat" href="#' + s.slug + '" data-slug="' + s.slug + '" data-tier="' + esc(s.tier) + '">' +
        '<p class="bx-strat-k"><span>' + esc(s.market_line || '') + '</span><span class="bx-tier" data-lvl="' + esc(s.tier) + '">' + esc(plans[s.tier].name) + '</span></p>' +
        '<h3><span class="bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span></h3>' +
        '<p class="bx-strat-n">' + esc(s.sentence || '') + '</p>' +
        '<div class="bx-spark" data-spark="' + s.slug + '" aria-hidden="true"></div>' +
        '<p class="bx-strat-go"><span class="bx-status" data-status="' + s.slug + '"></span><span class="bx-open">Open strategy</span></p>' +
        '</a>';
    }).join('');
  }

  var docs = {};                // slug -> loaded data file
  var sel = { plan: null };
  var openSlug = null, cameFromPage = false, lastTrigger = null, chosenAt = 0;
  var listPlan = null;          // the tier whose opened list is on screen while its own Choose button is not

  var bar = $('#bar'), barPlan = $('#bar-plan'), barDetail = $('#bar-detail'), barPrice = $('#bar-price'), barBtn = $('#bar-btn'), barAlt = $('#bar-alt');
  var sheet = $('#sheet'), backdrop = $('#backdrop'), sheetK = $('#sheet-k'), sheetTitle = $('#sheet-title');
  var sheetBody = $('#sheet-body');

  var DETAIL = {
    base: 'Base strategies',
    select: 'Select and Base strategies',
    supreme: 'Every strategy',
    lifetime: 'Every strategy, paid once'
  };

  /* ---------- the selection ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && plans[s.plan]) sel.plan = s.plan;
    } catch (e) { /* private mode: the page works without it */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) { /* ignore */ } }

  // Does the chosen tier include this strategy? A higher tier includes the ones below it.
  function includes(planId, slug) { return !!plans[planId] && plans[planId].rank >= plans[tiers[slug]].rank; }

  // The bar's main button. It is a link only when it leads somewhere: to the tiers, or to a tier's checkout.
  function setBtn(act, text, href, planId) {
    barBtn.textContent = text;
    barBtn.dataset.act = act;
    if (planId) barBtn.dataset.plan = planId; else delete barBtn.dataset.plan;
    barBtn.removeAttribute('aria-disabled');
    barBtn.removeAttribute('rel');
    if (act === 'soon') {            // no checkout link yet: it reads "Opening soon" and does nothing
      barBtn.removeAttribute('href');
      barBtn.setAttribute('role', 'button');
      barBtn.setAttribute('aria-disabled', 'true');
    } else if (act === 'checkout') { // a real link to the tier's checkout
      barBtn.setAttribute('href', href);
      barBtn.setAttribute('rel', 'noopener');
      barBtn.removeAttribute('role');
    } else {
      barBtn.setAttribute('href', '#plans');
      barBtn.setAttribute('role', 'button');
    }
  }

  // The bar is the one pinned line. Closed: the choice and its checkout. With a strategy open it also says
  // whether the choice includes that strategy and offers its tier, so no second bar is stacked on it.
  function render() {
    var p = plans[sel.plan];
    Object.keys(plans).forEach(function (id) {
      var on = sel.plan === id, btn = $('.bx-choose', plans[id].el);
      plans[id].el.classList.toggle('is-chosen', on);
      btn.textContent = on ? plans[id].name + ' chosen' : 'Choose ' + plans[id].name;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var own = openSlug ? plans[tiers[openSlug]] : (listPlan ? plans[listPlan] : null), nm = openSlug ? names[openSlug] : '';
    var two = false;
    bar.classList.toggle('has-sel', !!p);
    barAlt.hidden = true;
    if (!p) {
      barPrice.hidden = true;
      if (own) {
        barPlan.textContent = own.name + ' tier';
        barDetail.textContent = priceWords(own);
        setBtn('choose', 'Choose ' + own.name, '', own.id);
      } else {
        barPlan.textContent = 'No tier chosen yet';
        barDetail.textContent = 'Pick one above';
        setBtn('tiers', 'See tiers');
      }
    } else {
      barPlan.innerHTML = esc(p.name) + '<span class="bx-bp-price"> · ' + esc(priceWords(p)) + '</span>';
      barPrice.hidden = false;
      barPrice.innerHTML = '$' + p.price.toLocaleString('en-US') + '<small>' + (p.kind === 'lifetime' ? 'once' : 'a month') + '</small>';
      var link = checkoutLink(p.id);
      if (link) setBtn('checkout', 'Checkout', link); else setBtn('soon', 'Opening soon');
      if (!own || (!openSlug && own.id === p.id)) {
        barDetail.textContent = DETAIL[p.id];
      } else if (openSlug && includes(p.id, openSlug)) {
        barDetail.textContent = '✓ Includes ' + nm;
      } else {
        barDetail.textContent = openSlug ? nm + ' is in ' + own.name : 'Viewing the ' + own.name + ' list';
        barAlt.textContent = 'Switch to ' + own.name + ' · $' + own.price.toLocaleString('en-US');
        barAlt.dataset.plan = own.id;
        barAlt.hidden = false;
        two = true;
      }
    }
    document.body.classList.toggle('bx-bar-two', two);   // two buttons: the bar takes a second row on narrow screens
  }

  function choose(plan) { sel.plan = plan; chosenAt = Date.now(); save(); render(); }

  $$('.bx-choose').forEach(function (b) {
    b.addEventListener('click', function () { choose(b.dataset.choose); });
  });

  barBtn.addEventListener('click', function (e) {
    var act = barBtn.dataset.act;
    if (act === 'checkout') {
      if (Date.now() - chosenAt < 600) e.preventDefault();   // a double tap on Choose must not run on into checkout
      return;                                                // otherwise the link itself opens the checkout
    }
    e.preventDefault();
    if (act === 'soon') return;
    if (act === 'choose') { choose(barBtn.dataset.plan); return; }
    if (openSlug) closeSheet();
    $('#plans').scrollIntoView({ behavior: 'smooth' });
  });
  barBtn.addEventListener('keydown', function (e) {          // role="button": Space presses it as well as Enter
    if (e.key === ' ' && barBtn.getAttribute('role') === 'button') { e.preventDefault(); barBtn.click(); }
  });
  barAlt.addEventListener('click', function () {
    choose(barAlt.dataset.plan);
    barBtn.focus({ preventScroll: true });       // the tapped button is hidden now: keep focus in the bar
  });

  // An opened list can be taller than the screen. While any of it is on screen and its card's own Choose
  // button is not, the bar offers that tier, the way it does for an open strategy. With two such lists side
  // by side, the one opened last.
  function watchLists() {
    var found = null, top = 0, bottom = bar.getBoundingClientRect().top;
    var nav = $('header.nav');
    if (nav) top = Math.max(0, nav.getBoundingClientRect().bottom);
    if (!openSlug) {
      Object.keys(openedAt).forEach(function (id) {
        var ul = $('[data-tier-list="' + id + '"]'), own = plans[id] && $('.bx-choose', plans[id].el);
        if (!ul || !own) return;
        var r = ul.getBoundingClientRect(), b = own.getBoundingClientRect();
        if (r.bottom <= top || r.top >= bottom) return;               // none of the list is on screen
        if (b.top >= top && b.bottom <= bottom) return;               // its own button is in full view
        if (!found || openedAt[id] > openedAt[found]) found = id;
      });
    }
    if (found !== listPlan) { listPlan = found; render(); }
  }
  var listTick = 0;
  function listSoon() {
    if (listTick) return;
    listTick = requestAnimationFrame(function () { listTick = 0; watchLists(); });
  }
  window.addEventListener('scroll', listSoon, { passive: true });
  window.addEventListener('resize', listSoon);

  /* ---------- the open strategy ---------- */
  function hashSlug() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(names, h) ? h : null;
  }

  function showSheet(slug) {
    openSlug = slug;
    sheetTitle.textContent = names[slug];
    var s = named.filter(function (x) { return x.slug === slug; })[0];
    sheetTitle.setAttribute('data-lvl', tiers[slug]);
    ['--n', '--c0', '--c1', '--c2'].forEach(function (k) { sheetTitle.style.removeProperty(k); });
    if (s) {
      palette(s).forEach(function (p) { sheetTitle.style.setProperty(p[0], p[1]); });
      if (sheen(s)) sheetTitle.insertAdjacentHTML('beforeend', sheen(s));
    }
    sheetK.textContent = plans[tiers[slug]].name + ' tier';
    sheetBody.innerHTML = '<p class="bx-note">Loading…</p>';
    listPlan = null;
    render();
    backdrop.hidden = false;
    sheet.hidden = false;
    document.body.classList.add('noscroll');
    sheetBody.scrollTop = 0;
    sheetTitle.focus({ preventScroll: true });
    getDoc(slug).then(function (doc) { if (openSlug === slug) renderPanel(doc); },
      function () { if (openSlug === slug) sheetBody.innerHTML = '<p class="bx-note">This strategy’s record did not load. Reload the page to try again.</p>'; });
  }

  function hideSheet() {
    if (!openSlug) return;
    openSlug = null;
    sheet.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('noscroll');
    render();
    watchLists();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }

  // Close: step back in history when the view was opened from this page (so Back and Close agree);
  // when the page was loaded straight onto a strategy link, clear the hash instead.
  function closeSheet() {
    if (!openSlug) return;
    if (cameFromPage) { cameFromPage = false; history.back(); }
    else { history.replaceState(null, '', location.pathname + location.search); hideSheet(); }
  }

  function route() {
    var s = hashSlug();
    if (s) { if (s !== openSlug) showSheet(s); }
    else { cameFromPage = false; hideSheet(); }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var s = a.getAttribute('href').slice(1);
    if (Object.prototype.hasOwnProperty.call(names, s)) { lastTrigger = a; if (!openSlug) cameFromPage = true; }
  });
  window.addEventListener('hashchange', route);
  $('#sheet-close').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSlug) closeSheet();
  });

  /* ---------- data ---------- */
  function getDoc(slug) {
    if (docs[slug]) return Promise.resolve(docs[slug]);
    return fetch('data/' + slug + '.json').then(function (r) {
      if (!r.ok) throw new Error('data file ' + r.status);
      return r.json();
    }).then(function (d) { docs[slug] = d; return d; });
  }

  /* ---------- the performance view: the same parts, in the same order, for every strategy ---------- */
  function dl(rows) {
    return '<dl class="bx-dl">' + rows.filter(function (r) { return r && r[1]; }).map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
  }
  function tile(label, value, cls, small) {
    return '<div class="bx-tile"><span>' + esc(label) + '</span><b class="' + (cls || '') + '">' + esc(value) + '</b>' +
      (small ? '<small>' + esc(small) + '</small>' : '') + '</div>';
  }
  function kpi(label, value, cls) {
    return '<div class="bx-kpi"><dt>' + esc(label) + '</dt><dd class="' + (cls || '') + '">' + esc(value) + '</dd></div>';
  }
  function has(v) { return v !== undefined && v !== null && v !== ''; }

  function renderPanel(d) {
    var w = d.what || {}, tierName = plans[tiers[d.slug]].name;
    sheetK.textContent = (w.market_line ? w.market_line + ' · ' : '') + tierName + ' tier';

    var what = '<section class="bx-part"><h3>What it is</h3>' + (w.sentence ? '<p>' + esc(w.sentence) + '</p>' : '') +
      dl([['Market', has(w.market_line) && esc(w.market_line)], ['Chart', has(w.timeframe) && esc(w.timeframe)],
        ['Trades during', has(w.session) && esc(w.session)], ['Tier', esc(tierName)]]) + '</section>';

    if (d.status !== 'figures') {
      sheetBody.innerHTML = '<div class="bx-nofig">' +
        '<p>No figures are published for ' + esc(d.name) + ' yet.</p>' +
        '<p>Nothing is shown here until a current Strategy Tester record for it is posted. No number is estimated, and none is carried over from another strategy. When it is posted, this view shows the same parts as every other strategy: the chart, the figures, the monthly P&amp;L, the test and the proof.</p>' +
        '</div><div class="bx-more">' + what + '</div>';
      return;
    }

    var t = d.test, f = d.figures, p = d.proof || {}, show = f.display, wo = d.worked_out;
    var windowWords = day(t.window_from) + ' to ' + day(t.window_to);
    var hasCurve = d.equity && d.equity.length, hasMonths = d.months && d.months.length;
    var kpiLen = Math.max(show.net_profit.length, show.max_drawdown.length);
    var moWords = hasMonths ? d.months.map(function (m) { return usd(m.pnl_usd, true); }) : [];
    var moLen = moWords.reduce(function (a, s) { return Math.max(a, s.length); }, 0);

    // The caption beside the label: the window, the start, the sizing and the costs, as the record states them.
    var cap = [d.label.text, windowWords];
    if (has(t.start_capital_usd)) cap.push(usd(t.start_capital_usd, false, false) + ' start');
    if (has(t.order_size)) cap.push(t.order_size);
    if (has(t.commission) && has(t.slippage)) cap.push('after commission and slippage');
    else if (has(t.commission)) cap.push('after commission');

    // First screen: the chart, the four figures in one bar, one caption, the monthly P&L.
    var first = '<div class="bx-first">' +
      (hasCurve ? '<div class="bx-chart" id="bx-chart"></div>'
        : (d.overview_image ? '<div class="bx-chart is-image"><img src="data/' + esc(d.overview_image) + '" alt="The Strategy Tester overview for ' + esc(d.name) + ': a hypothetical backtest, ' + esc(windowWords) + '"></div>' : '')) +
      '<dl class="bx-kpis' + (kpiLen >= 15 ? ' is-long is-xlong' : (kpiLen >= 12 ? ' is-long' : '')) + '">' +
        kpi('Net profit', show.net_profit, tone(f.net_profit_usd)) +
        kpi('Win rate', show.win_rate) +
        kpi('Profit factor', show.profit_factor) +
        kpi('Max drawdown', show.max_drawdown) +
      '</dl>' +
      '<p class="bx-cap">' + cap.map(esc).join(' · ') + '</p>' +
      (hasMonths ? '<div class="bx-mo"><h3 class="bx-mo-h" id="bx-mo-h">Monthly P&amp;L</h3>' +
      '<ul class="bx-months' + (moLen >= 12 ? ' is-long is-xlong' : (moLen >= 11 ? ' is-long' : '')) + '" aria-labelledby="bx-mo-h" style="--mo-n:' + Math.min(12, d.months.length) + '">' + d.months.map(function (m, i) {
        return '<li class="bx-month ' + (m.pnl_usd > 0 ? 'is-win' : (m.pnl_usd < 0 ? 'is-loss' : '')) + '"><span>' + esc(month(m.month)) + '</span>' +
          '<b class="' + tone(m.pnl_usd) + '">' + esc(moWords[i]) + '</b></li>';
      }).join('') + '</ul></div>' : '') +
      '</div>';

    // Below the first screen: what it is, the test, the other figures, the proof.
    var tiles = tile('Trades', f.trades.toLocaleString('en-US'), '', has(f.winners) ? f.winners.toLocaleString('en-US') + ' winners' : '');
    if (wo && has(wo.worst_day_usd)) tiles += tile('Worst day', usd(wo.worst_day_usd, true), tone(wo.worst_day_usd), day(wo.worst_day_date));
    var more = '<div class="bx-more">' + what +
      '<section class="bx-part"><h3>The test</h3>' + dl([
        ['Tested with', esc(t.tester)],
        ['Symbol', has(t.symbol) && esc(t.symbol)],
        ['Window', esc(windowWords)],
        ['Starting balance', has(t.start_capital_usd) && esc(usd(t.start_capital_usd, false, false))],
        ['Order size', has(t.order_size) && esc(t.order_size)],
        ['Commission', has(t.commission) && esc(t.commission)],
        ['Slippage', has(t.slippage) && esc(t.slippage)]
      ]) + '</section>' +
      '<section class="bx-part"><h3>More figures</h3><div class="bx-tiles">' + tiles + '</div>' +
        (wo && wo.note ? '<p class="bx-note">' + esc(wo.note) + '</p>' : '') + '</section>' +
      '<section class="bx-part"><h3>The proof</h3>' + dl([
        ['Test run', has(p.run_date) && esc(day(p.run_date))],
        ['TradingView page', has(p.tradingview_url) && /^https:\/\/([a-z]+\.)?tradingview\.com\//.test(p.tradingview_url) && '<a href="' + esc(p.tradingview_url) + '" rel="noopener">Open the strategy on TradingView</a>']
      ]) + '</section>' +
      '</div>';

    sheetBody.innerHTML = first + more;
    if (hasCurve) {
      var box = $('#bx-chart');
      drawChart(box, d.equity);
      if (chartWatch) { chartWatch.disconnect(); chartWatch.observe(box); }
    }
  }

  function linePath(eq, w, hgt, pad) {
    var vals = eq.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0]));
    var span = (hi - lo) || 1, n = eq.length;
    var X = function (i) { return pad.l + (w - pad.l - pad.r) * (n === 1 ? 0 : i / (n - 1)); };
    var Y = function (v) { return pad.t + (hgt - pad.t - pad.b) * (1 - (v - lo) / span); };
    var d = eq.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    return { d: d, X: X, Y: Y, lo: lo, hi: hi, n: n };
  }

  // A round step for the money axis: 1, 2, 2.5 or 5 times a power of ten, giving about `want` lines.
  function niceStep(span, want) {
    var raw = span / want, pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / pow;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pow;
  }

  // The chart fills its box: the box takes whatever height the first screen has left.
  // The line is the record's own day-by-day equity; the axis marks are round steps for reading it, not figures.
  function drawChart(box, eq) {
    if (!box || !eq || !eq.length) return;
    var w = Math.max(220, Math.round(box.clientWidth - 20));
    var hgt = Math.max(120, Math.round(box.clientHeight - 12));
    // money axis: round steps; its labels sit in a gutter on the left, clear of the line
    var vals = eq.map(function (p) { return p[1]; });
    var lo0 = Math.min.apply(null, vals.concat([0])), hi0 = Math.max.apply(null, vals.concat([0]));
    var step = niceStep((hi0 - lo0) || 1, hgt < 220 ? 3 : 5), marksY = [], widest = 2;
    for (var v = Math.ceil(lo0 / step) * step; v <= hi0 + 1e-9; v += step) {
      var txt0 = Math.abs(v) < 1e-9 ? '$0' : usd(v, true, false);
      marksY.push([v, txt0]);
      widest = Math.max(widest, txt0.length);
    }
    var pad = { l: Math.round(widest * 6.4 + 12), r: 8, t: 14, b: 26 };
    var g = linePath(eq, w, hgt, pad);
    var zero = g.Y(0), last = eq[eq.length - 1];
    var area = g.d + ' L' + g.X(g.n - 1).toFixed(1) + ' ' + zero.toFixed(1) + ' L' + g.X(0).toFixed(1) + ' ' + zero.toFixed(1) + ' Z';
    var lines = '', labels = '', ticks = '';

    marksY.forEach(function (mk) {
      var y = g.Y(mk[0]), isZero = mk[1] === '$0';   // the zero line is solid
      lines += '<line x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#2f3349" stroke-width="1"' + (isZero ? '' : ' stroke-dasharray="3 5"') + '/>';
      labels += '<text class="bx-gl" text-anchor="end" x="' + (pad.l - 7) + '" y="' + (y + 4).toFixed(1) + '">' + esc(mk[1]) + '</text>';
    });

    // time axis: one mark per month, so the chart reads against the monthly P&L under it
    var marks = [], seen = '';
    eq.forEach(function (pt, i) {
      var ym = pt[0].slice(0, 7);
      if (ym !== seen) { seen = ym; marks.push([i, ym]); }
    });
    var every = Math.max(1, Math.ceil(marks.length / Math.max(1, Math.floor((w - pad.l - pad.r) / 64))));
    marks.forEach(function (mk, k) {
      var x = g.X(mk[0]), mo = Number(mk[1].slice(5)), yr = mk[1].slice(0, 4);
      if (k) lines += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + pad.t + '" y2="' + (hgt - pad.b) + '" stroke="#23263a" stroke-width="1"/>';
      if (k % every) return;
      var txt = MON[mo - 1] + (k === 0 || mo === 1 ? ' ' + yr : '');
      if (x > w - pad.r - 44) return;   // no label hard against the right edge
      ticks += '<text class="bx-xl" x="' + (x + (k ? 4 : 0)).toFixed(1) + '" y="' + (hgt - 8) + '">' + esc(txt) + '</text>';
    });

    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" role="img" aria-label="Equity curve from ' +
      esc(day(eq[0][0])) + ' to ' + esc(day(last[0])) + ', ending at ' + esc(usd(last[1], true)) + '. Hypothetical backtest: profit and loss added up day by day.">' +
      '<defs><linearGradient id="bx-eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      lines +
      '<path d="' + area + '" fill="url(#bx-eq)"/>' +
      '<path d="' + g.d + '" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + g.X(g.n - 1).toFixed(1) + '" cy="' + g.Y(last[1]).toFixed(1) + '" r="3.5" fill="#fff"/>' +
      labels + ticks +
      '</svg>';
    box.dataset.w = w; box.dataset.h = hgt;
  }

  function spark(el, d) {
    if (d.status !== 'figures' || !d.equity || !d.equity.length) {
      el.textContent = d.status === 'figures' ? d.label.text : 'No figures published yet';
      return;
    }
    var g = linePath(d.equity, 300, 68, { l: 4, r: 4, t: 8, b: 8 });
    el.innerHTML = '<svg viewBox="0 0 300 68" preserveAspectRatio="none"><path d="' + g.d +
      '" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  }

  // Redraw the chart whenever its box changes size (window, rotation, the bar taking a second row).
  function redraw() {
    var box = $('#bx-chart');
    if (!box || !openSlug || !docs[openSlug] || docs[openSlug].status !== 'figures') return;
    if (Number(box.dataset.w) === Math.max(220, Math.round(box.clientWidth - 20)) && Number(box.dataset.h) === Math.max(120, Math.round(box.clientHeight - 12))) return;
    drawChart(box, docs[openSlug].equity);
  }
  var chartWatch = window.ResizeObserver ? new ResizeObserver(redraw) : null;
  var resizeTimer, lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redraw, 120);
    if (window.innerWidth !== lastWidth) {     // a new width: the heights held for the open lists no longer apply
      lastWidth = window.innerWidth;
      if (planGrid) $$('.bx-plan', planGrid).forEach(function (c) { c.style.minHeight = ''; });
    }
  });

  /* ---------- start ---------- */
  load();
  render();
  slugs.forEach(function (slug) {
    getDoc(slug).then(function (d) {
      var st = $('[data-status="' + slug + '"]'), sp = $('[data-spark="' + slug + '"]');
      if (st) st.textContent = d.status === 'figures' ? d.label.text : '';
      if (sp) spark(sp, d);
    }, function () { /* the cards still read without their data */ });
  });
  route();
})();
