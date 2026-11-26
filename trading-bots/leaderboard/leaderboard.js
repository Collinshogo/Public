/* AFT Trading Bots: the Strategy Leaderboard. No tracking of its own and no network call beyond this site's own data files.
   - What it ranks: the strategies the Strategy Library lists (data/catalog.js: a released strategy with its TradingView
     page, and a coming-soon one that has figures), by one calendar month's profit, for the current month in the
     records and the two before it.
   - Where each figure comes from: the month's entry in the strategy's own data file (data/<slug>.json, months), the same
     entry its card prints in the Monthly P&L table: the trades closed in that month and no others. Nothing is worked
     out here but the order, the bar lengths, the moves and the count in profit. A record import changes this page
     with no edit to it.
   - The current month is the newest month that more than half the records have reached, so one early export does not
     open a board of its own and one late record does not hold the page back. A month is a part month when a record
     stops before the month's last weekday (or starts after its first); the board says so and each line carries its
     record's last day.
   - The bars share one scale across the boards, so a longer bar is always a larger figure. A loss is red and carries
     its minus sign.
   - Names are lettered by the site's rule (as bots.js and calc.js have it): the level from the strategy's plan, the
     colours from its market. A coming-soon strategy carries the tag "Coming soon" right after its name.
   - Under 1100 px one board shows at a time, picked with the month buttons; from 1100 px the three stand side by side
     (leaderboard.css). A link to #m-2026-11 opens that month. */
(function () {
  'use strict';

  var CAT = window.AFT_BOTS_CATALOG || {};
  var FIGS = CAT.figures || {};
  var DATA = document.body.dataset.dataBase || '../data/';
  var LIB = '../strategies/';
  var SHOWN = 3;
  var MINUS = '−';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var boardsEl = $('#lb-boards'), pickEl = $('#lb-pick'), statusEl = $('#lb-status');
  if (!boardsEl || !pickEl || !statusEl) return;

  /* ---------- formatting ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cents(n) { return Math.round(n * 100); }
  function usd(n) {
    var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (cents(n) < 0 ? MINUS : (cents(n) > 0 ? '+' : '')) + '$' + abs;
  }
  function tone(n) { return cents(n) < 0 ? 'bx-neg' : (cents(n) > 0 ? 'bx-pos' : ''); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function isYm(v) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v)); }
  function isDay(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v)); }
  function monthName(ym) { return MONTH[Number(ym.slice(5)) - 1]; }
  function monthLong(ym) { return monthName(ym) + ' ' + ym.slice(0, 4); }
  function dayShort(iso) { var p = iso.split('-'); return MON[Number(p[1]) - 1] + ' ' + Number(p[2]); }
  function dayFull(iso) { return dayShort(iso) + ', ' + iso.slice(0, 4); }
  function ymPrev(ym) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5)) - 1;
    if (m < 1) { m = 12; y -= 1; }
    return y + '-' + (m < 10 ? '0' : '') + m;
  }
  function iso(dt) { return dt.toISOString().slice(0, 10); }
  // The first and the last Monday-to-Friday date of a month. Holidays are not removed, as on the rest of the site.
  function edgeWeekday(ym, last) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5));
    var dt = new Date(Date.UTC(y, last ? m : m - 1, last ? 0 : 1));
    while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) dt.setUTCDate(dt.getUTCDate() + (last ? -1 : 1));
    return iso(dt);
  }
  function plural(n, one, many) { return n.toLocaleString('en-US') + ' ' + (n === 1 ? one : many); }
  // One day, or a range of days: "Nov 20", "Nov 18–20", "Oct 30 – Nov 3"; the year is added by the caller.
  function daySpan(a, b) {
    if (a === b) return dayShort(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return dayShort(a) + '–' + Number(b.slice(8));
    return dayShort(a) + ' – ' + dayShort(b);
  }

  /* ---------- the strategies, their plans and their lettering (the site's rule, as in bots.js and calc.js) ---------- */
  var TV = /^https:\/\/www\.tradingview\.com\/script\//;
  function isSoon(s) { return !!s && s.coming_soon === true; }
  var list = (CAT.strategies || []).filter(function (s) {
    if (!s || !s.name || !/^[a-z0-9-]+$/.test(String(s.slug))) return false;
    return isSoon(s) ? Object.prototype.hasOwnProperty.call(FIGS, s.slug) : (s.named === true && TV.test(String(s.tv_url)));
  });
  var LAD = (CAT.tiers || []).slice().sort(function (a, b) { return a.rank - b.rank; });
  function tierOf(s) { return ([1, 2, 3, 4].indexOf(s.grade) >= 0 && LAD[LAD.length - s.grade]) ? LAD[LAD.length - s.grade].id : s.tier; }
  function rungOf(s) { var t = tierOf(s), i = -1; LAD.forEach(function (x, k) { if (x.id === t) i = k; }); return i; }
  // A name: the lowest plan plain, the top plan and the one under it the sheen, every plan between solid colour.
  function nameFinish(s) {
    var i = rungOf(s), n = LAD.length;
    return i <= 0 ? 'plain' : (i === n - 1 || (n >= 3 && i === n - 2) ? 'sheen' : 'solid');
  }
  // A plan's badge: the lowest plain, the top the sheen, with four or more the one under it polished, the rest the gradient.
  function badgeFinish(i) {
    var n = LAD.length;
    return i === 0 ? 'plain' : (i === n - 1 ? 'sheen' : (n >= 4 && i === n - 2 ? 'polished' : 'gradient'));
  }
  function planBadge(s) {
    var i = rungOf(s);
    return i < 0 ? '' : '<span class="bx-tier" data-lvl="' + badgeFinish(i) + '">' + esc(LAD[i].name) + '</span>';
  }
  function colour(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)); }
  var MKT = { MNQ: 'mnq', MGC: 'mgc', MES: 'mes' };
  function marketCode(s) { return s.chip || String(s.market_line || '').split(' · ')[0]; }
  function palette(s) {
    var g = s.lettering, out = ['--n:' + String(s.name).length], m = MKT[String(marketCode(s)).toUpperCase()];
    if (m) out.push('--c0:var(--' + m + '-0)', '--c1:var(--' + m + ')', '--c2:var(--' + m + '-2)');
    else if (g && g.length === 3 && g.every(colour)) out.push('--c0:' + g[0], '--c1:' + g[1], '--c2:' + g[2]);
    return out;
  }
  function soonTag(s) { return isSoon(s) ? '<span class="bx-cs"><span class="bx-vh">, </span>Coming soon</span>' : ''; }
  // A line's name: one row of letters, with the sheen where its level is lit.
  function nameSpan(s) {
    var fin = nameFinish(s);
    var sh = fin === 'sheen' ? '<span class="bx-sh" aria-hidden="true" data-t="' + esc(s.name) + '"></span>' : '';
    var n = '<span class="bx-sname bx-wm" data-lvl="' + fin + '" style="' + palette(s).join(';') + '">' + esc(s.name) + sh + '</span>';
    return isSoon(s) ? '<span class="bx-nt">' + n + soonTag(s) + '</span>' : n;
  }
  // A podium name: the same level and colours, but it may break between its words, so it carries no sheen (the sheen
  // repeats the name on one row). --w is its longest word, which sets its size in a narrow place (leaderboard.css).
  function podName(s) {
    var w = String(s.name).split(/\s+/).reduce(function (a, b) { return Math.max(a, b.length); }, 1);
    return '<span class="lb-pname bx-wm" data-lvl="' + nameFinish(s) + '" style="' + palette(s).concat('--w:' + w).join(';') + '">' + esc(s.name) + '</span>';
  }

  /* ---------- the boards ---------- */
  var recs = [];          // { s, months: { ym: { pnl_usd, trades } }, from, to, run }

  function usable(d) {
    return !!(d && d.months && d.months.length && d.test && isDay(d.test.window_from) && isDay(d.test.window_to));
  }
  function board(ym) {
    var rows = [], none = [], fw = edgeWeekday(ym, false), lw = edgeWeekday(ym, true);
    recs.forEach(function (r) {
      var e = r.months[ym];
      if (!e && r.from <= lw && r.to >= fw) e = { pnl_usd: 0, trades: 0 };        // inside its dates with no entry: no trade closed in it
      if (!e) { none.push(r); return; }
      rows.push({ r: r, v: e.pnl_usd, n: e.trades, late: r.from > fw ? r.from : '', early: r.to < lw ? r.to : '', end: r.to < lw ? r.to : lw });
    });
    rows.sort(function (a, b) { return cents(b.v) - cents(a.v) || (a.r.s.name < b.r.s.name ? -1 : 1); });
    rows.forEach(function (x, i) { x.rank = i + 1; });
    var ends = rows.map(function (x) { return x.end; }).sort();
    return {
      ym: ym, rows: rows, none: none,
      part: rows.some(function (x) { return x.early || x.late; }),
      ends: ends.length ? [ends[0], ends[ends.length - 1]] : null,
      up: rows.filter(function (x) { return cents(x.v) > 0; }).length
    };
  }
  // How far a line moved from the month before: places up (+), down (-), 0, or null when it was not on that board.
  function moves(b, before) {
    var was = {};
    before.rows.forEach(function (x) { was[x.r.s.slug] = x.rank; });
    b.rows.forEach(function (x) {
      x.mv = before.rows.length ? (Object.prototype.hasOwnProperty.call(was, x.r.s.slug) ? was[x.r.s.slug] - x.rank : null) : undefined;
    });
    b.before = before.rows.length ? before.ym : '';
  }
  function moveMark(x, b) {
    if (x.mv === undefined) return '';
    var from = ' from ' + monthName(b.before);
    if (x.mv === null) return '<span class="lb-mv is-new">new<span class="bx-vh">: not on the board in ' + monthName(b.before) + '</span></span>';
    if (x.mv === 0) return '<span class="lb-mv"><span aria-hidden="true">–</span><span class="bx-vh">, same place as in ' + monthName(b.before) + '</span></span>';
    var n = Math.abs(x.mv), up = x.mv > 0;
    return '<span class="lb-mv ' + (up ? 'is-up' : 'is-down') + '"><span aria-hidden="true">' + (up ? '▲' : '▼') + n + '</span><span class="bx-vh">, ' +
      (up ? 'up ' : 'down ') + plural(n, 'place', 'places') + from + '</span></span>';
  }
  function trades(n) { return typeof n === 'number' && isFinite(n) ? plural(n, 'trade', 'trades') : ''; }
  // What stands under a name: its market, its plan (on a line) and the month's trades.
  function meta(x, withPlan) {
    var bits = [], mk = marketCode(x.r.s), pl = withPlan ? planBadge(x.r.s) : '', tr = trades(x.n);
    if (mk) bits.push('<span>' + esc(mk) + '</span>');
    if (pl) bits.push(pl);
    if (tr) bits.push('<span>' + tr + '</span>');
    return bits.join(withPlan ? ' ' : '<span class="lb-dot" aria-hidden="true"> · </span>');
  }
  // In a part month, the days of the month the record covers: "to Nov 20" (or "from Nov 3", or both).
  function partDays(x) {
    if (x.late && x.early) return dayShort(x.late) + ' to ' + dayShort(x.early);
    return x.late ? 'from ' + dayShort(x.late) : (x.early ? 'to ' + dayShort(x.early) : '');
  }
  var CROWN = '<svg class="lb-crown" viewBox="0 0 24 18" width="24" height="18" aria-hidden="true" focusable="false"><path d="M2 5.2l5 4.3L12 1.6l5 7.9 5-4.3-2 10.6H4z"/><path d="M4.2 17h15.6" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function podCell(x) {
    var s = x.r.s;
    return '<li class="lb-p" data-r="' + x.rank + '"><a class="lb-plink" href="' + LIB + '#' + esc(s.slug) + '">' +
      '<span class="bx-vh">Place ' + x.rank + ': </span>' +
      (x.rank === 1 ? CROWN : '') +
      podName(s) + soonTag(s) +
      '<b class="lb-pv ' + tone(x.v) + '">' + usd(x.v) + '</b>' +
      '<span class="lb-pmeta"><span>' + meta(x, false) + '</span>' + (partDays(x) ? '<span>' + partDays(x) + '</span>' : '') + '</span>' +
      '<span class="lb-ped" aria-hidden="true">' + x.rank + '</span>' +
      '</a></li>';
  }
  function rowLine(x, b, top) {
    var s = x.r.s, w = top > 0 ? Math.abs(cents(x.v)) / top * 100 : 0;
    if (cents(x.v) !== 0 && w < 1.2) w = 1.2;
    var pd = partDays(x);
    return '<li class="lb-row"><a class="lb-link' + (pd ? ' has-end' : '') + '" href="' + LIB + '#' + esc(s.slug) + '">' +
      '<span class="lb-rk"><b><span class="bx-vh">Place </span>' + x.rank + '</b>' + moveMark(x, b) + '</span>' +
      '<span class="lb-nm">' + nameSpan(s) + '</span>' +
      '<b class="lb-v ' + tone(x.v) + '">' + usd(x.v) + '</b>' +
      '<span class="lb-meta">' + meta(x, true) + '</span>' +
      (pd ? '<span class="lb-end">' + pd + '</span>' : '') +
      '<span class="lb-bar" aria-hidden="true"><i class="' + (cents(x.v) < 0 ? 'is-neg' : 'is-pos') + '" style="width:' + w.toFixed(2) + '%"></i></span>' +
      '</a></li>';
  }
  function boardHtml(b, i, top) {
    var id = 'm-' + b.ym, live = i === 0 && b.part;
    var state = live ? 'In progress' : (b.part ? 'Part month' : 'Full month');
    var sub = [];
    if (b.part && b.ends) sub.push('Tested to ' + daySpan(b.ends[0], b.ends[1]) + ', ' + b.ends[1].slice(0, 4));
    sub.push(b.up + ' of ' + b.rows.length + ' in profit');
    var pod = b.rows.length >= 3 ? b.rows.slice(0, 3) : [], rest = b.rows.slice(pod.length);
    return '<section class="lb-board' + (i === 0 ? ' is-on' : '') + '" id="' + id + '" aria-labelledby="' + id + '-h" data-m="' + b.ym + '"' + (i === 0 ? ' data-main=""' : '') + '>' +
      '<header class="lb-bh"><h2 id="' + id + '-h">' + esc(monthLong(b.ym)) + '</h2>' +
      '<p class="lb-state"' + (live ? ' data-live=""' : '') + '>' + state + '</p>' +
      '<p class="lb-sub">' + sub.map(esc).join(' <span class="lb-dot" aria-hidden="true">·</span> ') + '</p></header>' +
      (pod.length ? '<ol class="lb-pod">' + pod.map(podCell).join('') + '</ol>' : '') +
      (rest.length ? '<ol class="lb-rows" start="' + (pod.length + 1) + '">' + rest.map(function (x) { return rowLine(x, b, top); }).join('') + '</ol>' : '') +
      (b.none.length ? '<p class="lb-none">No record for this month: ' + b.none.map(function (r) { return esc(r.s.name); }).join(', ') + '.</p>' : '') +
      '</section>';
  }

  /* ---------- the month buttons (under 1100 px one board shows at a time) ---------- */
  function show(ym, scroll) {
    var hit = false;
    $$('.lb-board', boardsEl).forEach(function (el) { var on = el.getAttribute('data-m') === ym; el.classList.toggle('is-on', on); hit = hit || on; });
    if (!hit) return false;
    $$('button', pickEl).forEach(function (bt) { bt.setAttribute('aria-pressed', bt.getAttribute('data-m') === ym ? 'true' : 'false'); });
    if (scroll) {
      // a pick made far down a long board: back to the top of the boards, clear of the bar and the buttons
      var y = boardsEl.getBoundingClientRect().top, clear = pickEl.getBoundingClientRect().bottom + 10;
      if (y < clear - 1) window.scrollBy(0, y - clear);
    }
    return true;
  }
  pickEl.addEventListener('click', function (e) {
    var bt = e.target.closest ? e.target.closest('button[data-m]') : null;
    if (!bt) return;
    var ym = bt.getAttribute('data-m');
    if (show(ym, true)) { try { history.replaceState(null, '', '#m-' + ym); } catch (err) { /* ignore */ } }
  });
  function fromHash(first) {
    var m = /^#m-(\d{4}-\d{2})$/.exec(location.hash || '');
    if (!m || !show(m[1], false)) return;
    var el = document.getElementById('m-' + m[1]);
    if (el && first) el.scrollIntoView();
  }
  window.addEventListener('hashchange', function () { fromHash(false); });

  /* ---------- load ---------- */
  function fail() { statusEl.textContent = 'The leaderboard could not be loaded. Try again later.'; }
  function build() {
    // the current month: the newest month that more than half the records have reached
    var reached = recs.map(function (r) { return r.to.slice(0, 7); }).sort();
    var latest = reached[Math.floor((reached.length - 1) / 2)];
    if (!isYm(latest)) { fail(); return; }
    var yms = [latest], k;
    for (k = 1; k <= SHOWN; k++) yms.push(ymPrev(yms[k - 1]));        // one more than shown: the moves of the oldest board
    var all = yms.map(board), shown = all.slice(0, SHOWN).filter(function (b) { return b.rows.length; });
    if (!shown.length) { fail(); return; }
    shown.forEach(function (b) { moves(b, all[all.indexOf(b) + 1]); });
    var top = 0;
    shown.forEach(function (b) { b.rows.forEach(function (x) { top = Math.max(top, Math.abs(cents(x.v))); }); });

    boardsEl.setAttribute('data-n', String(shown.length));
    boardsEl.innerHTML = shown.map(function (b, i) { return boardHtml(b, i, top); }).join('');
    pickEl.innerHTML = shown.map(function (b, i) {
      return '<button type="button" class="lb-pb" data-m="' + b.ym + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" aria-controls="m-' + b.ym + '">' +
        esc(monthName(b.ym)) + '<span class="bx-vh"> ' + b.ym.slice(0, 4) + '</span></button>';
    }).join('');
    pickEl.hidden = shown.length < 2;

    var runs = recs.map(function (r) { return r.run; }).filter(isDay).sort(), asof = $('#lb-asof'), part = $('#lb-n-part');
    if (asof) asof.textContent = 'Hypothetical backtests from TradingView’s Strategy Tester.' + (runs.length ? ' Last test run ' + dayFull(runs[runs.length - 1]) + '.' : '');
    if (part) part.hidden = !shown[0].part;
    statusEl.hidden = true;
    statusEl.textContent = '';
    fromHash(true);
    document.body.setAttribute('data-ready', '1');
  }

  if (!list.length) { fail(); return; }
  Promise.all(list.map(function (s) {
    return fetch(DATA + s.slug + '.json', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (d) { return { s: s, d: d }; }, function () { return { s: s, d: null }; });
  })).then(function (got) {
    got.forEach(function (x) {
      if (!usable(x.d)) return;
      var months = {};
      x.d.months.forEach(function (m) {
        if (m && isYm(m.month) && typeof m.pnl_usd === 'number' && isFinite(m.pnl_usd)) months[m.month] = { pnl_usd: m.pnl_usd, trades: m.trades };
      });
      recs.push({ s: x.s, months: months, from: x.d.test.window_from, to: x.d.test.window_to, run: x.d.test.run_date });
    });
    if (!recs.length) { fail(); return; }
    build();
  });
})();
