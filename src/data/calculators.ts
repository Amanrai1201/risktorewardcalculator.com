/**
 * The calculator registry.
 *
 * Feeds the navigation, the "related calculators" blocks and the per-page
 * `WebApplication` structured data, so adding a calculator means adding one
 * entry here plus its page.
 */

export interface CalculatorEntry {
  id: string;
  href: string;
  /** Full name, used in headings and structured data. */
  name: string;
  /** Short name for cards and navigation. */
  shortName: string;
  /** One line describing what it answers. */
  blurb: string;
}

export const CALCULATORS: CalculatorEntry[] = [
  {
    id: 'risk-reward',
    href: '/',
    name: 'Risk to Reward Calculator',
    shortName: 'Risk : reward',
    blurb:
      'Turn an entry, stop loss and target into a risk-reward ratio, the win rate you need, and your profit after broker charges.',
  },
  {
    id: 'win-rate',
    href: '/win-rate-calculator/',
    name: 'Win Rate Calculator',
    shortName: 'Win rate',
    blurb:
      'Enter your wins and losses to get your win rate, expectancy per trade, and the reward-to-risk you need to stay profitable.',
  },
  {
    id: 'stock-average',
    href: '/stock-average-calculator/',
    name: 'Stock Average Calculator',
    shortName: 'Stock average',
    blurb:
      'Average several buys into one cost price, then find how many more shares it takes to reach the average you want.',
  },
];

const INDEX = new Map(CALCULATORS.map((entry) => [entry.id, entry]));

export function getCalculator(id: string): CalculatorEntry {
  const entry = INDEX.get(id);
  if (!entry) throw new Error(`Unknown calculator: ${id}`);
  return entry;
}

/** Every calculator except the one given, for cross-linking. */
export function otherCalculators(id: string): CalculatorEntry[] {
  return CALCULATORS.filter((entry) => entry.id !== id);
}
