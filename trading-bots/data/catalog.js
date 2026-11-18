// AFT Trading Bots: which strategies the page names, and the tier each one is in.
// One entry per strategy. named: true puts the name on the page; named: false (or no entry) keeps it
// under its tier's unnamed line ("Named here at release"). tier is the data-plan of a tier card in index.html:
// base, select, supreme or ultimate.
// tier also sets how the name is lettered (the ladder in bots.css), by the tier's place among the tiers: the lowest
// is plain, then the quiet gradient, then a satin polish with a slow sheen, and the top tier a mirror polish with a
// glow and a bright sheen, all at the same size. lettering is the strategy's own three colours, used at every level.
// grade is the strategy's grade, 1 (the strongest) to 4. null = it follows tier (base 4, select 3, supreme 2, ultimate 1).
// A grade that is set decides the tier: 1 ultimate, 2 supreme, 3 select, 4 base.
// tier may also be null: the tier is not set yet. Such a strategy shows "Tier not set", belongs to no plan, and appears on no
// tier card and in no plan's savings. Only Collin sets a tier.
// tv_url is the strategy's public TradingView script page. The Strategies page lists only the entries that have one.
// price is what the strategy costs on its own, in US dollars a month. null = "Price at release". Only Collin sets a price.
// tiers repeats each tier card of index.html, so the Strategies page can show the same tiers; aft_bots_publish.py refuses
// to run if the two differ.
// Each named strategy also needs its data file beside this one: data/<slug>.json, written by aft_bots_publish.py.
// Nothing else on the page has to change to name a strategy, price it or move it to another tier.
window.AFT_BOTS_CATALOG = {
  schema: "aft.bots-catalog/3",
  tiers: [
    {
      id: "base",
      name: "Base",
      rank: 1,
      price: 197,
      line: "All Tier 4 strategies."
    },
    {
      id: "select",
      name: "Select",
      rank: 2,
      price: 397,
      line: "All Tier 3 and Tier 4 strategies."
    },
    {
      id: "supreme",
      name: "Supreme",
      rank: 3,
      price: 897,
      line: "All Tier 2, 3 and 4 strategies."
    },
    {
      id: "ultimate",
      name: "Ultimate",
      rank: 4,
      price: 1197,
      line: "All strategies, Tier 1 to 4."
    }
  ],
  strategies: [
    {
      slug: "continuum",
      named: true,
      name: "Continuum",
      tv_url: "https://www.tradingview.com/script/GoazA2iD-Continuum-AFT/",
      tier: "ultimate",
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#f2f6f3", "#8ea0ff", "#3ddc84"]
    },
    {
      slug: "midas",
      named: true,
      name: "Midas",
      tv_url: "https://www.tradingview.com/script/uljkARS5-Midas-AFT/",
      tier: "ultimate",
      grade: 1,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fff6dc", "#f7c948", "#ff8a3d"]
    },
    {
      slug: "slipstream",
      named: true,
      name: "Slipstream",
      tv_url: "https://www.tradingview.com/script/ikYoLFYO-Slipstream-AFT/",
      tier: "select",
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#f2f6f3", "#ff9fd0", "#b388ff"]
    },
    {
      slug: "aftershock",
      named: true,
      name: "Aftershock",
      tv_url: "https://www.tradingview.com/script/8plxyoYn-Aftershock-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#fff1ec", "#ff7a59", "#ffc94d"]
    },
    {
      slug: "lantern",
      named: true,
      name: "Lantern",
      tv_url: "https://www.tradingview.com/script/4ckOe4KX-Lantern-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#fff8e6", "#ffb347", "#ff6f91"]
    },
    {
      slug: "the-press",
      named: true,
      name: "The Press",
      tv_url: "https://www.tradingview.com/script/YSUDmL8e-The-Press-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#eef3ff", "#7fb2ff", "#c9d6ff"]
    },
    {
      slug: "meridian",
      named: true,
      name: "Meridian",
      tv_url: "https://www.tradingview.com/script/TR5t3w88-Meridian-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      lettering: ["#e9fbff", "#4fd8eb", "#5b8cff"]
    },
    {
      slug: "prime-meridian",
      named: true,
      name: "Prime Meridian",
      tv_url: "https://www.tradingview.com/script/V6XGLqQq-Prime-Meridian-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MES",
      market_line: "MES · Micro S&P 500",
      lettering: ["#eefcf4", "#5fe3a1", "#37c6d0"]
    },
    {
      slug: "golden-meridian",
      named: true,
      name: "Golden Meridian",
      tv_url: "https://www.tradingview.com/script/XaWdIs0A-Golden-Meridian-AFT/",
      tier: "ultimate",
      grade: 1,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fff9e0", "#ffd65c", "#46d5c4"]
    },
    {
      slug: "hallmark",
      named: true,
      name: "Hallmark",
      tv_url: "https://www.tradingview.com/script/teBARQ5o-Hallmark-AFT/",
      tier: "ultimate",
      grade: 1,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fdf3e3", "#e6b873", "#c77dff"]
    },
    {
      slug: "the-alloy",
      named: true,
      name: "The Alloy",
      tv_url: "https://www.tradingview.com/script/837aV0Y8-The-Alloy-AFT/",
      tier: "supreme",
      grade: 2,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#f4f1ea", "#c9b18a", "#7fd1c7"]
    },
    {
      slug: "the-assay",
      named: true,
      name: "The Assay",
      tv_url: "https://www.tradingview.com/script/XemUIkde-The-Assay-AFT/",
      tier: "base",
      grade: 4,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fff4d6", "#f0c14b", "#8fd14f"]
    },
    {
      slug: "the-fix",
      named: true,
      name: "The Fix",
      tv_url: "https://www.tradingview.com/script/XrpbFoZt-The-Fix-AFT/",
      tier: "base",
      grade: 4,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fdeef0", "#ff8fa3", "#ffd166"]
    },
    {
      slug: "the-ingot",
      named: true,
      name: "The Ingot",
      tv_url: "https://www.tradingview.com/script/UNIo4H1s-The-Ingot-AFT/",
      tier: "base",
      grade: 4,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#fff3da", "#ffb627", "#e85d04"]
    },
    {
      slug: "the-print",
      named: true,
      name: "The Print",
      tv_url: "https://www.tradingview.com/script/iTT56GNd-The-Print-AFT/",
      tier: null,
      grade: null,
      price: null,
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      lettering: ["#f1f4ff", "#a5b4fc", "#f9c74f"]
    }
  ]
};
// ---- figures: written by aft_bots_publish.py from the data files; never edit by hand ----
window.AFT_BOTS_CATALOG.figures = {
 "midas": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-18",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 104083.25,
  "profit_factor": 2.673,
  "trades": 1208,
  "win_rate_pct": 70.86,
  "max_drawdown_usd": 1638.25,
  "return_on_drawdown": 63.53,
  "avg_trade_usd": 86.13,
  "monthly_profit_usd": 9462.11,
  "trading_days": 229,
  "trade_frequency": 0.1896,
  "display": {
   "net_profit": "+$104,083.25",
   "profit_factor": "2.673",
   "trades": "1,208",
   "win_rate": "70.86%",
   "max_drawdown_usd": "$1,638.25",
   "return_on_drawdown": "63.53",
   "avg_trade": "+$86.13",
   "monthly_profit": "+$9,462.11",
   "trading_days": "229",
   "trade_frequency": "0.19"
  }
 },
 "golden-meridian": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-17",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 56518.0,
  "profit_factor": 3.748,
  "trades": 323,
  "win_rate_pct": 61.3,
  "max_drawdown_usd": 1075.0,
  "return_on_drawdown": 52.57,
  "avg_trade_usd": 174.98,
  "monthly_profit_usd": 5138.0,
  "trading_days": 229,
  "trade_frequency": 0.709,
  "display": {
   "net_profit": "+$56,518.00",
   "profit_factor": "3.748",
   "trades": "323",
   "win_rate": "61.30%",
   "max_drawdown_usd": "$1,075.00",
   "return_on_drawdown": "52.57",
   "avg_trade": "+$174.98",
   "monthly_profit": "+$5,138.00",
   "trading_days": "229",
   "trade_frequency": "0.71"
  }
 },
 "hallmark": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-17",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 66965.75,
  "profit_factor": 2.569,
  "trades": 788,
  "win_rate_pct": 73.1,
  "max_drawdown_usd": 1203.25,
  "return_on_drawdown": 55.65,
  "avg_trade_usd": 84.62,
  "monthly_profit_usd": 6087.8,
  "trading_days": 229,
  "trade_frequency": 0.2906,
  "display": {
   "net_profit": "+$66,965.75",
   "profit_factor": "2.569",
   "trades": "788",
   "win_rate": "73.10%",
   "max_drawdown_usd": "$1,203.25",
   "return_on_drawdown": "55.65",
   "avg_trade": "+$84.62",
   "monthly_profit": "+$6,087.80",
   "trading_days": "229",
   "trade_frequency": "0.29"
  }
 },
 "the-alloy": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-17",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 58401.5,
  "profit_factor": 2.061,
  "trades": 769,
  "win_rate_pct": 67.36,
  "max_drawdown_usd": 1849.5,
  "return_on_drawdown": 31.58,
  "avg_trade_usd": 75.99,
  "monthly_profit_usd": 5309.23,
  "trading_days": 229,
  "trade_frequency": 0.2978,
  "display": {
   "net_profit": "+$58,401.50",
   "profit_factor": "2.061",
   "trades": "769",
   "win_rate": "67.36%",
   "max_drawdown_usd": "$1,849.50",
   "return_on_drawdown": "31.58",
   "avg_trade": "+$75.99",
   "monthly_profit": "+$5,309.23",
   "trading_days": "229",
   "trade_frequency": "0.30"
  }
 },
 "the-assay": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-18",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 37706.0,
  "profit_factor": 2.195,
  "trades": 241,
  "win_rate_pct": 67.22,
  "max_drawdown_usd": 1825.0,
  "return_on_drawdown": 20.66,
  "avg_trade_usd": 156.46,
  "monthly_profit_usd": 3427.82,
  "trading_days": 229,
  "trade_frequency": 0.9502,
  "display": {
   "net_profit": "+$37,706.00",
   "profit_factor": "2.195",
   "trades": "241",
   "win_rate": "67.22%",
   "max_drawdown_usd": "$1,825.00",
   "return_on_drawdown": "20.66",
   "avg_trade": "+$156.46",
   "monthly_profit": "+$3,427.82",
   "trading_days": "229",
   "trade_frequency": "0.95"
  }
 },
 "the-fix": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-18",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 36420.0,
  "profit_factor": 2.823,
  "trades": 156,
  "win_rate_pct": 70.51,
  "max_drawdown_usd": 1788.75,
  "return_on_drawdown": 20.36,
  "avg_trade_usd": 233.46,
  "monthly_profit_usd": 3310.91,
  "trading_days": 229,
  "trade_frequency": 1.4679,
  "display": {
   "net_profit": "+$36,420.00",
   "profit_factor": "2.823",
   "trades": "156",
   "win_rate": "70.51%",
   "max_drawdown_usd": "$1,788.75",
   "return_on_drawdown": "20.36",
   "avg_trade": "+$233.46",
   "monthly_profit": "+$3,310.91",
   "trading_days": "229",
   "trade_frequency": "1.47"
  }
 },
 "the-ingot": {
  "label": "Hypothetical backtest",
  "window_from": "2026-01-01",
  "window_to": "2026-11-17",
  "run_date": "2026-11-18",
  "start_capital_usd": 25000.0,
  "net_profit_usd": 37893.5,
  "profit_factor": 1.785,
  "trades": 805,
  "win_rate_pct": 73.42,
  "max_drawdown_usd": 1861.0,
  "return_on_drawdown": 20.36,
  "avg_trade_usd": 47.07,
  "monthly_profit_usd": 3444.86,
  "trading_days": 229,
  "trade_frequency": 0.2845,
  "display": {
   "net_profit": "+$37,893.50",
   "profit_factor": "1.785",
   "trades": "805",
   "win_rate": "73.42%",
   "max_drawdown_usd": "$1,861.00",
   "return_on_drawdown": "20.36",
   "avg_trade": "+$47.07",
   "monthly_profit": "+$3,444.86",
   "trading_days": "229",
   "trade_frequency": "0.28"
  }
 }
};
// ---- end of figures ----
