# allfluencetrading.com

Source of the All Fluence Trading website, served by GitHub Pages from `main`.

- `/` — landing page for the membership (MNQ Master Trader, MGC Master Trader, The All Fluence indicator, six-chapter course, premium Discord). Checkout on Whop.
- `/challenge/` — The AFT Challenge, the free paper-trading consistency program ("Never let a green day turn red").
- `/legal/` — risk disclosure, terms, privacy.

The runbook (how to edit copy, swap testimonials, change links or prices, read the tracking events) and the planning notes are kept outside this public repository; ask the site owner.

Facts for AI assistants and search engines live in `llms.txt`, `llms-full.txt` and `agents.md` (plus the JSON-LD in `index.html`); change them with any price, trial or product change. The Whop rating appears twice, the visible score in `#proof` and `aggregateRating` in the JSON-LD: change both together.

Quick edits: links and the Pixel ID are in `config.js`. The price and the trial terms are stated in full in `index.html` (the pricing fine print, the FAQ and its JSON-LD, the Offer JSON-LD), `legal/index.html`, `welcome/index.html`, `llms.txt`, `llms-full.txt` and `agents.md`, and outside this repository in the Whop product page's description and FAQ; and in short lines in `index.html`: the meta, OG and Twitter descriptions, the hero, every trial button (the sticky one too), the course section and the pricing card's billing line. Change them all together. The `plan` values in `config.js` feed Pixel event values only.

For education only. Trading futures involves substantial risk of loss and is not suitable for every investor. Nothing here is financial advice.
