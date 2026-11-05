# PlanrPro — AdMetrics

E-commerce media planning calculator for Google & Meta Ads: forecasts, break-even
ROAS, blended MER, a three-scenario stress test, and a live currency converter.

Single self-contained `index.html` — no build step, no framework, no backend.

## Tabs

| Tab | What it answers |
|---|---|
| 🔵 **Google** | Budget + CPC + CTR + CVR + AOV → clicks, orders, revenue, ROAS, CPA, break-even ROAS, gross profit after ads, net revenue after returns, MER, KPI health, 3 scenarios |
| 🔴 **Meta** | Budget + CPM + CTR + CVR + AOV → impressions, reach, clicks, implied CPC, orders, ROAS, CPA, eCPM, hook-rate and frequency health, 3 scenarios |
| 🟡 **Universal** | Break-even ROAS from contribution margin, blended ROAS / MER across channels, AOV optimiser, live currency converter |
| 📚 **Learn** | Foundations, glossary, formulas, forecasting and India-specific strategy notes |

## Currency

- **Display currency** (header): INR, USD, EUR, GBP, AED, SGD, AUD, CAD. Switching it
  re-expresses every money field *and* output, so the plan keeps its real value
  instead of silently changing by a factor of 83. Percentages, counts and Quality
  Score are never converted.
- **Converter** (Universal tab): amount + from/to + swap, with the exact rate shown.
- **Rates** come from `open.er-api.com`, falling back to a jsDelivr currency feed;
  results are cached for 6 hours. If both are unreachable — offline, blocked, or a
  privacy extension — the app keeps working on a bundled estimate and says so in the
  status line, so it never shows a stale rate as if it were live.
- The ₹ figures in the **Learn** tab are deliberately left as rupees: they are
  India-specific benchmarks (₹999 free-shipping threshold, ₹5L revenue examples).

Your inputs, and the currency they were entered in, are saved to `localStorage` and
restored on reload. **Reset** clears a tab's fields.

## Run it

Open `index.html` directly, or serve it:

```bash
npm run serve      # http://localhost:8000
```

## Tests

```bash
npm install
npm test
```

96 assertions run the real page in jsdom — formulas, formatters, empty/reset states,
input clamping, persistence across reloads, and both the live and offline FX paths
(with a stubbed API). No network needed.

---

Built by Debanjan Das — Performance Marketer · Google & Meta Ads Specialist
