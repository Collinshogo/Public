// AFT Trading Bots: the page's switches and checkout links. Edit values here; nothing else needs to change.
// Loaded by /trading-bots/ and /trading-bots/strategies/, and by cart.js on the other Trading Bots pages. The site-wide /config.js is separate and is not touched by this page.
window.AFT_BOTS_CONFIG = {
  // The one-time Lifetime plan. false = it is not on the page at all.
  lifetime: true,

  // Row E832: the free trial's length in days (BRAND-62; DP-074, "14 days, like the membership"). Every monthly plan and
  // every released single strategy starts with this many days free; Lifetime has none. The plan cards, the Strategy
  // Library's lines, the open strategy and the cart write their trial lines from it, and the pages' own sentences carry
  // it in a <span data-trial-days> that cart.js sets from it. 0 = no trial lines on the cards, the lines or the cart (the
  // pages' sentences are then changed by hand).
  trialDays: 14,

  // The link to the set-up guide. false = no link to it anywhere on the page.
  setupGuide: true,
  setupGuideUrl: "/trading-bots/setup/",

  // Each tier's Whop checkout link, https://whop.com/checkout/<plan id>. The cart (cart.js) adds the tier and pays its plan id,
  // the last part of the link, in Whop's embedded checkout; the link itself is the fallback when that does not load.
  // Empty = the tier has no Add to cart, and the bar's button reads "Opening soon" and does nothing.
  checkout: {
    base: "",
    select: "",
    supreme: "",
    ultimate: "",
    lifetime: ""
  },

  // Each strategy's own Whop checkout link, by its slug in data/catalog.js ("slug": "https://whop.com/checkout/<plan id>"),
  // used by the cart as the tiers' links are. None listed, or a strategy with no price yet = no Add to cart for it.
  strategyCheckout: {
    "continuum": "",
    "midas": "",
    "slipstream": "",
    "aftershock": "",
    "lantern": "",
    "the-press": "",
    "meridian": "",
    "prime-meridian": "",
    "golden-meridian": "",
    "hallmark": "",
    "the-alloy": "",
    "the-assay": "",
    "the-fix": "",
    "the-ingot": "",
    "the-print": ""
  },

  // The cart's checkout (row E805's test: Whop charges several monthly plans together as one payment). true = the cart
  // holds any number of items and pays them in one checkout; false = one item at a time, and the cart says so.
  // Lifetime is always checked out alone: Whop takes it by bank payment only, which cannot share a checkout with a card.
  multiCart: true
};
