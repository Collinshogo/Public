// AFT Trading Bots: the page's switches and checkout links. Edit values here; nothing else needs to change.
// Loaded by /trading-bots/ only. The site-wide /config.js is separate and is not touched by this page.
window.AFT_BOTS_CONFIG = {
  // The one-time Lifetime plan. false = it is not on the page at all.
  lifetime: false,

  // The link to the set-up guide. false = no link to it anywhere on the page.
  setupGuide: false,
  setupGuideUrl: "/trading-bots/setup/",

  // Each tier's Whop checkout link. Empty = the bar's button reads "Opening soon" and does nothing.
  checkout: {
    base: "",
    select: "",
    supreme: "",
    lifetime: ""
  }
};
