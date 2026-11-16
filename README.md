# -token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/wellforever1024/-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/wellforever1024/-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A radar for pre-token protocols: every protocol on the snapshot's watchlist
(TVL ≥ $50M, no token on record), plus every pre-token protocol below that
floor that passes the watchlist's own exclusion rules — 178 rows, ranked by
implied launch value. Live-token protocols are set aside with their market
caps shown, never mixed into the ranking.

## The model (radar-2)

Implied value is fitted from the snapshot's own live-token protocols. On the
92 like-for-like live tokens, log10(market cap) against log10(TVL) fits

    log10(mcap) = 3.957838 + 0.394000 × log10(TVL)

and the full formula was blind-tested on them in five folds: median miss
×3.57, a third of predictions within ×2, 45% within ×3. The starter's flat
0.25 × TVL scores ×4.46 on the same test. Every value carries the blind
test's middle-half band (×0.31 to ×4.98). Growth and age adjustments are
bounded (0.85–1.30× and 0.80–1.00×) so they move a protocol a little, never
overturn what its size says. No protocol name is ever special-cased.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

`main.ts` reads the sealed snapshot, writes `board.json` (the ranked rows),
`data.js` (the dashboard's dataset), copies `dashboard/` and `screenshots/`,
and writes `dossier.json` last with the kit's own `buildDossier`. Running it
twice writes the same bytes twice. No network, no clock, no randomness.

Screenshots are taken from the built dashboard with headless Chromium at
1440×900: the board, one protocol's detail view, and one filtered view.

## Files

- `main.ts` — entrypoint
- `lib/model.ts` — the model, the board, the farm plans
- `dashboard/` — the page (index.html, app.css, app.js)
- `screenshots/` — three screenshots of the page
- `vendor/makefun-board.ts` — the kit's dossier library, verbatim

---

<sub>Entered on [make.fun](https://make.fun/?ref=akq7csc6&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
