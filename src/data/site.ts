/** Site-wide constants. Single source for metadata, so nothing drifts. */

export const SITE = {
  name: 'Risk Reward Calculator',
  shortName: 'RiskReward',
  domain: 'risktorewardcalculator.com',
  url: 'https://risktorewardcalculator.com',
  description:
    'Free risk to reward calculator for stocks and forex. Work out your risk-reward ratio, break-even win rate, and net profit after Indian brokerage, STT, GST and stamp duty.',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Risk : Reward' },
  { href: '/win-rate-calculator/', label: 'Win rate' },
  { href: '/stock-average-calculator/', label: 'Stock average' },
  { href: '/risk-reward-calculator/', label: 'Guide' },
] as const;

export const FOOTER_LINKS = [
  { href: '/risk-reward-calculator/', label: 'Risk reward ratio guide' },
  { href: '/disclaimer/', label: 'Disclaimer' },
  { href: '/privacy-policy/', label: 'Privacy policy' },
] as const;
