// AFT Trading Bots: which strategies the page names, and the tier each one is in.
// One entry per strategy. named: true puts the name on the page; named: false (or no entry) keeps it
// under its tier's unnamed line ("Named here at release"). tier is base, select or supreme.
// tier also sets how the name is lettered (the ladder in bots.css): base is plain, select is the gradient,
// supreme is the most striking. lettering is the strategy's own three colours, used at every level.
// Each named strategy also needs its data file beside this one: data/<slug>.json, written by the importer
// (aft_strategy_export.py). Nothing else on the page has to change to name a strategy or move it to another tier.
window.AFT_BOTS_CATALOG = {
  schema: "aft.bots-catalog/2",
  strategies: [
    {
      slug: "continuum",
      named: true,
      name: "Continuum",
      tier: "supreme",
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      sentence: "Several MNQ models run together in one strategy, one position at a time, through the full futures day.",
      lettering: ["#f2f6f3", "#8ea0ff", "#3ddc84"]
    },
    {
      slug: "midas",
      named: true,
      name: "Midas",
      tier: "supreme",
      chip: "MGC",
      market_line: "MGC · Micro Gold",
      sentence: "Gold models for the Tokyo, London and New York sessions, combined in one strategy.",
      lettering: ["#fff6dc", "#f7c948", "#ff8a3d"]
    },
    {
      slug: "slipstream",
      named: true,
      name: "Slipstream",
      tier: "select",
      chip: "MNQ",
      market_line: "MNQ · Micro Nasdaq",
      sentence: "A single MNQ model that trades the continuation of fresh price imbalances.",
      lettering: ["#f2f6f3", "#ff9fd0", "#b388ff"]
    }
  ]
};
