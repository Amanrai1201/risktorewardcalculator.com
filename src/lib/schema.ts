import { SITE } from '../data/site';
import type { Faq } from '../data/faqs';

/**
 * JSON-LD builders.
 *
 * Every page passes its structured data through these, so the shapes stay
 * consistent and the FAQ markup and the FAQ schema are always built from the
 * same source array.
 */

const origin = SITE.url;

function absolute(path: string): string {
  return new URL(path, origin).href;
}

/** One calculator, described as a free browser tool. */
export function webApplication(options: {
  name: string;
  description: string;
  path: string;
  image?: string[];
  operatingSystem?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: absolute(options.path),
    applicationCategory: 'FinanceApplication',
    operatingSystem: options.operatingSystem ?? 'Any modern browser',
    ...(options.image && { image: options.image.map(absolute) }),
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: origin,
    },
  };
}

export function faqPage(faqs: Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** Trail from the homepage down to the current page. */
export function breadcrumbs(trail: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absolute(step.path),
    })),
  };
}

/** Site-level identity, emitted on the homepage only. */
export function webSite(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: origin,
    description: SITE.description,
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: origin,
    },
  };
}
