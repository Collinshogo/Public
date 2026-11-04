# Meta ad plan — All Fluence Trading (one page)

**Objective.** Trial starts on Whop for the membership, measured as InitiateCheckout on the page and Purchase from Whop, at a cost per trial start the margin can carry ($100/mo product, Whop takes ~2.7% + $0.30; a $40 cost per paying member is the ceiling to test toward).

## Read first: the policy risk (Oct 29, 2026)

Meta's financial-services policy now bars US-targeted ads that "promote any investment products or opportunities, including in the context of educational or informational content" unless the advertiser is a verified accredited brokerage or licensed advisor. AFT sells software and education, not an investment product. Keep every ad inside that line: no returns, no profit, no payouts, no P&L, no "funded", no DM-me. The landing page carries member payouts and P&L by Collin's decision (see `docs/FUNNEL_WARGAME.md` section 1); if a rejection cites the page, point ads at a `/start/` copy without those sections rather than softening the creative further. Expect the first ad to be reviewed by a human. If an ad is rejected citing investment products, appeal once with the software/education framing; if the appeal fails, stop Meta and run the same creative on TikTok and YouTube with the page as the destination. Do not try to word around it.

## Account setup (Collin, ~30 min)

1. Business Manager: create (or confirm) an **AFT** business separate from Etchling. Move or create the ad account `1662092955311936` (currently has no business and no pixel) under it, or use it as is.
2. Events Manager: create **AFT Pixel** (dataset) under the AFT ad account. Put its ID in `config.js` and in Whop → Settings → Checkout. Turn on Conversions API via the Worker (`docs/RUNBOOK.md` §5) when convenient.
3. Business settings → Security Center: complete **identity verification** and **business verification** (required for financial-services advertisers since Oct 26, 2026). Add the domain `allfluencetrading.com` and verify it (meta tag or DNS TXT at GoDaddy).
4. Aggregated Event Measurement: prioritise Purchase > InitiateCheckout > Lead > ViewContent for the domain.
5. Page and Instagram: connect the AFT Facebook Page and @shogotrades Instagram to the ad account (today the ad account has no Page attached).

## Campaign structure (first 14 days, ~$30/day)

| Setting | Value | Why |
|---|---|---|
| Campaign | Sales (Advantage+ sales campaign, "manual" structure acceptable) | The desired action is a checkout on Whop |
| Special ad category | **Financial products and services** — declare it | Keeps the account safe during review; costs age/gender/detailed-interest targeting, which matters little at this budget |
| Conversion location | Website, AFT Pixel | |
| Optimisation event | **InitiateCheckout** for the first 2–3 weeks | Purchase comes from Whop at low volume; Meta needs ~50 optimisation events per ad set per week to exit learning. InitiateCheckout clicks will reach that faster. Switch to Purchase when Whop-reported purchases pass ~25 in a week |
| Attribution | 7-day click, 1-day view | Default; keep it so results are comparable |
| Audience | US (all states), 18+ (forced by the category), broad, Advantage+ audience with a suggestion of "futures trading", "TradingView", "day trading" interests | Broad plus the creative does the targeting |
| Placements | Advantage+ placements; exclude Audience Network | Phone feeds and Reels are where the clips work |
| Budget | $30/day, campaign-level (CBO) | Enough for ~1,000–1,500 impressions/day at trading CPMs |
| Ad sets | 1 broad; add a 2nd for retargeting after 7 days (all site visitors 30d + IG engagers 90d, exclude Purchasers) | |
| Ads | 3 to start: (a) 20–40 s screen-recorded clip of the MNQ Master Trader drawing a setup in replay, Collin's voice over, "this is what's on the chart"; (b) 15 s MGC equivalent; (c) static: the chart screenshot with the one-line headline from the page. Primary text from the page's hero, no edits that add claims | Real charts, his voice, no stock footage |
| Landing URL | `https://allfluencetrading.com/?utm_source=meta&utm_medium=paid&utm_campaign=trial-launch&utm_content={{ad.name}}` | The page forwards UTMs and the affiliate code to Whop |
| Creative rule | No P&L, no payout, no dollar figures, no "funded", no DM/comment CTAs, no before/after. Disclaimer line in the primary text: "Educational tools. Futures trading involves substantial risk of loss." | Policy |

## Optimisation thresholds

- Learning phase needs ~50 optimisation events per ad set in 7 days. At $30/day with InitiateCheckout, that needs a page→Whop click rate of about 8–10%; the sticky CTA and nav button exist for this.
- Move to Purchase optimisation only when a week shows ≥25 Whop purchases attributed. Below that, Purchase optimisation starves and CPMs climb.
- Kill an ad at 3,000 impressions with CTR (link) < 0.8%. Kill an ad set after $150 with zero InitiateCheckout.
- Scale only by +20% per day on CBO; new creative goes into the same ad set.

## Retargeting (needs no email list)

Custom audiences from the pixel: All visitors 30d; ViewContent (pricing) 30d; InitiateCheckout 7d; Purchasers (from Whop's events) 180d as an exclusion. Second ad set = the first three, excluding purchasers, with the Discord "look around" clip and the free Chapter 1 offer as the creative, optimised for Lead. Whop's free Chapter 1 plan collects the email inside Whop, where Collin can message them.

## Reporting

Weekly, one line each: spend, impressions, link CTR, cost per InitiateCheckout, Whop-reported trials and paid conversions, cost per paid member. Whop's Analytics (filter `utm_source=meta`) is the source of truth for revenue; Meta's numbers are for optimisation.

## Instagram and TikTok bios

Bio link: `https://allfluencetrading.com/?utm_source=instagram&utm_medium=bio` (and `tiktok`). TikTok ads later use the same page; TikTok's finance policy also restricts "investment" claims, so the same creative rules apply.
