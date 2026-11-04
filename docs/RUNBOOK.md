# allfluencetrading.com — runbook

Static site on GitHub Pages from the `main` branch of `Collinshogo/Public` (custom domain via `CNAME`; GoDaddy DNS: A records to GitHub's four IPs, `www` CNAME to `collinshogo.github.io`, both verified 2026-11-04). Every push to `main` is live within a minute or two. There is no build step.

## Files

| File | What it is |
|---|---|
| `index.html` | The landing page. All copy lives here. |
| `config.js` | IDs, links, prices. **Edit this first for any change to links, pixel or pricing.** |
| `tracking.js` | Meta Pixel + optional CAPI relay + optional Whop pixel; UTM and affiliate pass-through on Whop links. |
| `style.css` | Styles. Mobile-first; the sticky bottom CTA shows under 768px. |
| `challenge/index.html` | The AFT Challenge (free program). Old root URL now redirects via the 404 page text; sitemap updated. |
| `legal/index.html` | Risk disclosure, terms, privacy. |
| `assets/` | Screenshots, OG image (`og.png`, 1200x630), icons. `tracking/make_assets.py` regenerates the OG image, icons and the **placeholder** chart panels. |
| `assets/proof/` | Member payout, P&L and testimonial screenshots captured from the AFT Discord on 2026-11-04 (JPEG, ≤150 KB each). Used by the `proof`, `pnl` and `voices` sections. |
| `tracking/capi-worker.js` | Cloudflare Worker for the Conversions API (optional, recommended). |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Search and AI-engine files. Update `sitemap.xml` `lastmod` when a page changes. |
| `docs/FUNNEL_WARGAME.md`, `docs/AD_PLAN.md` | Why the page is shaped this way; the Meta plan. |

## 1. Go-live checklist (nothing is live until `main` is pushed)

1. **Screenshots.** Replace the four placeholder PNGs in `assets/` with real TradingView captures, same filenames, 16:10 (1600x1000 works), **stats/P&L table hidden**, current builds only: `hero-mnq-master-trader.png` (MNQ 1m with a drawn setup), `mnq-master-trader.png` (MNQ 5m), `mgc-master-trader.png` (MGC 5m, London setup), `all-fluence-indicator.png`. Keep each under ~300 KB (export PNG, or run through squoosh.app). The placeholders say "SCREENSHOT PENDING" in red; the page must not ship with them.
2. **Pixel.** Put the Meta Pixel ID in `config.js` → `metaPixelId`. Use an AFT-owned pixel, not the Etchling one (two exist under the Etchling business today: "Etchling Pixel" and "Collin Muldowney's Pixel"; create "AFT Pixel" in Events Manager under the AFT ad account if neither is meant for AFT).
3. **Whop.** Confirm the offer still matches `config.js → plan` and the pricing card (the Whop page said "Founders Pack available through October 31, 2026"; if the bundle, price or trial changed, update `config.js`, the pricing card in `index.html`, the Product JSON-LD offers and the FAQ answer on refunds). Confirm the three Whop URLs resolve: store, product, free Chapter 1.
4. **Purchase tracking on Whop.** Whop dashboard → Settings → Checkout → paste the same Meta Pixel ID. Whop then fires Purchase (and its checkout events) server-side for every sale; the page never fires Purchase itself, so there is no double count.
5. **Discord.** Confirm `discord.gg/aft-traders` is a non-expiring invite with the right landing channel.
6. **Book screenshots.** The `book` section shows the MNQ Book and MGC Book numbers as text. To add the two Strategy Tester screenshots Collin sent (last 365 days, MNQ 1K start / MGC 25K start), save them as `assets/book-mnq.png` and `assets/book-mgc.png` (≤300 KB) and add a `<figure class="shot">` under each `.card.book`. Update the numbers whenever the Books are re-run; the section says "as of November 2026".
7. **Member permission.** Every image in `assets/proof/` was posted by the member in the AFT Discord. Collin decided on 2026-11-04 to show them publicly. Before go-live, message the members whose full legal name is on a certificate (Angel Galarza, Phillip White, Crystal Marie Miller, Scott, Mubarak) and anyone who may prefer a handle; remove any image on request (delete the `<figure>` and the file).
8. **Merge** the `landing-page` branch into `main` (PR in the repo). GitHub Pages redeploys automatically. Check https://allfluencetrading.com/ on a phone within five minutes.
9. **Verify events** (section 4). Then submit the sitemap in Google Search Console (domain property for allfluencetrading.com; verify via a GoDaddy TXT record).

## 2. Editing copy

Open `index.html`. Sections are marked with `<section id="...">`: `what`, `indicators`, `method`, `course`, `reviews`, `proof` (payouts), `pnl`, `voices` (Discord quotes), `book`, `fit`, `pricing`, `faq`, `free`. Keep one `<h1>`. If you change an FAQ answer, change the same text in the `FAQPage` JSON-LD in `<head>` so the two match. Push to `main`.

Words to keep out of **ads** (Meta financial-services review): profit, income, payout, returns, ROI, passive, signals, funded, "make money", any dollar result, any P&L image. The page itself now carries payouts and P&L by Collin's decision (2026-11-04); the ad creative must not, and the ad's first screen on the page (hero, what, indicators) stays free of them. See `docs/FUNNEL_WARGAME.md` section 1 for the risk and the fallback.

## 3. Swapping testimonials, payouts and P&L

Whop reviews are the `<article class="review">` blocks in the `reviews` section. Discord material lives in three sections: `proof` (payout screenshots), `pnl` (P&L, evaluations, before/after) and `voices` (verbatim quotes). Rules:
- Verbatim text only. Truncate with "…" if long; never reword. Keep the Whop handle and the "written N after purchase" line Whop shows.
- Only reviews about the tool or the teaching. **Do not** use reviews that state or imply earnings (today excluded for that reason: "Made me money even before I bought it" and the eval-pass story in the f8Ed Cross review's second half).
- Discord posts: verbatim, dated, the display name or handle as the member uses it in the server; typos stay. One `<figure class="proof">` per image: `<a href data-lb><img></a><figcaption><b>Name</b> · date · what it is<span>“their words”</span></figcaption>`. Images go in `assets/proof/`, long side ≤1100 px, JPEG ≤150 KB.
- Never a bank screenshot that shows an account number, address or email; prefer the prop firm's certificate or dashboard. Left out for that reason on 2026-11-04: the Rise email, the Fednow deposit, the Apex bank transaction, the Lucid instant-payment bank line.
- Every proof section keeps its disclaimer paragraph (not typical, not a promise, simulated funded accounts, risk of loss). Do not add totals, averages or "members made $X" lines; each item stays one person, one account.
- Member permission: see go-live step 7. Keep a list of who was asked and when in the Discord mod channel.
- Downloads from discord.com are blocked in Collin's Chrome profile (the originals were captured by zoom instead). To get originals: open the attachment in Discord, click the blocked-download icon in the address bar and choose "Always allow downloads from discord.com".
- Update the trust line in the hero (rating, review count, member count) from the public Whop page and note the date in a commit message. Last read: 5.0 / 11 reviews / 76 paid members on 2026-11-04; "700+ in the Discord" is from the Oct 1, 2026 server announcement ("700 People in here").

## 4. Reading the events

Page events (Meta Pixel, browser) with `eventID` on each:

| Event | When | Where set |
|---|---|---|
| PageView | every page load | `tracking.js` |
| ViewContent | pricing card ≥40% in view, once per load | `tracking.js` `watchPricing()` |
| InitiateCheckout | click on any Whop join/trial button (`data-ev="checkout"`), value = plan price | link attributes in `index.html` |
| Lead | click on Discord or free Chapter 1 (`data-ev="lead"`) | link attributes |
| Purchase | fired by Whop (Pixel ID in Whop Checkout settings), not by the page | Whop |

Where to look: Events Manager → the pixel → Overview (last 24h counts per event), Test events (live, with your browser's test code), Diagnostics. In Ads Manager, add the columns "Results", "Cost per result", "Leads", "Checkouts initiated", "Purchases". Whop's own numbers: Whop dashboard → Analytics (the `utm_source=allfluencetrading.com` tag plus any ad UTMs are on every link the page sends to Whop).

Verify after go-live: open the site with `?utm_source=test` in a normal browser, Events Manager → Test events → enter the test code in the URL as `&test_event_code=TESTxxxx`? No: for the browser pixel, Test events picks up your own browser automatically once you open the site from the Test events tab's "Open website" box. Expect PageView, then ViewContent on scrolling to pricing, then InitiateCheckout on clicking the Whop button, then Lead on the Discord button. For CAPI, set `META_TEST_EVENT_CODE` on the Worker (section 5) and watch the same events arrive marked "Server" with "Deduplicated" status.

## 5. Conversions API (optional, 10 minutes)

The site is static, so server events go through a tiny Cloudflare Worker: `tracking/capi-worker.js` (free tier). Follow the header comment in that file (wrangler login, three secrets, deploy), then put the Worker URL into `config.js → capiEndpoint`. The page then sends every event to both the Pixel and the Worker with the same `event_id`; Meta dedupes. No personal data is sent; only IP, user agent, `_fbp`/`_fbc` cookies and the event.

## 6. UTM convention for ads and bios

`https://allfluencetrading.com/?utm_source=meta&utm_medium=paid&utm_campaign=<campaign>&utm_content=<ad name>`
Bios: `?utm_source=tiktok&utm_medium=bio` and `?utm_source=instagram&utm_medium=bio`. YouTube descriptions: `?utm_source=youtube&utm_medium=description`. The page stores these for the session and forwards them (plus `a=shogotrades`) to every Whop link.

## 7. Local preview

```bash
python -m http.server 8080 --directory .
```
Then open http://localhost:8080/. The Pixel does not load until `metaPixelId` is set.

## 8. Things that will bite

- GitHub Pages caches hard; after a push, check with a private window or add `?v=2`.
- The OG image is cached by Meta and Discord; after changing `assets/og.png`, run the URL through developers.facebook.com/tools/debug/ and press "Scrape again".
- If `www.allfluencetrading.com` ever 404s, re-add the custom domain in the repo's Settings → Pages (the `CNAME` file must stay in the repo root).
- Whop reviews, member count and the trial/refund terms change on Whop's side; re-read them monthly.
