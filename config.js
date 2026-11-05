// Site configuration. Edit values here; nothing else needs to change.
// Loaded before tracking.js on every page.
window.AFT_CONFIG = {
  // --- Tracking -----------------------------------------------------------
  // Meta Pixel ID (Events Manager > Data sources). Empty string = pixel off.
  metaPixelId: "1151769454028430",
  // Visits whose utm_source is in this list (e.g. links posted in the Discord) never load the Meta Pixel or send
  // any Meta event; the exclusion is remembered on that device for 30 days so later pages and /welcome/ stay clean.
  excludeSources: ["discord"],
  // Optional Conversions API relay (see tracking/capi-worker.js). Empty = off.
  capiEndpoint: "",
  // Whop account id (dashboard URL after /dashboard/, starts with biz_). Loads the Whop Pixel. Empty = off.
  whopBizId: "biz_G9AWq2Fgg1uLUM",

  // --- Destinations ---------------------------------------------------------
  // Whop affiliate code appended to every Whop link as ?a=<code>. Never shown in copy.
  whopAffiliate: "shogotrades",
  // Whop store and product URLs (no query string here; affiliate + UTMs are appended by script).
  whopStore: "https://whop.com/aft-official/",
  whopJoin: "https://whop.com/aft-official/products/the-all-fluence-indicator/",
  whopHub: "https://whop.com/hub/",
    whopReviews: "https://whop.com/aft-official/reviews",
  discordInvite: "https://discord.gg/aft-traders",
  supportEmail: "support@allfluencetrading.com",
  youtube: "https://www.youtube.com/@shogotrades",
  tiktok: "https://www.tiktok.com/@shogotrades",

  // --- Plan values for Pixel event values only (nothing here is rendered; the price copy is in index.html) ---
  // Default Whop plan: 14-day trial, then three monthly payments of 100 USD, then billing stops (split pay).
  plan: {
    name: "All Fluence Trading membership",
    priceMonthly: 100,
    currency: "USD",
    trialDays: 14,
    moneyBackDays: 7
  }
};
