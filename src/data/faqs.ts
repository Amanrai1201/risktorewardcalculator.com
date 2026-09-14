/**
 * FAQ copy.
 *
 * Answers are plain text with no markup, because each set feeds both the
 * `<details>` list on the page and the `FAQPage` structured data. One source
 * means the two can never disagree.
 */

export interface Faq {
  question: string;
  answer: string;
}

export const HOME_FAQS: Faq[] = [
  {
    question: 'What is risk reward ratio in trading?',
    answer:
      'The risk reward ratio in trading compares your potential loss to your expected gain on a trade. It measures how much capital you are risking to achieve a specific profit target. For example, a 1 : 2 ratio means you stand to make $2 for every $1 risked, allowing a trader to remain profitable over time even with a win rate below 50%.',
  },
  {
    question: 'How to calculate risk to reward ratio?',
    answer:
      'To calculate risk to reward ratio, measure the distance from your entry price to your stop loss (Risk per share) and the distance from your entry price to your profit target (Reward per share). Divide the reward per share by the risk per share and write it as 1 : n. For instance, buying at ₹100 with a stop loss at ₹95 (₹5 risk) and a target at ₹115 (₹15 reward) gives a risk to reward ratio of 1 : 3.',
  },
  {
    question: 'How to calculate risk reward ratio in trading?',
    answer:
      'In trading, calculate the risk reward ratio using the formula: Risk = |Entry Price − Stop Loss| and Reward = |Target Price − Entry Price|. The ratio is expressed as 1 : (Reward ÷ Risk). For long positions, Risk = Entry − Stop Loss and Reward = Target − Entry. For short positions, Risk = Stop Loss − Entry and Reward = Entry − Target. Factoring in brokerage, taxes, and slippage gives your true net risk reward ratio.',
  },
  {
    question: 'How to calculate risk reward ratio in forex?',
    answer:
      'To calculate risk reward ratio in forex, measure your stop loss and take profit distances in pips or US dollars. Divide the target profit in pips by your stop loss in pips. For instance, risking 20 pips to gain 60 pips on EUR/USD yields a 20 : 60 ratio, simplified to 1 : 3. In lot sizes (standard, mini, micro), multiply pip values by lot count and include spread and commission costs for an accurate net ratio.',
  },
  {
    question: 'What is a good risk to reward ratio in trading?',
    answer:
      'A good risk to reward ratio in trading is typically 1 : 2 or 1 : 3 for swing and position trading. However, a good ratio depends on your win rate: at 1 : 2, you break even with a 33.3% win rate, whereas at 1 : 1, you need over 50%. A higher ratio provides a larger safety margin, but only if the profit target is realistic and regularly achieved.',
  },
  {
    question: 'What is the relationship between risk and reward in investing?',
    answer:
      'In investing, the relationship between risk and reward is directly proportional: higher potential returns generally require taking on higher risk, while lower-risk assets offer more modest returns. Investors balance this tradeoff by constructing diversified portfolios that match their financial goals and risk capacity.',
  },
  {
    question: 'What is the relationship between risk and reward?',
    answer:
      'The relationship between risk and reward states that potential payout increases in tandem with the level of risk accepted. In trading, maintaining a favorable risk to reward ratio ensures that your average winning trade is significantly larger than your average losing trade, enabling long-term account growth even during losing streaks.',
  },
  {
    question: 'Does this calculator include brokerage and taxes?',
    answer:
      'Yes. Pick your broker, exchange, and product, and the calculator prices brokerage, STT, exchange transaction charges, SEBI turnover fees, stamp duty, GST, and DP charges into a net profit, net loss, net risk to reward ratio, and net break-even win rate.',
  },
  {
    question: 'What does the break-even win rate tell me?',
    answer:
      'The break-even win rate is the percentage of trades you must win for a setup to end up flat over time. A 1 : 3 setup breaks even at a 25% win rate, so any win rate above 25% produces profit. It is the fastest way to sanity-check a trade setup before taking it.',
  },
  {
    question: 'Can I use it for short trades?',
    answer:
      'Yes. Choose Short and set the stop loss above your entry price and target below it. The calculator computes risk and reward distances accordingly and accounts for short intraday sell leg taxes and charges.',
  },
];

export const WIN_RATE_FAQS: Faq[] = [
  {
    question: 'How to calculate win rate?',
    answer:
      'Win rate is calculated by dividing your number of winning trades by total closed trades and multiplying by 100. Formula: Win Rate (%) = (Winning Trades ÷ Total Closed Trades) × 100. For example, 45 wins out of 60 total decided trades is a 75% win rate. Break-even trades are typically excluded from the calculation.',
  },
  {
    question: 'What is a good win rate in trading?',
    answer:
      'A good win rate in trading typically falls between 40% and 60% for most successful trading systems. A 40% win rate can be highly profitable if your risk to reward ratio is 1 : 2 or higher. Conversely, even an 80% win rate can lose money if average losses far exceed average gains.',
  },
  {
    question: 'How to achieve 90% win rate in trading?',
    answer:
      'To achieve a 90% win rate in trading, traders focus on strong trend alignment, high-confluence support/resistance setups, tight profit targets (scalping), and strict exit discipline. However, 90% win rate strategies often risk larger stop losses relative to targets. High win rates must be balanced with strict risk management to prevent a single large loss from wiping out cumulative gains.',
  },
  {
    question: 'How do I improve my win rate in day trading?',
    answer:
      'To improve your win rate in day trading, trade only in the direction of the dominant higher time frame trend, wait for key level confirmations, avoid over-trading during low volatility market sessions, use fixed risk management per trade (1-2% of account capital), and keep a detailed trade log to identify and refine your highest-probability setups.',
  },
  {
    question: 'What is expectancy in trading?',
    answer:
      'Expectancy is the average result of one trade over a long run: (Win Rate × Average Win) − (Loss Rate × Average Loss). A positive expectancy proves your trading strategy has a statistical edge and generates profit over time.',
  },
  {
    question: 'How many trades before my win rate means anything?',
    answer:
      'A sample size of at least 50 to 100 trades is needed to calculate a statistically meaningful win rate. Small samples dominated by 10-20 trades are heavily influenced by market luck and noise.',
  },
];

export const STOCK_AVERAGE_FAQS: Faq[] = [
  {
    question: 'How to average stock price using a calculator?',
    answer:
      'To average stock price using a calculator, enter the purchase price and share quantity for each buy order. The calculator computes the weighted average price by dividing total money spent by total shares owned. For example, buying 100 shares at ₹150 and 200 shares at ₹120 totals ₹39,000 for 300 shares, resulting in an average stock price of ₹130 per share.',
  },
  {
    question: 'How to average stock price calculator works?',
    answer:
      'A stock average price calculator works by applying a weighted average formula: Total Money Invested ÷ Total Shares Held. Unlike a simple midpoint average, it weighs each transaction by the volume of shares purchased. This allows investors to plan "average down" strategies by calculating how many new shares at current market prices are needed to bring the overall cost basis down to a target price.',
  },
  {
    question: 'Why is my average not the midpoint of my buy prices?',
    answer:
      'Your average price differs from the simple midpoint because the purchases were made with different share quantities. The weighted average shifts towards the price where you bought a larger quantity of shares. Buying larger volumes at lower prices pulls your overall average price down much faster.',
  },
  {
    question: 'How many shares do I need to reach a target average?',
    answer:
      'To reach a target average price, the calculator solves for the additional quantity needed at a given buy price using the formula: Shares Needed = (Total Invested − (Target Average × Total Shares)) ÷ (Target Average − New Buy Price). Note that you cannot average down to a target price below the current market buying price.',
  },
  {
    question: 'Is averaging down a good idea?',
    answer:
      'Averaging down lowers your break-even price on a stock position, but it also increases your total monetary risk in that single stock. It works best when fundamental analysis confirms the company remains strong and the price dip is temporary. Pre-determining your total maximum allocation prevents over-exposing your portfolio.',
  },
  {
    question: 'Does the average price include brokerage and taxes?',
    answer:
      'This calculator averages the trade execution prices. Some brokers fold brokerage and transaction taxes into your cost of acquisition on contract notes. For tax purposes, refer to your broker contract note or tax P&L statement.',
  },
];

