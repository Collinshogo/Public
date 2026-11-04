# Funnel wargame — allfluencetrading.com (2026-11-04)

Decisions already made (not relitigated here): ads land on this page; Whop is checkout; Discord is the "look around first" door; the product is the membership bundle; no Shopify.

## 1. The one thing that can kill the plan before it starts

**Meta's US financial-services rule changed on 2026-10-29.** The policy page now says US-targeted ads may not "promote any investment products or opportunities, including in the context of educational or informational content" unless the advertiser is an accredited brokerage or licensed financial advisor verified through Meta's financial services verification. Source: transparency.meta.com → Ad standards → Restricted → Financial and insurance products and services (change log entry Oct 29, 2026).

What this means for AFT:
- AFT sells **software (TradingView indicators) and education**, not an investment product. That is the defensible position and the page is written to hold it: no returns, no "opportunity", no P&L, no "make money", no DM-me CTAs.
- Meta reviewers pattern-match on words. The page and the ads avoid: profit, income, payout, returns, ROI, passive, signals, "funded in X days", dollar figures tied to results, screenshots of P&L.
- Even so, the first ad may be rejected or the account flagged as "Financial products and services". Plan for it: (a) declare the Financial products and services special ad category on the first campaign (loses age/gender/interest targeting, keeps the account safe); (b) have the TikTok and YouTube organic funnel pointing at the same page so the page is useful regardless; (c) if Meta rejects on "investment opportunity", appeal once with the software/education framing, then stop and move spend to TikTok (its finance policy is also strict but reviews indicators/education as software).
- **Payout screenshots on the page are a liability under this rule.** They read as "investment opportunity, educational context". The original recommendation was no payout images on the ad landing page. **Collin overruled this on 2026-11-04**: real member payouts, P&L and testimonials from the Discord are the strongest proof he has, and the page now carries them (`proof`, `pnl`, `voices` sections) with per-section disclaimers and no aggregate claims. Consequences, in order:
  1. Ads stay clean (no P&L, payouts or dollar figures in creative or primary text) and link to the page root; the first two screens a cold click sees are product and method, not money.
  2. If Meta rejects an ad citing the landing page, the fallback is a copy of the page without the three money sections at `/start/` (same files, delete three sections, `noindex`), used only as the ad destination. Build it only if a rejection names the page; it takes ten minutes.
  3. TikTok and YouTube organic traffic goes to the full page regardless.
  4. Whop's checkout is unaffected; Whop allows results content on store pages.

## 2. Who lands and what they need to see first

Three arrivals, same page:

| Arrival | State of mind | First screen must answer |
|---|---|---|
| Meta/IG ad click (cold) | "Another indicator guru?" Skeptical, on a phone, 3-second patience | What is it exactly, what is on the chart, who is this person, is there a way to look without paying |
| TikTok/IG bio click (warm, has seen clips) | "Where do I get the thing from the video?" | The product name they saw (MNQ Master Trader / MGC Master Trader), price, a button |
| Discord/YouTube referral (hot) | Already convinced, wants the checkout | Join button above the fold, trial terms, what they need at checkout (TradingView + Discord usernames) |

Design response: hero = specific noun phrase (the two named indicators + course + desk), one screenshot of the real chart, two buttons (Join on Whop / Look around the Discord first), one trust line (5.0 on Whop from 11 reviews, 76 members). Pricing is one scroll away and linked from the nav.

## 3. Objections in order of frequency, and where each is answered

1. "Is this a signals service?" → "Not signals" block under the hero. The indicators draw levels; the trader decides. Course teaches the decision.
2. "Will it work for me / is it only for pros?" → Who it's for / not for section. Honest exclusions.
3. "Does he actually trade this?" → Livestreams + documented trade books line; YouTube link; Discord door.
4. "What does it cost and can I leave?" → Pricing card with trial, monthly, cancel-anytime and the 7-day money-back as Whop states it.
5. "Do I need TradingView Premium?" → FAQ.
6. "I don't have time to learn a whole course." → Course outline shows 10 chapters; "Start with the free Chapter 1" path.
7. "What if I'm not sure?" → Discord (secondary CTA, never hidden), AFT Challenge (free, no signup), free Chapter 1 on Whop.

## 4. CTA ladder (every exit is tracked)

| Intent | Button | Destination | Pixel event |
|---|---|---|---|
| Buy | Join on Whop | Whop product page with `?a=shogotrades` + UTMs | InitiateCheckout (value = plan price) |
| Try | Start the free trial | Same Whop product (trial button is Whop's) | InitiateCheckout |
| Browse | Look around the Discord first | discord.gg/aft-traders | Lead |
| Learn free | Free Chapter 1 / AFT Challenge | Whop free plan / /challenge/ | Lead / ViewContent |

Affiliate attribution: `?a=shogotrades` is appended by script to every Whop link at click time, never shown in copy. Whop's cookie window is 30 days. If a visitor arrives from another affiliate's link first, Whop's attribution rules decide; nothing on the page overrides that.

## 5. Retargeting path without a backend

The site is static (GitHub Pages). Lead capture therefore runs through Whop (free plan collects the email in Whop, where Collin can email them) and Discord. Meta custom audiences are built from Pixel events: all visitors 30d, ViewContent (pricing seen) 30d, InitiateCheckout-without-Purchase 7d. Purchase comes back from Whop's own Meta integration (Pixel ID pasted in Whop's Checkout settings), which fires Purchase server-side; the page never fires Purchase itself.

## 6. What would make this page lie, and the guard against each

- A review that implies earnings ("made me money", "turned my eval around") → excluded from the page; FTC endorsement rules require typical-results disclosure for earnings claims. Only tool-quality reviews are shown, verbatim, with the Whop handle and purchase-timing line Whop displays.
- Screenshots of an old build or with a P&L table → only current Master Trader screenshots supplied by Collin, with the stats table hidden.
- Member counts and ratings → copied from the public Whop page on the date stated in the runbook; re-check monthly.
- "Future releases: bots" → stated as "as they pass testing", no dates, no performance.

## 7. Kill criteria for the first $300 of Meta spend

- Landing-page CTR from ad < 0.8% after 3,000 impressions → creative problem, not page.
- Page → Whop click rate < 8% on mobile → hero/pricing problem; test moving pricing up.
- Whop click → trial start < 15% → offer or Whop page problem (check what Whop shows after Oct 31 Founders Pack expiry).
- Any Meta rejection citing "investment" → stop, appeal once, do not rewrite the ad to hide it.
