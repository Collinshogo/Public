/* AFT Trading Bots storefront: page script.
   No tracking of its own and no network call beyond this folder's own data files.
   - What is on the page comes from two small files: bots-config.js (the Lifetime plan, the set-up guide link,
     each tier's checkout link) and data/catalog.js (which strategies are named, and in which tier).
     A strategy that is not named there is not on the page; its tier shows the unnamed line instead.
   - Tiers and the selection bar: one choice, kept in localStorage. Tiers are bundles: each higher tier
     includes the ones below it (data-rank on each tier card). A tier with no checkout link yet shows
     "Opening soon" in the bar, and that button does nothing.
   - A tier is defined once, by its card in index.html (name, rank, price, its lines) and its checkout key in
     bots-config.js. Its look follows its place among the tiers, worked out here: the lettering of its title and
     of its strategies' names, the card's finish, the tier pill, the bar and the open strategy's tier line.
     A card with no data-price reads "Price to be set" wherever its price would stand.
   - A tier's list: one chip per named strategy, side by side, every one shown (row E752: no list is cut).
   - The open strategy: every strategy name is a real link (#slug). The hash opens the view in place,
     Back or Close returns to the same spot, and the choice in the bar is never lost. While a strategy
     is open the bar also carries the button that chooses that strategy's tier, so one bar is pinned, not two.
   - The Strategies page (/trading-bots/strategies/) runs this same script: its tier cards are built here from the
     catalog, and strategies.js draws its list from what this script exposes as window.AFT_BOTS.
   - Savings: a tier's card says what its strategies cost one by one, worked out from the catalog's prices, only when
     every strategy the tier includes has a price and the tier costs less.
   - Performance: drawn from data/<slug>.json (schema aft.strategy-performance/2, or /1 in an older file).
     The four figures are printed exactly as the file's display strings give them. First screen: the chart,
     the four-figure bar and the monthly P&L. What it is, the test, the other figures and the proof scroll below. */
(function () {
  'use strict';

  var CFG = window.AFT_BOTS_CONFIG || {};
  var CAT = window.AFT_BOTS_CATALOG || {};
  // Row E736: a coming-soon entry is not a released strategy. It is taken out of the list every other part of both
  // pages reads, so it reaches no tier card, plan, saving, table row, sort, filter or count; only "Coming soon" shows it.
  var SOON = (CAT.strategies || []).filter(function (s) { return s && s.coming_soon === true; });
  if (CAT.strategies) CAT.strategies = CAT.strategies.filter(function (s) { return !(s && s.coming_soon === true); });
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
  var SHOWN = 2;   // months shown by day, the latest on top (Collin 2026-11-20, row E735)
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
  function palette(s) {          // [custom property, value] pairs for one name
    var g = s.lettering, out = [['--n', String(String(s.name).length)]];
    if (g && g.length === 3 && g.every(colour)) {
      out.push(['--c0', g[0]], ['--c1', g[1]], ['--c2', g[2]]);
    }
    return out;
  }
  function lettering(s) {        // the attributes that letter a name: its level and its palette
    return ' data-lvl="' + nameFinish(s.tier) + '" style="' + palette(s).map(function (p) { return p[0] + ':' + p[1]; }).join(';') + '"';
  }
  // The sheen on a name (bots.css): an empty element over the name that carries the name again as data,
  // hidden from screen readers and from selection. It goes on a name only when its tier's finish is lit:
  // the top tier (sheen) and, with four or more tiers, the one under it (polished, a slower and fainter pass).
  function sheenSpan(text) { return '<span class="bx-sh" aria-hidden="true" data-t="' + esc(text) + '"></span>'; }
  function lit(fin) { return fin === 'sheen' || fin === 'polished'; }
  function sheen(s) { return lit(nameFinish(s.tier)) ? sheenSpan(s.name) : ''; }

  /* ---------- the Strategies page: its tier cards come from the catalog ---------- */
  var ON_LIST = document.body.dataset.page === 'strategies';
  var DATA = document.body.dataset.dataBase || 'data/';
  if (ON_LIST && $('#plan-grid')) {
    $('#plan-grid').innerHTML = (CAT.tiers || []).map(function (t) {
      return '<article class="bx-plan" data-plan="' + esc(t.id) + '" data-name="' + esc(t.name) + '" data-price="' + Number(t.price) + '" data-kind="monthly" data-rank="' + Number(t.rank) + '">' +
        '<header><h3 class="bx-wm bx-tname">' + esc(t.name) + '</h3><p class="bx-plan-for">' + esc(t.line) + '</p></header>' +
        '<p class="bx-price"><span class="bx-amt">$' + Number(t.price).toLocaleString('en-US') + '</span><span class="bx-per">a month</span></p>' +
        '<button class="btn btn-ghost bx-choose" type="button" data-choose="' + esc(t.id) + '">Choose ' + esc(t.name) + '</button>' +
        '<div class="bx-strats"><ul data-tier-list="' + esc(t.id) + '">' + (t.rank < CAT.tiers.length ? '<li class="bx-srow"><p class="bx-tba">Tier ' + (CAT.tiers.length - t.rank + 1) + ' strategies<small>Named here at release</small></p></li>' : '') + '</ul></div>' +
        '</article>';
    }).join('');
  }

  /* ---------- the page's switches ---------- */
  // The one-time plan: built here and added to the page only when the config switches it on,
  // so with the switch off nothing about it is in the page at all.
  if (CFG.lifetime === true) {
    var grid = $('#plan-grid');
    var topCard = $$('#plan-grid .bx-plan[data-rank]').sort(function (a, b) { return Number(b.dataset.rank) - Number(a.dataset.rank); })[0];
    if (grid && topCard) {     // it stands level with the top tier, whichever tier that is, and wears its finish (wear(), below)
      grid.insertAdjacentHTML('afterend',
        '<article class="bx-plan bx-life" data-plan="lifetime" data-name="Lifetime" data-price="10000" data-kind="lifetime" data-rank="' + esc(topCard.dataset.rank) + '">' +
        '<div class="bx-life-main"><header><h3 class="bx-wm bx-tname">Lifetime</h3>' +
        '<p class="bx-plan-for">Pay once, with no monthly charge. Every strategy in every tier, and everything new the bots produce in future.</p>' +
        '<p class="bx-life-note">Yours for life, with every update pushed to you automatically and ' + esc(topCard.dataset.name) + '\'s support and access.</p></header></div>' +
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
    plans[el.dataset.plan] = { id: el.dataset.plan, name: el.dataset.name, price: el.hasAttribute('data-price') ? Number(el.dataset.price) : null,
      kind: el.dataset.kind, rank: Number(el.dataset.rank), el: el };
  });

  // The ladder: the monthly tiers, lowest first. A tier's place on it is its finish (bots.css), and each step up
  // adds light: the lowest is plain, the top one is the mirror polish with the glow and the bright sheen, with four
  // or more the one under the top is the satin polish with the slow sheen, and every tier between is the quiet
  // gradient. Add a tier card, take one away or change a rank and the finishes follow.
  var ladder = Object.keys(plans).map(function (id) { return plans[id]; })
    .filter(function (p) { return p.kind === 'monthly'; }).sort(function (a, b) { return a.rank - b.rank; });
  var FIN = {};
  function wear(p, fin) {        // a finish goes on the plan's card and on its title; a lit title carries the sheen
    var t = $('.bx-tname', p.el);
    p.el.setAttribute('data-lvl', fin);
    if (!t) return;
    var sh = $('.bx-sh', t);
    t.setAttribute('data-lvl', fin);
    if (lit(fin) && !sh) t.insertAdjacentHTML('beforeend', sheenSpan(p.name));
    if (!lit(fin) && sh) t.removeChild(sh);
  }
  ladder.forEach(function (p, i) {
    var n = ladder.length;
    FIN[p.id] = i === 0 ? 'plain' : (i === n - 1 ? 'sheen' : (n >= 4 && i === n - 2 ? 'polished' : 'gradient'));
    wear(p, FIN[p.id]);
  });
  // The one-time plan is the top tier paid once. It has no finish of its own: its card and its title wear the
  // top tier's, so the top tier's own rules (bots.css) draw them, and it follows the top tier if the tiers change.
  if (plans.lifetime && ladder.length) wear(plans.lifetime, FIN[ladder[ladder.length - 1].id]);
  function finish(tier) { return FIN[tier] || 'plain'; }
  // A strategy's NAME wears its tier's finish only in the upper half of the monthly tiers (row E728; with four tiers,
  // Tier 1 and Tier 2), so only those names stand out. A name in the lower half, or with no tier, is plain everywhere
  // it shows. The tier cards, the tier badges and the small cards' borders keep their tier's own finish (finish()).
  function nameFinish(tier) {
    var i = plans[tier] ? ladder.indexOf(plans[tier]) : -1;
    return i >= 0 && i >= ladder.length / 2 ? finish(tier) : 'plain';
  }
  // A strategy's grade follows the tier it sits in: the lowest tier holds Tier 4, the top tier Tier 1. The words
  // name the grade and the tiers that include it, wherever a strategy's tier is shown.
  function grade(tier) { return plans[tier] ? ladder.length - ladder.indexOf(plans[tier]) : null; }
  function gradeWords(tier) {
    if (!plans[tier]) return 'Tier not set';
    return 'Tier ' + grade(tier) + ' · ' + plans[tier].name + (plans[tier] === ladder[ladder.length - 1] ? '' : ' and up');
  }

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
    var gs = ladder.filter(function (q) { return q.rank <= p.rank; }).map(function (q) { return grade(q.id); }).reverse();
    if (gs.length > 1) return 'Tier ' + gs.slice(0, -1).join(', ') + ' and ' + gs[gs.length - 1] + ' strategies';
    return 'Tier ' + gs[0] + ' strategies';
  }

  /* ---------- the named strategies, from the catalog ---------- */
  // A grade that is set decides the strategy's tier: Tier 1 is the top tier, Tier 4 the lowest.
  (CAT.strategies || []).forEach(function (s) {
    if (s && [1, 2, 3, 4].indexOf(s.grade) >= 0 && ladder[ladder.length - s.grade]) s.tier = ladder[ladder.length - s.grade].id;
  });
  var names = {}, tiers = {}, slugs = [];
  var named = (CAT.strategies || []).filter(function (s) {
    return s && s.named === true && /^[a-z0-9-]+$/.test(String(s.slug)) && s.name && plans[s.tier] &&
      plans[s.tier].kind === 'monthly' && !document.getElementById(s.slug);
  });
  // The Strategies page lists every entry with a TradingView page, a strategy whose tier is not set (tier: null) included.
  // Only named strategies with a tier reach the tier cards and the savings.
  var listed = (CAT.strategies || []).filter(function (s) {
    return s && s.named === true && /^[a-z0-9-]+$/.test(String(s.slug)) && s.name && !document.getElementById(s.slug) &&
      /^https:\/\/www\.tradingview\.com\/script\//.test(String(s.tv_url)) && (s.tier === null || (plans[s.tier] && plans[s.tier].kind === 'monthly'));
  });
  var shown = ON_LIST ? listed : named;
  shown.forEach(function (s) { names[s.slug] = s.name; tiers[s.slug] = s.tier; slugs.push(s.slug); });

  function nameSpan(s) { return '<span class="bx-sname bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span>'; }

  // Tier cards: each named strategy is a chip before its tier's unnamed chip, in the catalog's order.
  // A chip is the name and an arrow, and the whole chip opens the strategy (bots.css).
  named.forEach(function (s) {
    var ul = $('[data-tier-list="' + s.tier + '"]');
    if (!ul) return;
    var li = document.createElement('li');
    li.className = 'bx-srow';
    li.setAttribute('data-lvl', finish(s.tier));
    li.innerHTML = '<a class="bx-slink" href="#' + s.slug + '">' + nameSpan(s) + '<span class="bx-arw" aria-hidden="true">›</span></a>';
    var last = ul.lastElementChild;
    ul.insertBefore(li, last && !$('.bx-slink', last) ? last : null);   // before the unnamed chip, when there is one
  });

  // What a tier saves against buying its strategies one by one. Shown only when every strategy the tier includes
  // has a price and the tier costs less; never typed anywhere, so a new price changes it by itself.
  function dollars(n) {
    var r = Math.round(n * 100) / 100;
    return '$' + r.toLocaleString('en-US', { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  ladder.forEach(function (p) {
    var inc = (CAT.strategies || []).filter(function (s) { return s && plans[s.tier] && plans[s.tier].kind === 'monthly' && plans[s.tier].rank <= p.rank; });
    if (!inc.length || p.price === null) return;
    if (!inc.every(function (s) { return typeof s.price === 'number' && s.price > 0; })) return;
    var all = inc.reduce(function (a, s) { return a + s.price; }, 0), saved = all - p.price;
    if (!(saved > 0)) return;
    $('header', p.el).insertAdjacentHTML('afterend', '<p class="bx-save">Bought one by one: ' + dollars(all) + ' a month. You save ' + dollars(saved) + '.</p>');
  });

  // Every named strategy's chip shows in its tier card (row E752: Collin, 2026-11-20, every posted strategy on the page).
  $$('[data-tier-list]').forEach(function (ul) {
    var head = ul.previousElementSibling;
    if (!ul.children.length && head && head.classList.contains('bx-list-h')) head.hidden = true;   // nothing to list yet
  });
  // The strategy cards.
  var stratGrid = $('#strat-grid');
  if (stratGrid) {
    stratGrid.innerHTML = named.map(function (s) {
      return '<a class="bx-strat" href="#' + s.slug + '" data-slug="' + s.slug + '" data-tier="' + esc(s.tier) + '" data-lvl="' + finish(s.tier) + '">' +
        '<p class="bx-strat-k"><span>' + esc(s.market_line || '') + '</span><span class="bx-tier" data-lvl="' + finish(s.tier) + '">' + esc(gradeWords(s.tier)) + '</span></p>' +
        '<h3><span class="bx-wm"' + lettering(s) + '>' + esc(s.name) + sheen(s) + '</span></h3>' +
        '<dl class="bx-hl" data-hl="' + s.slug + '"></dl>' +
        '<div class="bx-spark" data-spark="' + s.slug + '" aria-hidden="true"></div>' +
        '<p class="bx-strat-go"><span class="bx-status" data-status="' + s.slug + '"></span><span class="bx-open">Open strategy</span></p>' +
        '</a>';
    }).join('');
  }

  var docs = {};                // slug -> loaded data file
  var sel = { plan: null };
  var openSlug = null, cameFromPage = false, lastTrigger = null, chosenAt = 0;

  var bar = $('#bar'), barPlan = $('#bar-plan'), barDetail = $('#bar-detail'), barPrice = $('#bar-price'), barBtn = $('#bar-btn'), barAlt = $('#bar-alt');
  var sheet = $('#sheet'), backdrop = $('#backdrop'), sheetK = $('#sheet-k'), sheetTitle = $('#sheet-title');
  var sheetBody = $('#sheet-body');

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
    var own = openSlug ? plans[tiers[openSlug]] : null, nm = openSlug ? names[openSlug] : '';
    var two = false;
    bar.classList.toggle('has-sel', !!p);
    barAlt.hidden = true;
    if (!p) {
      barPrice.hidden = true;
      if (own) {
        barPlan.textContent = gradeWords(own.id);
        barDetail.textContent = priceWords(own);
        setBtn('choose', 'Choose ' + own.name, '', own.id);
      } else {
        barPlan.textContent = 'No tier chosen yet';
        barDetail.textContent = ON_LIST ? 'Pick one below' : 'Pick one above';
        setBtn('tiers', 'See tiers');
      }
    } else {
      barPlan.innerHTML = esc(p.name) + '<span class="bx-bp-price"> · ' + esc(priceWords(p)) + '</span>';
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
        barDetail.textContent = nm + ': ' + gradeWords(own.id);
        barAlt.textContent = 'Switch to ' + own.name + (own.price === null ? '' : ' · $' + own.price.toLocaleString('en-US'));
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

  /* ---------- the open strategy ---------- */
  function hashSlug() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(names, h) ? h : null;
  }

  function showSheet(slug) {
    openSlug = slug;
    sheetTitle.textContent = names[slug];
    var s = shown.filter(function (x) { return x.slug === slug; })[0];
    sheetTitle.setAttribute('data-lvl', nameFinish(tiers[slug]));
    ['--n', '--c0', '--c1', '--c2'].forEach(function (k) { sheetTitle.style.removeProperty(k); });
    if (s) {
      palette(s).forEach(function (p) { sheetTitle.style.setProperty(p[0], p[1]); });
      if (sheen(s)) sheetTitle.insertAdjacentHTML('beforeend', sheen(s));
    }
    sheetK.textContent = gradeWords(tiers[slug]);
    sheetBody.innerHTML = '<p class="bx-note">Loading…</p>';
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
    var w = d.what || {}, tierName = gradeWords(tiers[d.slug]);
    var own = shown.filter(function (x) { return x.slug === d.slug; })[0] || {};
    var ownPrice = typeof own.price === 'number' && own.price > 0 ? dollars(own.price) + ' a month' : 'Price at release';
    sheetK.textContent = (w.market_line ? w.market_line + ' · ' : '') + tierName;

    var what = '<section class="bx-part"><h3>The strategy</h3>' +
      dl([['Market', has(w.market_line) && esc(w.market_line)], ['Chart', has(w.timeframe) && esc(w.timeframe)],
        ['Tier', esc(tierName)], ['On its own', esc(ownPrice)]]) + '</section>';

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
        kpi('Profit factor', show.profit_factor) +
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
        ['TradingView page', has(p.tradingview_url) && /^https:\/\/([a-z]+\.)?tradingview\.com\//.test(p.tradingview_url) && '<a href="' + esc(p.tradingview_url) + '" rel="noopener">Open the strategy on TradingView</a>']
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

  // A card's quick highlights (Collin 2026-11-18, row E702): the record's own display figures, as the Strategy Library
  // table prints them, label over figure. The card carries no label words; the sheet and the Strategy Library keep them.
  function highlights(d) {
    if (d.status !== 'figures' || !d.figures || !d.figures.display) return '';
    var f = d.figures, show = f.display;
    return [['Return on drawdown', show.return_on_drawdown, ''], ['Avg monthly profit', show.monthly_profit, tone(f.monthly_profit_usd)],
            ['Win rate', show.win_rate, '']].filter(function (h) { return h[1]; }).map(function (h) {
      return '<div class="bx-hl-i"><dt>' + esc(h[0]) + '</dt><dd' + (h[2] ? ' class="' + h[2] + '"' : '') + '>' + esc(h[1]) + '</dd></div>';
    }).join('');
  }

  function spark(el, d) {
    if (d.status !== 'figures' || !d.equity || !d.equity.length) {
      el.textContent = d.status === 'figures' ? '' : 'No figures published yet';
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
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redraw, 120);
  });

  /* ---------- coming soon (row E736): a name, the market line and the chart, nothing else ---------- */
  // The Library's block (#soon, under the table) is one small card per item; the bots page's strip (#soon-strip, after
  // the tier cards) gives the names and markets and links to that block. A name is lettered plain.
  var soonItems = SOON.filter(function (s) { return /^[a-z0-9-]+$/.test(String(s.slug)) && s.name && s.market_line; });
  function soonBlock(el, full) {
    if (!el || !soonItems.length) return;
    var h = full ? 'h2' : 'h3';
    el.innerHTML = '<' + h + ' class="bx-soon-h" id="' + el.id + '-h">Coming soon</' + h + '>' +
      '<p class="bx-soon-n">Not released yet. Figures, tier and price are published with each release.</p>' +
      '<ul class="bx-soon-list">' + soonItems.map(function (s) {
        return '<li class="bx-soon-i"><p class="bx-soon-name">' + esc(s.name) + '</p><p class="bx-soon-m">' + esc(s.market_line) + '</p>' +
          (full ? '<p class="bx-soon-tag">Coming soon</p>' : '') + '</li>';
      }).join('') + '</ul>' +
      (full ? '' : '<p class="bx-soon-more"><a href="strategies/#soon">See them in the Strategy Library</a></p>');
    el.setAttribute('aria-labelledby', el.id + '-h');
    el.hidden = false;
    // A page loaded onto #soon: the block is drawn after the browser looked for it, so it is brought into view once all is drawn.
    if (full && location.hash === '#soon') window.addEventListener('load', function () { el.scrollIntoView({ block: 'start' }); });
  }
  soonBlock($('#soon'), true);
  soonBlock($('#soon-strip'), false);

  /* ---------- start ---------- */
  window.AFT_BOTS = { named: named, listed: listed, plans: plans, ladder: ladder, nameSpan: nameSpan, grade: grade, finish: finish, esc: esc,
    usd: usd, day: day, tone: tone, dollars: dollars, priceWords: priceWords, dayWords: dayWords, monthItem: monthItem, dailyCals: dailyCals,
    calcLink: calcLink };
  load();
  render();
  if (stratGrid) slugs.forEach(function (slug) {
    getDoc(slug).then(function (d) {
      var sp = $('[data-spark="' + slug + '"]'), hl = $('[data-hl="' + slug + '"]');
      if (hl) hl.innerHTML = highlights(d);
      if (sp) spark(sp, d);
    }, function () { /* the cards still read without their data */ });
  });
  route();
})();
