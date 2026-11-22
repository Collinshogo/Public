/* AFT Trading Bots storefront: page script.
   No tracking of its own and no network call beyond this folder's own data files.
   - What is on the page comes from two small files: bots-config.js (the Lifetime plan, the set-up guide link,
     each tier's checkout link) and data/catalog.js (which strategies are named, and in which tier).
     A strategy that is not named there is not on the page.
   - Coming soon (row E754): an entry with coming_soon set to true is listed like any other, in the same lists, with the
     tag "Coming soon" beside its name wherever the name shows. It never links to a script page, a checkout or a trial,
     it is in no savings sum, and with a strategy open the bar does not offer its tier.
     Row E816: in a plan card its line has no tag; it stands under the released lines, in a box of the card's own headed
     "Coming soon" (the heading is the mark), and its line still says "Coming soon" to screen readers.
   - Tiers and the selection bar: one choice, kept in localStorage. Tiers are bundles: each higher tier
     includes the ones below it (data-rank on each tier card). A tier with no checkout link yet shows
     "Opening soon" in the bar, and that button does nothing.
   - A tier is defined once, by its card in index.html (name, rank, price, its lines) and its checkout key in
     bots-config.js. Its look follows its place among the tiers, worked out here: the lettering of its title and
     of its strategies' names, the card's finish, the tier pill, the bar and the open strategy's tier line.
     A card with no data-price reads "Price to be set" wherever its price would stand.
   - A tier's list (row E803): one line per named strategy, never two side by side: its name, its return on drawdown as a percentage (row E815)
     and profit factor from the published figures, and its own monthly price; under the list one line says the figures are
     a hypothetical backtest and over which dates. Every one is shown (row E752: no list is cut).
   - The open strategy: every strategy name is a real link (#slug). The hash opens the view in place,
     Back or Close returns to the same spot, and the choice in the bar is never lost. While a strategy
     is open the bar also carries the button that chooses that strategy's tier, so one bar is pinned, not two.
   - The Strategies page (/trading-bots/strategies/) runs this same script: its tier cards are built here from the
     catalog, and strategies.js draws its list from what this script exposes as window.AFT_BOTS.
   - Savings (row E803): a tier's price is shown after its strategies' one-by-one total, struck through, with the
     monthly saving under it, worked out from the catalog's prices, only when every strategy the tier includes has
     a price and the tier costs less. Lifetime says what the top tier would cost over the same money.
   - Performance: drawn from data/<slug>.json (schema aft.strategy-performance/2, or /1 in an older file).
     The four figures are printed exactly as the file's display strings give them. First screen: the chart,
     the four-figure bar and the monthly P&L. What it is, the test, the other figures and the proof scroll below. */
(function () {
  'use strict';

  var CFG = window.AFT_BOTS_CONFIG || {};
  var CAT = window.AFT_BOTS_CATALOG || {};
  // Row E754 (2026-11-21): a coming-soon strategy is a catalog entry like any other that also carries
  // coming_soon: true. It is in the regular lists with the tag "Coming soon" beside its name (soonTag), and in its
  // tier's card when it has a tier. Its figures come only from its own data file; without one it reads as "No figures
  // published yet". Its instrument, when the catalog gives none, is the first word of its market line.
  var FIGS = CAT.figures || {};
  function isSoon(s) { return !!s && s.coming_soon === true; }
  function hasFigs(s) { return !isSoon(s) || Object.prototype.hasOwnProperty.call(FIGS, s.slug); }   // no data file is fetched for one without figures
  (CAT.strategies || []).forEach(function (s) {
    if (isSoon(s) && !s.chip && /^[A-Z0-9]{2,6} · /.test(String(s.market_line))) s.chip = String(s.market_line).split(' · ')[0];
  });
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

  /* ---------- daily P&L (row E732): shared by the open strategy view and the Strategy Library's open card ---------- */
  // The words in a day's cell: under 1,000 whole dollars with a sign, 1,000 to 9,999 in K with one decimal, 10,000 and over
  // in whole K; half rounds away from zero; exactly zero is "0". Worked in whole cents so no float edge decides a rounding.
  function dayWords(v) {
    var c = Math.round(Math.abs(v) * 100), s = v < 0 ? MINUS : '+', r = Math.floor((c + 50) / 100), t;
    if (c === 0) return '0';
    if (r < 1000) return s + r;
    t = Math.floor((c + 5000) / 10000);
    if (t < 100) return s + (t / 10).toFixed(1) + 'K';
    return s + Math.floor((c + 50000) / 100000) + 'K';
  }
  function dayExact(v) { return Math.round(v * 100) === 0 ? '$0.00' : usd(v, true); }
  var DOW = [['Su', 'Sunday'], ['Mo', 'Monday'], ['Tu', 'Tuesday'], ['We', 'Wednesday'], ['Th', 'Thursday'], ['Fr', 'Friday'], ['Sa', 'Saturday']];
  function hasDays(d) { return !!(d && d.days && d.days.length && d.months && d.months.length && d.test); }
  function calId(key, ym) { return key + '-cal-' + ym; }
  var SHOWN = 2;   // months shown by day, the latest on top (2026-11-20, row E735)
  // One month of the Monthly P&L list. A record with days gets a button that shows that month's calendar; one without
  // draws exactly as before.
  function monthItem(d, m, words, key) {
    var cls = 'bx-month ' + (m.pnl_usd > 0 ? 'is-win' : (m.pnl_usd < 0 ? 'is-loss' : ''));
    var inner = '<span>' + esc(month(m.month)) + '</span><b class="' + tone(m.pnl_usd) + '">' + esc(words) + '</b>';
    if (!hasDays(d)) return '<li class="' + cls + '">' + inner + '</li>';
    var latest = d.months.indexOf(m) >= d.months.length - SHOWN;
    return '<li class="bx-mo-li"><button type="button" class="' + cls + ' bx-mo-b" data-cal="' + (latest ? 'latest' : 'earlier') + '" aria-expanded="' + latest + '" aria-controls="' + calId(key, m.month) + '">' + inner + '</button></li>';
  }
  // The calendars: the two latest months shown, the latest first, every earlier month drawn hidden in the place after them
  // (one at a time).
  // Weeks are rows; Monday to Friday are columns, with a Sunday or a Saturday column only when the record has an entry on
  // that weekday, then in every calendar of the record.
  function dailyCals(d, key) {
    if (!hasDays(d)) return '';
    var amt = {}, on = {};
    d.days.forEach(function (e) { amt[e[0]] = e[1]; on[new Date(e[0] + 'T00:00:00Z').getUTCDay()] = 1; });
    var cols = [1, 2, 3, 4, 5];
    if (on[0]) cols.unshift(0);
    if (on[6]) cols.push(6);
    var start = cols[0], from = d.test.window_from, to = d.test.window_to, cut = Math.max(0, d.months.length - SHOWN);
    function iso(dt) { return dt.toISOString().slice(0, 10); }
    function cell(dt, mo) {
      if (dt.getUTCMonth() !== mo) return '<td class="is-pad"></td>';
      var k = iso(dt), n = dt.getUTCDate(), name = day(k);
      if (k < from || k > to) return '<td class="is-out"><i aria-hidden="true">' + n + '</i><span class="bx-vh">' + esc(name) + ': outside the test</span></td>';
      if (!Object.prototype.hasOwnProperty.call(amt, k)) return '<td><i aria-hidden="true">' + n + '</i><span class="bx-vh">' + esc(name) + ': no trade closed</span></td>';
      var v = amt[k], full = name + ': ' + dayExact(v);
      return '<td class="' + (v > 0 ? 'is-win' : (v < 0 ? 'is-loss' : 'is-zero')) + '" title="' + esc(full) + '"><i aria-hidden="true">' + n + '</i>' +
        '<b class="' + tone(v) + '" aria-hidden="true">' + esc(dayWords(v)) + '</b><span class="bx-vh">' + esc(full) + '</span></td>';
    }
    function cal(m, hidden) {
      var y = Number(m.month.slice(0, 4)), mo = Number(m.month.slice(5, 7)) - 1;
      var first = new Date(Date.UTC(y, mo, 1)), last = new Date(Date.UTC(y, mo + 1, 0));
      var wk = new Date(first.getTime() - ((first.getUTCDay() - start + 7) % 7) * 864e5), rows = '';
      while (wk <= last) {
        var cells = '', inMonth = false;
        cols.forEach(function (c) {
          var dt = new Date(wk.getTime() + ((c - start + 7) % 7) * 864e5);
          if (dt.getUTCMonth() === mo) inMonth = true;
          cells += cell(dt, mo);
        });
        if (inMonth) rows += '<tr>' + cells + '</tr>';
        wk = new Date(wk.getTime() + 7 * 864e5);
      }
      return '<table class="bx-cal" id="' + calId(key, m.month) + '"' + (hidden ? ' hidden' : '') + '><caption>' + esc(month(m.month) + ' · ' + usd(m.pnl_usd, true)) + '</caption>' +
        '<thead><tr>' + cols.map(function (c) { return '<th scope="col" abbr="' + DOW[c][1] + '"><span aria-hidden="true">' + DOW[c][0] + '</span><span class="bx-vh">' + DOW[c][1] + '</span></th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
    }
    return '<div class="bx-cals">' + d.months.slice(cut).reverse().map(function (m) { return cal(m, false); }).join('') +
      d.months.slice(0, cut).map(function (m) { return cal(m, true); }).join('') + '</div>';
  }
  // Row E737: an open record with day paths links to the account rules calculator with that strategy chosen.
  function calcLink(d) {
    return d && Array.isArray(d.day_paths) && d.day_paths.length && /^[a-z0-9-]+$/.test(String(d.slug))
      ? '<p class="bx-calc-l"><a href="/trading-bots/calculator/#s=' + d.slug + '">Run it through your account\'s rules</a></p>' : '';
  }
  // A month button: an earlier month shows its calendar in the place after the two (pressing it again, or another
  // month, closes or swaps it); one of the two latest scrolls its calendar into view.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button.bx-mo-b') : null;
    var cal = b && document.getElementById(b.getAttribute('aria-controls'));
    if (!cal) return;
    var how = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (b.getAttribute('data-cal') !== 'earlier') { cal.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: how }); return; }
    var opening = b.getAttribute('aria-expanded') !== 'true';
    $$('button.bx-mo-b[data-cal="earlier"]', b.closest('.bx-months')).forEach(function (o) {
      var c = document.getElementById(o.getAttribute('aria-controls'));
      o.setAttribute('aria-expanded', 'false');
      if (c) c.hidden = true;
    });
    if (opening) {
      b.setAttribute('aria-expanded', 'true');
      cal.hidden = false;
      cal.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: how });
    }
  });
  var TBS = 'Price to be set';   // a tier whose card carries no data-price
  function priceWords(p) { return p.price === null ? TBS : '$' + p.price.toLocaleString('en-US') + (p.kind === 'lifetime' ? ' once' : ' a month'); }
  function colour(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)); }
  // The lettering ladder (bots.css): the LEVEL is the finish of the strategy's tier, plain in the lower tiers (nameFinish(), below), the
  // PALETTE is the strategy's own three colours. The tier and the colours come from the catalog, so moving a
  // strategy to another tier there changes its lettering everywhere on the page with no style edit.
  // Row E802: the colours are the strategy's market's (bots.css: --mnq, --mgc, --mes, each with its light and end stops);
  // only a strategy on another market keeps its own three colours from the catalog.
  var MKT = { MNQ: 'mnq', MGC: 'mgc', MES: 'mes' };
  function palette(s) {          // [custom property, value] pairs for one name
    var g = s.lettering, out = [['--n', String(String(s.name).length)]], m = MKT[String(marketCode(s)).toUpperCase()];
    if (m) {
      out.push(['--c0', 'var(--' + m + '-0)'], ['--c1', 'var(--' + m + ')'], ['--c2', 'var(--' + m + '-2)']);
    } else if (g && g.length === 3 && g.every(colour)) {
      out.push(['--c0', g[0]], ['--c1', g[1]], ['--c2', g[2]]);
    }
    return out;
  }
  function lettering(s) {        // the attributes that letter a name: its level and its palette
    return ' data-lvl="' + nameFinish(s.tier) + '"' + (BOLT[s.tier] ? ' data-bolt=""' : '') + ' style="' + palette(s).map(function (p) { return p[0] + ':' + p[1]; }).join(';') + '"';
  }
  // The sheen on a name (bots.css): an empty element over the name that carries the name again as data,
  // hidden from screen readers and from selection. It goes on a name only when its tier's finish is lit:
  // the top tier (sheen) and, with four or more tiers, the one under it (polished, a slower and fainter pass).
  function sheenSpan(text) { return '<span class="bx-sh" aria-hidden="true" data-t="' + esc(text) + '"></span>'; }
  function lit(fin) { return fin === 'sheen' || fin === 'polished'; }
  function sheen(s) { return (lit(nameFinish(s.tier)) ? sheenSpan(s.name) : '') + (BOLT[s.tier] ? boltSpan(s.name) : ''); }
  // The lightning (row E810; bots.css): one bolt that strikes down through the name, drawn once in a box 64 by 96 units
  // (1.6em by 2.4em, so it is never stretched) centred on the letters at a point along the name. The main channel walks
  // down in steps of uneven length, each turned off its course by a random angle, toward a foot a little to one side, so
  // its path is crisp and irregular rather than an even zigzag; one or two shorter, fainter forks leave it among the
  // letters. Everything is seeded by the name, so a name always gets the same bolt and no two names share one.
  function boltSpan(text) {
    var t = String(text), h = 2166136261, k, W = 120, H = 96;
    for (k = 0; k < t.length; k++) h = Math.imul(h ^ t.charCodeAt(k), 16777619) >>> 0;
    function rnd() { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return (h >>> 8) / 16777216; }
    function jit() { return rnd() + rnd() + rnd() - 1.5; }               // -1.5 to 1.5, most often near 0
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function walk(x, y, a0, steps, l0, l1, turn, aim) {   // a channel of segments from (x, y), heading a0 (radians, down = pi/2)
      var p = [[x, y]];
      for (var i = 0; i < steps && y < H; i++) {
        var a = clamp((aim ? Math.atan2(H - y, aim - x) : a0) + jit() * turn, 0.42, Math.PI - 0.42), l = l0 + rnd() * (l1 - l0);
        x = clamp(x + Math.cos(a) * l, 3, W - 3); y = Math.min(H, y + Math.sin(a) * l); p.push([x, y]);
      }
      return p;
    }
    function fine(p, amp) {                               // a smaller kink in each longer step, off to one side of it
      var o = [p[0]];
      for (var i = 1; i < p.length; i++) {
        var a = p[i - 1], b = p[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy);
        if (l > 8) { var f = 0.3 + rnd() * 0.4, s = jit() * amp / 1.5; o.push([clamp(a[0] + dx * f - dy / l * s, 3, W - 3), a[1] + dy * f + dx / l * s]); }
        o.push(b);
      }
      return o;
    }
    function d(p) { return p.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(''); }
    var side = rnd() < 0.5 ? -1 : 1, x0 = W / 2 - side * (26 + rnd() * 10);
    var main = fine(walk(x0, 0, 0, 40, 7, 16, 0.7, W / 2 + side * (24 + rnd() * 14)), 4), forks = [];
    var nf = rnd() < 0.55 ? 2 : 1, used = {};
    for (k = 0; k < nf; k++) {
      var cand = [];
      main.forEach(function (q, i) { if (q[1] > 26 && q[1] < 60 && !used[i] && !used[i - 1] && !used[i + 1]) cand.push(i); });
      if (!cand.length) break;
      var at = cand[Math.floor(rnd() * cand.length)], q = main[at], nx = main[Math.min(at + 1, main.length - 1)];
      var dir = Math.atan2(nx[1] - q[1], nx[0] - q[0]) + (k ? -1 : 1) * side * (0.5 + rnd() * 0.35);
      used[at] = 1;
      forks.push(fine(walk(q[0], q[1], dir, k ? 2 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 2), 6, 12, 0.45), 2));
    }
    var fd = forks.map(d).join(''), md = d(main);
    return '<span class="bx-bolt" aria-hidden="true" data-t="' + esc(t) + '" style="--bd:-' + (rnd() * 7.8).toFixed(2) + 's"><svg viewBox="0 0 ' + W + ' ' + H + '" focusable="false" style="left:' + (30 + rnd() * 40).toFixed(1) + '%">'
      + (fd ? '<path class="g fg" d="' + fd + '"/><path class="c fc" d="' + fd + '"/>' : '') + '<path class="g" d="' + md + '"/><path class="c" d="' + md + '"/></svg></span>';
  }

  /* ---------- the Strategies page: its tier cards come from the catalog ---------- */
  var ON_LIST = document.body.dataset.page === 'strategies';
  var DATA = document.body.dataset.dataBase || 'data/';
  if (ON_LIST && $('#plan-grid')) {
    $('#plan-grid').innerHTML = (CAT.tiers || []).map(function (t) {
      return '<article class="bx-plan" data-plan="' + esc(t.id) + '" data-name="' + esc(t.name) + '" data-price="' + Number(t.price) + '" data-kind="monthly" data-rank="' + Number(t.rank) + '">' +
        '<header><h3 class="bx-wm bx-tname">' + esc(t.name) + '</h3></header>' +
        '<p class="bx-price"><span class="bx-amt">$' + Number(t.price).toLocaleString('en-US') + '</span><span class="bx-per">a month</span></p>' +
        '<button class="btn btn-ghost bx-choose" type="button" data-choose="' + esc(t.id) + '">Choose ' + esc(t.name) + '</button>' +
        '<div class="bx-strats"><ul data-tier-list="' + esc(t.id) + '"></ul></div>' +
        '</article>';
    }).join('');
  }

  /* ---------- the page's switches ---------- */
  // The one-time plan: built here and added to the page only when the config switches it on,
  // so with the switch off nothing about it is in the page at all.
  // Row E803: what Lifetime costs against the top tier's monthly price, both read from the page: the fewest whole months
  // of the top tier that cost more than Lifetime, and what they cost. No saving over a period is claimed.
  function lifeSum(top) {
    var tp = Number(top.dataset.price), life = 10000;
    if (!(tp > 0) || !(life > tp)) return '';
    var m = Math.floor(life / tp) + 1;
    return '<p class="bx-life-sum">Less than ' + m + ' months of ' + esc(top.dataset.name) + ' (' + m + ' \u00d7 $' + tp.toLocaleString('en-US') +
      ' = $' + (m * tp).toLocaleString('en-US') + '), then nothing more, every future strategy included.</p>';
  }
  if (CFG.lifetime === true) {
    var grid = $('#plan-grid');
    var topCard = $$('#plan-grid .bx-plan[data-rank]').sort(function (a, b) { return Number(b.dataset.rank) - Number(a.dataset.rank); })[0];
    if (grid && topCard) {     // it stands level with the top tier, whichever tier that is, and wears its finish (wear(), below)
      grid.insertAdjacentHTML('afterend',
        '<article class="bx-plan bx-life" data-plan="lifetime" data-name="Lifetime" data-price="10000" data-kind="lifetime" data-rank="' + esc(topCard.dataset.rank) + '">' +
        '<div class="bx-life-main"><header><h3 class="bx-wm bx-tname">Lifetime</h3>' +
        '<p class="bx-plan-for">Pay once, with no monthly charge. Every strategy in every plan, and everything new the bots produce in future.</p>' +
        '<p class="bx-life-note">Yours for life, with every update pushed to you automatically and ' + esc(topCard.dataset.name) + '\'s support and access.</p>' +
        // row E796 (the owner, 2026-11-21): Lifetime alone adds these two; no monthly tier offers a call or session (SD-158)
        '<ul class="bx-inc bx-life-adds"><li>Premium support</li>' +
        '<li>A one-on-one with the founder: help setting up your strategies and answers to your questions</li></ul></header>' +
        // row E832: Lifetime's four terms, word for word (BRAND-62, DP-076), always shown: no tap opens them
        '<ul class="bx-life-terms"><li>"For life" means for as long as All Fluence Trading offers the bots.</li><li>Access starts when Whop confirms the transfer (a bank transfer can take a few business days).</li><li>The one-on-one is booked by email after purchase.</li><li>The transfer goes to the bank details Whop shows at checkout; AFT never sends bank details by email or Discord.</li></ul></div>' +
        '<div class="bx-life-buy"><p class="bx-price"><span class="bx-amt">$10,000</span><span class="bx-per">once</span></p>' + lifeSum(topCard) +
        // row E827 item 15: how Lifetime is paid, under its price and above its button (the cart, the FAQ and the thanks
        // page say it in the same words)
        '<p class="bx-life-pay">Paid by bank transfer or wire through Whop <span class="bx-nb">(no card)</span>. No free trial.</p>' +   // row E832: when access starts is its second term
        '<button class="btn btn-ghost bx-choose" type="button" data-choose="lifetime">Choose Lifetime</button>' +
        // row E827 item 13: the sentence the plans' footnote, the FAQ, the cart and the legal page use
        '<p class="bx-life-fine">No refunds once charged.</p></div>' +
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
    plans[el.dataset.plan] = { id: el.dataset.plan, name: el.dataset.name, price: el.hasAttribute('data-price') ? Number(el.dataset.price) : null,
      kind: el.dataset.kind, rank: Number(el.dataset.rank), el: el };
  });
  // Row E832: the free trial (bots-config.js trialDays; BRAND-62). Every monthly plan and every released single strategy
  // starts with that many days free, and Lifetime has none. A plan card, a Library line and the open strategy say it in a
  // BRAND-48 phrase with the price ("14 days free, then $197 a month"); with no trialDays nothing about a trial is shown.
  var TRIAL = typeof CFG.trialDays === 'number' && CFG.trialDays > 0 ? Math.floor(CFG.trialDays) : 0;
  function trialWords(price) { return TRIAL && typeof price === 'number' && price > 0 ? TRIAL + ' days free, then ' + dollars(price) + ' a month' : ''; }
  Object.keys(plans).forEach(function (id) {
    var p = plans[id], w = p.kind === 'monthly' ? trialWords(p.price) : '', pr = $('.bx-price', p.el);
    if (w && pr) pr.insertAdjacentHTML('afterend', '<p class="bx-trial">' + esc(w) + '</p>');
  });

  // The ladder: the monthly tiers, lowest first. A tier's place on it is its finish (bots.css), and each step up
  // adds light: the lowest is plain, the top one is the mirror polish with the glow and the bright sheen, with four
  // or more the one under the top is the satin polish with the slow sheen, and every tier between is the quiet
  // gradient. Add a tier card, take one away or change a rank and the finishes follow.
  var ladder = Object.keys(plans).map(function (id) { return plans[id]; })
    .filter(function (p) { return p.kind === 'monthly'; }).sort(function (a, b) { return a.rank - b.rank; });
  var FIN = {}, LET = {}, BOLT = {};
  // Row E802: the card keeps its tier's finish (FIN: its edge, its badge and its title's colours, bots.css); the title and
  // the tier's strategy names wear the lettering (LET): the lowest tier plain, the top tier the sheen and the lightning
  // (BOLT), the one under the top (with three or more tiers) the same sheen, every tier between solid colour.
  function wear(p, fin, lt, bolt) {   // a finish goes on the plan's card; the lettering on its title, with its sheen and lightning
    var t = $('.bx-tname', p.el);
    p.el.setAttribute('data-lvl', fin);
    if (!t) return;
    var sh = $('.bx-sh', t), bo = $('.bx-bolt', t);
    t.setAttribute('data-lvl', lt);
    if (lit(lt) && !sh) t.insertAdjacentHTML('beforeend', sheenSpan(p.name));
    if (!lit(lt) && sh) t.removeChild(sh);
    if (bolt) { t.setAttribute('data-bolt', ''); if (!bo) t.insertAdjacentHTML('beforeend', boltSpan(p.name)); }
    else { t.removeAttribute('data-bolt'); if (bo) t.removeChild(bo); }
  }
  ladder.forEach(function (p, i) {
    var n = ladder.length, hd = $('header', p.el);
    FIN[p.id] = i === 0 ? 'plain' : (i === n - 1 ? 'sheen' : (n >= 4 && i === n - 2 ? 'polished' : 'gradient'));
    LET[p.id] = i === 0 ? 'plain' : (i === n - 1 || (n >= 3 && i === n - 2) ? 'sheen' : 'solid');
    BOLT[p.id] = i === n - 1;
    wear(p, FIN[p.id], LET[p.id], BOLT[p.id]);
    // Row E811: the plan card's "Tier n" badge (row E766) is gone: a strategy's badge now names its plan, and the card
    // already does in its title.
  });
  // The one-time plan is the top tier paid once. It has no finish of its own: its card and its title wear the
  // top tier's, so the top tier's own rules (bots.css) draw them, and it follows the top tier if the tiers change.
  if (plans.lifetime && ladder.length) { var topId = ladder[ladder.length - 1].id; wear(plans.lifetime, FIN[topId], LET[topId], BOLT[topId]); }
  function finish(tier) { return FIN[tier] || 'plain'; }
  // A strategy's NAME wears its tier's finish only in the upper half of the monthly tiers (row E728; with four tiers,
  // Tier 1 and Tier 2), so only those names stand out. A name in the lower half, or with no tier, is plain everywhere
  // it shows. The tier cards, the tier badges and the small cards' borders keep their tier's own finish (finish()).
  // Row E802: every tier's names now wear its lettering (LET, above); a name with no tier is plain.
  function nameFinish(tier) { return LET[tier] || 'plain'; }
  // A strategy's grade follows the tier it sits in: the lowest tier holds Tier 4, the top tier Tier 1. The words
  // name the grade and the tiers that include it, wherever a strategy's tier is shown.
  function grade(tier) { return plans[tier] ? ladder.length - ladder.indexOf(plans[tier]) : null; }
  function gradeWords(tier) {
    if (!plans[tier]) return 'Plan not set';   // row E827: the plan's name alone (no "and up")
    return plans[tier].name;
  }
  // Row E766: wherever a strategy's tier is shown it is the card's badge, "Tier n" in its tier's finish; where the line
  // also names what to buy, the tier card's name stands beside it.
  // Row E811: the badge names the plan, in its finish. Row E827: the plan alone, with no "and up" beside it.
  function tierBadge(tier) { return plans[tier] ? '<span class="bx-tier" data-lvl="' + finish(tier) + '">' + esc(plans[tier].name) + '</span>' : 'Plan not set'; }
  function tierWith(tier) { return tierBadge(tier); }

  // What a tier gives beyond its strategies. A tier's own lines are the items of the [data-perks] list in its card
  // (index.html), and a tier has every line of the tiers under it as well. Its card shows its own lines, marked as
  // added where there is a tier under it, and its "Plus everything in" line on the same running line. The block
  // under the cards shows every line as a table. Change a line in its card and both follow; a new tier card needs
  // nothing here.
  var perkRows = [];             // every line once, lowest tier first: {text, from: its tier's place on the ladder}
  ladder.forEach(function (p, i) {
    var ul = $('[data-perks]', p.el), plus = $('.bx-perks-plus', p.el);
    var low = perkRows.length;
    (ul ? $$('li', ul) : []).forEach(function (li) { perkRows.push({ text: li.textContent.trim(), from: i }); });
    if (!ul || !low) { if (plus) plus.hidden = true; return; }
    ul.classList.add('is-add');
  });
  var ruleBox = $('.bx-rule'), perksHead = $('.bx-perks-h');
  if (ruleBox && perksHead && ladder.length > 1 && perkRows.length) {
    ruleBox.insertAdjacentHTML('beforeend', '<div class="bx-cmp"><p class="bx-perks-h" id="bx-cmp-h">' + esc(perksHead.textContent) + '</p>' +
      '<table aria-labelledby="bx-cmp-h"><thead><tr><td></td>' +
      ladder.map(function (p) { return '<th scope="col"><span>' + esc(p.name) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      perkRows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.text) + '</th>' + ladder.map(function (p, i) {
          return i >= r.from ? '<td class="is-in"><span class="bx-vh">Yes</span></td>' : '<td><span class="bx-vh">No</span></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>');
  }
  // What a chosen tier holds, for the bar: the grades of its own strategies and of every tier under it.
  function holds(p) {
    if (p.kind === 'lifetime') return 'Every strategy, for life';
    if (ladder.length > 1 && p === ladder[ladder.length - 1]) return 'Every strategy';
    var gs = ladder.filter(function (q) { return q.rank <= p.rank; }).map(function (q) { return q.name; }).reverse();   // row E811: by plan name
    if (gs.length > 1) return gs.slice(0, -1).join(', ') + ' and ' + gs[gs.length - 1] + ' strategies';
    return gs[0] + ' strategies';
  }

  /* ---------- the named strategies, from the catalog ---------- */
  // A grade that is set decides the strategy's tier: Tier 1 is the top tier, Tier 4 the lowest.
  (CAT.strategies || []).forEach(function (s) {
    if (s && [1, 2, 3, 4].indexOf(s.grade) >= 0 && ladder[ladder.length - s.grade]) s.tier = ladder[ladder.length - s.grade].id;
  });
  // Row E832 (BRAND-62, DP-078 a): Base's price stays as it is and its card says how many strategies it holds once they are
  // released, coming-soon ones included, counted from the catalog, so a strategy added to Base changes the number by itself.
  // It stands where the other cards have their savings line.
  if (plans.base && plans.base.kind === 'monthly') {
    var nBase = (CAT.strategies || []).filter(function (s) { return s && s.tier === 'base'; }).length;
    if (nBase) $('header', plans.base.el).insertAdjacentHTML('afterend', '<p class="bx-base-line">' + nBase +
      (nBase === 1 ? ' strategy as it releases' : ' strategies as they release') + ', no price change</p>');
  }
  var names = {}, tiers = {}, slugs = [], soon = {};
  function onPage(s) { return s && (s.named === true || isSoon(s)) && /^[a-z0-9-]+$/.test(String(s.slug)) && s.name && !document.getElementById(s.slug); }
  function inTier(s) { return !!plans[s.tier] && plans[s.tier].kind === 'monthly'; }
  var named = (CAT.strategies || []).filter(function (s) { return onPage(s) && inTier(s); });
  // The Strategies page lists every entry with a TradingView page, a strategy whose tier is not set (tier: null) included,
  // and every coming-soon entry (it has no TradingView page). Only named strategies with a tier reach the tier cards.
  var listed = (CAT.strategies || []).filter(function (s) {
    return onPage(s) && (isSoon(s) || /^https:\/\/www\.tradingview\.com\/script\//.test(String(s.tv_url))) && (s.tier === null || s.tier === undefined && isSoon(s) || inTier(s));
  });
  // The bots page's strategy cards: every named strategy with a tier, and every coming-soon entry, with or without one.
  var carded = (CAT.strategies || []).filter(function (s) { return onPage(s) && (inTier(s) || (isSoon(s) && (s.tier === null || s.tier === undefined))); });
  var shown = ON_LIST ? listed : carded;
  shown.forEach(function (s) { names[s.slug] = s.name; tiers[s.slug] = s.tier; slugs.push(s.slug); if (isSoon(s)) soon[s.slug] = s; });

  // The one mark of a coming-soon strategy: a small plain tag right after its name, read with the name.
  function soonTag(s) { return isSoon(s) ? '<span class="bx-cs"><span class="bx-vh">, </span>Coming soon</span>' : ''; }
  function nameSpan(s) {
    var n = '<span class="bx-sname bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span>';
    return isSoon(s) ? '<span class="bx-nt">' + n + soonTag(s) + '</span>' : n;
  }
  // Row E816: a plan card's line shows the name alone, so the line keeps to one row at every width; a coming-soon line
  // sits in the card's "Coming soon" box and reads ", Coming soon" after the name, as the tag did.
  function rowName(s) {
    return '<span class="bx-sname bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span>' + (isSoon(s) ? '<span class="bx-vh">, Coming soon</span>' : '');
  }

  // Tier cards (row E803): one line per named strategy, in the catalog's order: its name, its return on drawdown (row E815:
  // net profit / max drawdown, a whole percent), its profit factor (two decimals), both from the published figures, and its own
  // monthly price. A strategy with no published figures shows a dash for both; one with no price shows no price.
  // The whole line is the link that opens the strategy (bots.css lines the figures up in columns).
  function half(n, d) { var k = Math.pow(10, d); return (Math.round((n + Number.EPSILON * Math.abs(n)) * k) / k).toFixed(d); }
  // Row E827: a profit factor is printed with two decimals wherever these pages show it, rounded half up from its number
  // (from the display string only when a record has no number); '' when there is neither.
  function pf2(fig) {
    var n = fig && typeof fig.profit_factor === 'number' ? fig.profit_factor : NaN;
    if (!isFinite(n) && fig && fig.display && fig.display.profit_factor) n = Number(String(fig.display.profit_factor).replace(/,/g, ''));
    return isFinite(n) ? half(n, 2) : '';
  }
  // Row E815: one figure over another as a whole percent, rounded half up, with a thousands separator ("5,319%"); used
  // for return on drawdown (net profit / max drawdown). null without both figures. v is the unrounded percentage, for sorting.
  function retPct(net, cap) {
    if (typeof net !== 'number' || typeof cap !== 'number' || !(cap > 0)) return null;
    var v = net / cap * 100, r = Number(half(Math.abs(v), 0));
    return { v: v, t: (v < 0 && r > 0 ? '-' : '') + r.toLocaleString('en-US') + '%' };
  }
  function figCells(s) {
    var f = FIGS[s.slug], dash = '<span aria-hidden="true">\u2014</span><span class="bx-vh">not published</span>';
    var ok = f && typeof f.net_profit_usd === 'number' && typeof f.max_drawdown_usd === 'number' && f.max_drawdown_usd > 0 && typeof f.profit_factor === 'number';
    var ret = ok ? retPct(f.net_profit_usd, f.max_drawdown_usd) : null, pf = ok ? half(f.profit_factor, 2) : '';
    // row E832 (BRAND-62, DP-078 c): a coming-soon strategy shows no price until it can be bought; its line stands in the
    // card's box headed "Coming soon" and reads ", Coming soon" after its name
    var pr = !isSoon(s) && typeof s.price === 'number' && s.price > 0 ? s.price : null;
    return '<span class="bx-fg" data-fig="rod"' + (ret ? ' data-v="' + ret.t + '"' : '') + '><span class="bx-vh">, return on drawdown </span>' + (ret ? ret.t : dash) + '</span>' +
      '<span class="bx-fg" data-fig="pf"' + (ok ? ' data-v="' + pf + '"' : '') + '><span class="bx-vh">, profit factor </span>' + (ok ? pf : dash) + '</span>' +
      '<span class="bx-fg bx-fg-p" data-fig="price"' + (pr ? ' data-v="' + pr + '"' : '') + '>' +
      (pr ? '<span class="bx-vh">, on its own </span>$' + pr.toLocaleString('en-US') + '<span class="bx-fg-u">/mo</span>' : '') + '</span>';
  }
  // Row E816: the released strategies first; the plan's coming-soon ones in a box under them, inside the same list frame,
  // headed "Coming soon", one a line with the same figures. A plan with no coming-soon strategy has no box.
  named.forEach(function (s) {
    var ul = $('[data-tier-list="' + s.tier + '"]');
    if (!ul) return;
    if (isSoon(s)) {
      var box = $('[data-soon-list="' + s.tier + '"]');
      if (!box) {
        ul.insertAdjacentHTML('afterend', '<div class="bx-soon"><p class="bx-soon-h" aria-hidden="true"><span class="bx-cs">Coming soon</span></p>' +
          '<ul data-soon-list="' + esc(s.tier) + '"></ul></div>');
        box = $('[data-soon-list="' + s.tier + '"]');
      }
      ul = box;
    }
    var li = document.createElement('li');
    li.className = 'bx-srow';
    li.setAttribute('data-lvl', finish(s.tier));
    li.innerHTML = '<a class="bx-slink" href="#' + s.slug + '">' + rowName(s) + figCells(s) + '<span class="bx-arw" aria-hidden="true">›</span></a>';
    ul.appendChild(li);
  });

  // What a tier saves against buying its strategies one by one (row E803): the one-by-one total, struck through, before
  // the tier's price, and the monthly saving on its own line under them. Shown only when every strategy the tier
  // includes has a price and the tier costs less; never typed anywhere, so a new price changes it by itself.
  function dollars(n) {
    var r = Math.round(n * 100) / 100;
    return '$' + r.toLocaleString('en-US', { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  ladder.forEach(function (p) {
    var inc = (CAT.strategies || []).filter(function (s) { return s && !isSoon(s) && plans[s.tier] && plans[s.tier].kind === 'monthly' && plans[s.tier].rank <= p.rank; });
    if (!inc.length || p.price === null) return;
    if (!inc.every(function (s) { return typeof s.price === 'number' && s.price > 0; })) return;
    var all = inc.reduce(function (a, s) { return a + s.price; }, 0), saved = all - p.price;
    if (!(saved > 0)) return;
    var amt = $('.bx-price .bx-amt', p.el);
    if (amt) amt.insertAdjacentHTML('beforebegin', '<s class="bx-was"><span class="bx-vh">One by one </span>' + dollars(all) + '<span class="bx-vh">, now</span></s>');
    $('header', p.el).insertAdjacentHTML('afterend', '<p class="bx-save">Save ' + dollars(saved) + ' a month</p>');
  });

  // Every named strategy's line shows in its tier card (row E752, 2026-11-20: every posted strategy on the page).
  // Row E803: over the figures, their column names; under them, one line naming them a hypothetical backtest, with the
  // dates the listed strategies' records cover (a range where their last days differ).
  function span(isos) {
    var u = isos.filter(function (v, i) { return isos.indexOf(v) === i; }).sort();
    if (u.length === 1) return day(u[0]);
    var a = u[0].split('-'), b = u[u.length - 1].split('-');
    if (a[0] === b[0] && a[1] === b[1]) return MON[Number(a[1]) - 1] + ' ' + Number(a[2]) + '\u2013' + Number(b[2]) + ', ' + a[0];
    return day(u[0]) + ' \u2013 ' + day(u[u.length - 1]);
  }
  // Row E816: the head and the dates cover the coming-soon box too: the head over the first list, the dates under the box.
  // In a narrow list the lines leave out their "/mo" (bots.css). Row E827 item 16: its price column's head reads "Price",
  // as on desktop; "$/mo" beside the performance figures read as monthly profit.
  $$('[data-tier-list]').forEach(function (ul) {
    var box = ul.nextElementSibling && ul.nextElementSibling.classList.contains('bx-soon') ? ul.nextElementSibling : null;
    var links = $$('.bx-slink', ul).concat(box ? $$('.bx-slink', box) : []);
    var fs = links.map(function (a) { return FIGS[a.getAttribute('href').slice(1)]; }).filter(function (f) { return f && f.window_from && f.window_to; });
    if (!links.length) return;
    ul.insertAdjacentHTML('beforebegin', '<p class="bx-fh" aria-hidden="true"><span class="bx-fh-rod" title="Return on drawdown">Return on drawdown</span><span title="Profit factor">PF</span>' +
      '<span><span class="bx-fh-pw">Price</span><span class="bx-fh-pn">Price</span></span><span></span></p>');
    if (!fs.length) return;
    var from = span(fs.map(function (f) { return f.window_from; })), to = span(fs.map(function (f) { return f.window_to; }));
    if (from.slice(-6) === to.slice(-6) && from.indexOf('\u2013') < 0) from = from.slice(0, -6);   // one year: said once, at the end
    (box || ul).insertAdjacentHTML('afterend', '<p class="bx-hypo">Hypothetical backtest, ' + from + ' to ' + to + '</p>');
  });
  // Row E816: a plan line's name takes the size at which its card's widest name fits beside the figures: --pr-k is that
  // name's width per pixel of font, and bots.css works the size out from the list's width. The lists' letter spacing
  // changes with their width, so a list is measured again whenever its width changes.
  // Row E827: the widest name takes 97% of its column, not all of it: an exact fit came out a few hundredths of a pixel
  // over after rounding, and the name was cut.
  function fitRows(lists) {
    lists.forEach(function (st) {
      var widest = 0;
      $$('.bx-srow .bx-sname', st).forEach(function (nm) {
        var t = nm.firstChild, f = parseFloat(getComputedStyle(nm).fontSize), r;
        if (!t || t.nodeType !== 3 || !(f > 0)) return;
        r = document.createRange();
        r.selectNodeContents(t);
        widest = Math.max(widest, r.getBoundingClientRect().width / f);
      });
      if (widest > 0) st.style.setProperty('--pr-k', (0.97 / widest).toFixed(5));
    });
  }
  var rowLists = $$('.bx-strats').filter(function (st) { return !!$('.bx-srow', st); });
  fitRows(rowLists);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitRows(rowLists); });
  if (window.ResizeObserver && window.WeakMap) {
    var rowW = new WeakMap(), rowRO = new ResizeObserver(function (es) {
      fitRows(es.filter(function (e) {
        var w = Math.round(e.contentRect.width);
        if (rowW.get(e.target) === w) return false;
        rowW.set(e.target, w);
        return true;
      }).map(function (e) { return e.target; }));
    });
    rowLists.forEach(function (st) { rowRO.observe(st); });
  }
  // The strategy cards. Row E763 (2026-11-21; the example card): one title line (the name, the market
  // code in a small chip, the badge "Tier n" at the right), one line of figures, the equity chart from the record's own
  // turning points with the total profit written on it; the max drawdown and the profit factor bottom left (row E760).
  // Every name on the grid takes one size, 16px or, where the widest name does not fit at 16px, the size at which it does
  // (fitNames). A coming-soon card's mark sits on its chart, top left, the same place on each; its title says it to screen
  // readers.
  function tierNo(s) { return plans[s.tier] ? plans[s.tier].name : gradeWords(s.tier); }   // row E811: the plan's name
  function marketCode(s) { return s.chip || String(s.market_line || '').split(' \u00b7 ')[0]; }
  // Row E761 (2026-11-21): the grid runs by tier, tier 1 first, and within a tier by return on drawdown, highest
  // first; a coming-soon build sits in its tier by the same rule. A card with no tier or no figures comes after the ones
  // that have them; ties keep the catalog's order. Only this grid is ordered so: the Library keeps its own order.
  function byTier(list) {
    return list.map(function (s, i) { return { s: s, i: i }; }).sort(function (a, b) {
      var ra = plans[a.s.tier] ? plans[a.s.tier].rank : -Infinity, rb = plans[b.s.tier] ? plans[b.s.tier].rank : -Infinity;
      var fa = FIGS[a.s.slug], fb = FIGS[b.s.slug];
      var da = fa && typeof fa.return_on_drawdown === 'number' ? fa.return_on_drawdown : -Infinity;
      var db = fb && typeof fb.return_on_drawdown === 'number' ? fb.return_on_drawdown : -Infinity;
      return (rb - ra) || (db - da) || (a.i - b.i);
    }).map(function (x) { return x.s; });
  }
  // Row E827: under each card's chart, one line naming it a hypothetical backtest, with that strategy's own dates from the
  // catalog's figures (the year said once when both dates share it). A strategy with no dates there gets no line.
  function cardHypo(s) {
    var f = FIGS[s.slug], iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!f || !iso.test(f.window_from) || !iso.test(f.window_to)) return '';
    var from = day(f.window_from), to = day(f.window_to);
    if (from.slice(-4) === to.slice(-4)) from = from.slice(0, -6);
    return '<p class="bx-strat-hypo">Hypothetical backtest · ' + esc(from) + ' to ' + esc(to) + '</p>';
  }
  var stratGrid = $('#strat-grid');
  // Row E827: the line over the cards counts the cards' released strategies and coming-soon ones (catalog, at load)
  var stratSub = $('#strat-sub');
  if (stratGrid && stratSub) {
    var nLive = carded.filter(function (s) { return !isSoon(s); }).length, nSoon = carded.length - nLive;
    stratSub.textContent = nLive + (nLive === 1 ? ' strategy is' : ' strategies are') + ' live now.' + (nSoon ? ' The ' + nSoon + ' marked Coming soon ' +
      (nSoon === 1 ? 'joins its plan when it is' : 'join their plan when they are') + ' released.' : '') + ' No release dates are promised.';
  }
  if (stratGrid) {
    stratGrid.innerHTML = byTier(carded).map(function (s) {
      return '<a class="bx-strat" href="#' + s.slug + '" data-slug="' + s.slug + '" data-tier="' + esc(s.tier == null ? '' : s.tier) + '" data-lvl="' + finish(s.tier) + '">' +
        '<div class="bx-strat-top"><h3><span class="bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span>' + (isSoon(s) ? '<span class="bx-vh">, Coming soon</span>' : '') + '</h3>' +
        '<span class="bx-strat-k">' + esc(marketCode(s)) + '</span>' +
        '<span class="bx-tier" data-lvl="' + finish(s.tier) + '">' + esc(tierNo(s)) + '</span></div>' +
        '<dl class="bx-hl" data-hl="' + s.slug + '"></dl>' +
        '<div class="bx-spark" data-spark="' + s.slug + '" aria-hidden="true"></div>' + cardHypo(s) +
        '<p class="bx-strat-go"><span class="bx-risk" data-risk="' + s.slug + '"></span><span class="bx-open">Open strategy</span></p>' +
        '</a>';
    }).join('');
  }
  // Row E763: the names' one size. Each name's width per pixel of font is measured (it scales with the font), and the grid
  // gets the ratio of the widest and the room the code and the badge take; bots.css sizes every name from the card's width.
  function fitNames() {
    if (!stratGrid) return;
    var widest = 0, room = 0;
    $$('.bx-strat', stratGrid).forEach(function (c) {
      var nm = $('h3 .bx-wm', c), code = $('.bx-strat-k', c), tier = $('.bx-tier', c);
      var f = parseFloat(getComputedStyle(nm).fontSize);
      if (f > 0) widest = Math.max(widest, nm.getBoundingClientRect().width / f);
      room = Math.max(room, code.getBoundingClientRect().width + tier.getBoundingClientRect().width);
    });
    if (!(widest > 0)) return;
    stratGrid.style.setProperty('--nm-k', (0.97 / widest).toFixed(5));
    stratGrid.style.setProperty('--nm-r', Math.ceil(room + 2 * 8 + 4) + 'px');   // two 8px gaps and a little air (the badge sits at the right)
  }
  fitNames();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNames);

  var docs = {};                // slug -> loaded data file
  var sel = { plan: null };
  var openSlug = null, cameFromPage = false, lastTrigger = null, chosenAt = 0;

  var bar = $('#bar'), barPlan = $('#bar-plan'), barDetail = $('#bar-detail'), barPrice = $('#bar-price'), barBtn = $('#bar-btn'), barAlt = $('#bar-alt');
  var sheet = $('#sheet'), backdrop = $('#backdrop'), sheetK = $('#sheet-k'), sheetTitle = $('#sheet-title');
  var sheetBody = $('#sheet-body');
  // Row E827: the view's heading is in the page only while the view is open, so the closed view leaves no empty heading in
  // the outline; the dialog is named by it only then. (A page that still has it in its markup works the same way.)
  if (!sheetTitle) {
    sheetTitle = document.createElement('h2');
    sheetTitle.className = 'bx-wm'; sheetTitle.id = 'sheet-title'; sheetTitle.tabIndex = -1;
  }
  var sheetIdBox = sheetK ? sheetK.parentNode : null;
  // Row E827: while the view is open the page behind it is inert (its top bar, main part and footer); the selection bar
  // at the bottom, and the cart it opens, stay usable.
  var behind = [$('header.tbn'), $('main'), $('footer')].filter(Boolean);
  function setBehind(on) { behind.forEach(function (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }); }

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
    var own = openSlug && !soon[openSlug] ? plans[tiers[openSlug]] : null, nm = openSlug ? names[openSlug] : '';   // a coming-soon one's tier is not offered
    var two = false;
    bar.classList.toggle('has-sel', !!p);
    barAlt.hidden = true;
    if (!p) {
      barPrice.hidden = true;
      if (own) {
        barPlan.innerHTML = 'Plan: ' + tierWith(own.id);   // row E827: "Plan: Supreme"
        barDetail.textContent = priceWords(own);
        setBtn('choose', 'Choose ' + own.name, '', own.id);
      } else {
        barPlan.textContent = 'No plan chosen yet';
        barDetail.textContent = ON_LIST ? 'Pick one below' : 'Pick one above';
        setBtn('tiers', 'See plans');
      }
    } else {
      barPlan.innerHTML = (p.kind === 'monthly' ? tierBadge(p.id) + ' ' : '') + esc(p.name) + '<span class="bx-bp-price"> · ' + esc(priceWords(p)) + '</span>';
      barPrice.hidden = false;
      barPrice.innerHTML = p.price === null ? '<small class="bx-tbs-bar">' + TBS + '</small>'
        : '$' + p.price.toLocaleString('en-US') + '<small>' + (p.kind === 'lifetime' ? 'once' : 'a month') + '</small>';
      var link = checkoutLink(p.id);
      if (link) setBtn('checkout', 'Checkout', link); else setBtn('soon', 'Opening soon');
      if (!own) {
        barDetail.textContent = holds(p);
      } else if (includes(p.id, openSlug)) {
        barDetail.textContent = '✓ Includes ' + nm;
      } else {
        barDetail.innerHTML = esc(nm) + ': ' + tierBadge(own.id);
        barAlt.textContent = 'Switch to ' + own.name + (own.price === null ? '' : ' · $' + own.price.toLocaleString('en-US'));
        barAlt.dataset.plan = own.id;
        barAlt.hidden = false;
        two = true;
      }
    }
    document.body.classList.toggle('bx-bar-two', two);   // two buttons: the bar takes a second row on narrow screens
    if (window.AFT_CART) window.AFT_CART.bar(openSlug);   // row E806: the cart (cart.js) redraws this bar and the tier buttons
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

  /* ---------- the open strategy ---------- */
  function hashSlug() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(names, h) ? h : null;
  }

  function showSheet(slug) {
    openSlug = slug;
    if (sheetIdBox && sheetTitle.parentNode !== sheetIdBox) sheetIdBox.appendChild(sheetTitle);
    sheet.setAttribute('aria-labelledby', 'sheet-title');
    sheetTitle.textContent = names[slug];
    var s = shown.filter(function (x) { return x.slug === slug; })[0];
    sheetTitle.setAttribute('data-lvl', nameFinish(tiers[slug]));
    if (BOLT[tiers[slug]]) sheetTitle.setAttribute('data-bolt', ''); else sheetTitle.removeAttribute('data-bolt');
    ['--n', '--c0', '--c1', '--c2'].forEach(function (k) { sheetTitle.style.removeProperty(k); });
    if (s) {
      palette(s).forEach(function (p) { sheetTitle.style.setProperty(p[0], p[1]); });
      if (sheen(s)) sheetTitle.insertAdjacentHTML('beforeend', sheen(s));
      if (isSoon(s)) {          // the tag takes about six letters' room, so the name's fitted size counts it (the title stays one line at 360 px)
        sheetTitle.insertAdjacentHTML('beforeend', soonTag(s));
        sheetTitle.style.setProperty('--n', String(String(s.name).length + 6));
      }
    }
    sheetK.innerHTML = tierBadge(tiers[slug]);
    sheetBody.innerHTML = '<p class="bx-note">Loading…</p>';
    render();
    backdrop.hidden = false;
    sheet.hidden = false;
    setBehind(true);
    document.body.classList.add('noscroll');
    sheetBody.scrollTop = 0;
    sheetTitle.focus({ preventScroll: true });
    if (soon[slug] && !hasFigs(soon[slug])) {   // no data file: the catalog's own words, as for a record with no figures
      renderPanel({ slug: slug, name: names[slug], status: 'none', what: { market_line: soon[slug].market_line, timeframe: soon[slug].timeframe } });
      return;
    }
    getDoc(slug).then(function (doc) { if (openSlug === slug) renderPanel(doc); },
      function () { if (openSlug === slug) sheetBody.innerHTML = '<p class="bx-note">This strategy’s record did not load. Reload the page to try again.</p>'; });
  }

  function hideSheet() {
    if (!openSlug) return;
    var was = openSlug;
    openSlug = null;
    sheet.hidden = true;
    backdrop.hidden = true;
    setBehind(false);
    if (sheetTitle.parentNode) sheetTitle.parentNode.removeChild(sheetTitle);
    sheet.removeAttribute('aria-labelledby');
    document.body.classList.remove('noscroll');
    render();
    // focus goes back to what opened the view; a view opened straight from a link goes back to its strategy's card (row E827)
    var back = lastTrigger && document.contains(lastTrigger) ? lastTrigger : $('#strat-grid .bx-strat[data-slug="' + was + '"]');
    if (back) back.focus({ preventScroll: true });
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
  // Row E827: a link to an FAQ item (the plans' "What you need" goes to #faq-need) opens the item as it scrolls to it
  function openFaq(id) { var d = id && document.getElementById(id); if (d && d.tagName === 'DETAILS') d.open = true; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#faq-"]');
    if (a) openFaq(a.getAttribute('href').slice(1));
  });
  try { if (/^#faq-/.test(location.hash)) openFaq(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* ignore */ }
  $('#sheet-close').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSlug) closeSheet();
  });
  // Row E827: while the view is open, Tab goes through the view's own controls and then the bar's, and from the bar's last
  // back to the view's first; Shift+Tab the other way. The open cart keeps focus inside itself (cart.js).
  var TABS = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,iframe,[tabindex]:not([tabindex="-1"])';
  function viewStops() {
    return $$(TABS, sheet).concat($$(TABS, bar)).filter(function (x) { return x.getClientRects().length > 0 && !x.closest('[hidden],[inert]'); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !openSlug) return;
    var cp = $('#crt-panel');
    if (cp && !cp.hidden) return;
    var s = viewStops(), a = document.activeElement, i = s.indexOf(a), k = 0;
    if (!s.length) return;
    e.preventDefault();
    if (i >= 0) { s[e.shiftKey ? (i - 1 + s.length) % s.length : (i + 1) % s.length].focus(); return; }
    // focus on no stop (the view's heading, focused when it opens): the next stop after it in its own part, else the
    // first stop of the part after it; anywhere else, the view's first stop (or, with Shift, the bar's last)
    var box = sheet.contains(a) ? sheet : (bar.contains(a) ? bar : null);
    if (box) {
      k = s.length;
      for (var j = 0; j < s.length; j++) {
        if (box.contains(s[j]) && (a.compareDocumentPosition(s[j]) & Node.DOCUMENT_POSITION_FOLLOWING)) { k = j; break; }
      }
      if (k === s.length && box === sheet) k = s.filter(function (x) { return sheet.contains(x); }).length;
    }
    s[e.shiftKey ? (k - 1 + s.length) % s.length : k % s.length].focus();
  });

  /* ---------- data ---------- */
  function getDoc(slug) {
    if (docs[slug]) return Promise.resolve(docs[slug]);
    return fetch(DATA + slug + '.json').then(function (r) {
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
    var w = d.what || {};
    var own = shown.filter(function (x) { return x.slug === d.slug; })[0] || {};
    var ownPrice = typeof own.price === 'number' && own.price > 0 ? (trialWords(own.price) || dollars(own.price) + ' a month') : 'Price at release';   // row E832: with its trial
    var tvOk = function (u) { return typeof u === 'string' && /^https:\/\/([a-z]+\.)?tradingview\.com\//.test(u); };
    var tvUrl = d.proof && has(d.proof.tradingview_url) ? d.proof.tradingview_url : own.tv_url;   // row E827
    sheetK.innerHTML = (w.market_line ? esc(w.market_line) + ' · ' : '') + tierBadge(tiers[d.slug]);

    var what = '<section class="bx-part"><h3>The strategy</h3>' +
      dl([['Market', has(w.market_line) && esc(w.market_line)], ['Chart', has(w.timeframe) && esc(w.timeframe)],
        ['Plan', tierWith(tiers[d.slug])], ['On its own', isSoon(own) ? 'Coming soon' : esc(ownPrice)]]) + '</section>';   // rows E758, E832: a coming-soon build is not sold on its own: "Coming soon" in place of a price

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
    var kpiLen = Math.max(show.net_profit.length, show.max_drawdown_usd.length);
    var moWords = hasMonths ? d.months.map(function (m) { return usd(m.pnl_usd, true); }) : [];
    var moLen = moWords.reduce(function (a, s) { return Math.max(a, s.length); }, 0);

    // The caption beside the label: the window, the start, the sizing and the costs, as the record states them.
    var cap = [d.label.text, windowWords];
    if (has(t.start_capital_usd)) cap.push(usd(t.start_capital_usd, false, false) + ' start');
    if (has(t.commission) && has(t.slippage)) cap.push('after commission and slippage');
    else if (has(t.commission)) cap.push('after commission');

    // First screen: the chart, the four figures in one bar, one caption, the monthly P&L.
    var first = '<div class="bx-first">' +
      (hasCurve ? '<div class="bx-chart" id="bx-chart"></div>'
        : (d.overview_image ? '<div class="bx-chart is-image"><img src="' + esc(DATA) + esc(d.overview_image) + '" alt="The Strategy Tester overview for ' + esc(d.name) + ': a hypothetical backtest, ' + esc(windowWords) + '"></div>' : '')) +
      '<dl class="bx-kpis' + (kpiLen >= 15 ? ' is-long is-xlong' : (kpiLen >= 12 ? ' is-long' : '')) + '">' +
        kpi('Net profit', show.net_profit, tone(f.net_profit_usd)) +
        kpi('Win rate', show.win_rate) +
        kpi('Profit factor', pf2(f)) +
        kpi('Max drawdown', show.max_drawdown_usd) +
      '</dl>' +
      '<p class="bx-cap">' + cap.map(esc).join(' · ') + '</p>' +
      (hasMonths ? '<div class="bx-mo"><h3 class="bx-mo-h" id="bx-mo-h">Monthly P&amp;L</h3>' +
      '<ul class="bx-months' + (moLen >= 12 ? ' is-long is-xlong' : (moLen >= 11 ? ' is-long' : '')) + '" aria-labelledby="bx-mo-h" style="--mo-n:' + Math.min(12, d.months.length) + '">' + d.months.map(function (m, i) {
        return monthItem(d, m, moWords[i], 'bxs');
      }).join('') + '</ul></div>' : '') +
      '</div>';

    // Under the Monthly P&L list: the two latest months by day, the latest on top (rows E732, E735). The first screen above keeps its height.
    var cals = dailyCals(d, 'bxs');
    var daily = cals ? '<div class="bx-daily"><h3 class="bx-mo-h">Daily P&amp;L</h3>' + cals +
      '<p class="bx-cap bx-daily-n">Each day is the total of the trades closed that day. K is thousands.</p></div>' : '';

    // Below the first screen: what it is, the test, the other figures, the proof.
    var tiles = tile('Trades', f.trades.toLocaleString('en-US'), '', has(f.winners) ? f.winners.toLocaleString('en-US') + ' winners' : '');
    if (wo && has(wo.worst_day_usd)) tiles += tile('Worst day', usd(wo.worst_day_usd, true), tone(wo.worst_day_usd), day(wo.worst_day_date));
    var more = '<div class="bx-more">' + what +
      '<section class="bx-part"><h3>The test</h3>' + dl([
        ['Tested with', esc(t.tester)],
        ['Symbol', has(t.symbol) && esc(t.symbol)],
        ['Window', esc(windowWords)],
        ['Starting balance', has(t.start_capital_usd) && esc(usd(t.start_capital_usd, false, false))],
        ['Commission', has(t.commission) && esc(t.commission)],
        ['Slippage', has(t.slippage) && esc(t.slippage)]
      ]) + '</section>' +
      '<section class="bx-part"><h3>More figures</h3><div class="bx-tiles">' + tiles + '</div>' +
        (wo && wo.note ? '<p class="bx-note">' + esc(wo.note) + '</p>' : '') + '</section>' +
      '<section class="bx-part"><h3>The proof</h3>' + dl([
        ['Test run', has(p.run_date) && esc(day(p.run_date))],
        // row E827: the data file's link, else the catalog's tv_url; released strategies only, in a new tab
        ['TradingView page', !soon[d.slug] && tvOk(tvUrl) && '<a href="' + esc(tvUrl) + '" rel="noopener" target="_blank">Open the strategy on TradingView</a>']
      ]) + '</section>' +
      '</div>';

    sheetBody.innerHTML = first + daily + calcLink(d) + more;
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

  // A card's quick highlights (2026-11-18, row E702): the record's own display figures, as the Strategy Library
  // table prints them, label over figure. The card carries no label words; the sheet and the Strategy Library keep them.
  function highlights(d) {
    if (d.status !== 'figures' || !d.figures || !d.figures.display) return '';
    var f = d.figures, show = f.display;
    // Row E763: three figures in one line; the total profit is written on the chart (spark).
    var ret = retPct(f.net_profit_usd, f.max_drawdown_usd);   // row E815: return on drawdown as a percentage
    return [['Return on drawdown', ret && ret.t, ''], ['Avg monthly profit', show.monthly_profit, tone(f.monthly_profit_usd)],
            ['Win rate', show.win_rate, '']].filter(function (h) { return h[1]; }).map(function (h) {
      return '<div class="bx-hl-i"><dt>' + esc(h[0]) + '</dt><dd' + (h[2] ? ' class="' + h[2] + '"' : '') + '>' + esc(h[1]) + '</dd></div>';
    }).join('');
  }

  // Row E760: a card's bottom-left pair, labelled, as the record prints them; a strategy without figures shows none.
  function risk(d) {
    if (d.status !== 'figures' || !d.figures || !d.figures.display) return '';
    var show = d.figures.display;
    return [['Max drawdown', show.max_drawdown_usd], ['Profit factor', pf2(d.figures)]].filter(function (h) { return h[1]; }).map(function (h) {
      return '<span class="bx-risk-i">' + esc(h[0]) + ' <b>' + esc(h[1]) + '</b></span>';
    }).join('');
  }

  // Row E763: a card's equity chart, as the director's example card draws it. The line runs through every turning point
  // inside every day (the record's day_paths, each day's path added to the close before it); where a record's paths do not
  // match its days, the daily closes alone. Faint dollar gridlines labelled on the right ($0 dashed), month names along the
  // bottom, a dot at the last point, a soft green fill. It is drawn at the box's own width and 230/600 of it high, so it is
  // never stretched and its words keep their size. The total profit is written inside it, bottom right, where a rising
  // line leaves room; where the line would cross it there, it goes top left (under a coming-soon card's mark, which sits
  // top left), then the same two places a size smaller, and failing all four the place the line crosses least.
  function cardPoints(d) {
    var eq = d.equity, dp = d.day_paths, pts = [[0, 0]], base = 0, ok = Array.isArray(dp) && dp.length === eq.length;
    if (ok) {
      for (var i = 0; i < eq.length && ok; i++) {
        var path = dp[i], k = path && path.length;
        if (!k || Math.abs(base + Number(path[k - 1]) - Number(eq[i][1])) > 0.01) { ok = false; break; }
        for (var j = 0; j < k; j++) pts.push([i + (j + 1) / k, base + Number(path[j])]);
        base = Number(eq[i][1]);
      }
    }
    if (!ok) pts = [[0, 0]].concat(eq.map(function (e, i) { return [i + 1, Number(e[1])]; }));
    return pts;
  }
  function niceStep(span, n) {
    var raw = (span || 1) / n, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), ms = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < ms.length; i++) if (ms[i] * p >= raw) return ms[i] * p;
    return 10 * p;
  }
  function kWords(v) {
    if (Math.abs(v) < 0.5) return '$0';
    var a = Math.abs(v) / 1000, s = Math.abs(a - Math.round(a)) < 1e-9 ? String(Math.round(a)) : String(Math.round(a * 10) / 10);
    return (v < 0 ? '\u2212' : '') + '$' + s + 'k';
  }
  function spark(el, d, isSoonCard) {
    var mark = isSoonCard ? '<span class="bx-cs">Coming soon</span>' : '';
    if (d.status !== 'figures' || !d.equity || !d.equity.length) {
      el.innerHTML = mark + (d.status === 'figures' ? '' : '<span class="bx-spark-none">No figures published yet</span>');
      return;
    }
    var W = Math.round((el.getBoundingClientRect().width - el.clientLeft * 2) * 100) / 100;   // the box's exact width
    if (!(W > 60)) return;
    if (Number(el.dataset.w) === W) return;
    el.dataset.w = W;
    var H = Math.round(W * 230 / 600 * 100) / 100, pts = cardPoints(d), n = d.equity.length;
    var lo = 0, hi = 0;
    pts.forEach(function (p) { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; });
    var span = (hi - lo) || 1, step = niceStep(span, 4), top = hi + span * .03, bot = lo - span * .05;
    var padR = 46, padT = 10, padB = 20, pw = W - padR, ph = H - padT - padB;
    var X = function (x) { return x / n * pw; }, Y = function (v) { return padT + (top - v) / (top - bot) * ph; };
    var line = 'M' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' L');
    var area = line + ' L' + X(n).toFixed(1) + ',' + Y(bot).toFixed(1) + ' L0,' + Y(bot).toFixed(1) + ' Z';
    var grid = '';
    for (var k = Math.ceil(bot / step); k * step <= top + 1e-6; k++) {
      var v = k * step, y = Y(v);
      grid += '<line x1="0" x2="' + pw.toFixed(1) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="gl' + (k === 0 ? ' z' : '') + '"/>' +
        '<text x="' + (W - 4) + '" y="' + (y + 3.5).toFixed(1) + '" class="gt" text-anchor="end">' + kWords(v) + '</text>';
    }
    var seen = {}, ticks = '';
    d.equity.forEach(function (e, i) {
      var m = Number(String(e[0]).slice(5, 7));
      if (!seen[m]) { seen[m] = 1; if ((m - 1) % 2 === 0) ticks += '<text x="' + (X(i) + 2).toFixed(1) + '" y="' + (H - 6) + '" class="gt">' + MON[m - 1] + '</text>'; }
    });
    var last = pts[pts.length - 1], ex = X(last[0]).toFixed(1), ey = Y(last[1]).toFixed(1), id = 'bxg-' + el.getAttribute('data-spark');
    var f = d.figures || {}, net = f.display && f.display.net_profit;
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34c27a" stop-opacity=".32"/><stop offset="1" stop-color="#34c27a" stop-opacity="0"/></linearGradient></defs>' +
      grid + ticks + '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="#3fd88a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="' + ex + '" cy="' + ey + '" r="4" fill="#3fd88a"/><circle cx="' + ex + '" cy="' + ey + '" r="8" fill="#3fd88a" fill-opacity=".2"/></svg>' +
      (net ? '<div class="bx-spark-tp"><span>Total profit</span><b class="' + tone(f.net_profit_usd) + '">' + esc(net) + '</b></div>' : '') + mark;
    el.classList.toggle('has-cs', !!isSoonCard);
    var tp = $('.bx-spark-tp', el);
    if (tp) placeTotal(el.querySelectorAll('svg path')[1], tp);
  }
  // how many of 400 points along the line fall within 3px of a box
  function crossings(ln, r) {
    var m = ln.getScreenCTM(), L = ln.getTotalLength(), c = 0;
    for (var i = 0; i <= 400; i++) {
      var q = ln.getPointAtLength(L * i / 400), x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
      if (x > r.left - 3 && x < r.right + 3 && y > r.top - 3 && y < r.bottom + 3) c++;
    }
    return c;
  }
  function placeTotal(ln, tp) {
    if (!ln || !ln.getScreenCTM()) return;
    var ways = ['', 'is-top', 'is-sm', 'is-sm is-top'], best = null;
    for (var i = 0; i < ways.length; i++) {
      tp.className = 'bx-spark-tp' + (ways[i] ? ' ' + ways[i] : '');
      var c = crossings(ln, tp.getBoundingClientRect());
      if (!c) return;
      if (!best || c < best[1]) best = [ways[i], c];
    }
    tp.className = 'bx-spark-tp' + (best[0] ? ' ' + best[0] : '');
  }
  var cardWatch = window.ResizeObserver ? new ResizeObserver(function (es) {
    es.forEach(function (e) { var el = e.target, slug = el.getAttribute('data-spark'); if (docs[slug]) spark(el, docs[slug], !!soon[slug]); });
  }) : null;

  // Redraw the chart whenever its box changes size (window, rotation, the bar taking a second row).
  function redraw() {
    var box = $('#bx-chart');
    if (!box || !openSlug || !docs[openSlug] || docs[openSlug].status !== 'figures') return;
    if (Number(box.dataset.w) === Math.max(220, Math.round(box.clientWidth - 20)) && Number(box.dataset.h) === Math.max(120, Math.round(box.clientHeight - 12))) return;
    drawChart(box, docs[openSlug].equity);
  }
  var chartWatch = window.ResizeObserver ? new ResizeObserver(redraw) : null;
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redraw, 120);
  });


  /* ---------- start ---------- */
  // Row E802: a name's lightning runs only while the name is on screen; off screen it never strikes (bots.css, .is-off).
  // Names drawn later (the Strategy Library's list, the open strategy's title) are picked up as they arrive.
  if ('IntersectionObserver' in window && 'MutationObserver' in window) {
    // Row E810: each lit name that comes on screen takes the least-used of thirteen moments 0.6 s apart in the 7.8 s strike
    // loop (bots.css), in a scattered order, set against the page clock; so no two names on screen strike together.
    var BOLT_AT = [0, 5, 10, 2, 7, 12, 4, 9, 1, 6, 11, 3, 8], boltUse = {};
    var boltIO = new IntersectionObserver(function (es) { es.forEach(function (e) {
      var b = e.target, s = b.getAttribute('data-s');
      if (e.isIntersecting && s === null) {
        s = BOLT_AT[0]; BOLT_AT.forEach(function (m) { if ((boltUse[m] || 0) < (boltUse[s] || 0)) s = m; });
        boltUse[s] = (boltUse[s] || 0) + 1; b.setAttribute('data-s', s);
        b.style.setProperty('--bd', (((s * 0.6 - performance.now() / 1000) % 7.8 + 7.8) % 7.8 - 7.8).toFixed(3) + 's');
      } else if (!e.isIntersecting && s !== null) { boltUse[s]--; b.removeAttribute('data-s'); }
      b.classList.toggle('is-off', !e.isIntersecting);
    }); });
    var watchBolts = function () { $$('.bx-bolt:not([data-w])').forEach(function (b) { b.setAttribute('data-w', ''); b.classList.add('is-off'); boltIO.observe(b); }); };
    watchBolts();
    new MutationObserver(watchBolts).observe(document.body, { childList: true, subtree: true });
  }
  // Option B (row E802, bots.css): with the class bx-ult-holo on the page root, the foil's rainbow edge shifts a little
  // with the pointer on a desktop. Off by default; nothing runs without the class, a fine pointer and motion allowed.
  (function () {
    var root = document.documentElement, fine = window.matchMedia && matchMedia('(pointer: fine)'), still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
    var queued = false, hx = 0, hy = 0;
    function on() { return (root.classList.contains('bx-ult-holo') || document.body.classList.contains('bx-ult-holo')) && fine && fine.matches && !(still && still.matches); }
    document.addEventListener('pointermove', function (e) {
      if (!on()) return;
      hx = Math.max(-1, Math.min(1, e.clientX / innerWidth * 2 - 1)); hy = Math.max(-1, Math.min(1, e.clientY / innerHeight * 2 - 1));
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        $$('.bx-wm[data-bolt]>.bx-bolt').forEach(function (b) { b.style.setProperty('--hx', hx.toFixed(3)); b.style.setProperty('--hy', hy.toFixed(3)); });
      });
    }, { passive: true });
  })();
  window.AFT_BOTS = { named: named, listed: listed, isSoon: isSoon, soonTag: soonTag, plans: plans, ladder: ladder, nameSpan: nameSpan, grade: grade, finish: finish, esc: esc,
    usd: usd, day: day, tone: tone, dollars: dollars, retPct: retPct, priceWords: priceWords, dayWords: dayWords, monthItem: monthItem, dailyCals: dailyCals,
    calcLink: calcLink, span: span, pf2: pf2, trialDays: TRIAL, trialWords: trialWords };   // row E832: the trial (bots-config.js trialDays)
  load();
  render();
  if (stratGrid) slugs.forEach(function (slug) {
    if (soon[slug] && !hasFigs(soon[slug])) { var sp0 = $('[data-spark="' + slug + '"]'); if (sp0) spark(sp0, { status: 'none' }, true); return; }
    getDoc(slug).then(function (d) {
      var sp = $('[data-spark="' + slug + '"]'), hl = $('[data-hl="' + slug + '"]'), rk = $('[data-risk="' + slug + '"]');
      if (hl) hl.innerHTML = highlights(d);
      if (rk) rk.innerHTML = risk(d);
      if (sp) { spark(sp, d, !!soon[slug]); if (cardWatch) cardWatch.observe(sp); }
    }, function () { /* the cards still read without their data */ });
  });
  route();
})();
