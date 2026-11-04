// Site configuration. Edit values here; nothing else needs to change.
// Loaded before tracking.js on every page.
window.AFT_CONFIG = {
  // --- Tracking -----------------------------------------------------------
  // Meta Pixel ID (Events Manager > Data sources). Empty string = pixel off.
  metaPixelId: "",
  // Optional Conversions API relay (see tracking/capi-worker.js). Empty = off.
  capiEndpoint: "",
  // Optional Whop pixel scope id (Whop dashboard URL after /dashboard/, starts with biz_). Empty = off.
  whopBizId: "",

  // --- Destinations ---------------------------------------------------------
  // Whop affiliate code appended to every Whop link as ?a=<code>. Never shown in copy.
  whopAffiliate: "shogotrades",
  // Whop store and product URLs (no query string here; affiliate + UTMs are appended by script).
  whopStore: "https://whop.com/aft-official/",
  whopJoin: "https://whop.com/aft-official/products/the-all-fluence-indicator/",
  whopFreeChapter: "https://whop.com/aft-official/products/founders-pack-course-trial/",
  discordInvite: "https://discord.gg/aft-traders",
  youtube: "https://www.youtube.com/@shogotrades",
  tiktok: "https://www.tiktok.com/@shogotrades",
  twitch: "https://www.twitch.tv/shogotrades",

  // --- Offer (shown on the page; keep in step with Whop) --------------------
  plan: {
    name: "All Fluence Trading membership",
    priceMonthly: 100,
    priceQuarterly: 300,
    priceAnnual: 1000,
    currency: "USD",
    trialDays: 14,
    moneyBackDays: 7
  }
};
