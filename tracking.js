/* AFT tracking: Meta Pixel (browser) + optional CAPI relay + optional Whop pixel,
   UTM/affiliate pass-through on outbound links. No cookies of our own; no PII collected.
   Events: PageView (load), ViewContent (pricing seen), InitiateCheckout (Whop click), Lead (Discord / free chapter). */
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

  // ---- 2. Meta Pixel loader ----------------------------------------------
  var pixelOn = !!C.metaPixelId;
  if (pixelOn && !window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq("init", C.metaPixelId);
  }

  // ---- 3. Whop pixel (optional; snippet is Whop's own loader) --------------
  if (C.whopBizId && !window.whop) {
    // Whop's loader is pasted by hand into tracking/whop-pixel.js from the Whop dashboard
    // (Marketing > Pixel > Install). It is loaded only when whopBizId is set.
    var w = document.createElement("script"); w.async = true; w.src = "/tracking/whop-pixel.js";
    document.head.appendChild(w);
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
    if (!C.capiEndpoint) return;
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
    if (window.whop && window.whop.track) {
      var whopName = { PageView: "page", ViewContent: "view_content", InitiateCheckout: "initiate_checkout", Lead: "lead" }[eventName];
      if (whopName && whopName !== "page") { try { window.whop.track(whopName, Object.assign({ event_id: id }, custom || {})); } catch (e) {} }
    }
    return id;
  }
  window.aftTrack = track;

  // ---- 5. PageView -----------------------------------------------------------
  track("PageView");

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
    if (kind === "checkout") {
      track("InitiateCheckout", { content_name: name, content_category: "membership", value: priceFor(a), currency: (C.plan || {}).currency || "USD" });
    } else if (kind === "lead") {
      track("Lead", { content_name: name });
    } else if (kind === "content") {
      track("ViewContent", { content_name: name });
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
