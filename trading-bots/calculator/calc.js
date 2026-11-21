/* AFT Trading Bots: the account rules calculator (row E737, corrected by rows E745 and E746).
   No tracking of its own, no library and no network call beyond this site's own data files (../data/<slug>.json).
   - It replays one strategy's published hypothetical results through the rules a visitor types: from every day of the
     test with a closed trade an account starts at 0, takes the days in order and ends when it reaches the profit target
     or hits the loss limit; a start the test ended first did not finish and is left out of the success rate.
   - A daily loss limit and a consistency rule never end an account: each stops the day it reaches (row E745 ruling 1).
   - The data: each record's "days" ([date, total]) and "day_paths" (for the same days, each day's running result from
     its start as its turning points, ending at the day's total; row E746), written by aft_strategy_export.py. A record
     without them is not offered. The replay walks each day's path, so the floors and both stops are exact.
   - The replay works in whole cents. aft_strategy_export.py carries the same replay and summary in Python (replay(),
     summary()); the page's results were checked against them over a grid of rules for every record. Change one, change
     both.
   - What the visitor chose is kept in the address after # so a view can be reopened. A value there that is not usable is
     reset to its starting value, and the page says which.
   - Strategy names are lettered by the site's rule (bots.js, rows E728 and E704): a grade sets the tier, and a name wears
     its tier's finish only in the upper half of the tiers. */
(function () {
  'use strict';

  var CAT = window.AFT_BOTS_CATALOG || {};
  var DATA = document.body.dataset.dataBase || '../data/';
  var MINUS = '−', DASH = '–';
  // Row E745 ruling 8 and row E746 ruling 13: the line every result stands beside, in both views.
  var MUST = 'A replay of hypothetical test results. Not a forecast, and not a chance of passing any account.';
  // Row E737: the multiples of the tested results. Collin ruled on 2026-11-20 that the control stays (SCALES = [1] would remove it).
  var SCALES = [1, 2, 3, 4, 5];
  // Row E745 ruling 9: his names, in his order. The ids (and the address keys) are those of row E737.
  var KINDS = [
    { id: 'fixed', name: 'Static', note: 'Never moves.' },
    { id: 'intraday', name: 'Trailing drawdown', note: 'Moves up with the highest point the account reaches, open trades included.' },
    { id: 'eod', name: 'End-of-day drawdown', note: 'Moves up only at each day’s close.' }
  ];
  var EXAMPLES = [   // inputs only, in whole cents; they never set the kind of loss limit or the switch
    { label: '50K account', t: 300000, l: 200000 },
    { label: '100K account', t: 600000, l: 300000 },
    { label: '150K account', t: 900000, l: 450000 }
  ];
  var OUT = ['target', 'limit', 'open'];   // how a start ended, by code 0 to 2
  var WORDS = { target: 'Reached the target', limit: 'Hit the loss limit', open: 'Did not finish' };
  var COL = { target: '#34c27a', limit: '#ff6b6b', open: '#565d78', mid: '#ffffff' };
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
  function avgText(t) {
    return t.avgT === null ? 'Average time to the target: ' + DASH :
      'Average time to the target: ' + tenths(t.avgT) + ' trading days, about ' + plural(t.avgC, 'calendar day', 'calendar days');
  }
  // Row E748 rulings 2 and 3: the same replay on the harsher order's paths (best point first in every trade). It shows
  // always under Trailing drawdown, and under the other kinds only when its success rate or its hit count differs.
  var HARSH = 'If each trade’s best point came before its worst: ';
  function harshShows(t, h, kind) { return kind === 'intraday' || h.rate !== t.rate || h.limit !== t.limit; }
  function harshLine(t, h) {
    return HARSH + (h.target === t.target && h.limit === t.limit && h.open === t.open ? 'the same result.' :
      rateText(h) + ' (' + num(h.target) + ' reached the target, ' + num(h.limit) + ' hit the loss limit, ' + num(h.open) + ' did not finish).');
  }
  function harshShort(h) { return 'other order ' + rateText(h); }   // row E749 ruling 1: named neutrally
  function notCounted(t) {
    return t.open ? num(t.open) + ' did not finish before the test ended and ' + (t.open === 1 ? 'is' : 'are') + ' not counted.' : '';
  }

  /* ---------- the lettering of a name (the site's rule, as in bots.js) ---------- */
  var LAD = (CAT.tiers || []).slice().sort(function (a, b) { return a.rank - b.rank; });
  function finishAt(i) { var n = LAD.length; return i === 0 ? 'plain' : (i === n - 1 ? 'sheen' : (n >= 4 && i === n - 2 ? 'polished' : 'gradient')); }
  function tierOf(s) { return ([1, 2, 3, 4].indexOf(s.grade) >= 0 && LAD[LAD.length - s.grade]) ? LAD[LAD.length - s.grade].id : s.tier; }
  function nameFinish(s) {
    var t = tierOf(s), i = -1;
    LAD.forEach(function (x, k) { if (x.id === t) i = k; });
    return i >= 0 && i >= LAD.length / 2 ? finishAt(i) : 'plain';
  }
  function colour(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)); }
  function nameSpan(s) {
    var fin = nameFinish(s), g = s.lettering, st = ['--n:' + String(s.name).length];
    if (g && g.length === 3 && g.every(colour)) st.push('--c0:' + g[0], '--c1:' + g[1], '--c2:' + g[2]);
    var sh = (fin === 'sheen' || fin === 'polished') ? '<span class="bx-sh" aria-hidden="true" data-t="' + esc(s.name) + '"></span>' : '';
    var n = '<span class="bx-sname bx-wm" data-lvl="' + fin + '" style="' + st.join(';') + '">' + esc(s.name) + sh + '</span>';
    // Row E754: a coming-soon strategy carries the tag "Coming soon" right after its name, read with it.
    return s.coming_soon === true ? '<span class="bx-nt">' + n + '<span class="bx-cs"><span class="bx-vh">, </span>Coming soon</span></span>' : n;
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
  // R: kind, t (target), l (limit), lock, dl (daily limit or null), cp (consistency per cent or null), md (minimum days).
  // dp: each day's path of turning points (cents, already scaled), ending at the day's total. Row E746: within a day the
  // running result x moves in straight steps from 0 through each point; the balance is b + x. The floor: Static -l;
  // End-of-day drawdown the highest end-of-day balance so far minus l, fixed during the day; Trailing drawdown the highest
  // balance reached so far minus l; with the switch, the two trailing floors never above 0. On a step down the account
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
  function dayNo(iso) { return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY_MS); }
  // What a view shows: counts, the success rate of the finished starts, the averages, the days stopped by each rule.
  function tally(res, dates) {
    var c = [0, 0, 0], reach = [], sumT = 0, sumC = 0, sd = 0, sc = 0, i;
    for (i = 0; i < res.code.length; i++) {
      c[res.code[i]]++;
      if (res.code[i] === 0) { reach.push(res.len[i]); sumT += res.len[i]; sumC += dayNo(dates[i + res.len[i] - 1]) - dayNo(dates[i]) + 1; }
    }
    for (i = 0; i < res.days.stop.length; i++) { if (res.days.stop[i] === 1) sd++; else if (res.days.stop[i] === 2) sc++; }
    reach.sort(function (a, b) { return a - b; });
    var m = reach.length, fin = c[0] + c[1], med = m ? (m % 2 ? reach[(m - 1) / 2] : (reach[m / 2 - 1] + reach[m / 2]) / 2) : null;
    return { n: res.code.length, target: c[0], limit: c[1], open: c[2], fin: fin, rate: fin ? halfUp(100 * c[0], fin) : null,
      avgT: m ? halfUp(10 * sumT, m) : null, avgC: m ? halfUp(sumC, m) : null, reach: reach, median: med, sd: sd, sc: sc };
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
  // Row E745 ruling 10: the switch is off by default.
  var DEF = { s: '', k: 'eod', t: 300000, l: 200000, lock: false, dlOn: false, dl: null, cpOn: false, cp: null, md: 0, x: 1, v: 'one' };
  var st = {};
  Object.keys(DEF).forEach(function (k) { st[k] = DEF[k]; });
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
    if (m.err) bad.push('Minimum trading days'); else st.md = m.c;
    return bad;
  }
  function rulesC() {
    return { kind: st.k, t: st.t, l: st.l, lock: st.lock, dl: st.dlOn ? st.dl : null, cp: st.cpOn ? st.cp : null, md: st.md };
  }
  function writeHash() {
    var p = ['s=' + encodeURIComponent(st.s), 'k=' + st.k, 't=' + plain(st.t), 'l=' + plain(st.l), 'lock=' + (st.lock ? 1 : 0)];
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
    if ('lock' in q) { if (q.lock === '1' || q.lock === '0') st.lock = q.lock === '1'; else reset.push('the starting-balance switch'); }
    if ('dl' in q) { var d = readMoney(q.dl); if (d.err) reset.push('daily loss limit'); else { st.dlOn = true; st.dl = d.c; } }
    if ('c' in q) { var c = readWhole(q.c, 1, 100, ''); if (c.err) reset.push('consistency rule'); else { st.cpOn = true; st.cp = c.c; } }
    if ('md' in q) { var m = readWhole(q.md, 0, 999, ''); if (m.err) reset.push('minimum trading days'); else st.md = m.c; }
    if ('x' in q) { var x = Number(q.x); if (SCALES.indexOf(x) >= 0 && /^\d$/.test(q.x)) st.x = x; else reset.push('scale'); }
    if ('v' in q) { if (q.v === 'compare' || q.v === 'one') st.v = q.v; else reset.push('view'); }
    return reset;
  }
  function fillControls() {
    F.pick.value = st.s;
    F.target.value = plain(st.t);
    F.limit.value = plain(st.l);
    document.querySelectorAll('input[name="kind"]').forEach(function (r) { r.checked = r.value === st.k; });
    F.lock.checked = st.lock;
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
    var moving = st.k !== 'fixed';
    F.lock.disabled = !moving;
    $('#lock-row').classList.toggle('is-off', !moving);
    $('#lock-hint').textContent = moving ? 'Once the limit has risen to the starting balance, it stays there.' : 'Only for the two drawdown kinds. A static limit never moves.';
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
    return t.fin ? 'Success rate ' + t.rate + '%: of ' + plural(t.fin, 'start that finished', 'starts that finished') + ', ' + num(t.target) + ' reached the target and ' +
      num(t.limit) + ' hit the loss limit.' : 'No start finished under these rules in the tested range.';
  }

  function drawDial(tal, h, kind) {
    var hs = harshShows(tal, h, kind);
    var alt = rateWords(tal) + (tal.open ? ' ' + notCounted(tal) : '') + ' ' + avgText(tal) + '.' + (hs ? ' ' + harshLine(tal, h) : '');
    var segs = [{ v: tal.target, c: COL.target }, { v: tal.limit, c: COL.limit }];
    $('#dial').innerHTML =
      '<div class="cx-dial"><svg viewBox="0 0 240 240" role="img" aria-label="' + esc(alt) + '"><defs><filter id="cx-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<g class="cx-glow" filter="url(#cx-glow)">' + ring(240, 92, 14, segs, tal.fin, false) + '</g>' +
      ring(240, 92, 14, segs, tal.fin, true) + '</svg>' +
      '<div class="cx-dial-mid" aria-hidden="true"><b class="cx-big" id="big">' + rateText(tal) + '</b><span>success rate</span></div></div>' +
      '<p class="cx-dial-n" id="dial-n">' + (tal.fin ? num(tal.target) + ' of ' + plural(tal.fin, 'finished start', 'finished starts') + ' reached the target' : 'No start finished under these rules in the tested range.') + '</p>' +
      '<p class="cx-avg" id="dial-avg">' + esc(avgText(tal)) + '</p>' +
      '<ul class="cx-legend cx-dial-leg">' +
        legendItem(COL.target, 'Reached the target <b data-n="target">' + num(tal.target) + '</b>') +
        legendItem(COL.limit, 'Hit the loss limit <b data-n="limit">' + num(tal.limit) + '</b>') + '</ul>' +
      (hs ? '<p class="cx-harsh" id="dial-harsh">' + esc(harshLine(tal, h)) + '</p>' : '') +
      '<p class="cx-must cx-must-dial">' + MUST + '</p>' +
      '<p class="cx-nc" id="dial-open" data-open="' + tal.open + '">' + esc(notCounted(tal)) + '</p>';
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
        '<svg viewBox="0 0 120 120" aria-hidden="true">' + ring(120, 44, 9, [{ v: t.target, c: COL.target }, { v: t.limit, c: COL.limit }], t.fin, false) +
        '<text x="60" y="66" text-anchor="middle" class="cx-mini-p">' + rateText(t) + '</text></svg>' +
        '<span class="cx-mini-k">' + esc(kd.name) + '</span>' +
        '<span class="cx-mini-n">' + (t.fin ? num(t.target) + ' of ' + num(t.fin) + ' finished' : 'none finished') + '</span>' +
        '<span class="cx-mini-n">' + (t.avgT === null ? 'Average ' + DASH : 'Average ' + tenths(t.avgT) + ' days') + '</span>' +
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
      num(tal.target) + ' reach the target line at ' + money(R.t) + ', ' + num(tal.limit) + ' end at the loss limit and ' + num(tal.open) + ' did not finish before the test ended. ' +
      'The longest runs ' + plural(maxLen, 'trading day', 'trading days') + '. The highlighted middle start, by ending balance, began on ' + day(cur.rec.d.days[mid][0]) + ' and ' +
      (mcode === 'target' ? 'reached the target after ' + plural(res.len[mid], 'trading day', 'trading days') : mcode === 'open' ? 'had not finished when the test ended, ' + plural(res.len[mid], 'trading day', 'trading days') + ' later' : 'hit the loss limit after ' + plural(res.len[mid], 'trading day', 'trading days')) + '.');
    $('#lines-legend').innerHTML = legendItem(COL.target, 'Reached the target') + legendItem(COL.limit, 'Hit the loss limit') + legendItem(COL.open, 'Did not finish') +
      legendItem(COL.mid, 'The middle start, began ' + esc(day(cur.rec.d.days[mid][0])), 'is-mid');
  }

  // The start days in calendar order: weeks as rows, Monday to Friday as columns (and a weekend column when traded).
  function drawCals() {
    var d = cur.rec.d, res = cur.res, by = {}, on = {};
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
      var i = by[k], c = OUT[res.code[i]];
      var words = day(k) + ': ' + (c === 'open' ? 'did not finish before the test ended' : WORDS[c].toLowerCase() + ' after ' + plural(res.len[i], 'trading day', 'trading days'));
      return '<td class="is-' + c + '" title="' + esc(words) + '"><i aria-hidden="true">' + dt.getUTCDate() + '</i><span class="bx-vh">' + esc(words) + '</span></td>';
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
    $('#cal-legend').innerHTML = legendItem(COL.target, 'Reached the target') + legendItem(COL.limit, 'Hit the loss limit') + legendItem(COL.open, 'Did not finish');
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
      el.innerHTML = '<h3 class="cx-h3">How long to the target</h3><p class="cx-sub-l">No start reached the target under these rules.</p>';
      return;
    }
    var r = tal.reach, mx = r[r.length - 1], bw = Math.max(1, Math.ceil(mx / 30)), nb = Math.ceil(mx / bw), cnt = [], i, top = 0;
    for (i = 0; i < nb; i++) cnt.push(0);
    r.forEach(function (v) { cnt[Math.min(nb - 1, Math.floor((v - 1) / bw))]++; });
    cnt.forEach(function (c) { if (c > top) top = c; });
    var W = 300, H = 100, gw = W / nb, svg = '';
    cnt.forEach(function (c, k) {
      var hh = top ? H * c / top : 0;
      svg += '<rect x="' + (k * gw + gw * 0.12).toFixed(2) + '" y="' + (H - hh).toFixed(2) + '" width="' + (gw * 0.76).toFixed(2) + '" height="' + hh.toFixed(2) + '" fill="' + COL.target + '" fill-opacity=".8"/>';
    });
    var mxX = (tal.median - 0.5) / (nb * bw) * W;
    svg += '<line x1="' + mxX.toFixed(2) + '" x2="' + mxX.toFixed(2) + '" y1="0" y2="' + H + '" class="cx-med" vector-effect="non-scaling-stroke"/>';
    var alt = 'Trading days to the target for the ' + plural(r.length, 'start', 'starts') + ' that reached it: the fastest ' + daysWords(r[0]) + ', the median ' + daysWords(tal.median) +
      ', the average ' + tenths(tal.avgT) + ' days, the slowest ' + daysWords(mx) + '. Each bar is ' + (bw === 1 ? 'one day' : bw + ' days') + '.';
    el.innerHTML = '<h3 class="cx-h3">How long to the target</h3><p class="cx-sub-l">Trading days, for the ' + plural(r.length, 'start', 'starts') + ' that reached it.</p>' +
      '<svg class="cx-hist" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(alt) + '">' + svg + '</svg>' +
      '<div class="cx-hax" aria-hidden="true"><span>1</span><span>' + (nb * bw) + ' days</span></div>' +
      '<dl class="cx-stats cx-st4"><div><dt>Fastest</dt><dd>' + daysWords(r[0]) + '</dd></div><div><dt>Median</dt><dd>' + daysWords(tal.median) + '</dd></div>' +
      '<div><dt>Average</dt><dd id="hist-avg">' + tenths(tal.avgT) + ' days</dd></div><div><dt>Slowest</dt><dd>' + daysWords(mx) + '</dd></div></dl>';
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

  /* ---------- the compare view ---------- */
  // Row E745 ruling 7: success rate (of finished starts), hit the loss limit, did not finish, average days.
  var sortBy = { key: 'rate', dir: -1 };
  var COLS = [
    { key: 'rate', label: 'Success rate' },
    { key: 'limit', label: 'Hit the loss limit' },
    { key: 'open', label: 'Did not finish' },
    { key: 'avg', label: 'Average days' }
  ];
  function nullLast(x, y, dir) { return x === null && y === null ? 0 : x === null ? 1 : y === null ? -1 : dir * (x - y); }
  function drawCompare(R, k) {
    var rows = order.map(function (slug) {
      var rec = recs[slug], t = tally(run(rec, k, R, false), rec.dates), h = runHarsh(rec, k, R);
      return { slug: slug, rec: rec, t: t, h: h, rate: t.rate, limit: t.fin ? t.limit / t.fin : null, open: t.open, avg: t.avgT };
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
      return '<tbody data-slug="' + esc(r.slug) + '"><tr class="cx-cn"><th scope="rowgroup" colspan="4"><button type="button" class="cx-open" data-open="' + esc(r.slug) + '">' + nameSpan(r.rec.s) +
        '<span class="cx-cn-m">' + esc(r.rec.s.market_line || '') + ' · ' + plural(t.n, 'start day', 'start days') + '</span><span class="bx-vh">, open it in the one-strategy view</span></button></th></tr>' +
        '<tr class="cx-cv">' +
        '<td class="is-t"><b>' + rateText(t) + '</b><small>' + (t.fin ? num(t.target) + ' of ' + num(t.fin) + ' finished' : 'none finished') + '</small>' + bar(t.target, t.fin, COL.target) +
          (hs ? '<small class="cx-harsh-s">' + esc(harshShort(r.h)) + '</small>' : '') + '</td>' +
        '<td class="is-l"><b>' + num(t.limit) + '</b><small>' + (t.fin ? pct(t.limit, t.fin) + '% of finished' : 'none finished') + '</small>' + bar(t.limit, t.fin, COL.limit) + '</td>' +
        '<td class="is-o"><b>' + num(t.open) + '</b><small>not counted</small></td>' +
        '<td class="is-m"><b>' + (t.avgT === null ? DASH : tenths(t.avgT)) + '</b><small>' + (t.avgT === null ? 'none reached' : 'trading days') + '</small></td></tr></tbody>';
    }).join('');
    $('#cmp').insertAdjacentHTML('beforeend', html);
  }

  /* ---------- drawing everything ---------- */
  var drawn = 0;
  function render(animate) {
    var t0 = (window.performance && performance.now) ? performance.now() : 0;
    var bad = readAll();
    var out = $('#out');
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
      var t = cur.tal;
      $('#msum').innerHTML = '<b>' + rateText(t) + '</b> success rate · ' + num(t.target) + ' reached the target · ' + num(t.limit) + ' hit the loss limit · ' +
        num(t.open) + ' did not finish · ' + (t.avgT === null ? 'no average time' : 'average ' + tenths(t.avgT) + ' trading days') +
        (harshShows(t, cur.tal2, R.kind) ? ' · <span class="cx-harsh-s">' + esc(harshShort(cur.tal2)) + '</span>' : '') + '. <button type="button" class="cx-jump">See it drawn</button>' +
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
    render(one);
    if (focus) (one ? $('#tab-one') : $('#tab-cmp')).focus();
  }

  /* ---------- start ---------- */
  function build() {
    F = { pick: $('#pick'), target: $('#target'), limit: $('#limit'), lock: $('#lock'), dlOn: $('#dl-on'), dl: $('#dl'), cpOn: $('#cp-on'), cp: $('#cp'), md: $('#md'), scale: null };
    F.pick.innerHTML = order.map(function (slug) { return '<option value="' + esc(slug) + '">' + esc(recs[slug].s.name) + (recs[slug].s.coming_soon === true ? ' (Coming soon)' : '') + '</option>'; }).join('');
    $('#kinds').innerHTML = KINDS.map(function (kd) {
      return '<label class="cx-radio"><input type="radio" name="kind" value="' + kd.id + '"><span><b>' + esc(kd.name) + '</b><small>' + esc(kd.note) + '</small></span></label>';
    }).join('');
    $('#examples').innerHTML = EXAMPLES.map(function (e, i) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-ex="' + i + '" aria-label="Example numbers, ' + esc(e.label) + ': target ' + money(e.t) + ', loss limit ' + money(e.l) + '">' + esc(e.label) + '<small>' + money(e.t) + ' / ' + money(e.l) + '</small></button>';
    }).join('');
    if (SCALES.length > 1) {
      F.scale = $('#scale');
      F.scale.innerHTML = SCALES.map(function (x) { return '<option value="' + x + '">' + (x === 1 ? 'As tested' : x + ' × the tested results') + '</option>'; }).join('');
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
      if (el === F.lock) { st.lock = el.checked; render(false); return; }
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
        sortBy = sortBy.key === key ? { key: key, dir: -sortBy.dir } : { key: key, dir: key === 'name' || key === 'avg' || key === 'limit' || key === 'open' ? 1 : -1 };
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
    var rw = 0;
    if (window.ResizeObserver) new ResizeObserver(function () {
      var w = $('#lines').clientWidth;
      if (w && w !== rw) { rw = w; if (cur && st.v !== 'compare') drawLines(false); }
    }).observe($('#lines'));
  }
  function applyHash() {
    var reset = readHash();
    if (!st.s || !recs[st.s]) st.s = order[0];
    fillControls();
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
