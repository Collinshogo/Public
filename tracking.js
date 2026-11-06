/* AFT tracking: Meta Pixel (browser) + optional CAPI relay + optional Whop pixel,
   UTM/affiliate pass-through on outbound links. No cookies of our own; no PII collected.
   Meta events: PageView (load), ViewContent (pricing seen, reviews, challenge), InitiateCheckout + custom StartTrialClick
   (any trial button), Lead + custom JoinDiscord (Discord), CompleteRegistration + custom TrialStarted (/welcome/, once per
   session, reached from Whop's checkout-success redirect within 24 h of a trial-button click in this browser; any other
   Whop arrival, such as a free chat join, sends custom WhopWelcome only). StartTrial and Purchase come from Whop's own
   Meta integration, which also sends Purchase for $0 trials and free plan joins: count trials and sales from Whop.
   Visits with utm_source in AFT_CONFIG.excludeSources (Discord links) load no Meta Pixel and send no Meta event at all. */
(function () {
  var C = window.AFT_CONFIG || {};
  var sessionKey = "aft_params";

  // ---- 1. Capture inbound campaign params once per session ----------------
  var inbound = {};
  try {
    var qs = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid"].forEach(function (k) {
      if (qs.get(k)) inbound[k] = qs.get(k);
    });
    if (Object.keys(inbound).length) sessionStorage.setItem(sessionKey, JSON.stringify(inbound));
    else inbound = JSON.parse(sessionStorage.getItem(sessionKey) || "{}");
  } catch (e) { inbound = {}; }

  // ---- 1b. Internal traffic (Discord links etc.) never reaches the Meta Pixel -------
  var excluded = false;
  try {
    var src = String(inbound.utm_source || "").toLowerCase();
    var list = (C.excludeSources || []).map(function (x) { return String(x).toLowerCase(); });
    var exKey = "aft_no_pixel", now = Date.now();
    if (src && list.indexOf(src) >= 0) { excluded = true; localStorage.setItem(exKey, String(now + 30 * 864e5)); }
    else { var until = Number(localStorage.getItem(exKey) || 0); if (until > now) excluded = true; else if (until) localStorage.removeItem(exKey); }
  } catch (e) {}
  window.aftPixelExcluded = excluded;

  // ---- 2. Meta Pixel loader ----------------------------------------------
  var pixelOn = !!C.metaPixelId && !excluded;
  if (pixelOn && !window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq("init", C.metaPixelId);
  }

  // ---- 3. Whop pixel (optional; snippet is Whop's own loader) --------------
  if (C.whopBizId && !excluded && !window.whop) {
    // Whop Pixel, official snippet (docs.whop.com/developer/guides/pixel). Whop records checkout, trial and
    // purchase events itself; this only adds page views and leads so Whop can attribute them.
    !function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");
    window.whop.setScope(C.whopBizId);
    window.whop.track("page");
  }

  // ---- 4. Event helpers ----------------------------------------------------
  function uid() {
    return "aft-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function cookie(name) {
    var m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() : "";
  }
  function capi(eventName, eventId, custom) {
    if (!C.capiEndpoint || excluded) return;
    var body = JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      fbp: cookie("_fbp"),
      fbc: cookie("_fbc"),
      custom_data: custom || {}
    });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(C.capiEndpoint, new Blob([body], { type: "application/json" }));
      else fetch(C.capiEndpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch (e) {}
  }
  function track(eventName, custom) {
    var id = uid();
    if (pixelOn) window.fbq("track", eventName, custom || {}, { eventID: id });
    capi(eventName, id, custom);
    // Whop sees its own checkouts, trials and purchases; only leads are sent to the Whop Pixel.
    if (eventName === "Lead" && window.whop && window.whop.track) {
      try { window.whop.track("lead", { event_id: id }); } catch (e) {}
    }
    return id;
  }
  function trackCustom(eventName, custom) {
    var id = uid();
    if (pixelOn) window.fbq("trackCustom", eventName, custom || {}, { eventID: id });
    capi(eventName, id, custom);
    return id;
  }
  window.aftTrack = track;
  window.aftTrackCustom = trackCustom;

  // ---- 5. PageView; trial completion on /welcome/ (Whop checkout-success redirect) --
  track("PageView");
  // Only count /welcome/ loads that came from Whop's checkout-success redirect (referrer or the
  // ?src=whop marker set in Whop > Settings > Checkout); direct, bookmarked or QA loads send PageView only.
  // Whop sends every checkout here, the free chat plan included. A trial is counted only when this browser clicked a
  // trial button on this site within TRIAL_INTENT_MS (those buttons open the trial product, which has no free plan);
  // any other Whop arrival (a free chat join, a checkout started on Whop itself) sends the custom WhopWelcome only.
  var TRIAL_INTENT_KEY = "aft_trial_intent", TRIAL_INTENT_MS = 24 * 36e5;
  var fromWhop = false;
  try { fromWhop = /(^|\.)whop\.com$/.test(new URL(document.referrer).hostname); } catch (e) {}
  try { var wq = new URLSearchParams(location.search); fromWhop = fromWhop || wq.get("src") === "whop" || wq.has("receipt_id") || wq.has("membership_id") || wq.has("checkout_id"); } catch (e) {}
  if (/^\/welcome\/?$/.test(location.pathname) && fromWhop) {
    var doneKey = "aft_trial_done", already = false, intentAt = 0;
    try { already = !!sessionStorage.getItem(doneKey); sessionStorage.setItem(doneKey, "1"); } catch (e) {}
    try { intentAt = Number(localStorage.getItem(TRIAL_INTENT_KEY) || 0); localStorage.removeItem(TRIAL_INTENT_KEY); } catch (e) {}
    if (!already) {
      var P = C.plan || {};
      if (intentAt && Date.now() - intentAt < TRIAL_INTENT_MS) {
        track("CompleteRegistration", { content_name: P.name || "membership", status: "trial", value: P.priceMonthly || 0, currency: P.currency || "USD" });
        trackCustom("TrialStarted", { content_name: P.name || "membership" });
      } else {
        trackCustom("WhopWelcome", { content_name: "whop arrival without a trial click" });
      }
    }
  }

  // ---- 6. Outbound link decoration + click events ---------------------------
  function decorate(url) {
    try {
      var u = new URL(url, location.href);
      if (/(^|\.)whop\.com$/.test(u.hostname)) {
        if (C.whopAffiliate && !u.searchParams.get("a")) u.searchParams.set("a", C.whopAffiliate);
        Object.keys(inbound).forEach(function (k) { if (/^utm_/.test(k) && !u.searchParams.get(k)) u.searchParams.set(k, inbound[k]); });
        if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", "allfluencetrading.com");
      }
      return u.toString();
    } catch (e) { return url; }
  }
  function priceFor(el) {
    var p = (C.plan || {});
    var v = el.getAttribute("data-value");
    return v ? Number(v) : (p.priceMonthly || 0);
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-ev]");
    if (!a) return;
    var kind = a.getAttribute("data-ev");
    var name = a.getAttribute("data-name") || a.textContent.trim();
    var dest = a.getAttribute("data-dest") || "";
    if (kind === "checkout") {
      try { localStorage.setItem(TRIAL_INTENT_KEY, String(Date.now())); } catch (e) {}
      track("InitiateCheckout", { content_name: name, content_category: "membership", value: priceFor(a), currency: (C.plan || {}).currency || "USD" });
      trackCustom("StartTrialClick", { placement: name });
    } else if (kind === "lead") {
      var isDiscord = dest === "discordInvite";
      track("Lead", { content_name: name, content_category: isDiscord ? "discord" : "other" });
      if (isDiscord) trackCustom("JoinDiscord", { placement: name });
    } else if (kind === "content") {
      track("ViewContent", { content_name: name, content_category: dest === "whopReviews" ? "reviews" : "page" });
    }
  }, true);

  function applyLinks() {
    document.querySelectorAll("a[data-dest]").forEach(function (a) {
      var key = a.getAttribute("data-dest");
      if (C[key]) a.href = C[key];
    });
    document.querySelectorAll("a[href*='whop.com']").forEach(function (a) {
      a.href = decorate(a.href);
      a.rel = "noopener";
      a.target = "_blank";
    });
  }

  // ---- 7. ViewContent when the pricing section is actually seen --------------
  function watchPricing() {
    var el = document.getElementById("pricing");
    if (!el || !("IntersectionObserver" in window)) return;
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!fired && en.isIntersecting && en.intersectionRatio >= 0.4) {
          fired = true; io.disconnect();
          track("ViewContent", { content_name: (C.plan || {}).name || "membership", content_category: "pricing", value: (C.plan || {}).priceMonthly, currency: (C.plan || {}).currency || "USD" });
        }
      });
    }, { threshold: [0.4] });
    io.observe(el);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { applyLinks(); watchPricing(); });
  else { applyLinks(); watchPricing(); }
})();
