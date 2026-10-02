/**
 * Article registry.
 *
 * Each entry corresponds to a .txt source file under
 * public/assests/articles/. All content is inlined here so the build
 * stays fully static — no runtime file reads.
 */

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface Article {
  /** Route slug, matches the SLUG field in the source file. */
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  category: string;
  /** Full article body as a multiline string. */
  body: string;
  faqs: ArticleFaq[];
  /** Publication date (ISO string) used for schema.org datePublished. */
  datePublished: string;
}

export const ARTICLES: Article[] = [
  {
    slug: 'zerodha-groww-charges-stt-risk-reward',
    title: 'The Zerodha & Groww Charges Trap: How STT Destroys Your 1:2 Risk-to-Reward',
    metaTitle: 'The Zerodha & Groww Charges Trap: Real Net Risk-to-Reward',
    metaDescription:
      'Learn how STT, GST, brokerage, and exchange fees alter your 1:2 risk-to-reward ratio on Zerodha and Groww into a net loss.',
    keywords: 'Zerodha hidden charges, Groww intraday brokerage, STT tax intraday, real risk to reward calculator, net P&L India',
    category: 'Indian Markets',
    datePublished: '2025-09-01',
    body: `Many Indian retail traders review their trading log at the end of the month, see ₹10,000 in gross profits, and wonder why their Demat account balance has dropped. The culprit is execution friction: the combination of brokerage, Securities Transaction Tax (STT), Exchange Turnover Fees, GST, and Stamp Duty.

When trading through discount brokers like Zerodha, Groww, or Angel One, trading charts display gross risk-to-reward (R:R). They ignore statutory taxes that skew actual trade outcomes.

**Typical Trading Chart vs Actual Demat Account Reality**

| Metric | Gross (Chart) | Net (Real) |
|---|---|---|
| Target | +₹2,000 | +₹1,910 |
| Entry | ₹100 | ₹100 |
| Stop | −₹1,000 | −₹1,090 |
| R:R | 1:2.0 | **1:1.75** |

**The Mathematical Proof: Gross vs. Net Risk-to-Reward**

A standard chart calculator computes risk-to-reward using raw price levels:

> Gross R:R = (Target Price − Entry Price) / (Entry Price − Stop Loss Price)

To calculate True Net Risk-to-Reward, transaction charges must be factored into both execution legs:

- **Net Risk** = Gross Stop Loss + Buy Charges + Sell Charges (SL)
- **Net Reward** = Gross Target Profit − Buy Charges − Sell Charges (Target)
- **Net R:R** = Net Reward / Net Risk

**Case Study: A Standard Intraday Equity Trade**

Consider a trade taking 1,000 shares of an equity stock at ₹500 with a Stop Loss at ₹495 and a Target Price at ₹510.

- Gross Risk: ₹5.00 per share × 1,000 = ₹5,000
- Gross Reward: ₹10.00 per share × 1,000 = ₹10,000
- Apparent R:R: 1:2.00

**Breakdown of Indian Regulatory Charges (Intraday Equity):**

1. Brokerage: Flat ₹20 or 0.03% (lower) per leg = ₹40.00
2. STT (Securities Transaction Tax): 0.025% on Sell side only = ₹127.50 (Target Exit) / ₹123.75 (SL Exit)
3. Exchange Turnover Fee (NSE): 0.00297% on total turnover = ₹30.00 (Target Exit) / ₹29.55 (SL Exit)
4. GST: 18% on (Brokerage + Txn Fee + SEBI Fee) = ₹12.60 (Target Exit) / ₹12.52 (SL Exit)
5. Stamp Duty: 0.003% on Buy side only = ₹15.00

Total Transaction Friction: ₹225.10 (Target Exit) / ₹220.82 (SL Exit)

**The Real Net Outcome:**

- Actual Net Risk: ₹5,000 + ₹220.82 = **₹5,220.82**
- Actual Net Reward: ₹10,000 − ₹225.10 = **₹9,774.90**
- True Net Risk-to-Reward Ratio: 9,774.90 / 5,220.82 = **1:1.87**

On higher-frequency or lower-margin setups, friction is even more severe, often reducing theoretical 1:2 setups down to a net 1:1.3.`,
    faqs: [
      {
        question: 'Why is STT charged differently on Intraday vs. Delivery equity trades in India?',
        answer:
          'The Ministry of Finance levies Securities Transaction Tax (STT) based on holding duration. Equity Intraday trades incur 0.025% STT on the sell side only. Equity Delivery investments incur 0.1% STT on both buy and sell legs.',
      },
      {
        question: 'How do transaction charges affect the required break-even win rate?',
        answer:
          'A theoretical 1:2 R:R requires a 33.33% win rate to break even. When transaction charges lower the net ratio to 1:1.5, the required break-even win rate increases to 40.0%.',
      },
    ],
  },
  {
    slug: 'why-high-win-rate-strategies-fail',
    title: 'Why an 80% Win Rate Strategy Can Still Bankrupt Your Demat Account',
    metaTitle: 'Why an 80% Win Rate Strategy Fails in Trading | Expectancy Formula',
    metaDescription:
      'Discover why an 80% win rate strategy can lead to trading losses. Learn the mathematical expectancy formula and break-even win rate matrix.',
    keywords: 'win rate vs risk reward ratio, expectancy formula trading, break even win rate calculator, trading psychology profit',
    category: 'Risk Management',
    datePublished: '2025-09-05',
    body: `A common misconception among beginner traders is that a high win rate guarantees profitability. In financial markets, win rate is only one half of an equation. Without proper risk-to-reward calibration, an 80% win rate strategy can lead to total capital exhaustion.

**The High Win Rate Illusion**

| | Trades | Per Trade | Total |
|---|---|---|---|
| Winning | 8 | +₹1,000 | +₹8,000 |
| Losing | 2 | −₹5,000 | −₹10,000 |
| Gross P&L | | | **−₹2,000** |
| Execution Fees | | | −₹1,200 |
| **Net P&L** | | | **−₹3,200 LOSS** |

**The Expectancy Formula**

Mathematical expectancy defines the average amount a trader can expect to win (or lose) per rupee risked over a sample size of trades:

> E = (W × R_net) − ((1 − W) × 1)

Where:
- **E** = Mathematical Expectancy per trade (in R-multiples)
- **W** = Win Rate (expressed as a decimal)
- **R_net** = Net Risk-to-Reward Ratio (Net Reward / Net Risk)

If E > 0, the trading system possesses a positive statistical edge. If E < 0, the system will deplete capital over time regardless of how frequently individual trades win.

**Comparing Three Trading Strategies**

| Strategy | Win Rate | Net R:R | Avg Win | Avg Loss | Expectancy | Net P&L (100 Trades) |
|---|---|---|---|---|---|---|
| A – High Win Rate | 80% | 1:0.25 | ₹250 | ₹1,000 | ₹0.00 | ₹0 (−Fees = Net Loss) |
| B – Balanced | 50% | 1:1.50 | ₹1,500 | ₹1,000 | +₹250 | **+₹25,000** |
| C – Asymmetric | 30% | 1:3.00 | ₹3,000 | ₹1,000 | +₹200 | **+₹20,000** |

**The Break-Even Win Rate Matrix**

> Break-Even Win Rate (%) = (1 / (1 + R_net)) × 100

| Net R:R | Required Win Rate |
|---|---|
| 1:0.5 | 66.67% |
| 1:1.0 | 50.00% |
| 1:1.5 | 40.00% |
| 1:2.0 | 33.33% |
| 1:3.0 | 25.00% |`,
    faqs: [
      {
        question: 'Why do traders naturally gravitate toward high win rate strategies?',
        answer:
          'Cognitive psychology leads human brains to equate winning frequency with competence. Accepting small, frequent wins feels satisfying, but avoiding stop-losses often leads traders to hold losing positions too long, causing large drawdowns that erase multiple gains.',
      },
      {
        question: 'What is a sustainable net risk-to-reward ratio for day trading?',
        answer:
          'A net ratio between 1:1.5 and 1:2.5 (after accounting for execution charges) provides a sustainable balance for day trading. It allows profitability even if win rates fluctuate between 40% and 50%.',
      },
    ],
  },
  {
    slug: 'when-to-average-down-stocks',
    title: 'When to Average Down a Losing Stock (And When It Will Wipe You Out)',
    metaTitle: 'When to Average Down a Stock | Weighted Cost Basis Formula',
    metaDescription:
      'Learn how to calculate weighted average cost basis when scaling into stocks. Compare fixed share vs fixed capital averaging down strategies.',
    keywords: 'stock average price calculator, averaging down strategy, weighted average cost basis, break-even stock price',
    category: 'Position Sizing',
    datePublished: '2025-09-10',
    body: `Averaging down—purchasing additional shares of a declining stock to lower the average entry price—is a common technique in equity investing. When applied systematically to high-quality assets, it lowers the required break-even point. When applied recklessly to deteriorating assets, it concentrates risk and accelerates losses.

**Averaging Down Dynamics**

| Scenario | Action | New Average | Break-Even Needed | Capital Risk |
|---|---|---|---|---|
| Initial | 100 shares @ ₹100 | ₹100 | — | ₹10,000 |
| Stock drops to ₹60 | Do nothing | ₹100 | +66.7% | ₹10,000 |
| Stock drops to ₹60 | Buy 100 more @ ₹60 | **₹80** | **+33.3%** | ₹16,000 |

**The Mathematics of Weighted Average Price**

The cost basis of a scaled position is governed by a weighted average calculation:

> P_avg = Σ(Pᵢ × Qᵢ) / Σ(Qᵢ)

Where:
- **P_avg** = Weighted Average Cost Basis
- **Pᵢ** = Execution Price of tranche i
- **Qᵢ** = Quantity purchased in tranche i

**Quantitative Comparison: Fixed Share vs. Fixed Capital Scaling**

Assume an investor buys an initial tranche of 100 shares at ₹500 and the stock drops sequentially to ₹400 and ₹300.

**Method 1: Fixed Share Quantity (100 Shares per Tranche)**
- Tranche 1: 100 shares @ ₹500 = ₹50,000
- Tranche 2: 100 shares @ ₹400 = ₹40,000
- Tranche 3: 100 shares @ ₹300 = ₹30,000
- **P_avg = ₹120,000 / 300 = ₹400.00**
- To break even from ₹300, the stock must recover by **+33.33%**

**Method 2: Fixed Rupee Amount (₹50,000 per Tranche — Value Averaging)**
- Tranche 1: 100.0 shares @ ₹500 = ₹50,000
- Tranche 2: 125.0 shares @ ₹400 = ₹50,000
- Tranche 3: 166.6 shares @ ₹300 = ₹50,000
- **P_avg = ₹150,000 / 391.6 = ₹383.04**
- To break even from ₹300, the stock must recover by **+27.68%**

**Evaluation Decision Tree**

1. **Fundamental thesis INTACT** (Strong Balance Sheet, Sector-wide dip) → Scale in systematically
2. **Fundamental thesis BROKEN** (Deteriorating Earnings, High Debt) → Cut loss immediately`,
    faqs: [
      {
        question: 'Why is averaging down dangerous for intraday traders?',
        answer:
          'Intraday trades rely on momentum and structural leverage. Averaging down on a declining intraday position violates risk management, increases position size as price moves against you, and often leads to margin calls or auto-square-off losses.',
      },
      {
        question: 'What is the difference between Dollar-Cost Averaging (DCA) and averaging down?',
        answer:
          'Dollar-Cost Averaging (DCA) is a scheduled, asset-agnostic investment plan executed over time regardless of market direction. Averaging down is a reactive decision to buy additional shares specifically because an asset\'s price has declined.',
      },
    ],
  },
  {
    slug: '1-percent-risk-rule-position-sizing',
    title: 'How Much Should You Risk Per Trade? The 1% Capital Rule Explained',
    metaTitle: 'The 1% Risk Rule in Trading: Position Sizing Formula & Guide',
    metaDescription:
      'Master the 1% risk rule for stock, forex, and crypto trading. Calculate share quantity using capital risk rather than cash balance.',
    keywords: '1 percent risk rule, position sizing calculator, risk management trading, stop loss position size formula',
    category: 'Risk Management',
    datePublished: '2025-09-15',
    body: `The 1% Risk Rule is a fundamental pillar of professional capital preservation. It dictates that a trader should never risk more than 1% of their total account equity on a single trade setup.

Many beginner traders confuse Position Size with Capital at Risk, leading to improper trade allocation.

**The 1% Rule in Practice**

| | Amount |
|---|---|
| Total Account Capital | ₹5,00,000 |
| Maximum Allowed Risk (1%) | ₹5,000 |

- ❌ **Incorrect**: Buy ₹5,000 worth of stock total
- ✅ **Correct**: Calculate share quantity so that (Entry − SL) × Qty + execution fees = ₹5,000

**The Position Sizing Formula**

To apply the 1% rule, derive share quantity based on stop-loss distance rather than fixed cash allocation:

> Account Risk (₹) = Total Capital × 0.01
> Risk Per Share (₹) = Entry Price − Stop Loss Price
> Max Position Size (Shares) = Account Risk (₹) / (Risk Per Share (₹) + Per-Share Charges)

**Mathematical Worked Example**

- Account Capital: ₹2,00,000
- Maximum Risk (1%): ₹2,000
- Stock Entry Price: ₹250
- Stop Loss Price: ₹240
- Risk Per Share: ₹10
- Raw Quantity = ₹2,000 / ₹10 = **200 Shares**
- Total Position Value: 200 × ₹250 = ₹50,000 (25% of capital)
- Maximum Monetary Risk: 200 × ₹10 = **₹2,000 (exactly 1%)**

**Mathematical Survival Proof: 1% vs. 5% Risk (10 Losing Trades from ₹1,00,000)**

| Risk Rule | Starting Capital | After 10 Losses | Drawdown |
|---|---|---|---|
| 1% Fixed Risk | ₹1,00,000 | ₹90,438 | **−9.56%** |
| 5% Fixed Risk | ₹1,00,000 | ₹59,873 | −40.13% |
| 10% Unmanaged | ₹1,00,000 | ₹34,868 | −65.13% |`,
    faqs: [
      {
        question: 'Can aggressive accounts use a 2% or 3% risk rule?',
        answer:
          'Yes. Experienced traders with proven positive statistical expectancy sometimes risk 2% per trade. However, risking 3% or more significantly increases drawdown risk during market anomalies, requiring higher win rates to recover capital.',
      },
      {
        question: 'How does portfolio leverage affect the 1% risk rule?',
        answer:
          'Leverage increases total buying power, but the 1% risk rule must always be calculated against your underlying account equity, not leveraged buying limits.',
      },
    ],
  },
  {
    slug: 'true-cost-of-overtrading-brokerage',
    title: 'The True Cost of Overtrading: How Brokerage Eats 50% of Retail Profits',
    metaTitle: 'The True Cost of Overtrading: Brokerage & STT Impact Analysis',
    metaDescription:
      'Calculate how daily overtrading depletes retail trading capital through brokerage, STT, and turnover charges in Indian equity markets.',
    keywords: 'overtrading costs India, net P&L vs gross P&L, contract note charges calculator, high frequency trading fees',
    category: 'Trading Psychology',
    datePublished: '2025-09-20',
    body: `Overtrading—taking excessive trade volume within a short period—is a major contributor to retail capital loss. Beyond psychological fatigue, the primary damage caused by overtrading is execution friction. Each order incurs statutory fees regardless of trade profitability.

**Gross Profit vs. Net Realized Profit (20 Trades / Day — Intraday Equity)**

| | Daily | Monthly (20 Days) |
|---|---|---|
| Gross Profit | +₹2,000 | +₹40,000 |
| Total Charges | −₹1,200 | −₹24,000 |
| **Net Realized** | **+₹800** | **+₹16,000** |

> 60% of profits lost to execution friction.

**The Mathematical Breakdown of Daily Overtrading**

Fee simulation for a trader performing 10 round-trip trades per day (20 executed orders) on equity intraday setups with an average order value of ₹1,00,000 per leg:

| Leg | Brokerage | STT | Exchange Fee | Stamp/GST | Total |
|---|---|---|---|---|---|
| Buy | ₹20.00 | ₹0.00 | ₹2.97 | ₹7.13 | ₹30.10 |
| Sell | ₹20.00 | ₹25.00 | ₹2.97 | ₹4.13 | ₹52.10 |
| **Per Trade** | | | | | **₹82.20** |

- **10 Trades/Day** → ₹822.00 daily friction

**Cumulative Friction vs. Trade Frequency (Monthly — 22 Days)**

| Trades/Day | Monthly Fees |
|---|---|
| 2 | ₹1,808 |
| 10 | ₹9,042 |
| 20 | ₹18,084 |
| 30 | ₹27,126 |

**Strategies to Mitigate Overtrading Costs**

1. **Establish a Daily Trade Cap**: Limit trading activity to 2 or 3 high-probability setups per session.
2. **Implement a Minimum Net R:R Filter**: Filter out trade setups where projected fees exceed 15% of gross profit targets.
3. **Transition to High-Timeframe Setups**: Swing trading setups generate fewer transactions per month, reducing the impact of flat brokerage fees and turnover taxes relative to profit targets.`,
    faqs: [
      {
        question: 'Does zero-brokerage delivery trading eliminate all friction costs?',
        answer:
          'No. While some brokers offer zero brokerage on equity delivery, statutory charges still apply, including 0.1% STT on both buy and sell legs, exchange turnover fees, GST, state stamp duty, and flat DP (Depository Participant) charges upon selling.',
      },
      {
        question: 'What percentage of trading capital is typically lost to transaction costs by active day traders?',
        answer:
          'High-frequency intraday traders often spend 15% to 40% of their starting account equity annually purely on brokerage, transaction fees, and statutory taxes.',
      },
    ],
  },
];

/** Look up a single article by its slug. Returns undefined if not found. */
export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Category badge colour mapping. */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Indian Markets': { bg: 'bg-accent/10', text: 'text-accent' },
  'Risk Management': { bg: 'bg-gain-wash', text: 'text-gain' },
  'Position Sizing': { bg: 'bg-primary/10', text: 'text-primary-press' },
  'Trading Psychology': { bg: 'bg-loss-wash', text: 'text-loss' },
};
