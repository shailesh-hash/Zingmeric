# Quantitative Strategy Research Template

> **Purpose:** Evaluate options and equity income strategies scientifically before implementation or deployment.  
> **Usage:** Copy this file to `research/<strategy-name>-v<version>.md` (e.g. `research/bull-put-v2.md`) and complete every section.  
> **Platform:** Zingmeric unified backtest engine, `BacktestReportService`, forward-test engine.

---

## Research Metadata

| Field | Value |
|-------|-------|
| **Strategy** | _Bull Put Spread / Iron Condor / Covered Call / Wheel_ |
| **Version** | _v1_ |
| **Researcher** | |
| **Date opened** | |
| **Date closed** | |
| **Status** | _Draft / In Review / Accepted / Rejected_ |
| **Underlying(s)** | _NIFTY / BANKNIFTY / single equity_ |
| **Data period** | _YYYY-MM-DD → YYYY-MM-DD_ |
| **Implementation ref** | _e.g. `src/strategies/spreads/bull-put-spread-v1.strategy.ts`_ |

### Research Question

State one falsifiable question this study answers:

> _Example: Does a 0.15–0.20 delta bull put spread on NIFTY weekly expiries, with 50% profit target and 1% account risk sizing, achieve Sharpe > 1.0 and max drawdown < 15% over 2019–2024?_

### Success Criteria (decide before backtesting)

| Criterion | Threshold | Weight |
|-----------|-----------|--------|
| Sharpe ratio | ≥ _1.0_ | Required |
| Sortino ratio | ≥ _1.2_ | Required |
| Max drawdown | ≤ _15%_ | Required |
| Win rate | ≥ _60%_ | Optional |
| Profit factor | ≥ _1.5_ | Optional |
| Minimum trades | ≥ _30_ | Required (statistical power) |

**Primary objective:** Optimize for _lowest drawdown and highest risk-adjusted return_, not maximum raw return (per `research.md`).

---

## 1. Hypothesis

### 1.1 Economic Rationale

Why should this strategy earn a premium after costs?

- **Edge source:** _volatility risk premium / mean reversion / theta decay / dividend capture / …_
- **Who is on the other side:** _retail buyers of OTM options / hedgers / …_
- **Why the edge persists:** _behavioral bias / structural flow / margin constraints / …_

### 1.2 Formal Hypothesis

| | Statement |
|---|-----------|
| **H₀ (null)** | Strategy risk-adjusted return ≤ buy-and-hold benchmark after costs |
| **H₁ (alternative)** | Strategy Sharpe ratio > benchmark Sharpe at α = 0.05 |

### 1.3 Testable Predictions

List 3–5 predictions that would **confirm** or **refute** the hypothesis:

1. _Win rate exceeds 55% in low-VIX regimes_
2. _Average winner / average loser ratio > 0.35_
3. _Max consecutive losses ≤ 5_
4. _Strategy underperforms in VIX > 25 regimes_
5. _…_

### 1.4 Falsification Conditions

What result would cause you to **reject** this strategy?

- Max drawdown > _15%_ in any rolling 12-month window
- Sharpe < _0.5_ on out-of-sample period
- Edge disappears when slippage doubled
- _…_

---

## 2. Market Regime

Classify when the strategy is expected to work and when it should be **turned off**.

### 2.1 Regime Definitions

| Regime | Indicator | Threshold | Expected strategy behavior |
|--------|-----------|-----------|----------------------------|
| Low vol | India VIX / realized vol (20d) | < _14_ | Favorable — sell premium |
| Normal | India VIX | _14–22_ | Baseline |
| High vol | India VIX | > _22_ | Reduce size or no new trades |
| Trend up | NIFTY vs 200 SMA | Price > SMA | _Strategy-specific_ |
| Trend down | NIFTY vs 200 SMA | Price < SMA | _Strategy-specific_ |
| Event risk | RBI policy / budget / expiry week | Calendar | No entry _N_ days before |

### 2.2 Regime Filter (if any)

- **Filter applied in backtest?** _Yes / No_
- **Rule:** _e.g. Skip entry when VIX > 20 or when underlying below 200 SMA_
- **Rationale:** _…_

### 2.3 Regime-Segmented Results (fill after backtest)

| Regime | Trades | Win % | Avg PnL | Sharpe | Max DD |
|--------|--------|-------|---------|--------|--------|
| Low vol | | | | | |
| Normal | | | | | |
| High vol | | | | | |
| Up trend | | | | | |
| Down trend | | | | | |

### 2.4 Benchmark

| Benchmark | Definition |
|-----------|------------|
| Primary | _NIFTY total return / risk-free + premium benchmark_ |
| Secondary | _Short straddle / cash / fixed deposit equivalent_ |

---

## 3. Entry Criteria

Document rules precisely enough to implement in code without ambiguity.

### 3.1 Instrument Selection

| Parameter | Value |
|-----------|-------|
| Underlying | |
| Expiry preference | _Weekly / Monthly / 30–45 DTE_ |
| Minimum days to expiry | |
| Maximum days to expiry | |
| Liquidity filter | _Min OI / min volume / max bid-ask spread %_ |

### 3.2 Strike Selection

| Leg | Side | Option type | Delta target | Delta range | Notes |
|-----|------|-------------|--------------|-------------|-------|
| _Short_ | Sell | Put/Call | | | |
| _Long_ | Buy | Put/Call | | | |
| _…_ | | | | | |

**Structural constraints:**

- [ ] Spread width ≥ minimum (_e.g. 50 points NIFTY_)
- [ ] Short strike OTM relative to spot (_specify_)
- [ ] No entry if credit ≤ 0
- [ ] No overlapping positions on same underlying/expiry

### 3.3 Timing

| Rule | Value |
|------|-------|
| Entry time of day | _e.g. 09:20 IST after open settle_ |
| Entry day | _e.g. Monday–Wednesday only_ |
| Re-entry after stop | _Cooldown N days / none_ |
| Max concurrent positions | _1 / N_ |

### 3.4 Entry Checklist (pre-trade)

- [ ] Option chain available for snapshot
- [ ] Account equity known for sizing
- [ ] Risk engine: trade risk ≤ 1%, hard stop ≤ 2%
- [ ] Portfolio drawdown < 15% (no new trades if exceeded)
- [ ] Regime filter passed
- [ ] No open position for this strategy on same underlying

---

## 4. Exit Criteria

### 4.1 Profit Target

| Rule | Value | Rationale |
|------|-------|-----------|
| Profit target | _e.g. 50% of max profit (close at 50% of entry credit)_ | Theta capture vs tail risk |
| Calculation | _closeCost ≤ entryCredit × (1 − profitTargetPct)_ | |

### 4.2 Stop Loss

| Rule | Value | Rationale |
|------|-------|-----------|
| Stop type | _Premium multiple / max-loss % / underlying breach_ | |
| Stop level | _e.g. 2× entry credit debit to close_ | |
| Calculation | _closeCost ≥ entryCredit × stopLossMultiple_ | |

> **Note:** Premium-based stops differ from max-loss-based stops on wide spreads. Document which basis you use and why.

### 4.3 Time-Based Exit

| Rule | Value |
|------|-------|
| Exit at expiry | _Yes — intrinsic settlement / No_ |
| Exit N days before expiry | _e.g. 0 (hold to expiry) / 1 / 5_ |
| Exit if DTE < | |

### 4.4 Other Exits

| Trigger | Action |
|---------|--------|
| Regime change (VIX spike) | _Close / hold / reduce_ |
| Rolling | _Roll to next expiry when …_ |
| Assignment (Wheel / Covered Call) | _Accept shares / buy back call_ |
| Manual override | _Never (per rules.md)_ |

### 4.5 Exit Priority

When multiple exits trigger on the same bar, document precedence:

1. _Stop loss_
2. _Profit target_
3. _Expiry_
4. _Regime filter_

---

## 5. Position Sizing

Align with `rules.md`: **1% account risk per trade**, **2% hard limit**, drawdown rules at 10% / 15%.

### 5.1 Sizing Method

| Method | Formula | Used? |
|--------|---------|-------|
| Fixed lot | _N lots regardless of equity_ | |
| Fixed fractional | _X% of equity in notional_ | |
| Defined-risk budget | _qty = floor((equity × maxRiskPct) / (maxLossPerUnit × lotSize)) × lotSize_ | ✓ recommended |
| Kelly / half-Kelly | _f* = edge / variance_ | _Research only — not live without shrinkage_ |

### 5.2 Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| maxRiskPct | _0.01 (1%)_ | `rules.md` |
| lotSize | _50 (NIFTY)_ | Exchange |
| maxLossPerUnit | _spread width − credit_ | Per trade |
| minQuantity | _1 lot_ | |
| maxQuantity cap | _optional_ | |

### 5.3 Drawdown Response

| Drawdown | Action per `rules.md` |
|----------|----------------------|
| ≥ 10% | Reduce size 50% |
| ≥ 15% | Stop new trades; manual review |

### 5.4 Sizing Sanity Checks

- [ ] Quantity always rounds to lot size
- [ ] Zero quantity → skip trade (do not force 1 lot)
- [ ] Sizing uses **confirmed equity**, not stale snapshot
- [ ] Margin requirement ≤ available margin

---

## 6. Expected Outcome

Fill **before** running the backtest to avoid hindsight bias.

### 6.1 Point Estimates (prior)

| Metric | Expected range | Confidence |
|--------|----------------|------------|
| Annualized return | _X% – Y%_ | Low / Med / High |
| Sharpe ratio | _X – Y_ | |
| Max drawdown | _X% – Y%_ | |
| Win rate | _X% – Y%_ | |
| Avg trades / month | _N_ | |
| Avg hold time (days) | _N_ | |

### 6.2 Distribution Assumptions

- Return distribution: _normal / skewed negative (short vol) / …_
- Tail risk: _expect occasional 2–3× premium loss events_
- Correlation to benchmark: _low / negative in calm markets_

### 6.3 Cost Assumptions

| Cost component | Assumption |
|----------------|------------|
| Brokerage | _₹20/order or per platform_ |
| STT | _As per NSE schedule_ |
| Slippage | _0 / 1 tick / 0.5% of premium_ |
| includeCosts in backtest | _true / false_ |

### 6.4 Known Limitations of Model

- Same-bar signal + fill at close (_document look-ahead risk_)
- Mid-quote fills (_no bid/ask_)
- No partial fills
- No assignment/exercise modeling (_unless specified_)
- _…_

---

## 7. Backtest Results

### 7.1 Configuration

| Setting | Value |
|---------|-------|
| Engine | _UnifiedBacktestEngine / legacy — specify_ |
| Strategy class | _e.g. `BullPutSpreadStrategyV1`_ |
| Date range (in-sample) | |
| Date range (out-of-sample) | |
| Initial capital | _₹_ |
| riskConfig | _Production 1/2/15% or permissive — specify_ |
| Data source | _Prisma / CSV / synthetic events_ |
| Command / example | _e.g. `examples/bull-put-spread-v1-backtest.example.ts`_ |

### 7.2 Summary Metrics

| Metric | In-sample | Out-of-sample | Benchmark |
|--------|-----------|---------------|-----------|
| Total return | | | |
| CAGR | | | |
| Sharpe ratio | | | |
| Sortino ratio | | | |
| Max drawdown | | | |
| Calmar ratio | | | |
| Win rate | | | |
| Profit factor | | | |
| Total trades | | | |
| Avg win | | | |
| Avg loss | | | |
| Max consecutive losses | | | |
| Expectancy per trade | | | |

### 7.3 Statistical Tests

| Test | Result | p-value | Conclusion |
|------|--------|---------|------------|
| Sharpe vs benchmark (Jobson-Korkie / bootstrap) | | | |
| Mean return ≠ 0 (t-test) | | | |
| Out-of-sample degradation | _IS Sharpe − OOS Sharpe_ | | Acceptable if < _0.3_ |

### 7.4 Equity Curve

_Paste chart or link to exported JSON/CSV from `BacktestReportService`._

```
Path: reports/<strategy>-<date>.json
```

### 7.5 Trade Log Sample

| # | Entry | Exit | Credit | Close cost | PnL | Exit reason | DTE |
|---|-------|------|--------|------------|-----|-------------|-----|
| 1 | | | | | | | |
| 2 | | | | | | | |

### 7.6 Sensitivity Analysis

Vary one parameter at a time; record Sharpe and max DD.

| Parameter | Low | Base | High | Sharpe (L/B/H) | Max DD (L/B/H) |
|-----------|-----|------|------|----------------|----------------|
| Short delta | | | | | |
| Profit target % | | | | | |
| Stop multiple | | | | | |
| maxRiskPct | | | | | |

### 7.7 Forward Test (if run)

| Metric | Backtest | Forward test | Delta |
|--------|----------|--------------|-------|
| Avg slippage | _assumed_ | _actual_ | |
| Win rate | | | |
| Avg PnL/trade | | | |

---

## 8. Drawdown Analysis

### 8.1 Drawdown Episodes

| # | Peak date | Trough date | Depth % | Duration (days) | Recovery (days) | Cause |
|---|-----------|-------------|---------|-----------------|-----------------|-------|
| 1 | | | | | | _e.g. COVID crash, VIX spike_ |
| 2 | | | | | | |

### 8.2 Rolling Drawdown

| Window | Max DD | Date |
|--------|--------|------|
| 12-month rolling | | |
| 24-month rolling | | |

### 8.3 Underwater Chart

_Describe or attach time spent underwater vs new highs._

### 8.4 Drawdown vs Rules

| Rule (`rules.md`) | Triggered? | Dates | System response | Actual response |
|-------------------|------------|-------|-----------------|-----------------|
| 10% → reduce size 50% | | | | |
| 15% → stop new trades | | | | |

### 8.5 Tail Events

Worst _N_ trades:

| Rank | Date | PnL | % of equity | Setup description |
|------|------|-----|-------------|-------------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## 9. Failure Analysis

### 9.1 Losing Trade Categories

| Category | Count | % of losses | Avg loss | Root cause |
|----------|-------|-------------|----------|------------|
| Stop hit | | | | |
| Expiry max loss | | | | |
| Gap through short strike | | | | |
| Whipsaw / quick reversal | | | | |
| Liquidity / wide spread | | | | |
| Regime misclassification | | | | |

### 9.2 Hypothesis Violations

Did any **falsification conditions** (Section 1.4) occur?

- [ ] Yes — strategy **rejected**
- [ ] No — proceed with caveats: _…_

### 9.3 Implementation Bugs vs Strategy Flaws

Separate backtest artifacts from economic failure:

| Issue | Type | Evidence | Fix |
|-------|------|----------|-----|
| _e.g. same-bar look-ahead_ | Implementation | OOS Sharpe collapse with next-bar fill | Re-run with conservative fill |
| _e.g. VIX spike cluster_ | Strategy | Losses cluster Aug 2024 | Add regime filter |

### 9.4 Comparison to Prior Version

| Metric | Prior version | This version | Change |
|--------|---------------|--------------|--------|
| Sharpe | | | |
| Max DD | | | |
| Trades | | | |

---

## 10. Improvement Ideas

Prioritize by **impact × confidence / effort**.

| # | Idea | Hypothesis | Test design | Priority |
|---|------|------------|-------------|----------|
| 1 | _Add VIX regime filter_ | Reduces tail losses in high vol | Segment backtest by VIX | P0 |
| 2 | _Widen long put delta to 0.03–0.08_ | Improves win rate with small Sharpe cost | Sensitivity §7.6 | P1 |
| 3 | _Exit 1 day before expiry_ | Avoids gamma risk | A/B backtest | P2 |
| 4 | _…_ | | | |

### 10.1 Rejected Ideas (document why)

| Idea | Reason rejected |
|------|-----------------|
| _Martingale after loss_ | Violates risk rules |
| _…_ | |

### 10.2 Next Research Cycle

- [ ] Version bump: _v(N+1)_
- [ ] Out-of-sample period extension: _dates_
- [ ] Forward test duration: _N days_
- [ ] Paper trade before live: _yes/no_

---

## Appendix A — Strategy-Specific Starting Points

Use these as defaults when opening a new research file. Override with evidence.

### A.1 Bull Put Spread

| Section | Starting point |
|---------|----------------|
| **Hypothesis** | Theta decay on OTM put spreads earns premium in calm-to-normal markets; long put caps tail risk |
| **Market regime** | Best when VIX 12–20; avoid entry VIX > 22 |
| **Entry** | Short put Δ 0.15–0.20, long put Δ 0.05–0.10; credit > 0; weekly/monthly expiry |
| **Exit** | 50% profit target; 2× premium stop; expiry exit |
| **Sizing** | 1% max loss per trade via `calculateDefinedRiskQuantity` |
| **Implementation** | `BullPutSpreadStrategyV1`, `DEFAULT_BULL_PUT_SPREAD_V1_CONFIG` |

### A.2 Iron Condor

| Section | Starting point |
|---------|----------------|
| **Hypothesis** | Combined put + call premium harvests range-bound markets; dual wings define risk |
| **Market regime** | Best in low-vol, range-bound NIFTY; avoid strong trend days |
| **Entry** | Put spread Δ 0.15/0.05 + call spread Δ 0.15/0.05; symmetric wings |
| **Exit** | 50% of total credit; 2× credit stop on combined close cost |
| **Sizing** | maxLoss = max(wing width) − credit; apply 1% rule |
| **Implementation** | `IronCondorStrategy`, `DEFAULT_IRON_CONDOR_CONFIG` |

### A.3 Covered Call

| Section | Starting point |
|---------|----------------|
| **Hypothesis** | Long stock + short OTM call enhances yield vs buy-and-hold in flat-to-rising markets |
| **Market regime** | Mildly bullish or neutral; avoid strong downtrends without hedge |
| **Entry** | Buy stock at market; sell call Δ ~0.30; strike must be above spot |
| **Exit** | 50% call premium profit; 2× premium stop; roll or accept assignment |
| **Sizing** | 1 lot stock + 1 lot short call; equity notional = spot × lot size |
| **Implementation** | `CoveredCallStrategy`, composite OPEN_EQUITY + OPEN_DEFINED_RISK |

### A.4 Wheel Strategy

| Section | Starting point |
|---------|----------------|
| **Hypothesis** | Repeated cash-secured puts → assignment → covered calls compounds premium income with defined entry prices |
| **Market regime** | Neutral to mildly bullish on single names; avoid earnings without rule |
| **Entry (Phase 1 — CSP)** | Sell put at Δ ~0.30 on stocks you want to own; cash-secured |
| **Entry (Phase 2 — CC)** | On assignment, sell call Δ ~0.30 above cost basis |
| **Exit** | CSP: 50% profit / 2× stop / assignment; CC: same as covered call |
| **Sizing** | Cash secured = strike × 100 × lots; risk ≤ 1% if using spread variant |
| **Implementation** | _Not yet implemented — research first; compose CSP + Covered Call phases_ |

---

## Appendix B — Research Workflow

```
1. Copy ResearchTemplate.md → research/<strategy>-v<N>.md
2. Complete Sections 1–6 BEFORE backtest (pre-registration)
3. Run UnifiedBacktestEngine → export via BacktestReportService (JSON + CSV)
4. Complete Sections 7–9 with results
5. Peer review: second person checks §1.4 falsification and §7.3 statistics
6. Decision: Accept / Reject / Iterate (§10)
7. If accepted: implement or update strategy code + add tests
8. Forward test ≥ 20 sessions before live consideration
```

### Platform Commands

```bash
# Run example backtest
npx tsx examples/bull-put-spread-v1-backtest.example.ts

# Run full test suite
npm test

# Export report (programmatic)
# BacktestReportService.exportJson(report) / exportCsv(report)
```

### Related Documents

| Document | Purpose |
|----------|---------|
| `rules.md` | Risk limits and engineering standards |
| `PROJECT_REVIEW.md` | Known platform gaps affecting research validity |
| `docs/adrs/ADR-004-event-driven-backtest.md` | Backtest architecture |
| `research.md` | Portfolio-level research objectives |

---

## Appendix C — Review Checklist

Before marking research **Accepted**:

- [ ] Hypothesis stated before results (§1 vs §7 dates)
- [ ] Out-of-sample period held out and reported separately
- [ ] ≥ 30 trades in combined sample (or power analysis documented)
- [ ] Costs and slippage assumptions explicit (§6.3)
- [ ] Max drawdown within `rules.md` limits or exception documented
- [ ] Failure modes categorized (§9)
- [ ] Improvement ideas ranked (§10)
- [ ] Implementation reference updated or ticket created
- [ ] Known platform limitations from `PROJECT_REVIEW.md` acknowledged

---

_Template version: 1.0 — Zingmeric Quant Research Framework_
