/** Site-wide constants. Single source for metadata, so nothing drifts. */

export const SITE = {
  name: 'Risk Reward Calculator',
  shortName: 'RiskReward',
  domain: 'risktorewardcalculator.com',
  url: 'https://risktorewardcalculator.com',
  description:
    'Free online Risk Reward Calculator, Win Rate Calculator & Stock Average Calculator for trading stocks, forex, and crypto. Calculate risk reward ratio, win rate formula, brokerage, and average down cost.',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Risk : Reward' },
  { href: '/win-rate-calculator/', label: 'Win rate' },
  { href: '/stock-average-calculator/', label: 'Stock average' },
  // { href: '/#guide', label: 'Guide' },
] as const;

export const FOOTER_LINKS = [
  { href: '/#guide', label: 'Risk reward ratio guide' },
  { href: '/about/', label: 'About us' },
  { href: '/contact/', label: 'Contact us' },
] as const;

export const LEGAL_LINKS = [
  { href: '/disclaimer/', label: 'Disclaimer' },
  { href: '/terms/', label: 'Terms & Conditions' },
  { href: '/privacy-policy/', label: 'Privacy Policy' },
] as const;
