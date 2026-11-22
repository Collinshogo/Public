/* AFT Trading Bots: the account rules calculator (row E737, corrected by rows E745 and E746).
   No tracking of its own, no library and no network call beyond this site's own data files (../data/<slug>.json).
   - It replays one strategy's published hypothetical results through the rules a visitor types: from every day of the
     test with a closed trade an account starts at 0, takes the days in order and ends when it reaches the profit target
     or hits the loss limit; a start the test ended first did not finish and is left out of the percentage passed.
   - A daily loss limit and a consistency rule never end an account: each stops the day it reaches (row E745 ruling 1).
   - The data: each record's "days" ([date, total]) and "day_paths" (for the same days, each day's running result from
     its start as its turning points, ending at the day's total; row E746), written by aft_strategy_export.py. A record
     without them is not offered. The replay walks each day's path, so the floors and both stops are exact.
   - The replay works in whole cents. aft_strategy_export.py carries the same replay and summary in Python (replay(),
     summary()); the page's results were checked against them over a grid of rules for every record. Change one, change
     both.
   - What the visitor chose is kept in the address after # so a view can be reopened. A value there that is not usable is
     reset to its starting value, and the page says which.
   - Row E768: the picker names each strategy's return on drawdown and max drawdown; a panel under the picker and the size
     control shows the record as tested and at the chosen multiple (the record's amounts times n, to the cent) and its max
     drawdown against the loss limit typed; the compare view shows each max drawdown at the multiple. The form is shorter:
     example accounts first, target and loss limit side by side, the kind as one switch, the other rules under "More
     rules". Every input, its meaning and its default are as before.
   - Strategy names are lettered by the site's rule (bots.js, rows E728, E704 and E802): a grade sets the tier, and a name
     wears its tier's lettering as on the bots page (row E833, the owner's scheme by plan): Base's names plain, Select's
     bold in one solid colour, Supreme's bold with the sheen, Ultimate's bold with the sheen and the lightning through
     the letters; each name in its market's colours, as on the bots page (bots.js palette(), row E802). */
(function () {
  'use strict';

  var CAT = window.AFT_BOTS_CATALOG || {};
  var DATA = document.body.dataset.dataBase || '../data/';
  var MINUS = '−', DASH = '–';
  // Row E745 ruling 8 and row E746 ruling 13: the line every result stands beside, in both views.
  var MUST = 'A replay of hypothetical test results. Not a forecast, and not a chance of passing any account.';
  // Row E737: the multiples of the tested results. It was ruled on 2026-11-20 that the control stays (SCALES = [1] would remove it).
  var SCALES = [1, 2, 3, 4, 5];
  // Row E745 ruling 9: his names, in his order. The ids (and the address keys) are those of row E737.
  var KINDS = [
    { id: 'fixed', name: 'Static', note: 'Never moves.' },
    { id: 'intraday', name: 'Trailing drawdown', note: 'Moves up with the highest point the account reaches, open trades included.' },
    { id: 'eod', name: 'End-of-day drawdown', note: 'Moves up only at each day’s close.' }
  ];
  var EXAMPLES = [   // inputs only, in whole cents; they never set the kind of loss limit
    { label: '50K account', t: 300000, l: 200000 },
    { label: '100K account', t: 600000, l: 300000 },
    { label: '150K account', t: 900000, l: 450000 }
  ];
  var OUT = ['target', 'limit', 'open'];   // how a start ended, by code 0 to 2
  var WORDS = { target: 'Passed', limit: 'Blown', open: 'In progress' };   // row E783: a start's outcome, everywhere on the page
  var COL = { target: '#34c27a', limit: '#ff6b6b', open: '#565d78', mid: '#ffffff', daily: '#f5c542', cons: '#4ea1ff' };   // daily, cons: row E779's calendar
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function still() { return !!(reduce && reduce.matches); }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function day(iso) { var p = String(iso).split('-'); return MON[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0]; }
  // Cents to words: "$3,000" when whole, "$3,000.50" otherwise; signed when asked.
  function money(c, signed) {
    var a = Math.abs(c), whole = Math.floor(a / 100), cents = a % 100;
    var s = '$' + whole.toLocaleString('en-US') + (cents ? '.' + (cents < 10 ? '0' : '') + cents : '');
    return (c < 0 ? MINUS : (signed && c > 0 ? '+' : '')) + s;
  }
  function moneyFull(c, signed) {   // always with cents, as the daily P&L shows a day
    var a = Math.abs(c), s = '$' + Math.floor(a / 100).toLocaleString('en-US') + '.' + ((a % 100) < 10 ? '0' : '') + (a % 100);
    return (c < 0 ? MINUS : (signed && c > 0 ? '+' : '')) + s;
  }
  function plain(c) { return (c / 100).toFixed(c % 100 ? 2 : 0); }   // a number for an input box or the address
  function halfUp(num, den) { return Math.floor((2 * num + den) / (2 * den)); }   // in integers, as the reference
  function pct(a, n) { return n ? halfUp(100 * a, n) : 0; }   // whole per cent, half up
  function num(n) { return n.toLocaleString('en-US'); }
  function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : many); }
  function daysWords(v) { return (v % 1 ? v.toFixed(1) : String(v)) + (v === 1 ? ' day' : ' days'); }
  function tenths(t) { return (t / 10).toFixed(1); }   // an average in tenths, "47.3"
  function rateText(t) { return t.rate === null ? DASH : t.rate + '%'; }
  // Row E782: time to the target is counted in calendar days (start day to target day, both counted); days with trades second.
  function avgText(t) {
    return t.avgC === null ? 'Average time to the target: ' + DASH :
      'Average time to the target: about ' + plural(t.avgC, 'day', 'days') + ' (' + tenths(t.avgT) + ' days with trades)';
  }
  // Row E748 rulings 2 and 3: the same replay on the harsher order's paths (best point first in every trade). It shows
  // always under Trailing drawdown, and under the other kinds only when its percentage passed or its hit count differs.
  var HARSH = 'If each trade’s best point came before its worst: ';
  function harshShows(t, h, kind) { return kind === 'intraday' || h.rate !== t.rate || h.limit !== t.limit; }
  function harshLine(t, h) {
    return HARSH + (h.target === t.target && h.limit === t.limit && h.open === t.open ? 'the same result.' :
      rateText(h) + ' (' + num(h.target) + ' passed, ' + num(h.limit) + ' blown, ' + num(h.open) + ' in progress).');
  }
  function harshShort(h) { return 'if each trade’s best point came first: ' + rateText(h); }   // row E749 ruling 1: named neutrally; row E828: in words
  function notCounted(t) {
    return t.open ? num(t.open) + ' in progress when the test ended, left out of the rate.' : '';
  }
  // Row E783: the ring shows every start; its words give the three counts and why in-progress starts are not in the rate.
  var LEFT_OUT = 'The percentage passed counts passed and blown accounts; accounts still in progress when the test ended are left out.';
  function ringWords(t) {
    return (t.fin ? t.rate + '% passed.' : 'No start finished under these rules in the tested range.') + ' Of all ' + plural(t.n, 'start', 'starts') + ': ' +
      num(t.target) + ' passed, ' + num(t.limit) + ' blown, ' + num(t.open) + ' in progress.' + (t.open ? ' ' + LEFT_OUT : '');
  }
  function oc(c, n, w) { return '<span class="cx-oc"><i style="background:' + c + '" aria-hidden="true"></i>' + num(n) + ' ' + w + '</span>'; }

  /* ---------- the lettering of a name (the site's rule, as in bots.js) ---------- */
  var LAD = (CAT.tiers || []).slice().sort(function (a, b) { return a.rank - b.rank; });
  function tierOf(s) { return ([1, 2, 3, 4].indexOf(s.grade) >= 0 && LAD[LAD.length - s.grade]) ? LAD[LAD.length - s.grade].id : s.tier; }
  function rungOf(s) { var t = tierOf(s), i = -1; LAD.forEach(function (x, k) { if (x.id === t) i = k; }); return i; }
  // Row E833: the bots page's lettering by plan (bots.js LET and BOLT, row E802): the lowest plan plain, the top plan and
  // the one under it the sheen, every plan between solid colour, and the top plan's names the lightning; no plan, plain.
  function nameFinish(s) {
    var i = rungOf(s), n = LAD.length;
    return i <= 0 ? 'plain' : (i === n - 1 || (n >= 3 && i === n - 2) ? 'sheen' : 'solid');
  }
  function nameBolt(s) { var i = rungOf(s); return i >= 0 && i === LAD.length - 1; }
  function colour(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)); }
  // Row E833 (the director's follow-up, 2026-11-22): a name's colours are its market's, as bots.js palette() has them
  // (row E802; bots.css: --mnq, --mgc, --mes, each with its light and end stops, on .bots); only a strategy on another
  // market keeps its own three colours from the catalog. marketCode() is bots.js's as it is.
  var MKT = { MNQ: 'mnq', MGC: 'mgc', MES: 'mes' };
  function marketCode(s) { return s.chip || String(s.market_line || '').split(' \u00b7 ')[0]; }
  function palette(s) {
    var g = s.lettering, out = ['--n:' + String(s.name).length], m = MKT[String(marketCode(s)).toUpperCase()];
    if (m) out.push('--c0:var(--' + m + '-0)', '--c1:var(--' + m + ')', '--c2:var(--' + m + '-2)');
    else if (g && g.length === 3 && g.every(colour)) out.push('--c0:' + g[0], '--c1:' + g[1], '--c2:' + g[2]);
    return out;
  }
  // Row E833: bots.js's boltSpan() as it is (the calculator does not load bots.js), so a name gets the same bolt here.
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
  function nameSpan(s) {
    var fin = nameFinish(s), st = palette(s);
    var sh = (fin === 'sheen' || fin === 'polished') ? '<span class="bx-sh" aria-hidden="true" data-t="' + esc(s.name) + '"></span>' : '';
    var bo = nameBolt(s) ? boltSpan(s.name) : '';
    var n = '<span class="bx-sname bx-wm" data-lvl="' + fin + '"' + (bo ? ' data-bolt=""' : '') + ' style="' + st.join(';') + '">' + esc(s.name) + sh + bo + '</span>';
    // Row E754: a coming-soon strategy carries the tag "Coming soon" right after its name, read with it.
    return s.coming_soon === true ? '<span class="bx-nt">' + n + '<span class="bx-cs"><span class="bx-vh">, </span>Coming soon</span></span>' : n;
  }
  // Row E833, as on the bots page (bots.js, rows E802 and E810): a name's lightning runs only while the name is on
  // screen, and each lit name that comes on screen takes the least-used of thirteen moments 0.6 s apart in the 7.8 s
  // strike loop (bots.css), so no two names on screen strike together. A name the page has drawn again is let go.
  if ('IntersectionObserver' in window && 'MutationObserver' in window) {
    var BOLT_AT = [0, 5, 10, 2, 7, 12, 4, 9, 1, 6, 11, 3, 8], boltUse = {};
    var boltIO = new IntersectionObserver(function (es) { es.forEach(function (e) {
      var b = e.target, s = b.getAttribute('data-s');
      if (e.isIntersecting && s === null) {
        s = BOLT_AT[0]; BOLT_AT.forEach(function (m) { if ((boltUse[m] || 0) < (boltUse[s] || 0)) s = m; });
        boltUse[s] = (boltUse[s] || 0) + 1; b.setAttribute('data-s', s);
        b.style.setProperty('--bd', (((s * 0.6 - performance.now() / 1000) % 7.8 + 7.8) % 7.8 - 7.8).toFixed(3) + 's');
      } else if (!e.isIntersecting && s !== null) { boltUse[s]--; b.removeAttribute('data-s'); }
      b.classList.toggle('is-off', !e.isIntersecting);
      if (!b.isConnected) boltIO.unobserve(b);
    }); });
    var watchBolts = function () {
      Array.prototype.forEach.call(document.querySelectorAll('.bx-bolt:not([data-w])'), function (b) { b.setAttribute('data-w', ''); b.classList.add('is-off'); boltIO.observe(b); });
    };
    watchBolts();
    new MutationObserver(watchBolts).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- the replay, in whole cents ---------- */
  function capOf(R) { return R.cp === null ? null : Math.floor(R.t * R.cp / 100); }   // the consistency cap, rounded down
  // Row E746: one day's path walked alone against the two stop levels (cents, already scaled; D and C null when off).
  // Returns 0 (not stopped), 1 (the daily loss limit) or 2 (the consistency rule): the first level the walk meets.
  function walkDay(p, D, C) {
    var x = 0;
    for (var j = 0; j < p.length; j++) {
      var v = p[j];
      if (v < x) { if (D !== null && v <= -D) return 1; }
      else if (v > x) { if (C !== null && v >= C) return 2; }
      x = v;
    }
    return 0;
  }
  function stopDays(dp, R) {
    var D = R.dl, C = capOf(R), stop = new Int8Array(dp.length);
    for (var i = 0; i < dp.length; i++) stop[i] = walkDay(dp[i], D, C);
    return { stop: stop };
  }
  // R: kind, t (target), l (limit), lock (false from the page since row E828), dl (daily limit or null), cp (consistency per cent or null), md (minimum days).
  // dp: each day's path of turning points (cents, already scaled), ending at the day's total. Row E746: within a day the
  // running result x moves in straight steps from 0 through each point; the balance is b + x. The floor: Static -l;
  // End-of-day drawdown the highest end-of-day balance so far minus l, fixed during the day; Trailing drawdown the highest
  // balance reached so far minus l; with lock, the two trailing floors never above 0. On a step down the account
  // ends where b + x meets the floor, and the day stops where x meets -dl: the level met first applies, the account at a
  // tie. On a step up the day stops where x meets the cap. A stopped day ends at its level; then the target is checked.
  // Returns {code: Int8Array (0 target, 1 limit, 2 open), len: the days traded to that end, days: the days stopped by each
  // rule (each walked alone), paths when asked: each start's balance at the start (0), after each day, and at its end (the
  // floor it met)}.
  function replayC(dp, R, withPaths) {
    var n = dp.length, code = new Int8Array(n), len = new Int32Array(n), paths = withPaths ? new Array(n) : null;
    var D = R.dl, C = capOf(R), L = R.l, kind = R.kind, lock = R.lock;
    for (var s = 0; s < n; s++) {
      var b = 0, eod = 0, hi = 0, end = 2, i, path = withPaths ? [0] : null, last = 0;
      for (i = s; i < n; i++) {
        var p = dp[i], x = 0, fl = 0, ended = false, j, v, acc;
        if (kind === 'fixed') fl = -L;
        else if (kind === 'eod') { fl = eod - L; if (lock && fl > 0) fl = 0; }
        for (j = 0; j < p.length; j++) {
          v = p[j];
          if (v < x) {
            if (kind === 'intraday') { fl = hi - L; if (lock && fl > 0) fl = 0; }
            acc = fl - b;
            if (v <= acc && (D === null || acc >= -D)) { ended = true; break; }
            if (D !== null && v <= -D) { x = -D; break; }
            x = v;
          } else if (v > x) {
            if (C !== null && v >= C) { x = C; if (b + x > hi) hi = b + x; break; }
            x = v;
            if (b + x > hi) hi = b + x;
          }
        }
        if (ended) { end = 1; last = fl; break; }
        b += x;
        if (b > eod) eod = b;
        if (path) path.push(b);
        if (b >= R.t && i - s + 1 >= R.md) { end = 0; break; }
      }
      code[s] = end;
      len[s] = end === 2 ? n - s : i - s + 1;
      if (path) { if (end === 1) path.push(last); paths[s] = path; }
    }
    return { code: code, len: len, days: stopDays(dp, R), paths: paths };
  }
  var DAY_MS = 864e5;
  // Row E782: the calendar days a start ran, its start day and its end day both counted (len: its trading days).
  function calDays(dates, i, len) { return dayNo(dates[i + len - 1]) - dayNo(dates[i]) + 1; }
  function dayNo(iso) { return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY_MS); }
  // What a view shows: counts, the percentage of the finished starts that passed, the averages, the days stopped by each rule.
  function tally(res, dates) {
    var c = [0, 0, 0], reach = [], reachC = [], sumT = 0, sumC = 0, sd = 0, sc = 0, i, cd;
    for (i = 0; i < res.code.length; i++) {
      c[res.code[i]]++;
      if (res.code[i] === 0) { cd = calDays(dates, i, res.len[i]); reach.push(res.len[i]); reachC.push(cd); sumT += res.len[i]; sumC += cd; }
    }
    for (i = 0; i < res.days.stop.length; i++) { if (res.days.stop[i] === 1) sd++; else if (res.days.stop[i] === 2) sc++; }
    reach.sort(function (a, b) { return a - b; });
    reachC.sort(function (a, b) { return a - b; });
    function mid(r) { return m ? (m % 2 ? r[(m - 1) / 2] : (r[m / 2 - 1] + r[m / 2]) / 2) : null; }
    var m = reach.length, fin = c[0] + c[1], med = mid(reach);
    return { n: res.code.length, target: c[0], limit: c[1], open: c[2], fin: fin, rate: fin ? halfUp(100 * c[0], fin) : null,
      avgT: m ? halfUp(10 * sumT, m) : null, avgC: m ? halfUp(sumC, m) : null, reach: reach, median: med, reachC: reachC, medianC: mid(reachC), sd: sd, sc: sc };
  }
  function cents(v) { return Math.round(v * 100); }
  // The same replay with the reference's arguments (dollars), for the check against aft_strategy_export.py.
  function argsC(paths, rules) {
    var k = Math.round(rules.size || 1);
    return {
      dp: paths.map(function (p) { return p.map(function (v) { return cents(v) * k; }); }),
      R: { kind: rules.kind, t: cents(rules.target), l: cents(rules.limit), lock: rules.lock === true,
        dl: rules.daily == null ? null : cents(rules.daily), cp: rules.consistency == null ? null : rules.consistency, md: rules.min_days || 0 }
    };
  }
  function replay(days, paths, rules) {
    var a = argsC(paths, rules), r = replayC(a.dp, a.R, false), out = [];
    for (var i = 0; i < r.code.length; i++) out.push([OUT[r.code[i]], r.len[i]]);
    return out;
  }
  function summary(days, paths, rules, alt) {   // row E748: with alt (the harsher order's paths), also .harsher
    var a = argsC(paths, rules), t = tally(replayC(a.dp, a.R, false), days.map(function (d) { return d[0]; }));
    var o = { target: t.target, limit: t.limit, open: t.open, rate: t.rate, avg_trading_tenths: t.avgT, avg_calendar: t.avgC,
      stopped_daily: t.sd, stopped_cons: t.sc, n_days: t.n };
    if (alt) o.harsher = summary(days, alt, rules);
    return o;
  }

  /* ---------- the records ---------- */
  var recs = {}, order = [];   // slug -> {s (catalog entry), d (data file), tot, dp and dp2 (cents, as tested: the main paths and the harsher order's), dates}
  function pathsOk(ps, d) {
    if (!Array.isArray(ps) || d.days.length !== ps.length) return false;
    return ps.every(function (p, i) {
      return Array.isArray(p) && p.length && p.every(function (v) { return typeof v === 'number' && isFinite(v); }) &&
        cents(p[p.length - 1]) === cents(d.days[i][1]);
    });
  }
  function usable(d) {   // row E748: both paths, the main one and the harsher order's
    if (!d || d.status !== 'figures' || !Array.isArray(d.days) || !d.days.length) return false;
    return pathsOk(d.day_paths, d) && pathsOk(d.day_paths_alt, d);
  }
  function scaled(rec, k) {
    if (rec.k === k) return rec.sc;
    rec.k = k;
    function times(p) { return p.map(function (v) { return v * k; }); }
    rec.sc = { tot: rec.tot.map(function (v) { return v * k; }), dp: rec.dp.map(times), dp2: rec.dp2.map(times) };
    return rec.sc;
  }
  function run(rec, k, R, withPaths) { var sc = scaled(rec, k); return replayC(sc.dp, R, withPaths); }
  function runHarsh(rec, k, R) { return tally(replayC(scaled(rec, k).dp2, R, false), rec.dates); }

  /* ---------- the rules: inputs, checks and the address ---------- */
  // Row E745 ruling 10 had the starting-balance switch off by default and row E793 turned it on. Row E828 (the owner,
  // 2026-11-21, of that option: "No one's ever going to use that." and "It's always going to trail"): the switch is
  // gone and the loss limit always trails as its kind says; a link that still carries lock= reads as without it.
  var DEF = { s: '', k: 'eod', t: 300000, l: 200000, dlOn: false, dl: null, cpOn: false, cp: null, md: 0, x: 1, v: 'one' };
  var st = {};
  Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });
  // Row E780: the Live account mode keeps its own state (lv), so the Prop firm account mode and its address are exactly as
  // before; the address carries a=live and the live keys only in the Live account mode.
  var MKTS = ['MNQ', 'MES', 'MGC'];
  var lv = { on: false, s: { MNQ: '', MES: '', MGC: '' }, d: '', b: null, bSet: false,   // bSet: a starting balance was typed
    x: { MNQ: 1, MES: 1, MGC: 1 }, m: 20000, mSet: false };   // row E797: a multiplier per market; the margin per micro (mSet: typed)
  var MPM = 20000;   // row E797: $200 of margin per micro contract by default (the owner, 2026-11-21), based on Tradovate's margins
  var MAXC = 1000000000;   // $10,000,000
  // A box's text to whole cents: digits with at most two decimals, a $ and commas allowed. Anything else says why.
  function readMoney(text) {
    var t = String(text).trim().replace(/[$,\s]/g, '');
    if (t === '') return { err: 'Type an amount in dollars.' };
    if (/^[-−]/.test(t)) return { err: 'Type an amount above $0, without a minus sign.' };
    if (!/^\d+(\.\d{1,2})?$/.test(t) && !/^\.\d{1,2}$/.test(t)) return { err: 'Numbers only, with at most two decimals.' };
    var p = t.split('.'), c = Number(p[0] || '0') * 100 + (p[1] ? Number((p[1] + '0').slice(0, 2)) : 0);
    if (c === 0) return { err: 'Type an amount above $0.' };
    if (c > MAXC) return { err: 'Type an amount up to $10,000,000.' };
    return { c: c };
  }
  function readWhole(text, lo, hi, what) {
    var t = String(text).trim();
    if (t === '') return { err: 'Type ' + what + '.' };
    if (/^[-−]/.test(t)) return { err: 'Type a number from ' + lo + ' to ' + hi + ', without a minus sign.' };
    if (!/^\d+$/.test(t)) return { err: 'Whole numbers only.' };
    var v = Number(t);
    if (v < lo || v > hi) return { err: 'Type a number from ' + lo + ' to ' + hi + '.' };
    return { c: v };
  }
  var F = {};   // the controls
  function errShow(id, msg) {
    var el = $('#' + id + '-err'), box = $('#' + id);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    if (box) box.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  // Reads every box into st; returns the list of boxes that block the replay (with their messages shown).
  function readAll() {
    var bad = [];
    function money1(id, key, label) {
      var r = readMoney(F[id].value);
      errShow(id, r.err);
      if (r.err) bad.push(label); else st[key] = r.c;
    }
    money1('target', 't', 'Profit target');
    money1('limit', 'l', 'Loss limit');
    if (st.dlOn) money1('dl', 'dl', 'Daily loss limit'); else errShow('dl', '');
    if (st.cpOn) {
      var r = readWhole(String(F.cp.value).trim().replace(/\s*%$/, ''), 1, 100, 'a per cent from 1 to 100');
      errShow('cp', r.err);
      if (r.err) bad.push('Consistency rule'); else st.cp = r.c;
    } else errShow('cp', '');
    var m = readWhole(F.md.value, 0, 999, 'a number of days (0 for none)');
    errShow('md', m.err);
    if (m.err) bad.push('Required days to pass'); else st.md = m.c;
    return bad;
  }
  function rulesC() {
    return { kind: st.k, t: st.t, l: st.l, lock: false, dl: st.dlOn ? st.dl : null, cp: st.cpOn ? st.cp : null, md: st.md };
  }
  function writeHash() {
    var p = ['s=' + encodeURIComponent(st.s), 'k=' + st.k, 't=' + plain(st.t), 'l=' + plain(st.l)];
    if (st.dlOn && st.dl) p.push('dl=' + plain(st.dl));
    if (st.cpOn && st.cp) p.push('c=' + st.cp);
    if (st.md) p.push('md=' + st.md);
    if (SCALES.length > 1 && st.x !== 1) p.push('x=' + st.x);
    if (st.v === 'compare') p.push('v=compare');
    var h = '#' + p.join('&');
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* the view still works */ } }
  }
  // The address: each value is checked as if typed; one that is not usable is reset and named in a note.
  function readHash() {
    var raw = location.hash.replace(/^#/, ''), q = {}, reset = [];
    Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });
    if (!raw) return reset;
    raw.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) { try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { q[kv.slice(0, i)] = '\u0000'; } }
    });
    if ('s' in q) { if (recs[q.s]) st.s = q.s; else reset.push('strategy'); }
    if ('k' in q) { if (KINDS.some(function (x) { return x.id === q.k; })) st.k = q.k; else reset.push('kind of loss limit'); }
    [['t', 't', 'profit target'], ['l', 'l', 'loss limit']].forEach(function (a) {
      if (!(a[0] in q)) return;
      var r = readMoney(q[a[0]]);
      if (r.err) reset.push(a[2]); else st[a[1]] = r.c;
    });
    if ('dl' in q) { var d = readMoney(q.dl); if (d.err) reset.push('daily loss limit'); else { st.dlOn = true; st.dl = d.c; } }
    if ('c' in q) { var c = readWhole(q.c, 1, 100, ''); if (c.err) reset.push('consistency rule'); else { st.cpOn = true; st.cp = c.c; } }
    if ('md' in q) { var m = readWhole(q.md, 0, 999, ''); if (m.err) reset.push('required days to pass'); else st.md = m.c; }
    if ('x' in q) { var x = Number(q.x); if (SCALES.indexOf(x) >= 0 && /^\d$/.test(q.x)) st.x = x; else reset.push('multiplier'); }
    if ('v' in q) { if (q.v === 'compare' || q.v === 'one') st.v = q.v; else reset.push('view'); }
    return reset;
  }
  function fillControls() {
    F.pick.value = st.s;
    F.target.value = plain(st.t);
    F.limit.value = plain(st.l);
    document.querySelectorAll('input[name="kind"]').forEach(function (r) { r.checked = r.value === st.k; });
    F.dlOn.checked = st.dlOn;
    F.dl.value = st.dl ? plain(st.dl) : '';
    F.cpOn.checked = st.cpOn;
    F.cp.value = st.cp ? String(st.cp) : '';
    F.md.value = String(st.md);
    if (F.scale) F.scale.value = String(st.x);
    syncSwitches();
  }
  function syncSwitches() {
    $('#dl-box').hidden = !st.dlOn;
    $('#cp-box').hidden = !st.cpOn;
    var kd = KINDS.filter(function (x) { return x.id === st.k; })[0];
    $('#kind-note').textContent = kd ? kd.name + ': ' + kd.note.charAt(0).toLowerCase() + kd.note.slice(1) : '';
    moreCount();
  }
  // Row E768: the rules under "More rules" that are on, named on the closed control.
  function moreCount() {
    var on = [];
    if (st.dlOn) on.push('daily loss limit');
    if (st.cpOn) on.push('consistency');
    if (st.md) on.push('required days to pass');
    $('#more-n').textContent = on.length ? on.length + ' on: ' + on.join(', ') : '';
  }

  /* ---------- drawing helpers ---------- */
  function arc(cx, cy, r, a0, a1) {   // an SVG arc path from angle a0 to a1 (radians, 0 at the top, clockwise)
    var x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0), x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1);
    return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
  }
  // A ring of segments [{v, c}], gaps between segments, ticks round the outside.
  function ring(size, r, w, segs, total, ticks) {
    var cx = size / 2, out = '';
    if (ticks) for (var i = 0; i < 60; i++) {
      var a = i / 60 * 2 * Math.PI, r0 = r + w / 2 + 5, r1 = r0 + (i % 5 ? 3 : 6);
      out += '<line x1="' + (cx + r0 * Math.sin(a)).toFixed(1) + '" y1="' + (cx - r0 * Math.cos(a)).toFixed(1) + '" x2="' + (cx + r1 * Math.sin(a)).toFixed(1) + '" y2="' + (cx - r1 * Math.cos(a)).toFixed(1) + '" class="cx-tick"/>';
    }
    out += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" class="cx-track" stroke-width="' + w + '"/>';
    if (!total) return out;
    var live = segs.filter(function (s) { return s.v > 0; }), gap = live.length > 1 ? 0.035 : 0, a0 = 0;
    live.forEach(function (s) {
      var span = s.v / total * 2 * Math.PI, a1 = a0 + span;
      if (live.length === 1) out += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + s.c + '" stroke-width="' + w + '" class="cx-seg"/>';
      else if (span - gap > 0.001) out += '<path d="' + arc(cx, cx, r, a0 + gap / 2, a1 - gap / 2) + '" fill="none" stroke="' + s.c + '" stroke-width="' + w + '" class="cx-seg"/>';
      a0 = a1;
    });
    return out;
  }
  function countUp(el, to, suffix) {
    if (to === null) { el.textContent = DASH; return; }
    if (still() || !window.requestAnimationFrame) { el.textContent = to + suffix; return; }
    var t0 = null, dur = 700;
    function step(t) {
      if (t0 === null) t0 = t;
      var f = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - f, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- the one-strategy view ---------- */
  var cur = null;   // the last result drawn: {rec, res, tal, rules, k}
  function legendItem(c, text, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '><i style="background:' + c + '" aria-hidden="true"></i>' + text + '</li>'; }
  function rateWords(t) {
    return t.fin ? t.rate + '% passed: of ' + plural(t.fin, 'start that finished', 'starts that finished') + ', ' + num(t.target) + ' passed and ' +
      num(t.limit) + (t.limit === 1 ? ' was' : ' were') + ' blown.' : 'No start finished under these rules in the tested range.';
  }

  function drawDial(tal, h, kind) {
    var hs = harshShows(tal, h, kind);
    var alt = ringWords(tal) + ' ' + avgText(tal) + '.' + (hs ? ' ' + harshLine(tal, h) : '');
    var segs = [{ v: tal.target, c: COL.target }, { v: tal.limit, c: COL.limit }, { v: tal.open, c: COL.open }];
    $('#dial').innerHTML =
      '<div class="cx-dial"><svg viewBox="0 0 240 240" role="img" aria-label="' + esc(alt) + '"><defs><filter id="cx-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<g class="cx-glow" filter="url(#cx-glow)">' + ring(240, 92, 14, segs, tal.n, false) + '</g>' +
      ring(240, 92, 14, segs, tal.n, true) + '</svg>' +
      '<div class="cx-dial-mid" aria-hidden="true"><b class="cx-big" id="big">' + rateText(tal) + '</b><span>passed</span></div></div>' +
      '<ul class="cx-legend cx-dial-leg cx-out-leg" id="dial-leg" aria-hidden="true">' +
        legendItem(COL.target, 'Passed <b data-n="target">' + num(tal.target) + '</b>') +
        legendItem(COL.limit, 'Blown <b data-n="limit">' + num(tal.limit) + '</b>') +
        legendItem(COL.open, 'In progress <b data-n="open">' + num(tal.open) + '</b>') + '</ul>' +
      '<p class="cx-avg" id="dial-avg">' + esc(avgText(tal)) + '</p>' +
      (hs ? '<p class="cx-harsh" id="dial-harsh">' + esc(harshLine(tal, h)) + '</p>' : '') +
      '<p class="cx-must cx-must-dial">' + MUST + '</p>';
    var dial = $('#dial .cx-dial');
    if (!still() && tal.fin) { dial.classList.add('is-in'); requestAnimationFrame(function () { requestAnimationFrame(function () { dial.classList.remove('is-in'); }); }); }
    countUp($('#big'), tal.rate, '%');
  }

  function drawTrio(rec, k, rules) {
    $('#trio').innerHTML = KINDS.map(function (kd) {
      var on = kd.id === rules.kind, r = on && cur ? cur.res : run(rec, k, Object.assign({}, rules, { kind: kd.id }), false), t = on && cur ? cur.tal : tally(r, rec.dates);
      var h = on && cur ? cur.tal2 : runHarsh(rec, k, Object.assign({}, rules, { kind: kd.id })), hs = harshShows(t, h, kd.id);
      var words = kd.name + ': ' + rateWords(t) + (t.open ? ' ' + notCounted(t) : '') + ' ' + avgText(t) + '.' + (hs ? ' ' + harshLine(t, h) : '');
      return '<button type="button" class="cx-mini' + (on ? ' is-on' : '') + '" data-kind="' + kd.id + '" aria-pressed="' + on + '" aria-label="' + esc(words) + '">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true">' + ring(120, 44, 9, [{ v: t.target, c: COL.target }, { v: t.limit, c: COL.limit }, { v: t.open, c: COL.open }], t.n, false) +
        '<text x="60" y="66" text-anchor="middle" class="cx-mini-p">' + rateText(t) + '</text></svg>' +
        '<span class="cx-mini-k">' + esc(kd.name) + '</span>' +
        '<span class="cx-mini-n">' + (t.fin ? num(t.target) + ' passed of ' + num(t.fin) + ' finished' : 'none finished') + '</span>' +
        '<span class="cx-mini-n">' + (t.avgC === null ? 'Average ' + DASH : 'Average ' + plural(t.avgC, 'day', 'days')) + '</span>' +
        (hs ? '<span class="cx-mini-n cx-harsh-s">' + esc(harshShort(h)) + '</span>' : '') + '</button>';
    }).join('');
  }

  // Every start: one thin line per start day, balance after each trading day, coloured by how it ended.
  var lineAnim = 0;
  function drawLines(animate) {
    if (!cur) return;
    var box = $('#lines'), cv = $('#lines-c'), res = cur.res, R = cur.rules, n = res.code.length;
    var W = box.clientWidth, H = W < 560 ? 250 : 320, dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d');
    var maxLen = 1, lo = -R.l, hi = R.t, i, j;
    for (i = 0; i < n; i++) {
      var p = res.paths[i];
      if (p.length - 1 > maxLen) maxLen = p.length - 1;
      for (j = 0; j < p.length; j++) { if (p[j] < lo) lo = p[j]; if (p[j] > hi) hi = p[j]; }
    }
    var span = hi - lo || 1; lo -= span * 0.06; hi += span * 0.06; span = hi - lo;
    var padL = 54, padR = 10, padT = 12, padB = 24, w = W - padL - padR, h = H - padT - padB;
    function X(d) { return padL + w * d / maxLen; }
    function Y(v) { return padT + h * (1 - (v - lo) / span); }
    // the middle start by ending balance (the median start)
    var idx = []; for (i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) { var pa = res.paths[a], pb = res.paths[b]; return (pa[pa.length - 1] - pb[pb.length - 1]) || (a - b); });
    var mid = idx[(n - 1) >> 1];
    cur.mid = mid;
    var t0 = null, dur = (animate && !still()) ? 1000 : 0, go = ++lineAnim;
    function frame(t) {
      if (go !== lineAnim) return;
      if (t0 === null) t0 = t;
      var f = dur ? Math.min(1, (t - t0) / dur) : 1, upto = f * maxLen;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // the grid, the zero line, the target and the starting loss limit
      ctx.font = '11px "IBM Plex Sans", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      for (var g = 1; g < 6; g++) { var gx = padL + w * g / 6; ctx.beginPath(); ctx.moveTo(gx + 0.5, padT); ctx.lineTo(gx + 0.5, padT + h); ctx.stroke(); }
      var said = [];   // a label too close to one already written is left out; its line stays
      function hline(v, colr, dash, label) {
        var y = Math.round(Y(v)) + 0.5;
        ctx.setLineDash(dash); ctx.strokeStyle = colr; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke(); ctx.setLineDash([]);
        if (said.some(function (z) { return Math.abs(z - y) < 13; })) return;
        said.push(y);
        ctx.fillStyle = colr; ctx.textAlign = 'right'; ctx.fillText(label, padL - 6, y);
      }
      hline(R.t, COL.target, [5, 4], money(R.t));
      hline(-R.l, COL.limit, [5, 4], money(-R.l));
      hline(0, 'rgba(216,219,230,0.45)', [], '$0');
      ctx.textAlign = 'left'; ctx.fillStyle = '#9a9fb3'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Day 0', padL, H - 6);
      ctx.textAlign = 'right'; ctx.fillText('Day ' + maxLen, padL + w, H - 6);
      // the lines: the unfinished (quiet) and the limits first, the reached on top, the middle start last
      ctx.lineWidth = n > 150 ? 1 : 1.4;
      [2, 1, 0].forEach(function (c) {
        ctx.globalAlpha = c === 2 ? (n > 150 ? 0.32 : 0.45) : (n > 150 ? 0.42 : 0.6);
        ctx.strokeStyle = COL[OUT[c]];
        ctx.beginPath();
        for (var s = 0; s < n; s++) {
          if (res.code[s] !== c || s === mid) continue;
          var q = res.paths[s];
          ctx.moveTo(X(0), Y(0));
          for (var d = 1; d < q.length && d - 1 < upto; d++) {
            var dd = Math.min(d, upto);
            ctx.lineTo(X(dd), Y(q[d - 1] + (q[d] - q[d - 1]) * (dd - (d - 1))));
          }
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = COL.mid;
      ctx.shadowColor = 'rgba(255,255,255,0.55)'; ctx.shadowBlur = 8;
      var m = res.paths[mid]; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (var e = 1; e < m.length && e - 1 < upto; e++) { var ee = Math.min(e, upto); ctx.lineTo(X(ee), Y(m[e - 1] + (m[e] - m[e - 1]) * (ee - (e - 1)))); }
      ctx.stroke(); ctx.shadowBlur = 0;
      if (f < 1) requestAnimationFrame(frame);
    }
    if (dur) requestAnimationFrame(frame); else frame(0);
    var tal = cur.tal, mcode = OUT[res.code[mid]];
    var kindWord = R.kind === 'fixed' ? 'the loss limit' : 'the loss limit where it starts';
    $('#lines-sub').textContent = 'One line per start day: the balance after each trading day, to the day it ended. The dashed lines are the target and ' + kindWord + '.';
    cv.setAttribute('aria-label', 'Every start drawn: ' + plural(n, 'line', 'lines') + ', one per start day, from $0 to its end. ' +
      num(tal.target) + ' passed (reached the target line at ' + money(R.t) + '), ' + num(tal.limit) + ' blown and ' + num(tal.open) + ' in progress when the test ended. ' +
      'The longest runs ' + plural(maxLen, 'trading day', 'trading days') + '. The highlighted middle start, by ending balance, began on ' + day(cur.rec.d.days[mid][0]) + ' and ' +
      (mcode === 'target' ? 'passed after ' + plural(calDays(cur.rec.dates, mid, res.len[mid]), 'day', 'days') : mcode === 'open' ? 'was still in progress when the test ended, ' + plural(calDays(cur.rec.dates, mid, res.len[mid]), 'day', 'days') + ' later' : 'was blown after ' + plural(calDays(cur.rec.dates, mid, res.len[mid]), 'day', 'days')) + '.');
    $('#lines-legend').innerHTML = legendItem(COL.target, WORDS.target) + legendItem(COL.limit, WORDS.limit) + legendItem(COL.open, WORDS.open) +
      legendItem(COL.mid, 'The middle start, began ' + esc(day(cur.rec.d.days[mid][0])), 'is-mid');
  }

  // The trading days in calendar order: weeks as rows, Monday to Friday as columns (and a weekend column when traded).
  // Row E779: one square per tested trading day, coloured by what happened that day under the chosen rules: red where
  // accounts were blown (the account loss limit breached; the count is the starts whose end, start + length - 1, is that
  // day, so the red counts add up to the Blown total), yellow where the daily loss limit stopped trading and none was
  // blown (only while one is set; red wins), green for neither; a blue dot where the consistency cap stopped trading
  // (only while the rule is on; stop code 2). Nothing here names a daily loss limit while none is set.
  function calWords(R, cap) {
    var w = 'Each coloured square is one trading day in the test, coloured by what happened that day: red, accounts were blown that day (the number in the square is how many); green, none was.';   // row E793 (E792 R5): 'coloured'; the plain squares are named last
    if (R.dl !== null) w += ' Yellow: the daily loss limit stopped trading that day and no account was blown.';
    if (cap !== null) w += ' A blue dot: the day\u2019s profit reached the consistency cap of ' + money(cap) + ', so trading stopped for the day.';
    return w + ' A plain square had no closed trade.';
  }
  function drawCals() {
    var d = cur.rec.d, res = cur.res, by = {}, on = {};
    var R = cur.rules, cap = capOf(R), dlOn = R.dl !== null, stop = res.days.stop, blown = new Int32Array(res.code.length), s0;
    for (s0 = 0; s0 < res.code.length; s0++) if (res.code[s0] === 1) blown[s0 + res.len[s0] - 1]++;
    var capWords = cap === null ? '' : 'Consistency cap reached: trading stopped that day at ' + money(cap);
    d.days.forEach(function (e, i) { by[e[0]] = i; on[new Date(e[0] + 'T00:00:00Z').getUTCDay()] = 1; });
    var cols = [1, 2, 3, 4, 5];
    if (on[0]) cols.unshift(0);
    if (on[6]) cols.push(6);
    var start = cols[0], DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var first = d.days[0][0], last = d.days[d.days.length - 1][0], from = (d.test || {}).window_from, to = (d.test || {}).window_to;
    var y = Number(first.slice(0, 4)), mo = Number(first.slice(5, 7)) - 1, html = '';
    function cell(dt, m) {
      if (dt.getUTCMonth() !== m) return '<td class="is-pad"></td>';
      var k = dt.toISOString().slice(0, 10);
      if ((from && k < from) || (to && k > to)) return '<td class="is-out"><span class="bx-vh">' + esc(day(k)) + ': outside the test</span></td>';
      if (!(k in by)) return '<td><span class="bx-vh">' + esc(day(k)) + ': no trade closed</span></td>';
      var i = by[k], b = blown[i], dly = dlOn && stop[i] === 1, cm = cap !== null && stop[i] === 2;
      var c = b ? 'blown' : dly ? 'daily' : 'clear';
      var words = day(k) + ': ' + (b ? plural(b, 'account blown', 'accounts blown') + (dly ? '; the daily loss limit also stopped trading that day' : '') :
        dly ? 'the daily loss limit stopped trading that day; no account blown' : 'no account blown');
      if (cm) words += '. ' + capWords;
      return '<td class="is-' + c + (cm ? ' has-cm' : '') + '" title="' + esc(words) + '"' + (b ? ' data-blown="' + b + '"' : '') + '><i aria-hidden="true">' + dt.getUTCDate() + '</i>' +
        (b ? '<b class="cx-bn" aria-hidden="true">' + b + '</b>' : '') +   // row E790: the count, shown without hover
        (cm ? '<b class="cx-cm" aria-hidden="true"></b>' : '') + '<span class="bx-vh">' + esc(words) + '</span></td>';
    }
    while (y * 12 + mo <= Number(last.slice(0, 4)) * 12 + Number(last.slice(5, 7)) - 1) {
      var f = new Date(Date.UTC(y, mo, 1)), l = new Date(Date.UTC(y, mo + 1, 0));
      var wk = new Date(f.getTime() - ((f.getUTCDay() - start + 7) % 7) * DAY_MS), rows = '';
      while (wk <= l) {
        var cells = '', inM = false;
        cols.forEach(function (c) { var dt = new Date(wk.getTime() + ((c - start + 7) % 7) * DAY_MS); if (dt.getUTCMonth() === mo) inM = true; cells += cell(dt, mo); });
        if (inM) rows += '<tr>' + cells + '</tr>';
        wk = new Date(wk.getTime() + 7 * DAY_MS);
      }
      html += '<table class="cx-cal"><caption>' + MONTH[mo] + ' ' + y + '</caption><thead><tr>' +
        cols.map(function (c) { return '<th scope="col" abbr="' + DOWL[c] + '"><span aria-hidden="true">' + DOW[c] + '</span><span class="bx-vh">' + DOWL[c] + '</span></th>'; }).join('') +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
      mo++; if (mo > 11) { mo = 0; y++; }
    }
    $('#cals').innerHTML = html;
    $('#cal-sub').textContent = calWords(R, cap);
    $('#cal-legend').innerHTML = legendItem(COL.target, 'No account blown') + legendItem(COL.limit, 'Accounts blown that day') +
      (dlOn ? legendItem(COL.daily, 'Daily loss limit stopped trading that day') : '') + (cap === null ? '' : legendItem(COL.cons, esc(capWords), 'is-cm'));
  }

  function bar(v, max, c) {
    var w = max ? Math.max(v ? 2 : 0, 100 * v / max) : 0;
    return '<svg class="cx-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="100" height="10" rx="0" class="cx-bar-bg"/>' +
      '<rect x="0" y="0" width="' + w.toFixed(2) + '" height="10" fill="' + c + '"/></svg>';
  }
  // Row E745 ruling 6: the days a daily loss limit or a consistency rule stopped, shown only when one of them is on.
  function drawStops(tal, R) {
    var el = $('#stops'), pair = $('#pair');
    if (R.dl === null && R.cp === null) { el.hidden = true; el.innerHTML = ''; pair.classList.add('is-one'); return; }
    var lines = '';
    if (R.dl !== null) lines += '<li><span class="cx-bl">Daily loss limit</span>' + bar(tal.sd, tal.n, '#8ea0ff') + '<b data-n="sd">' + num(tal.sd) + '</b></li>';
    if (R.cp !== null) lines += '<li><span class="cx-bl">Consistency rule</span>' + bar(tal.sc, tal.n, '#8ea0ff') + '<b data-n="sc">' + num(tal.sc) + '</b></li>';
    var words = [];
    if (R.dl !== null) words.push('The daily loss limit stopped trading on ' + num(tal.sd) + ' of ' + plural(tal.n, 'tested day', 'tested days') + '.');
    if (R.cp !== null) words.push('The consistency rule stopped trading on ' + num(tal.sc) + ' of ' + plural(tal.n, 'tested day', 'tested days') + '.');
    words.push('A stopped day ends at that amount; the account trades again the next day.');
    el.innerHTML = '<h3 class="cx-h3">Days stopped early</h3>' + words.map(function (s) { return '<p class="cx-sub-l">' + esc(s) + '</p>'; }).join('') +
      '<ul class="cx-bars" aria-hidden="true">' + lines + '</ul>';
    el.hidden = false;
    pair.classList.remove('is-one');
  }
  function drawHist(tal) {
    var el = $('#hist');
    if (!tal.reach.length) {
      el.innerHTML = '<h3 class="cx-h3">How long to the target</h3><p class="cx-sub-l">No start passed under these rules.</p>';
      return;
    }
    var r = tal.reachC, mx = r[r.length - 1], bw = Math.max(1, Math.ceil(mx / 30)), nb = Math.ceil(mx / bw), cnt = [], i, top = 0;
    for (i = 0; i < nb; i++) cnt.push(0);
    r.forEach(function (v) { cnt[Math.min(nb - 1, Math.floor((v - 1) / bw))]++; });
    cnt.forEach(function (c) { if (c > top) top = c; });
    var W = 300, H = 100, gw = W / nb, svg = '';
    cnt.forEach(function (c, k) {
      var hh = top ? H * c / top : 0;
      svg += '<rect x="' + (k * gw + gw * 0.12).toFixed(2) + '" y="' + (H - hh).toFixed(2) + '" width="' + (gw * 0.76).toFixed(2) + '" height="' + hh.toFixed(2) + '" fill="' + COL.target + '" fill-opacity=".8"/>';
    });
    var mxX = (tal.medianC - 0.5) / (nb * bw) * W;
    svg += '<line x1="' + mxX.toFixed(2) + '" x2="' + mxX.toFixed(2) + '" y1="0" y2="' + H + '" class="cx-med" vector-effect="non-scaling-stroke"/>';
    var alt = 'Days to the target for the ' + plural(r.length, 'start', 'starts') + ' that passed: the fastest ' + daysWords(r[0]) + ', the median ' + daysWords(tal.medianC) +
      ', the average ' + daysWords(tal.avgC) + ', the slowest ' + daysWords(mx) + '. Each bar is ' + (bw === 1 ? 'one day' : bw + ' days') + '.';
    el.innerHTML = '<h3 class="cx-h3">How long to the target</h3><p class="cx-sub-l">Days from the start day to the target, both counted, for the ' + plural(r.length, 'start', 'starts') + ' that passed.</p>' +
      '<svg class="cx-hist" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(alt) + '">' + svg + '</svg>' +
      '<div class="cx-hax" aria-hidden="true"><span>1</span><span>' + (nb * bw) + ' days</span></div>' +
      '<dl class="cx-stats cx-st4"><div><dt>Fastest</dt><dd>' + daysWords(r[0]) + '</dd></div><div><dt>Median</dt><dd>' + daysWords(tal.medianC) + '</dd></div>' +
      '<div><dt>Average</dt><dd id="hist-avg">' + daysWords(tal.avgC) + '</dd></div><div><dt>Slowest</dt><dd>' + daysWords(mx) + '</dd></div></dl>';
  }
  function drawWL(rec, k) {
    var sc = scaled(rec, k), w = 0, l = 0, z = 0, bi = 0, wi = 0;
    sc.tot.forEach(function (v, i) { if (v > 0) w++; else if (v < 0) l++; else z++; if (v > sc.tot[bi]) bi = i; if (v < sc.tot[wi]) wi = i; });
    var n = sc.tot.length, alt = plural(w, 'winning day', 'winning days') + ' and ' + plural(l, 'losing day', 'losing days') + (z ? ' and ' + plural(z, 'day', 'days') + ' at $0' : '') + ' in the tested range.';
    $('#wl').innerHTML = '<h3 class="cx-h3">Winning and losing days</h3>' +
      '<p class="cx-sub-l">In the tested range' + (k > 1 ? ', every day multiplied by ' + k : ', as tested') + '.</p>' +
      '<svg class="cx-split" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label="' + esc(alt) + '">' +
      '<rect x="0" y="0" width="' + (100 * w / n).toFixed(3) + '" height="10" fill="' + COL.target + '"/>' +
      '<rect x="' + (100 * (w + z) / n).toFixed(3) + '" y="0" width="' + (100 * l / n).toFixed(3) + '" height="10" fill="' + COL.limit + '"/></svg>' +
      '<dl class="cx-stats cx-wl"><div><dt>Winning days</dt><dd class="bx-pos">' + w + '</dd></div><div><dt>Losing days</dt><dd class="bx-neg">' + l + '</dd></div>' +
      '<div><dt>Best day</dt><dd><span class="bx-pos">' + moneyFull(sc.tot[bi], true) + '</span><small>' + esc(day(rec.d.days[bi][0])) + '</small></dd></div>' +
      '<div><dt>Worst day</dt><dd><span class="' + (sc.tot[wi] < 0 ? 'bx-neg' : '') + '">' + moneyFull(sc.tot[wi], true) + '</span><small>' + esc(day(rec.d.days[wi][0])) + '</small></dd></div></dl>';
  }

  function capFor(d) {
    var t = d.test || {}, cap = [d.label && d.label.text ? d.label.text : 'Hypothetical backtest'];
    if (t.window_from && t.window_to) cap.push(day(t.window_from) + ' to ' + day(t.window_to));
    if (t.commission && t.slippage) cap.push('after commission and slippage'); else if (t.commission) cap.push('after commission');
    return cap.join(' · ');
  }

  /* ---------- row E768: the record as tested and at the chosen multiple ---------- */
  // Row E817: half() and retPct() are copied verbatim from bots.js (row E815), which this page does not load, so the return
  // on drawdown here is the same whole percentage the plan cards and the Strategy Library show ("5,319%"). Change both together.
  function half(n, d) { var k = Math.pow(10, d); return (Math.round((n + Number.EPSILON * Math.abs(n)) * k) / k).toFixed(d); }
  function retPct(net, cap) {
    if (typeof net !== 'number' || typeof cap !== 'number' || !(cap > 0)) return null;
    var v = net / cap * 100, r = Number(half(Math.abs(v), 0));
    return { v: v, t: (v < 0 && r > 0 ? '-' : '') + r.toLocaleString('en-US') + '%' };
  }
  function recFig(rec) {   // the record's own figures in whole cents; return on drawdown as the site's whole percentage
    var f = (rec.d && rec.d.figures) || {}, r = retPct(f.net_profit_usd, f.max_drawdown_usd);
    function c(v) { return typeof v === 'number' && isFinite(v) ? cents(v) : null; }
    return { net: c(f.net_profit_usd), dd: c(f.max_drawdown_usd), mon: c(f.monthly_profit_usd), rod: r ? r.t : null };
  }
  function times(c, k) { return c === null ? null : c * k; }
  function amt(c, signed) { return c === null ? DASH : moneyFull(c, signed); }
  function tone(c) { return c === null || c === 0 ? '' : (c > 0 ? 'bx-pos' : 'bx-neg'); }
  function atWords(k) { return 'At ' + k + '\u00d7'; }
  // Row E781 (after E776): the closed picker shows the strategy's name only (and its Coming soon mark) as the select's own
  // text; the open list keeps name, return on drawdown and max drawdown (optText). E776 laid a label over the select and hid the select's
  // text with -webkit-text-fill-color, which draws two offset copies wherever that is not honoured (forced colours, some
  // engines). Row E791 (review E789 C1): E781 lengthened every option when the list opened and shortened the chosen one on
  // change or blur; a list closed without a choice (Escape, a tap on the chosen option, a tap outside) fired neither, so the
  // closed box kept the long text, cut. Now the chosen option's own text is always the name, open or closed, and every other
  // option keeps name, return on drawdown and max drawdown; nothing depends on knowing when the list opens or closes. The chosen
  // strategy's figures are in the record panel under the picker.
  function pickName(rec) { return rec.s.name + (rec.s.coming_soon === true ? ' (Coming soon)' : ''); }
  function selTexts(sel) {
    var o = sel.options;
    for (var i = 0; i < o.length; i++) {
      var r = recs[o[i].value];
      if (!r) continue;
      var t = i !== sel.selectedIndex ? optText(r) : pickName(r);
      if (o[i].text !== t) o[i].text = t;
    }
  }
  function pickTexts() { selTexts(F.pick); }
  function optText(rec) {
    var g = recFig(rec), s = rec.s;
    return s.name + (s.coming_soon === true ? ' (Coming soon)' : '') + (g.rod ? ' \u00b7 Return on drawdown ' + g.rod : '') + (g.dd !== null ? ' \u00b7 Max drawdown ' + moneyFull(g.dd) : '');
  }
  // Row E776 (review E774 C1): the two amounts only. The record's max drawdown is not measured the way the replay applies
  // the chosen kind of loss limit, so no verdict is drawn from it; the replay, which applies the kind, says how many accounts were blown.
  function limitLine(g, k) {
    var x = times(g.dd, k), lim = readMoney(F.limit.value);
    if (x === null) return '';
    return 'Largest drawdown in the test at ' + k + '\u00d7: ' + moneyFull(x) + '; your loss limit: ' + (lim.err ? DASH : money(lim.c)) +
      '. The replay shows how many accounts were blown.';
  }
  function drawMx(rec, k) {
    var g = recFig(rec), ll = limitLine(g, k);
    var rows = [
      ['Total profit', 'net', amt(g.net, true), amt(times(g.net, k), true), tone(g.net)],
      ['Max drawdown', 'dd', amt(g.dd), amt(times(g.dd, k)), ''],
      ['Avg per month', 'mon', amt(g.mon, true), amt(times(g.mon, k), true), tone(g.mon)],
      ['Return on drawdown', 'rod', g.rod || DASH, g.rod || DASH, '']
    ];
    $('#mx').innerHTML = '<h3 class="cx-mx-h" id="mx-h">Its tested record</h3>' +
      '<table class="cx-mxt"><thead><tr><td></td><th scope="col">As tested</th><th scope="col">' + atWords(k) + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-row="' + r[1] + '"><th scope="row">' + r[0] + '</th><td class="' + r[4] + '">' + r[2] + '</td><td class="' + r[4] + '">' + r[3] + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="cx-mxn" id="mx-n">Hypothetical backtest results. ' + atWords(k) + ': every day times ' + k +
        '. Return on drawdown is the total profit as a percentage of the max drawdown, and it is the same at any multiplier.</p>' +
      (ll ? '<p class="cx-mxl" id="mx-l">' + esc(ll) + '</p>' : '');
  }
  function mxShort(rec, k) {   // the same in one line, repeated by the result line on a phone; HTML, each figure kept whole
    var g = recFig(rec);   // row E817: each label stays with its figure (cx-nw), so a narrow line breaks only at a dot
    function nw(t) { return '<span class="cx-nw">' + esc(t) + '</span>'; }
    return nw((k === 1 ? 'As tested' : atWords(k)) + ': total profit ' + amt(times(g.net, k), true)) + ' \u00b7 ' + nw('max drawdown ' + amt(times(g.dd, k))) +
      ' \u00b7 ' + nw('return on drawdown ' + (g.rod || DASH));
  }

  /* ---------- the compare view ---------- */
  // Row E745 ruling 7: the percentage passed (of finished starts; row E828 heads it Passed), accounts blown (row E778's words), did not finish, average days.
  var sortBy = { key: 'rate', dir: -1 };
  var COLS = [
    { key: 'rate', label: 'Passed' },
    { key: 'limit', label: 'Blown' },
    { key: 'open', label: 'In progress' },
    { key: 'avg', label: 'Average days' },
    { key: 'dd', label: 'Max drawdown' }   // row E768: at the chosen multiple
  ];
  function nullLast(x, y, dir) { return x === null && y === null ? 0 : x === null ? 1 : y === null ? -1 : dir * (x - y); }
  function drawCompare(R, k) {
    var rows = order.map(function (slug) {
      var rec = recs[slug], t = tally(run(rec, k, R, false), rec.dates), h = runHarsh(rec, k, R);
      return { slug: slug, rec: rec, t: t, h: h, rate: t.rate, limit: t.fin ? t.limit / t.fin : null, open: t.open, avg: t.avgC, dd: times(recFig(rec).dd, k) };
    });
    rows.sort(function (a, b) {
      if (sortBy.key === 'name') return sortBy.dir * a.rec.s.name.localeCompare(b.rec.s.name);
      return nullLast(a[sortBy.key], b[sortBy.key], sortBy.dir) ||
        (sortBy.key === 'rate' ? nullLast(a.avg, b.avg, 1) : 0) || a.rec.s.name.localeCompare(b.rec.s.name);
    });
    $('#cmp-head').innerHTML = COLS.map(function (c) {
      var on = sortBy.key === c.key;
      return '<th scope="col"' + (on ? ' aria-sort="' + (sortBy.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button" data-sort="' + c.key + '">' + c.label +
        '<span class="cx-arr" aria-hidden="true">' + (on ? (sortBy.dir > 0 ? '▲' : '▼') : '') + '</span></button></th>';
    }).join('');
    $('#cmp-sort').innerHTML = '<button type="button" class="cx-sortname" data-sort="name" aria-pressed="' + (sortBy.key === 'name') + '">Sort by name' +
      (sortBy.key === 'name' ? (sortBy.dir > 0 ? ', A to Z' : ', Z to A') : '') + '</button>';
    var tb = document.querySelectorAll('#cmp tbody');
    Array.prototype.forEach.call(tb, function (x) { x.parentNode.removeChild(x); });
    var html = rows.map(function (r) {
      var t = r.t, hs = harshShows(t, r.h, R.kind);
      return '<tbody data-slug="' + esc(r.slug) + '"><tr class="cx-cn"><th scope="rowgroup" colspan="5"><button type="button" class="cx-open" data-open="' + esc(r.slug) + '">' + nameSpan(r.rec.s) +
        '<span class="cx-cn-m">' + esc(r.rec.s.market_line || '') + ' · ' + plural(t.n, 'start day', 'start days') + '</span><span class="bx-vh">, open it in the one-strategy view</span></button></th></tr>' +
        '<tr class="cx-cv">' +
        '<td class="is-t"><b>' + rateText(t) + '</b><small>' + (t.fin ? num(t.target) + ' passed of ' + num(t.fin) + ' finished' : 'none finished') + '</small>' + bar(t.target, t.fin, COL.target) +
          (hs ? '<small class="cx-harsh-s">' + esc(harshShort(r.h)) + '</small>' : '') + '</td>' +
        '<td class="is-l"><b>' + num(t.limit) + '</b><small>' + (t.fin ? pct(t.limit, t.fin) + '% of finished' : 'none finished') + '</small>' + bar(t.limit, t.fin, COL.limit) + '</td>' +
        '<td class="is-o"><b>' + num(t.open) + '</b><small>not counted</small></td>' +
        '<td class="is-m"><b>' + (t.avgC === null ? DASH : num(t.avgC)) + '</b><small>' + (t.avgC === null ? 'none passed' : (t.avgC === 1 ? 'day' : 'days')) + '</small></td>' +
        '<td class="is-d"><b>' + amt(r.dd) + '</b><small>' + (k === 1 ? 'as tested' : 'at ' + k + '\u00d7') + '</small></td></tr></tbody>';
    }).join('');
    $('#cmp').insertAdjacentHTML('beforeend', html);
  }

  /* ---------- row E780: the Live account mode ---------- */
  // One account holds one to three strategies, at most one per market, each at its tested size times the page's multiple
  // (st.x, the Multiplier). Every amount is in whole cents.
  function mktOf(rec) { var m = /([A-Z]{2,4})1!$/.exec(String((rec.d.test || {}).symbol || '')); return m && MKTS.indexOf(m[1]) >= 0 ? m[1] : ''; }
  function capC(rec) { var v = (rec.d.test || {}).start_capital_usd; return typeof v === 'number' && isFinite(v) && v > 0 ? cents(v) : null; }
  function liveSlugs() { return MKTS.map(function (m) { return lv.s[m]; }).filter(function (s) { return s && recs[s]; }); }
  // The range every picked record covers: from the latest test start to the earliest test end. The start dates are the
  // days any picked record traded in that range; a record that did not trade on a day adds $0 to it.
  function liveSpan(slugs) {
    var lo = '', hi = '', set = {};
    slugs.forEach(function (s) {
      var r = recs[s], t = r.d.test || {}, a = /^\d{4}-\d\d-\d\d$/.test(t.window_from) ? t.window_from : r.dates[0],
        b = /^\d{4}-\d\d-\d\d$/.test(t.window_to) ? t.window_to : r.dates[r.dates.length - 1];
      if (a > lo) lo = a;
      if (!hi || b < hi) hi = b;
    });
    slugs.forEach(function (s) { recs[s].dates.forEach(function (x) { if (x >= lo && x <= hi) set[x] = 1; }); });
    return { lo: lo, hi: hi, days: Object.keys(set).sort() };
  }
  function liveDefB(slugs) {   // the picked records' tested start capital, the largest if they differ
    var b = null;
    slugs.forEach(function (s) { var c = capC(recs[s]); if (c !== null && (b === null || c > b)) b = c; });
    return b === null ? 2500000 : b;
  }
  // The combined account from a start date: each day's result is the sum of the picked records' results that day.
  // low is the worst case within the day: the balance before the day plus each record's own lowest point that day (never
  // above $0), as if they all came at the same moment; the records carry no trade times.
  // Row E797: ks is one multiplier for every record, or one per record in the order of slugs. Each record's own figures
  // from the start date are kept too: its net result, and its largest drop from a high on day closes (dd) and within the
  // day (ddL, its own lowest point that day), each at its own multiplier.
  function liveRun(slugs, ks, from) {
    var sp = liveSpan(slugs), days = sp.days.filter(function (x) { return x >= from; });
    var per = slugs.map(function (s, j) {
      var r = recs[s], at = {};
      r.dates.forEach(function (x, i) { at[x] = i; });
      return { r: r, at: at, k: Array.isArray(ks) ? ks[j] : ks, o: 0, own: [], pk: 0, dd: 0, ddL: 0 };
    });
    var day = [], cum = [], low = [], c = 0;
    days.forEach(function (x) {
      var tot = 0, dip = 0;
      per.forEach(function (p) {
        var i = p.at[x], k = p.k;
        if (i !== undefined) {
          var path = p.r.dp[i], m = 0;
          for (var z = 0; z < path.length; z++) if (path[z] < m) m = path[z];
          if (p.pk - (p.o + m * k) > p.ddL) p.ddL = p.pk - (p.o + m * k);
          tot += p.r.tot[i] * k; dip += m * k; p.o += p.r.tot[i] * k;
          if (p.o > p.pk) p.pk = p.o;
          if (p.pk - p.o > p.dd) p.dd = p.pk - p.o;
        }
        p.own.push(p.o);
      });
      low.push(c + dip); c += tot; day.push(tot); cum.push(c);
    });
    return { slugs: slugs, ks: per.map(function (p) { return p.k; }), span: sp, days: days, day: day, cum: cum, low: low,
      own: per.map(function (p) { return p.own; }),
      per: per.map(function (p) { return { net: p.o, dd: p.dd, ddL: Math.max(p.dd, p.ddL), k: p.k }; }) };
  }
  // Row E797: the margin the account needs: each record's most contracts open at once in its test (figures.max_contracts)
  // times its multiplier, added up as if every record held its most at the same moment, times the margin per micro.
  function mcOf(rec) { var v = ((rec.d || {}).figures || {}).max_contracts; return typeof v === 'number' && isFinite(v) && v >= 0 ? v : null; }
  function liveMargin(slugs, ks, per) {
    var parts = slugs.map(function (s, j) {
      var c = mcOf(recs[s]), k = Array.isArray(ks) ? ks[j] : ks;
      return { mc: c, k: k, micros: c === null ? null : c * k };
    });
    var micros = 0, missing = 0;
    parts.forEach(function (p) { if (p.micros === null) missing++; else micros += p.micros; });
    return { parts: parts, micros: micros, c: micros * per, per: per, missing: missing };
  }
  // The starting balance needed not to reach $0: from the start date, the lowest the balance went below the starting
  // balance; from the worst moment, the largest drop from a high (the start counts as a high). Each on day closes and
  // within the day, worst case.
  function liveNeeds(res) {
    var minC = 0, minL = 0, peak = 0, dd = 0, ddL = 0;
    for (var i = 0; i < res.cum.length; i++) {
      var l = Math.min(res.low[i], res.cum[i]);
      if (l < minL) minL = l;
      if (peak - l > ddL) ddL = peak - l;
      if (res.cum[i] < minC) minC = res.cum[i];
      if (res.cum[i] > peak) peak = res.cum[i];
      if (peak - res.cum[i] > dd) dd = peak - res.cum[i];
    }
    return { start: -minC, startL: -minL, dd: dd, ddL: Math.max(dd, ddL) };
  }
  // The first day the balance reached the floor M (row E797: the margin needed; $0 when none is given): on a day close,
  // and within the day in the worst case.
  function liveZero(res, B, M) {
    var z = { close: null, low: null }, f = M || 0;
    for (var i = 0; i < res.cum.length; i++) {
      if (z.low === null && B + Math.min(res.low[i], res.cum[i]) <= f) z.low = res.days[i];
      if (z.close === null && B + res.cum[i] <= f) z.close = res.days[i];
    }
    return z;
  }
  function liveMonths(res) {
    var m = {}, keys = [];
    res.days.forEach(function (x, i) { var k = x.slice(0, 7); if (!(k in m)) { m[k] = 0; keys.push(k); } m[k] += res.day[i]; });
    return keys.map(function (k) { return { k: k, v: m[k] }; });
  }
  function monthWords(k) { return MONTH[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4); }
  // Row E793 (E792 R3): a month is a part month when the period leaves out some of its weekdays: the first month when the
  // start date leaves out an earlier tested day of that month or the test window starts after its first weekday; the last
  // month when the test window ends before its last weekday. The figures are unchanged; only the words mark it.
  function wkEdge(k, last) {
    var y = Number(k.slice(0, 4)), m = Number(k.slice(5, 7)) - 1, d = last ? new Date(Date.UTC(y, m + 1, 0)) : new Date(Date.UTC(y, m, 1));
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + (last ? -DAY_MS : DAY_MS));
    return d.toISOString().slice(0, 10);
  }
  function liveParts(mo, res) {
    if (!mo.length) return mo;
    var sp = res.span, f = mo[0], l = mo[mo.length - 1], from = res.days[0];
    f.p = sp.lo > wkEdge(f.k, false) || sp.days.some(function (x) { return x.slice(0, 7) === f.k && x < from; });
    if (sp.hi < wkEdge(l.k, true)) l.p = true;
    return mo;
  }
  function partWords(mo) {
    var f = mo.length && mo[0].p, l = mo.length > 1 && mo[mo.length - 1].p;
    if (mo.length === 1) return f ? ', a part month' : '';
    return f && l ? ', the first and last part months' : f ? ', the first a part month' : l ? ', the last a part month' : '';
  }
  function monthPart(x) { return monthWords(x.k) + (x.p ? ' (part month)' : ''); }
  function sizeWords(k) { return k === 1 ? 'as tested' : k + '\u00d7 tested'; }
  function sizesWords(ks) {   // row E797: one size for all, or each its own
    return ks.every(function (k) { return k === ks[0]; }) ? sizeWords(ks[0]) : 'at its own multiplier';
  }
  var WDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function wday(iso) { return WDAY[new Date(iso + 'T00:00:00Z').getUTCDay()] + ', ' + day(iso); }
  function isDate(t) {
    if (!/^\d{4}-\d\d-\d\d$/.test(t)) return false;
    var d = new Date(t + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
  }
  function liveKs(slugs) { return slugs.map(function (s) { return lv.x[mktOf(recs[s])] || 1; }); }
  window.AFT_CALC_LIVE = { run: function (slugs, ks, from) { return liveRun(slugs, ks, from); }, needs: liveNeeds, zero: liveZero, span: liveSpan,
    margin: liveMargin };

  var liveCur = null, TEXTP = null, ldOut = '';
  var LCOL = ['#8ea0ff', '#f5c542', '#c58cff'];
  var LEAD_LIVE = 'Choose up to three strategies, one per market, and see how one account holding them all would have gone from a start date.';
  // Row E797: the start date is the browser's calendar, limited to the first and last tested days every chosen record
  // covers (row E793's range). lv.d keeps the date as chosen (the address carries it); a date on which no chosen strategy
  // traded starts on the next tested day, and the note under the box says so.
  function fillLiveDates(slugs) {
    var sp = slugs.length ? liveSpan(slugs) : { lo: '', hi: '', days: [] }, n = sp.days.length;
    var a = n ? sp.days[0] : '', z = n ? sp.days[n - 1] : '';
    if (lv.d && (!n || lv.d < a || lv.d > z)) lv.d = '';
    F.ld.min = a; F.ld.max = z;
    F.ld.value = lv.d || a;
    F.ld.disabled = !n;
    $('#ld-cap').textContent = n ? 'Any date from ' + day(a) + ' to ' + day(z) + ', the range every chosen record covers. A date with no trading starts on the next tested day.' : '';
    var from = '', note = '';
    if (n) {
      from = a;
      for (var i = 0; i < n; i++) if (sp.days[i] >= (lv.d || a)) { from = sp.days[i]; break; }
      if (ldOut) note = day(ldOut) + ' is outside that range, so the start date is set to ' + wday(lv.d || a) + '.';
      else if (lv.d && from !== lv.d) note = 'No chosen strategy traded on ' + wday(lv.d) + ', so the replay starts on the next tested day, ' + wday(from) + '.';
    }
    ldOut = '';
    var el = $('#ld-note');
    el.hidden = !note; el.textContent = note;
    sp.from = from;
    return sp;
  }
  // As the prop picker (row E791): the chosen strategy's own text is its name; the others show name, return on drawdown and max drawdown.
  function lpTexts(sel) { selTexts(sel); }
  function fillLive() {
    var grid = $('.cx-grid'), lead = $('.cx-head .bx-s-lead');
    if (TEXTP === null) TEXTP = { h2: $('#rules-h').textContent, lead: lead.textContent };
    F.acct.value = lv.on ? 'live' : 'prop';
    grid.classList.toggle('is-live', lv.on);
    $('#rules-h').textContent = lv.on ? 'Your live account' : TEXTP.h2;
    lead.textContent = lv.on ? LEAD_LIVE : TEXTP.lead;
    MKTS.forEach(function (m) { F['lp' + m].value = lv.s[m]; lpTexts(F['lp' + m]); F['lx' + m].value = String(lv.x[m]); });
    var slugs = liveSlugs();
    fillLiveDates(slugs);
    F.lb.value = plain(lv.bSet && lv.b ? lv.b : liveDefB(slugs));
    F.lm.value = plain(lv.mSet && lv.m ? lv.m : MPM);   // row E797
    errShow('lb', '');
    errShow('lm', '');
  }
  function liveHash() {
    var p = ['a=live', 'ls=' + liveSlugs().map(encodeURIComponent).join(',')];
    if (lv.d && liveCur && liveCur.res.span.days[0] !== lv.d) p.push('ld=' + lv.d);
    if (lv.bSet && lv.b) p.push('lb=' + plain(lv.b));
    MKTS.forEach(function (m) { if (lv.x[m] !== 1) p.push('x' + m + '=' + lv.x[m]); });   // row E797: a multiplier per market
    if (lv.mSet && lv.m && lv.m !== MPM) p.push('mm=' + plain(lv.m));
    var h = '#' + p.join('&');
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* the view still works */ } }
  }
  // The address in the Live account mode: a=live, ls (the strategies), ld (the start date), lb (the starting balance),
  // xMNQ, xMES and xMGC (row E797: each market's multiplier; an older link's one x applies to every market) and mm (the
  // margin per micro contract). Without a=live the page is the Prop firm account mode, exactly as before.
  function readLive() {
    var raw = location.hash.replace(/^#/, ''), q = {}, reset = [];
    lv.on = false; lv.s = { MNQ: '', MES: '', MGC: '' }; lv.d = ''; lv.b = null; lv.bSet = false;
    lv.x = { MNQ: 1, MES: 1, MGC: 1 }; lv.m = MPM; lv.mSet = false;
    raw.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) { try { q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { q[kv.slice(0, i)] = '\u0000'; } }
    });
    if (!('a' in q)) return reset;
    if (q.a !== 'live') { if (q.a !== 'prop') reset.push('account type'); return reset; }
    lv.on = true;
    if ('ls' in q) {
      var bad = false;
      q.ls.split(',').forEach(function (s) {
        var m = recs[s] ? mktOf(recs[s]) : '';
        if (m && !lv.s[m]) lv.s[m] = s; else if (s) bad = true;
      });
      if (bad) reset.push('live account strategies');
    }
    if ('ld' in q) {   // row E797: any date in the range every chosen record covers
      var sl = liveSlugs(), sd = sl.length ? liveSpan(sl).days : [];
      if (sd.length && isDate(q.ld) && q.ld >= sd[0] && q.ld <= sd[sd.length - 1]) lv.d = q.ld; else reset.push('start date');
    }
    if ('lb' in q) { var b = readMoney(q.lb); if (b.err) reset.push('starting balance'); else { lv.b = b.c; lv.bSet = true; } }
    // row E797: an older link's one multiplier applies to every market (one that is not usable is reset by readHash)
    if ('x' in q && /^\d$/.test(q.x) && SCALES.indexOf(Number(q.x)) >= 0) MKTS.forEach(function (m) { lv.x[m] = Number(q.x); });
    MKTS.forEach(function (m) {
      if (!(('x' + m) in q)) return;
      var v = q['x' + m];
      if (/^\d$/.test(v) && SCALES.indexOf(Number(v)) >= 0) lv.x[m] = Number(v); else reset.push(m + ' multiplier');
    });
    if ('mm' in q) { var mm = readMoney(q.mm); if (mm.err) reset.push('margin per micro contract'); else { lv.m = mm.c; lv.mSet = true; } }
    return reset;
  }
  function setAcct(on) {
    lv.on = on;
    if (on && !liveSlugs().length && recs[st.s] && mktOf(recs[st.s])) lv.s[mktOf(recs[st.s])] = st.s;
    fillLive();
    if (on) render(true); else setView(st.v, false);
  }
  function stat(label, c, small, signed) {
    return '<div><dt>' + label + '</dt><dd class="' + (signed ? tone(c) : '') + '">' + moneyFull(c, signed) + (small ? '<small>' + esc(small) + '</small>' : '') + '</dd></div>';
  }
  function renderLive() {
    var out = $('#out'), msg = $('#live-msg'), slugs = liveSlugs(), ks = liveKs(slugs);
    $('#label').textContent = 'Hypothetical backtest';
    var sp0 = fillLiveDates(slugs);
    out.classList.remove('is-stale');
    function done() { drawn++; out.setAttribute('data-drawn', String(drawn)); }
    if (!slugs.length) {
      liveCur = null;
      msg.hidden = false; msg.textContent = 'Choose at least one strategy above.';
      $('#live-res').hidden = true;
      liveHash(); done();
      return;
    }
    var b = readMoney(F.lb.value), mm = readMoney(F.lm.value), wait = [];
    errShow('lb', b.err);
    errShow('lm', mm.err);   // row E797
    if (b.err) wait.push('Starting balance');
    if (mm.err) wait.push('Margin per micro contract');
    if (wait.length) {
      out.classList.add('is-stale');
      msg.hidden = false; msg.textContent = 'The results wait for: ' + wait.join(', ') + '. Fix the box' + (wait.length > 1 ? 'es' : '') + ' above to see them again.';
      return;
    }
    if (lv.bSet) lv.b = b.c;
    if (lv.mSet) lv.m = mm.c;
    msg.hidden = true; msg.textContent = '';
    $('#live-res').hidden = false;
    var res = liveRun(slugs, ks, sp0.from), B = b.c, n = res.days.length, mg = liveMargin(slugs, ks, mm.c);
    var net = n ? res.cum[n - 1] : 0, nd = liveNeeds(res), z = liveZero(res, B, mg.c), mo = liveParts(liveMonths(res), res);
    liveCur = { res: res, B: B, mg: mg };
    var best = null, worst = null;
    mo.forEach(function (x) { if (best === null || x.v > best.v) best = x; if (worst === null || x.v < worst.v) worst = x; });
    var avg = mo.length ? (net < 0 ? -1 : 1) * halfUp(Math.abs(net), mo.length) : 0;
    $('#live-sum').innerHTML = '<h3 class="cx-h3">The account</h3>' +
      '<p class="cx-sub-l">Hypothetical backtest, ' + (n ? day(res.days[0]) + ' to ' + day(res.days[n - 1]) + ', ' + plural(n, 'trading day', 'trading days') : 'no trading days') +
      ', from a starting balance of ' + money(B) + '; each strategy ' + sizesWords(ks) + '.</p>' +
      '<dl class="cx-stats cx-st6">' + stat('Ending balance', B + net, '', false) + stat('Net profit', net, '', true) +
      stat('Max drawdown', nd.dd, 'from a high, on day closes', false) +
      stat('Average month', avg, 'over ' + plural(mo.length, 'month', 'months') + partWords(mo), true) +
      (best ? stat('Best month', best.v, monthPart(best), true) + stat('Worst month', worst.v, monthPart(worst), true) : '') + '</dl>';
    function cell(c, strong) { return '<td>' + (strong ? '<b>' + moneyFull(c) + '</b>' : moneyFull(c)) + '</td>'; }
    // Row E797: the most the account fell, shown large; it follows every multiplier.
    $('#live-dd').innerHTML = '<h3 class="cx-h3">How much the account could have lost</h3>' +
      '<p class="cx-sub-l">The most the account fell from a high in this test, at the multipliers chosen.</p>' +
      '<dl class="cx-stats cx-ddc">' + stat('On day closes', nd.dd, '', false) + stat('Within the day, worst case', nd.ddL, '', false) + '</dl>';
    // Row E797: the balance needed is the margin plus the most the account fell (within the day, worst case); the $0 line
    // is now the margin needed.
    var mWords = mg.parts.map(function (p) { return p.micros === null ? DASH : num(p.micros); }).join(' + ') +
      (mg.parts.length > 1 ? ' = ' + plural(mg.micros, 'micro', 'micros') : (mg.micros === 1 ? ' micro' : ' micros')) + ', times ' + money(mg.per) + ' a micro';
    var zw = 'With a starting balance of ' + money(B) + ': ' +
      (z.close ? 'on day closes the balance would have fallen to the margin needed (' + moneyFull(mg.c) + ') on ' + day(z.close)
        : 'on day closes the balance would have stayed above the margin needed (' + moneyFull(mg.c) + ')') + '; ' +
      (z.low ? (z.close ? 'within the day, in the worst case, on ' + day(z.low) + '.' : 'within the day, in the worst case, it would have fallen to it on ' + day(z.low) + '.')
        : 'within the day, in the worst case, it would have too.') +
      (z.close || z.low ? ' The figures after that day assume the account kept trading, which it could not have.' : '');
    $('#live-need').innerHTML = '<h3 class="cx-h3">Starting balance needed</h3>' +
      '<p class="cx-sub-l">For the balance never to fall to the margin the open contracts need, a starting balance has to be more than the margin plus the most the account fell.</p>' +
      '<table class="cx-need"><thead><tr><td></td><th scope="col">From this start date</th><th scope="col">From the worst moment in the period</th></tr></thead><tbody>' +
      '<tr><th scope="row">The most it fell<small>within the day, worst case: from the start date, the lowest the balance went below the starting balance; from the worst moment, the largest drop from a high</small></th>' + cell(nd.startL) + cell(nd.ddL) + '</tr>' +
      '<tr><th scope="row">Margin<small>' + esc(mWords) + '</small></th>' + cell(mg.c) + cell(mg.c) + '</tr>' +
      '<tr class="cx-need-sum"><th scope="row">Starting balance needed</th>' + cell(nd.startL + mg.c, true) + cell(nd.ddL + mg.c, true) + '</tr></tbody></table>' +
      '<p class="cx-hint">The margin assumes every strategy holds its most micros at the same moment. The records carry no trade times. So the worst case adds up each strategy\u2019s own lowest point within that day, as if they all came at the same moment.</p>' +
      (mg.missing ? '<p class="cx-hint">A record without its most contracts open at once adds no margin.</p>' : '') +
      '<p class="cx-zero ' + (z.close || z.low ? 'bx-neg' : '') + '">' + esc(zw) + '</p>';
    // Row E797: each strategy's own figures from the start date, at its own multiplier, in the stats style of the account.
    $('#live-picks').innerHTML = '<h3 class="cx-h3">The strategies in the account</h3>' +
      '<p class="cx-sub-l">Each strategy on its own from the start date, at its own multiplier.</p><ul class="cx-lpl">' + slugs.map(function (s, i) {
      var r = recs[s], g = res.per[i], q = mg.parts[i], k = g.k;
      var mic = q.micros === null ? DASH : num(q.micros), micS = q.micros === null ? 'not in the record' : (k === 1 ? 'as in its test' : num(q.mc) + ' in its test \u00d7 ' + k);
      return '<li><i style="background:' + LCOL[i] + '" aria-hidden="true"></i><div class="cx-lpb">' + nameSpan(r.s) + '<small>' + esc(mktOf(r)) + ' \u00b7 ' + esc(sizeWords(k)) + '</small>' +
        '<dl class="cx-stats cx-st4">' + stat('Net profit', g.net, '', true) +
        stat('Max drawdown', g.ddL, 'within the day; ' + moneyFull(g.dd) + ' on day closes', false) +
        '<div><dt>Most micros open at once</dt><dd>' + mic + '<small>' + esc(micS) + '</small></dd></div>' +
        '<div><dt>Margin for those</dt><dd>' + (q.micros === null ? DASH : moneyFull(q.micros * mg.per)) + '<small>' + (q.micros === null ? '' : esc(mic + ' \u00d7 ' + money(mg.per))) + '</small></dd></div></dl>' +
        '<small>' + esc(capFor(r.d)) + '</small></div></li>';
    }).join('') + '</ul>';
    drawLiveChart();
    liveHash(); done();
  }
  function drawLiveChart() {
    if (!liveCur) return;
    var box = $('#live-lines'), cv = $('#live-c'), r = liveCur.res, B = liveCur.B, n = r.days.length, W = box.clientWidth;
    var names = r.slugs.map(function (s) { return recs[s].s.name; });
    $('#live-legend').innerHTML = legendItem('#ffffff', 'The account', 'is-mid') + names.map(function (nm, i) { return legendItem(LCOL[i], esc(nm) + ' on its own'); }).join('') +
      legendItem('rgba(216,219,230,0.6)', 'Starting balance');
    $('#live-chart-sub').textContent = 'The balance after each trading day. The faint lines are each strategy on its own from the same starting balance.';
    if (!W || !n) return;
    var H = W < 560 ? 250 : 320, dpr = window.devicePixelRatio || 1, i, j;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var lo = B, hi = B;
    function seen(v) { if (v < lo) lo = v; if (v > hi) hi = v; }
    for (i = 0; i < n; i++) { seen(B + r.cum[i]); for (j = 0; j < r.own.length; j++) seen(B + r.own[j][i]); }
    var span = hi - lo || 1; lo -= span * 0.06; hi += span * 0.06; span = hi - lo;
    var padL = 76, padR = 10, padT = 12, padB = 24, w = W - padL - padR, h = H - padT - padB;
    function X(d) { return padL + w * d / n; }
    function Y(v) { return padT + h * (1 - (v - lo) / span); }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px "IBM Plex Sans", Arial, sans-serif';
    ctx.lineWidth = 1;
    var said = [];
    function hline(v, colr, dash, label) {
      if (v < lo || v > hi) return;
      var y = Math.round(Y(v)) + 0.5;
      ctx.setLineDash(dash); ctx.strokeStyle = colr; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke(); ctx.setLineDash([]);
      if (said.some(function (q) { return Math.abs(q - y) < 13; })) return;
      said.push(y);
      ctx.fillStyle = colr; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(label, padL - 6, y);
    }
    hline(B, 'rgba(216,219,230,0.6)', [5, 4], money(B));
    hline(0, COL.limit, [5, 4], '$0');
    hline(hi - span * 0.06, '#9a9fb3', [1, 5], money(Math.round((hi - span * 0.06) / 100) * 100));   // whole dollars
    hline(lo + span * 0.06, '#9a9fb3', [1, 5], money(Math.round((lo + span * 0.06) / 100) * 100));
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#9a9fb3';
    ctx.textAlign = 'left'; ctx.fillText(day(r.days[0]), padL, H - 6);
    ctx.textAlign = 'right'; ctx.fillText(day(r.days[n - 1]), padL + w, H - 6);
    function line(vals, colr, width, alpha) {
      ctx.globalAlpha = alpha; ctx.strokeStyle = colr; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(X(0), Y(B));
      for (var d = 0; d < n; d++) ctx.lineTo(X(d + 1), Y(B + vals[d]));
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (r.own.length > 1) r.own.forEach(function (o, q) { line(o, LCOL[q], 1.3, 0.5); });
    else line(r.own[0], LCOL[0], 1.3, 0.5);
    ctx.shadowColor = 'rgba(255,255,255,0.55)'; ctx.shadowBlur = 8;
    line(r.cum, '#ffffff', 2.5, 1);
    ctx.shadowBlur = 0;
    var mn = r.cum.reduce(function (a, v) { return Math.min(a, v); }, 0);
    cv.setAttribute('aria-label', 'The account\u2019s balance from ' + day(r.days[0]) + ' to ' + day(r.days[n - 1]) + ': it starts at ' + money(B) +
      ', ends at ' + moneyFull(B + r.cum[n - 1]) + ', and its lowest day close is ' + moneyFull(B + mn) + '.');
  }

  // Row E791 (review E789 R1; the owner for E779: "take away that whole daily loss limit thing"): the method note names the
  // daily loss limit only while one is set, and the consistency rule only while it is on; with both on it reads as before.
  function howRules(R) {
    var w = 'The loss limit is Static, a Trailing drawdown or an End-of-day drawdown, as chosen above.';
    if (R.dl !== null && R.cp !== null) return w + ' A daily loss limit stops that day at the limit, and a consistency rule stops a day at its share of the target; the account trades again the next day.';
    if (R.dl !== null) return w + ' A daily loss limit stops that day at the limit; the account trades again the next day.';
    if (R.cp !== null) return w + ' A consistency rule stops a day at its share of the target; the account trades again the next day.';
    return w;
  }

  /* ---------- drawing everything ---------- */
  var drawn = 0;
  function render(animate) {
    if (lv.on) { renderLive(); return; }   // row E780
    var t0 = (window.performance && performance.now) ? performance.now() : 0;
    var bad = readAll();
    var out = $('#out');
    moreCount();
    if (bad.some(function (b) { return /^(Daily|Consistency|Required)/.test(b); })) $('#more').open = true;
    pickTexts();
    if (st.v !== 'compare' && recs[st.s]) drawMx(recs[st.s], st.x);
    if (bad.length) {
      out.classList.add('is-stale');
      $('#msum').classList.add('is-stale');
      $('#status').textContent = 'The replay waits for: ' + bad.join(', ') + '. Fix the box above to see it again.';
      return;
    }
    out.classList.remove('is-stale');
    $('#msum').classList.remove('is-stale');
    $('#status').textContent = '';
    var R = rulesC(), k = st.x;
    writeHash();
    if (st.v === 'compare') {
      drawCompare(R, k);
    } else {
      var rec = recs[st.s], res = run(rec, k, R, true);
      cur = { rec: rec, res: res, tal: tally(res, rec.dates), tal2: runHarsh(rec, k, R), rules: R, k: k };
      $('#one-name').innerHTML = nameSpan(rec.s) + '<span class="cx-name-m">' + esc(rec.s.market_line || '') + '</span>';
      $('#label').textContent = rec.d.label && rec.d.label.text ? rec.d.label.text : 'Hypothetical backtest';
      $('#pick-cap').textContent = capFor(rec.d);
      drawDial(cur.tal, cur.tal2, R.kind);
      drawTrio(rec, k, R);
      drawLines(animate);
      drawCals();
      drawStops(cur.tal, R);
      drawHist(cur.tal);
      drawWL(rec, k);
      $('#how-rules').textContent = howRules(R);
      var t = cur.tal;
      $('#msum').innerHTML = '<span class="cx-msum-mx">' + mxShort(rec, k) + '</span><b>' + rateText(t) + '</b> passed · ' + oc(COL.target, t.target, 'passed') + ' · ' + oc(COL.limit, t.limit, 'blown') + ' · ' +
        oc(COL.open, t.open, 'in progress') + ' · ' + (t.avgC === null ? 'no average time' : 'average ' + plural(t.avgC, 'day', 'days')) +
        (harshShows(t, cur.tal2, R.kind) ? ' · <span class="cx-harsh-s">' + esc(harshShort(cur.tal2)) + '</span>' : '') + '. <button type="button" class="cx-jump">See full results <span aria-hidden="true">\u2193</span></button>' +
        '<span class="cx-must cx-must-s">' + MUST + '</span>';
    }
    $('#msum').hidden = st.v === 'compare';
    drawn++;
    out.setAttribute('data-drawn', String(drawn));
    if (t0) out.setAttribute('data-ms', (performance.now() - t0).toFixed(1));
  }
  function setView(v, focus) {
    st.v = v;
    var one = v !== 'compare';
    $('#tab-one').setAttribute('aria-selected', String(one)); $('#tab-one').tabIndex = one ? 0 : -1;
    $('#tab-cmp').setAttribute('aria-selected', String(!one)); $('#tab-cmp').tabIndex = one ? -1 : 0;
    $('#view-one').hidden = !one; $('#view-cmp').hidden = one;
    $('#pick-fld').hidden = !one;
    $('#mx').hidden = !one;
    render(one);
    if (focus) (one ? $('#tab-one') : $('#tab-cmp')).focus();
  }

  /* ---------- start ---------- */
  function build() {
    F = { pick: $('#pick'), target: $('#target'), limit: $('#limit'), dlOn: $('#dl-on'), dl: $('#dl'), cpOn: $('#cp-on'), cp: $('#cp'), md: $('#md'), scale: null };
    F.pick.innerHTML = order.map(function (slug) { return '<option value="' + esc(slug) + '">' + esc(optText(recs[slug])) + '</option>'; }).join('');
    pickTexts();   // row E791: the chosen option's text is the name; it follows every change
    F.pick.addEventListener('change', function () { pickTexts(); });
    $('#kinds').innerHTML = KINDS.map(function (kd) {
      return '<label class="cx-sgo"><input type="radio" name="kind" value="' + kd.id + '" aria-describedby="kind-note"><span>' + esc(kd.name) + '</span></label>';
    }).join('');
    $('#examples').innerHTML = EXAMPLES.map(function (e, i) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-ex="' + i + '" aria-label="Example numbers, ' + esc(e.label) + ': target ' + money(e.t) + ', loss limit ' + money(e.l) + '">' + esc(e.label.replace(' account', '')) + '<small>' + money(e.t) + ' / ' + money(e.l) + '</small></button>';
    }).join('');
    // row E780: the Account type choice and the Live account mode's boxes
    F.acct = $('#acct'); F.ld = $('#ld'); F.lb = $('#lb'); F.lm = $('#lm');
    MKTS.forEach(function (m) {
      var xs = F['lx' + m] = $('#lx-' + m);   // row E797: the market's own multiplier, the prop mode's choices
      xs.innerHTML = SCALES.map(function (x) { return '<option value="' + x + '">' + (x === 1 ? 'As tested' : x + ' \u00d7 tested') + '</option>'; }).join('');
      xs.addEventListener('change', function () { lv.x[m] = Number(xs.value); render(true); });
      var sel = F['lp' + m] = $('#lp-' + m);
      sel.innerHTML = '<option value="">None</option>' + order.filter(function (s) { return mktOf(recs[s]) === m; }).map(function (s) {
        return '<option value="' + esc(s) + '">' + esc(optText(recs[s])) + '</option>';
      }).join('');
      lpTexts(sel);
      sel.addEventListener('change', function () { lv.s[m] = sel.value; lpTexts(sel); if (!lv.bSet) F.lb.value = plain(liveDefB(liveSlugs())); render(true); });
    });
    F.acct.addEventListener('change', function () { setAcct(F.acct.value === 'live'); });
    F.ld.addEventListener('change', function () {   // row E797: a date outside the range is set to its nearer end
      var v = F.ld.value, a = F.ld.min, z = F.ld.max;
      if (v && a && v < a) { ldOut = v; v = a; } else if (v && z && v > z) { ldOut = v; v = z; }
      lv.d = v; render(true);
    });
    F.lb.addEventListener('input', function () { lv.bSet = true; render(false); });
    F.lm.addEventListener('input', function () { lv.mSet = true; render(false); });
    if (SCALES.length > 1) {
      F.scale = $('#scale');
      F.scale.innerHTML = SCALES.map(function (x) { return '<option value="' + x + '">' + (x === 1 ? 'As tested' : x + ' × tested') + '</option>'; }).join('');
      $('#scale-fld').hidden = false;
    }
    var form = $('#rules');
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    form.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'target' || id === 'limit' || id === 'dl' || id === 'cp' || id === 'md') render(false);
    });
    form.addEventListener('change', function (e) {
      var el = e.target;
      if (el === F.pick) { st.s = el.value; render(true); return; }
      if (el.name === 'kind') { st.k = el.value; syncSwitches(); render(false); return; }
      if (el === F.dlOn) { st.dlOn = el.checked; syncSwitches(); render(false); if (el.checked) F.dl.focus(); return; }
      if (el === F.cpOn) { st.cpOn = el.checked; syncSwitches(); render(false); if (el.checked) F.cp.focus(); return; }
      if (el === F.scale) { st.x = Number(el.value); render(true); }
    });
    $('#examples').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ex]');
      if (!b) return;
      var x = EXAMPLES[Number(b.dataset.ex)];
      F.target.value = plain(x.t); F.limit.value = plain(x.l);
      render(false);
    });
    $('#trio').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-kind]');
      if (!b || b.dataset.kind === st.k) return;
      st.k = b.dataset.kind;
      document.querySelectorAll('input[name="kind"]').forEach(function (r) { r.checked = r.value === st.k; });
      syncSwitches();
      render(false);
      var nb = $('#trio button[data-kind="' + st.k + '"]');
      if (nb) nb.focus();
    });
    $('#view-cmp').addEventListener('click', function (e) {
      var s = e.target.closest('button[data-sort]'), o = e.target.closest('button[data-open]');
      if (s) {
        var key = s.dataset.sort;
        sortBy = sortBy.key === key ? { key: key, dir: -sortBy.dir } : { key: key, dir: key === 'name' || key === 'avg' || key === 'limit' || key === 'open' || key === 'dd' ? 1 : -1 };
        render(false);
        var again = $('#view-cmp button[data-sort="' + key + '"]');
        if (again) again.focus();
      } else if (o) {
        st.s = o.dataset.open;
        F.pick.value = st.s;
        setView('one', false);
        $('#one-name').setAttribute('tabindex', '-1');
        $('#one-name').focus();
      }
    });
    $('.cx-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[role="tab"]');
      if (b) setView(b.id === 'tab-cmp' ? 'compare' : 'one', false);
    });
    $('.cx-tabs').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var toCmp = e.key === 'End' || ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && st.v !== 'compare');
        setView(toCmp ? 'compare' : 'one', true);
      }
    });
    $('#msum').addEventListener('click', function (e) {
      if (!e.target.closest('.cx-jump')) return;
      var v = $('#view-one');
      v.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' });
      v.focus({ preventScroll: true });
    });
    window.addEventListener('hashchange', function () { applyHash(); });
    var lw = 0;   // row E780
    if (window.ResizeObserver) new ResizeObserver(function () {
      var w = $('#live-lines').clientWidth;
      if (w && w !== lw) { lw = w; if (lv.on) drawLiveChart(); }
    }).observe($('#live-lines'));
    var rw = 0;
    if (window.ResizeObserver) new ResizeObserver(function () {
      var w = $('#lines').clientWidth;
      if (w && w !== rw) { rw = w; if (cur && st.v !== 'compare') drawLines(false); }
    }).observe($('#lines'));
  }
  function applyHash() {
    var reset = readHash().concat(readLive());   // row E780: readLive reads the Live account keys only
    if (!st.s || !recs[st.s]) st.s = order[0];
    fillControls();
    fillLive();
    var note = $('#addr-note');
    note.hidden = !reset.length;
    note.textContent = reset.length ? 'Some values in the address could not be used and were reset: ' + reset.join(', ') + '.' : '';
    setView(st.v, false);
  }

  window.AFT_CALC = { replay: replay, summary: summary, version: 2 };
  // Row E754: a coming-soon strategy is listed like the others once it has figures (its data file); without them none is fetched.
  var FIGS = CAT.figures || {};
  var list = (CAT.strategies || []).filter(function (s) {
    return s && (s.coming_soon === true ? Object.prototype.hasOwnProperty.call(FIGS, s.slug) : s.named === true) && /^[a-z0-9-]+$/.test(String(s.slug)) && s.name;
  });
  Promise.all(list.map(function (s) {
    return fetch(DATA + s.slug + '.json', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (d) { return { s: s, d: d }; }, function () { return { s: s, d: null }; });
  })).then(function (all) {
    all.forEach(function (x) {
      if (!usable(x.d)) return;
      recs[x.s.slug] = { s: x.s, d: x.d, tot: x.d.days.map(function (e) { return cents(e[1]); }), dates: x.d.days.map(function (e) { return e[0]; }),
        dp: x.d.day_paths.map(function (p) { return p.map(cents); }), dp2: x.d.day_paths_alt.map(function (p) { return p.map(cents); }), k: null, sc: null };
      order.push(x.s.slug);
    });
    if (!order.length) { $('#status').textContent = 'No strategy record could be loaded. Try again later.'; return; }
    build();
    applyHash();
    document.body.setAttribute('data-ready', '1');
  });
})();
