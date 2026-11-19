/* AFT Trading Bots: the Strategies page's table. No tracking of its own and no network call beyond this site's own data files.
   Everything it shows comes from data/catalog.js: the strategies, their grades and prices, and the block of figures that
   aft_bots_publish.py writes there from each strategy's data file. Figures are printed as the display strings give them.
   A click on a column heading sorts the table, as in a spreadsheet; a click on a row opens that strategy's card under it.
   The search, the filters, the sort and the open card live in the address, so a link opens the same view.
   This page never uses the full-screen strategy view of bots.js: a link to #slug opens the card in the table instead. */
(function () {
  'use strict';

  var A = window.AFT_BOTS;
  if (!A) return;
  var FIG = (window.AFT_BOTS_CATALOG || {}).figures || {};
  var LINKS = (window.AFT_BOTS_CONFIG || {}).strategyCheckout || {};
  var DATA = document.body.dataset.dataBase || '../data/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = A.esc;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function month(ym) { var p = ym.split('-'); return MON[Number(p[1]) - 1] + ' ' + p[0]; }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  // The words for Trade frequency (row E723). The number (trades per trading day) and the words shown ("3 per day",
  // "4 per week") are worked out once, in trade_frequency() and frequency_words() in aft_strategy_export.py.
  var FREQ = {
    sub: 'average trades taken',
    filter: 'Trade frequency (trades per day)',
    note: 'Trade frequency is the trades taken divided by the trading days in the test, rounded to a whole number. Trading days are the Monday to Friday dates in the tested range, first and last day included. Holidays are not removed. A strategy that averages under one trade a day shows its trades per week (five trading days).'
  };
  var HYPOTHETICAL = 'Every figure here is a hypothetical backtest from TradingView\'s Strategy Tester. A backtest does not represent actual trading.';

  // The columns, in the order they stand. first: the direction of the first click (best first).
  // f: the number in the catalog; d: its printed form; sub: the small line under the heading; note: the note under the table that explains it.
  var COLS = [
    { k: 'name', label: 'Strategy', first: 'asc' },
    { k: 'inst', label: 'Instrument', first: 'asc' },
    { k: 'tier', label: 'Tier', first: 'asc' },
    { k: 'rod', label: 'Return on drawdown', first: 'desc', f: 'return_on_drawdown', d: 'return_on_drawdown' },
    { k: 'np', label: 'Total profit', first: 'desc', f: 'net_profit_usd', d: 'net_profit' },
    { k: 'mp', label: 'Monthly profit', first: 'desc', f: 'monthly_profit_usd', d: 'monthly_profit', sub: 'average per month', note: 'hyp-note' },
    { k: 'pf', label: 'Profit factor', first: 'desc', f: 'profit_factor', d: 'profit_factor' },
    { k: 'fq', label: 'Trade frequency', first: 'desc', f: 'trade_frequency', d: 'trade_frequency', sub: FREQ.sub, note: 'freq-note' },
    { k: 'dd', label: 'Max drawdown', first: 'asc', f: 'max_drawdown_usd', d: 'max_drawdown_usd' },
    { k: 'wr', label: 'Win rate', first: 'desc', f: 'win_rate_pct', d: 'win_rate' },
    { k: 'price', label: 'Price', first: 'desc' }
  ];
  var RANGES = [
    { k: 'pf', label: 'Profit factor', f: 'profit_factor' },
    { k: 'fq', label: FREQ.filter, f: 'trade_frequency' },
    { k: 'dd', label: 'Max drawdown ($)', f: 'max_drawdown_usd' },
    { k: 'rod', label: 'Return on drawdown', f: 'return_on_drawdown' },
    { k: 'np', label: 'Total profit ($)', f: 'net_profit_usd' }
  ];
  function col(k) { return COLS.filter(function (c) { return c.k === k; })[0]; }

  /* ---------- the rows' data ---------- */
  // A strategy whose tier is not set has no grade (g: null).
  var all = A.listed.map(function (s) {
    return { s: s, f: FIG[s.slug] || null, g: A.grade(s.tier), price: num(s.price) !== null && s.price > 0 ? s.price : null };
  });
  var bySlug = {};
  all.forEach(function (r) { bySlug[r.s.slug] = r; });
  var NOT_SET = 'none';
  var anyUnset = all.some(function (r) { return r.g === null; });
  var markets = all.map(function (r) { return r.s.chip; }).filter(function (m, i, l) { return m && l.indexOf(m) === i; }).sort();

  /* ---------- the view: read from the address, written back to it ---------- */
  var st = { q: '', market: '', grade: '', sort: 'tier', dir: 'asc', r: {}, open: '' };
  function hashSlug() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(bySlug, h) ? h : '';
  }
  function fromAddress() {
    var u = new URLSearchParams(location.search);
    st.q = u.get('q') || '';
    st.market = markets.indexOf(u.get('market')) >= 0 ? u.get('market') : '';
    var g = u.get('grade') || '';
    st.grade = (g === NOT_SET && anyUnset) || (/^[1-9]$/.test(g) && Number(g) <= A.ladder.length) ? g : '';
    st.sort = col(u.get('sort')) ? u.get('sort') : 'tier';
    st.dir = u.get('dir') === 'asc' || u.get('dir') === 'desc' ? u.get('dir') : col(st.sort).first;
    RANGES.forEach(function (c) {
      ['min', 'max'].forEach(function (e) {
        var v = u.get(c.k + '_' + e);
        st.r[c.k + '_' + e] = v !== null && v !== '' && isFinite(Number(v)) ? v : '';
      });
    });
  }
  // replaceState fires no hashchange, so bots.js does not react to the #slug written here.
  function toAddress() {
    var u = new URLSearchParams();
    if (st.q) u.set('q', st.q);
    if (st.market) u.set('market', st.market);
    if (st.grade) u.set('grade', st.grade);
    Object.keys(st.r).forEach(function (k) { if (st.r[k] !== '') u.set(k, st.r[k]); });
    if (st.sort !== 'tier') u.set('sort', st.sort);
    if (st.dir !== col(st.sort).first) u.set('dir', st.dir);
    var qs = u.toString();
    var hash = st.open ? '#' + st.open : (hashSlug() ? '' : location.hash);
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + hash);
  }

  /* ---------- the filter panel ---------- */
  var body = $('#f-body');
  function options(list) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
  }
  function field(id, label, list) {
    return '<label class="bx-fld"><span>' + esc(label) + '</span><select id="' + id + '">' + options(list) + '</select></label>';
  }
  body.innerHTML =
    field('f-market', 'Instrument', [['', 'All instruments']].concat(markets.map(function (m) { return [m, m]; }))) +
    field('f-grade', 'Tier', [['', 'All tiers']].concat(A.ladder.map(function (p, i) { return [String(i + 1), 'Tier ' + (i + 1)]; }), anyUnset ? [[NOT_SET, 'Not set']] : [])) +
    RANGES.map(function (c) {
      return '<fieldset class="bx-rng"><legend>' + esc(c.label) + '</legend>' +
        '<input type="number" step="any" inputmode="decimal" id="f-' + c.k + '_min" placeholder="Min" aria-label="' + esc(c.label) + ', minimum">' +
        '<input type="number" step="any" inputmode="decimal" id="f-' + c.k + '_max" placeholder="Max" aria-label="' + esc(c.label) + ', maximum">' +
        '</fieldset>';
    }).join('');

  function toPanel() {
    $('#q').value = st.q;
    $('#f-market').value = st.market;
    $('#f-grade').value = st.grade;
    Object.keys(st.r).forEach(function (k) { $('#f-' + k).value = st.r[k]; });
  }
  function active() {
    return (st.market ? 1 : 0) + (st.grade ? 1 : 0) + Object.keys(st.r).filter(function (k) { return st.r[k] !== ''; }).length;
  }

  /* ---------- which rows, in which order ---------- */
  function passes(r) {
    if (st.q) {
      var hay = (r.s.name + ' ' + (r.s.chip || '') + ' ' + (r.s.market_line || '')).toLowerCase();
      if (hay.indexOf(st.q.trim().toLowerCase()) < 0) return false;
    }
    if (st.market && r.s.chip !== st.market) return false;
    if (st.grade === NOT_SET ? r.g !== null : (st.grade && String(r.g) !== st.grade)) return false;
    return RANGES.every(function (c) {
      var lo = st.r[c.k + '_min'], hi = st.r[c.k + '_max'];
      if (lo === '' && hi === '') return true;
      var v = r.f ? num(r.f[c.f]) : null;
      if (v === null) return false;              // no figure cannot meet a limit
      return (lo === '' || v >= Number(lo)) && (hi === '' || v <= Number(hi));
    });
  }
  function value(r, k) {
    if (k === 'name') return r.s.name.toLowerCase();
    if (k === 'inst') return r.s.chip ? String(r.s.chip).toLowerCase() : null;
    if (k === 'tier') return r.g;
    if (k === 'price') return r.price;
    return r.f ? num(r.f[col(k).f]) : null;
  }
  // A row with no value goes last in either direction.
  function rank(x, y, dir) {
    if (x === null || y === null) return x === y ? 0 : (x === null ? 1 : -1);
    if (x === y) return 0;
    var c = typeof x === 'string' ? x.localeCompare(y) : (x < y ? -1 : 1);
    return dir === 'asc' ? c : -c;
  }
  function byName(a, b) { return a.s.name.localeCompare(b.s.name); }
  // The default order: by tier, and inside a tier by return on drawdown, highest first; rows with no figures follow in name order.
  function order(a, b) {
    if (st.sort === 'tier') return rank(a.g, b.g, st.dir) || rank(value(a, 'rod'), value(b, 'rod'), 'desc') || byName(a, b);
    return rank(value(a, st.sort), value(b, st.sort), st.dir) || byName(a, b);
  }

  /* ---------- drawing the table ---------- */
  var NONE = '<span aria-hidden="true">–</span><span class="bx-vh">Not published yet</span>';
  function cell(r, c) {
    var shown = r.f && r.f.display && r.f.display[c.d];
    return '<td class="bx-c-' + c.k + (shown && (c.k === 'np' || c.k === 'mp') ? ' ' + A.tone(r.f[c.f]) : '') + '">' + (shown ? esc(shown) : NONE) + '</td>';
  }
  function rowHtml(r) {
    var s = r.s;
    return '<tr class="bx-row" data-slug="' + esc(s.slug) + '">' +
      '<th scope="row" class="bx-c-name"><button type="button" class="bx-r-open" aria-expanded="false">' + '<span class="bx-r-id">' + A.nameSpan(s) + '<span class="bx-r-sub">' + (s.chip ? esc(s.chip) + ' · ' : '') + (r.g === null ? 'Tier not set' : 'Tier ' + r.g) + '</span></span><span class="bx-r-chev" aria-hidden="true">›</span></button></th>' +
      '<td class="bx-c-inst">' + (s.chip ? esc(s.chip) : NONE) + '</td>' +
      '<td class="bx-c-tier"><span class="bx-tier" data-lvl="' + A.finish(s.tier) + '">' + (r.g === null ? 'Tier not set' : 'Tier ' + r.g) + '</span></td>' +
      COLS.filter(function (c) { return c.f; }).map(function (c) { return cell(r, c); }).join('') +
      '<td class="bx-c-price">' + (r.price !== null ? '<b>' + esc(A.dollars(r.price)) + '</b> <small>a month</small>' : '<span class="is-none">Price at release</span>') + '</td>' +
      '</tr>';
  }
  $('#t-head').innerHTML = '<tr>' + COLS.map(function (c) {
    return '<th scope="col" class="bx-h-' + c.k + '" data-k="' + c.k + '"><button type="button" data-sort="' + c.k + '"' + (c.note ? ' aria-describedby="' + c.note + '"' : '') + '>' +
      '<span class="bx-h-t">' + esc(c.label) + '<span class="bx-arrow" aria-hidden="true"></span></span>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</button>' +
      (c.k === 'name' ? '<span class="bx-h-more"><button type="button" data-sort="inst">Instrument<span class="bx-arrow" aria-hidden="true"></span></button><button type="button" data-sort="tier">Tier<span class="bx-arrow" aria-hidden="true"></span></button></span>' : '') + '</th>';
  }).join('') + '</tr>';
  $('#freq-note').textContent = FREQ.note;
  // The date line above the table: the figures run to the earliest end date among the strategies that have figures.
  var upTo = Object.keys(FIG).map(function (k) { return FIG[k] && FIG[k].window_to; })
    .filter(function (d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }).sort()[0];
  if (upTo) {
    var ud = upTo.split('-');
    $('#as-of-upd').textContent = ' Last updated ' + ud[2] + ' ' + MON[Number(ud[1]) - 1] + ' ' + ud[0] + '.';
  }
  function headState() {
    $$('#t-head th').forEach(function (th) {
      var on = th.dataset.k === st.sort;
      th.setAttribute('aria-sort', on ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.classList.toggle('is-on', on);
      $('.bx-arrow', th).textContent = on ? (st.dir === 'asc' ? ' ↑' : ' ↓') : '';
    });
    $$('#t-head .bx-h-more button').forEach(function (b) {
      var on = b.dataset.sort === st.sort;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('.bx-arrow', b).textContent = on ? (st.dir === 'asc' ? ' ↑' : ' ↓') : '';
    });
  }
  function draw() {
    var list = all.filter(passes).sort(order);
    if (st.open && !list.some(function (r) { return r.s.slug === st.open; })) st.open = '';
    $('#rows').innerHTML = list.map(rowHtml).join('');
    $('#table-frame').hidden = !list.length;
    $('#swipe').hidden = !list.length;
    $('#table-notes').hidden = !list.length;
    $('#empty').hidden = !!list.length;
    $('#dash-note').hidden = !list.some(function (r) { return !r.f || r.price === null; });
    $('#count').textContent = list.length === all.length
      ? all.length + (all.length === 1 ? ' strategy' : ' strategies')
      : 'Showing ' + list.length + ' of ' + all.length + (all.length === 1 ? ' strategy' : ' strategies');
    var n = active(), badge = $('#f-n');
    badge.hidden = !n;
    badge.textContent = n ? String(n) : '';
    $('#f-open').setAttribute('aria-label', 'Filter' + (n ? ', ' + n + ' active' : ''));
    headState();
    if (st.open) openCard(st.open);
  }
  function changed() { draw(); toAddress(); }

  /* ---------- the card under a row ---------- */
  var docs = {};
  var chartWatch = window.ResizeObserver ? new ResizeObserver(redraw) : null;
  function getDoc(slug) {
    if (docs[slug]) return Promise.resolve(docs[slug]);
    return fetch(DATA + slug + '.json').then(function (r) {
      if (!r.ok) throw new Error('data file ' + r.status);
      return r.json();
    }).then(function (d) { docs[slug] = d; return d; });
  }
  function buyHtml(r) {
    var link = LINKS[r.s.slug];
    return r.price !== null && typeof link === 'string' && /^https:\/\//.test(link)
      ? '<a class="btn bx-btn-red bx-r-btn" href="' + esc(link) + '" rel="noopener">Buy ' + esc(r.s.name) + '</a>'
      : '<span class="btn btn-ghost bx-r-btn" role="button" aria-disabled="true">Opening soon</span>';
  }
  function cardHtml(r) {
    return '<div class="bx-c-rec">' + (r.f ? '<p class="bx-note">Loading…</p>' : '<p class="bx-c-none">No figures published yet</p>') + '</div>' +
      '<p class="bx-c-hyp">' + esc(HYPOTHETICAL) + '</p>' +
      '<div class="bx-c-buy">' + buyHtml(r) + '</div>';
  }
  function kpi(label, val, cls) {
    return '<div class="bx-kpi"><dt>' + esc(label) + '</dt><dd class="' + (cls || '') + '">' + esc(val) + '</dd></div>';
  }
  // The same parts, in the same order, as the open strategy view on the bots page.
  function recordHtml(d) {
    var t = d.test, f = d.figures, show = f.display;
    var windowWords = A.day(t.window_from) + ' to ' + A.day(t.window_to);
    var hasCurve = d.equity && d.equity.length, hasMonths = d.months && d.months.length;
    var kpiLen = Math.max(show.net_profit.length, show.max_drawdown_usd.length);
    var moWords = hasMonths ? d.months.map(function (m) { return A.usd(m.pnl_usd, true); }) : [];
    var moLen = moWords.reduce(function (a, s) { return Math.max(a, s.length); }, 0);
    var cap = [d.label.text, windowWords];
    if (num(t.start_capital_usd) !== null) cap.push(A.usd(t.start_capital_usd, false, false) + ' start');
    if (t.commission && t.slippage) cap.push('after commission and slippage');
    else if (t.commission) cap.push('after commission');
    var basis = num(f.trades) !== null && num(f.trading_days) !== null
      ? '<p class="bx-cap">' + esc(f.trades.toLocaleString('en-US') + ' trades over ' + f.trading_days.toLocaleString('en-US') + ' trading days') + '</p>' : '';
    return '<div class="bx-first">' +
      (hasCurve ? '<div class="bx-chart"></div>'
        : (d.overview_image ? '<div class="bx-chart is-image"><img src="' + esc(DATA) + esc(d.overview_image) + '" alt="The Strategy Tester overview for ' + esc(d.name) + ': a hypothetical backtest, ' + esc(windowWords) + '"></div>' : '')) +
      '<dl class="bx-kpis' + (kpiLen >= 15 ? ' is-long is-xlong' : (kpiLen >= 12 ? ' is-long' : '')) + '">' +
        kpi('Total profit', show.net_profit, A.tone(f.net_profit_usd)) +
        kpi('Win rate', show.win_rate) +
        kpi('Profit factor', show.profit_factor) +
        kpi('Max drawdown', show.max_drawdown_usd) +
      '</dl>' +
      '<p class="bx-cap">' + cap.map(esc).join(' · ') + '</p>' + basis +
      (hasMonths ? '<div class="bx-mo"><h3 class="bx-mo-h">Monthly P&amp;L</h3>' +
        '<ul class="bx-months' + (moLen >= 12 ? ' is-long is-xlong' : (moLen >= 11 ? ' is-long' : '')) + '" aria-label="Monthly P&amp;L" style="--mo-n:' + Math.min(12, d.months.length) + '">' + d.months.map(function (m, i) {
          return '<li class="bx-month ' + (m.pnl_usd > 0 ? 'is-win' : (m.pnl_usd < 0 ? 'is-loss' : '')) + '"><span>' + esc(month(m.month)) + '</span>' +
            '<b class="' + A.tone(m.pnl_usd) + '">' + esc(moWords[i]) + '</b></li>';
        }).join('') + '</ul></div>' : '') +
      '</div>';
  }
  function closeCard() {
    var det = $('#rows .bx-det');
    if (det) det.parentNode.removeChild(det);
    $$('#rows .bx-row.is-open').forEach(function (tr) {
      var b = $('.bx-r-open', tr);
      tr.classList.remove('is-open');
      b.setAttribute('aria-expanded', 'false');
      b.removeAttribute('aria-controls');
    });
    if (chartWatch) chartWatch.disconnect();
    st.open = '';
  }
  function openCard(slug) {
    closeCard();
    var tr = $('#rows tr[data-slug="' + slug + '"]'), r = bySlug[slug];
    if (!tr || !r) return;
    var b = $('.bx-r-open', tr), id = 'card-' + slug;
    st.open = slug;
    tr.classList.add('is-open');
    b.setAttribute('aria-expanded', 'true');
    b.setAttribute('aria-controls', id);
    tr.insertAdjacentHTML('afterend', '<tr class="bx-det"><td colspan="' + COLS.length + '"><div class="bx-card" id="' + id + '">' + cardHtml(r) + '</div></td></tr>');
    if (!r.f) return;
    getDoc(slug).then(function (d) {
      var card = document.getElementById(id);
      if (!card || st.open !== slug) return;
      $('.bx-c-rec', card).innerHTML = d.status === 'figures' ? recordHtml(d) : '<p class="bx-c-none">No figures published yet</p>';
      var box = $('.bx-chart:not(.is-image)', card);
      if (box) { drawChart(box, d.equity); if (chartWatch) chartWatch.observe(box); }
    }, function () {
      var card = document.getElementById(id);
      if (card) $('.bx-c-rec', card).innerHTML = '<p class="bx-note">This strategy’s record did not load. Reload the page to try again.</p>';
    });
  }

  /* ---------- the chart: the record's own day-by-day equity, drawn as on the open strategy view ---------- */
  function niceStep(span, want) {
    var raw = span / want, pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / pow;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pow;
  }
  function drawChart(box, eq) {
    if (!box || !eq || !eq.length) return;
    var w = Math.max(220, Math.round(box.clientWidth - 20)), hgt = Math.max(120, Math.round(box.clientHeight - 12));
    var vals = eq.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0]));
    var span = (hi - lo) || 1, step = niceStep(span, hgt < 220 ? 3 : 5), marksY = [], widest = 2;
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      var t0 = Math.abs(v) < 1e-9 ? '$0' : A.usd(v, true, false);
      marksY.push([v, t0]);
      widest = Math.max(widest, t0.length);
    }
    var pad = { l: Math.round(widest * 6.4 + 12), r: 8, t: 14, b: 26 }, n = eq.length;
    var X = function (i) { return pad.l + (w - pad.l - pad.r) * (n === 1 ? 0 : i / (n - 1)); };
    var Y = function (val) { return pad.t + (hgt - pad.t - pad.b) * (1 - (val - lo) / span); };
    var line = eq.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    var zero = Y(0), last = eq[n - 1], lines = '', labels = '', ticks = '';
    var area = line + ' L' + X(n - 1).toFixed(1) + ' ' + zero.toFixed(1) + ' L' + X(0).toFixed(1) + ' ' + zero.toFixed(1) + ' Z';
    marksY.forEach(function (mk) {
      var y = Y(mk[0]);
      lines += '<line x1="' + pad.l + '" x2="' + (w - pad.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#2f3349" stroke-width="1"' + (mk[1] === '$0' ? '' : ' stroke-dasharray="3 5"') + '/>';
      labels += '<text class="bx-gl" text-anchor="end" x="' + (pad.l - 7) + '" y="' + (y + 4).toFixed(1) + '">' + esc(mk[1]) + '</text>';
    });
    var marks = [], seen = '';
    eq.forEach(function (pt, i) {
      var ym = pt[0].slice(0, 7);
      if (ym !== seen) { seen = ym; marks.push([i, ym]); }
    });
    var every = Math.max(1, Math.ceil(marks.length / Math.max(1, Math.floor((w - pad.l - pad.r) / 64))));
    marks.forEach(function (mk, k) {
      var x = X(mk[0]), mo = Number(mk[1].slice(5)), yr = mk[1].slice(0, 4);
      if (k) lines += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + pad.t + '" y2="' + (hgt - pad.b) + '" stroke="#23263a" stroke-width="1"/>';
      if (k % every || x > w - pad.r - 44) return;
      ticks += '<text class="bx-xl" x="' + (x + (k ? 4 : 0)).toFixed(1) + '" y="' + (hgt - 8) + '">' + esc(MON[mo - 1] + (k === 0 || mo === 1 ? ' ' + yr : '')) + '</text>';
    });
    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" role="img" aria-label="Equity curve from ' +
      esc(A.day(eq[0][0])) + ' to ' + esc(A.day(last[0])) + ', ending at ' + esc(A.usd(last[1], true)) + '. Hypothetical backtest: profit and loss added up day by day.">' +
      '<defs><linearGradient id="bx-eq-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      lines + '<path d="' + area + '" fill="url(#bx-eq-card)"/>' +
      '<path d="' + line + '" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(last[1]).toFixed(1) + '" r="3.5" fill="#fff"/>' +
      labels + ticks + '</svg>';
    box.dataset.w = w; box.dataset.h = hgt;
  }
  function redraw() {
    var box = $('.bx-card .bx-chart:not(.is-image)'), d = docs[st.open];
    if (!box || !d || !d.equity) return;
    if (Number(box.dataset.w) === Math.max(220, Math.round(box.clientWidth - 20)) && Number(box.dataset.h) === Math.max(120, Math.round(box.clientHeight - 12))) return;
    drawChart(box, d.equity);
  }

  /* ---------- events ---------- */
  function clearFilters() {
    st.q = ''; st.market = ''; st.grade = '';
    Object.keys(st.r).forEach(function (k) { st.r[k] = ''; });
    toPanel();
  }
  $('#q').addEventListener('input', function () { st.q = this.value; changed(); });
  $('#f-market').addEventListener('change', function () { st.market = this.value; changed(); });
  $('#f-grade').addEventListener('change', function () { st.grade = this.value; changed(); });
  fromAddress();
  Object.keys(st.r).forEach(function (k) {
    $('#f-' + k).addEventListener('input', function () { st.r[k] = this.value; changed(); });
  });
  $('#f-clear').addEventListener('click', function () { clearFilters(); changed(); });
  $('#empty-clear').addEventListener('click', function () { clearFilters(); changed(); });
  // The first click sorts a column best first, the second reverses it.
  $('#t-head').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-sort]');
    if (!b) return;
    var k = b.dataset.sort;
    if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
    else { st.sort = k; st.dir = col(k).first; }
    changed();
  });
  // A click anywhere on a row opens its card; a second click closes it. The name is the row's button for the keyboard.
  $('#rows').addEventListener('click', function (e) {
    if (e.target.closest('a, .bx-det')) return;
    var tr = e.target.closest('tr.bx-row');
    if (!tr || String(window.getSelection && window.getSelection()) !== '') return;
    if (st.open === tr.dataset.slug) closeCard(); else openCard(tr.dataset.slug);
    toAddress();
  });

  // A strategy picked in a tier card (row E724) opens bots.js's full-screen view in place, as on the AFT Trading Bots
  // page: the table, its filters, its sort and the page's scroll stay as they are. The open row's #slug is taken off the
  // address first (replaceState, no hashchange), so Close and Back return to an address with no strategy in it and
  // bots.js does not reopen that row's view; the #slug is written back once the view closes.
  var tierPick = '';
  $('#plans').addEventListener('click', function (e) {
    var a = e.target.closest('a.bx-slink');
    if (!a) return;
    var s = a.getAttribute('href').slice(1);
    if (!Object.prototype.hasOwnProperty.call(bySlug, s)) return;
    tierPick = s;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  function fromTier(slug) {
    return slug && (slug === tierPick || (history.state && history.state.bxTier === slug));
  }
  // strategies.css hides bots.js's view on this page (a link anywhere else opens the card in the table); a tier pick
  // lifts that rule for as long as its view is open, with the display bots.css gives the two elements.
  var sheetEl = $('#sheet'), backEl = $('#backdrop');
  function tierView(on) {
    [[sheetEl, 'flex'], [backEl, 'block']].forEach(function (p) {
      if (on) p[0].style.setProperty('display', p[1], 'important'); else p[0].style.removeProperty('display');
    });
  }
  if (sheetEl && backEl && window.MutationObserver) {
    new MutationObserver(function () { tierView(!sheetEl.hidden && fromTier(hashSlug())); })
      .observe(sheetEl, { attributes: true, attributeFilter: ['hidden'] });
  }

  // Any other link to #slug (or a page loaded onto one): bots.js opens its full-screen view first, so that view is
  // closed and the card opens in the table.
  function takeHash() {
    var slug = hashSlug(), sheet = $('#sheet');
    if (fromTier(slug)) {   // the view stays open where he is; this history entry is marked so Forward does the same
      if (!(history.state && history.state.bxTier === slug)) history.replaceState({ bxTier: slug }, '', location.href);
      return;
    }
    if (tierPick && !slug) { tierPick = ''; if (st.open) toAddress(); return; }   // the view closed: an open row's #slug goes back
    tierPick = '';
    if (!slug) return;
    if (sheet && !sheet.hidden) $('#sheet-close').click();
    if (!passes(bySlug[slug])) clearFilters();
    st.open = slug;
    changed();
    var th = $('#rows tr[data-slug="' + slug + '"] .bx-c-name');
    if (th) th.scrollIntoView({ block: 'start', inline: 'nearest' });
  }
  window.addEventListener('hashchange', takeHash);

  /* ---------- the filter panel: behind one button at every width; a sheet on phones ---------- */
  var panel = $('#filters'), back = $('#f-back'), opener = $('#f-open');
  var phone = window.matchMedia('(max-width:899.98px)');
  function openPanel() {
    panel.classList.add('is-open');
    opener.setAttribute('aria-expanded', 'true');
    if (phone.matches) { back.hidden = false; document.body.classList.add('noscroll'); }
    $('#f-done').focus({ preventScroll: true });
  }
  function closePanel() {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    opener.setAttribute('aria-expanded', 'false');
    back.hidden = true;
    document.body.classList.remove('noscroll');
    opener.focus({ preventScroll: true });
  }
  opener.addEventListener('click', function () { if (panel.classList.contains('is-open')) closePanel(); else openPanel(); });
  $('#f-done').addEventListener('click', closePanel);
  $('#f-x').addEventListener('click', closePanel);
  back.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  if (phone.addEventListener) phone.addEventListener('change', closePanel);

  /* ---------- the pinned bar belongs to the tier cards: it shows only while they are on screen ---------- */
  var plansEl = $('#plans');
  if (plansEl && window.IntersectionObserver) {
    new IntersectionObserver(function (seen) {
      document.body.classList.toggle('bx-bar-on', seen[seen.length - 1].isIntersecting);
    }).observe(plansEl);
  } else {
    document.body.classList.add('bx-bar-on');
  }

  /* ---------- start ---------- */
  toPanel();
  draw();
  takeHash();
})();
