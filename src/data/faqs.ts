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
    question: 'How do I calculate a risk to reward ratio?',
    answer:
      'Measure the distance from your entry to your stop loss — that is your risk per share. Then measure the distance from your entry to your target — that is your reward per share. Divide the reward by the risk and write it as 1 : n. Buying at ₹100 with a stop at ₹95 and a target at ₹115 risks ₹5 to make ₹15, which is 1 : 3.',
  },
  {
    question: 'What is a good risk to reward ratio?',
    answer:
      'Most swing and positional traders look for at least 1 : 2, and 1 : 3 gives comfortable room for error. The number only matters next to your win rate: at 1 : 2 you break even winning one trade in three, while at 1 : 1 you need to win more than half. A high ratio on a setup that almost never reaches its target is worse than a modest ratio you actually hit.',
  },
  {
    question: 'Does this calculator include brokerage and taxes?',
    answer:
      'Yes, and they change the result rather than sitting in a separate table. Pick your broker, exchange and product, and the calculator prices brokerage, STT, exchange transaction charges, the SEBI turnover fee, stamp duty, GST and DP charges into a net profit, a net loss and a net risk to reward ratio. All charge figures are estimates based on published rate cards.',
  },
  {
    question: 'What does the break-even win rate tell me?',
    answer:
      'It is the share of trades you must win for this setup to end up flat over many repetitions. A 1 : 3 setup breaks even at a 25 per cent win rate, so anything above that is profit. It is the fastest way to sanity-check a trade: if the break-even win rate is higher than you have ever managed, the setup is not worth taking.',
  },
  {
    question: 'Can I use it for short trades?',
    answer:
      'Yes. Choose Short and put the stop above your entry and the target below it. The arithmetic is the same, but the charges are not — on an intraday short the entry is the sell leg, which moves where securities transaction tax and stamp duty land. The calculator accounts for that.',
  },
  {
    question: 'Does it work for forex?',
    answer:
      'Switch the market to Forex and you can size a position in standard, mini or micro lots, or in raw units. Risk and reward are shown in pips and in US dollars, and your spread and per-lot commission are treated as the cost of the trade in place of Indian statutory charges.',
  },
];

export const GUIDE_FAQS: Faq[] = [
  {
    question: 'Is 1 : 2 or 1 : 3 the better target?',
    answer:
      'Neither is better on its own, because a wider target is also a target you reach less often. Moving from 1 : 2 to 1 : 3 drops your break-even win rate from 33 to 25 per cent, but it only pays if your win rate falls by less than that. Work out both ratios for the same idea, compare each against the win rate you actually record, and take the one with the higher expectancy.',
  },
  {
    question: 'Where should the stop loss go?',
    answer:
      'Place it where the trade idea is proven wrong — beyond a swing low, a breakout level or a moving average — and then let the ratio tell you whether the trade is worth taking. Choosing a stop to manufacture a flattering ratio inverts the process: you end up with a tight stop that gets hit by ordinary noise, and a ratio that never materialises.',
  },
  {
    question: 'How much do charges really change the ratio?',
    answer:
      'It depends almost entirely on how wide your stop and target are relative to your position value. A 1 : 3 intraday setup risking ₹5 a share on a ₹100 stock loses very little to charges, while the same charges on a ₹1 stop can turn 1 : 3 into something closer to 1 : 2. Small targets and large positions are where costs do the most damage.',
  },
  {
    question: 'Why is my net ratio worse than my gross ratio?',
    answer:
      'Because charges push in both directions. On a winning trade they come out of your profit; on a losing trade they are added to your loss. Net reward is gross reward minus the charges at your target, and net risk is gross risk plus the charges at your stop, so the net ratio is always below the gross one.',
  },
  {
    question: 'Why are charges calculated twice for one trade?',
    answer:
      'Most charges are a percentage of turnover, and turnover depends on the price you exit at. Selling at your target produces a different turnover from selling at your stop, so the two exits genuinely cost different amounts. Pricing the trade once and reusing the number for both outcomes is a common shortcut that makes the loss look smaller than it is.',
  },
  {
    question: 'Which charges apply to intraday but not delivery?',
    answer:
      'Securities transaction tax is the main difference: intraday equity is taxed at 0.025 per cent on the sell leg only, while delivery is taxed at 0.1 per cent on both legs. Stamp duty is 0.003 per cent on the buy leg for intraday against 0.015 per cent for delivery, and depository charges apply only when you sell shares held in your demat account.',
  },
  {
    question: 'What is GST charged on?',
    answer:
      'GST at 18 per cent applies to the services in the trade — brokerage, exchange transaction charges, the SEBI turnover fee and depository charges — not to the taxes. Securities transaction tax and stamp duty are outside the GST base. Getting this wrong is what makes hand-built spreadsheets overstate the cost of a trade.',
  },
  {
    question: 'How do I turn a rupee risk limit into a quantity?',
    answer:
      'Divide the money you are willing to lose by your risk per share. Risking 1 per cent of a ₹5,00,000 account is ₹5,000, and with a ₹5 stop distance that is 1,000 shares. The position size helper in the calculator does this from your capital and risk percentage, and you can apply the result to the quantity field in one click.',
  },
  {
    question: 'What does expectancy add that the ratio does not?',
    answer:
      'The ratio describes one trade; expectancy describes a run of them. Multiply your win rate by the net profit, subtract the losing share multiplied by the net loss, and you get the average rupees a trade of this type is worth. It is the figure that settles arguments between a high win rate with small targets and a low win rate with large ones.',
  },
  {
    question: 'How does a pip translate into money?',
    answer:
      'For a pair quoted in US dollars, one pip on a standard lot of 100,000 units is worth about $10, and a mini lot is worth about $1. When the dollar is the base currency, as in USD/JPY, the pip value depends on the exchange rate, so the calculator works it out from the price you enter rather than assuming a fixed figure.',
  },
];

export const WIN_RATE_FAQS: Faq[] = [
  {
    question: 'How is win rate calculated?',
    answer:
      'Divide your winning trades by your total closed trades and express it as a percentage. Thirty-two wins out of eighty trades is a 40 per cent win rate. Trades that closed at break-even are usually left out of both counts, since they neither confirm nor contradict the edge.',
  },
  {
    question: 'What win rate do I need to be profitable?',
    answer:
      'It depends entirely on your average reward-to-risk. At 1 : 1 you need better than 50 per cent, at 1 : 2 you need better than 33 per cent, and at 1 : 3 you need better than 25 per cent. A 70 per cent win rate still loses money if your losers are three times the size of your winners.',
  },
  {
    question: 'Is a high win rate a good thing?',
    answer:
      'Only alongside the size of your average win and loss. Strategies that take small, frequent profits produce comfortable win rates and can still be wiped out by a handful of large losses. Expectancy — average profit per trade across wins and losses — is the measure that tells you whether the approach makes money.',
  },
  {
    question: 'How many trades before my win rate means anything?',
    answer:
      'A few dozen trades give you a rough sense; a hundred or more before you draw firm conclusions. Small samples are dominated by luck, and the first ten trades of a losing strategy can easily look like the first ten of a winning one.',
  },
  {
    question: 'What is expectancy in trading?',
    answer:
      'Expectancy is the average result of one trade over a long run: win rate multiplied by average win, minus loss rate multiplied by average loss. A positive number means the strategy makes money if you keep repeating it at the same size. It also tells you how many trades you need before the edge shows through the noise.',
  },
];

export const STOCK_AVERAGE_FAQS: Faq[] = [
  {
    question: 'How do I calculate the average price of a stock?',
    answer:
      'Add up what you paid across every purchase, then divide by the total number of shares. Two hundred shares at ₹150 and three hundred at ₹120 is ₹30,000 plus ₹36,000 for five hundred shares, an average of ₹132. It is a weighted average, so the larger purchase pulls the figure towards its own price.',
  },
  {
    question: 'Why is my average not the midpoint of my two buy prices?',
    answer:
      'Because the two purchases were different sizes. The simple midpoint only holds when you bought the same quantity at each price. Any difference in quantity pulls the average towards the price you bought more of, which is why buying larger amounts on the way down moves the average faster.',
  },
  {
    question: 'How many shares do I need to reach a target average?',
    answer:
      'It depends on the gap between the current price and the average you want. The calculator solves for the quantity directly, and it tells you when the target is unreachable — you cannot average down to a price below the market price, no matter how many shares you buy.',
  },
  {
    question: 'Is averaging down a good idea?',
    answer:
      'It lowers your break-even price, which is a fact, not a strategy. Adding to a losing position also increases the money at risk in a single idea and only pays off if the original reason to buy still holds. Deciding your total position size and your exit before the first purchase is what keeps averaging from becoming a way to avoid a loss.',
  },
  {
    question: 'Does the average price include brokerage and taxes?',
    answer:
      'This calculator averages the trade prices themselves. Your broker may show a slightly higher figure, because some contract notes fold charges into the cost of acquisition. For tax purposes the cost of acquisition is what matters, so check your contract note before using an average in a capital gains calculation.',
  },
];
