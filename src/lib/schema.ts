import { SITE } from '../data/site';
import type { Faq } from '../data/faqs';
import type { Article } from '../data/articles';

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
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: absolute(options.path),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any modern browser',
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

/** A single article page, described as a schema.org Article. */
export function articleSchema(article: Article): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    keywords: article.keywords,
    datePublished: article.datePublished,
    author: {
      '@type': 'Organization',
      name: SITE.name,
      url: origin,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: origin,
    },
    url: absolute(`/articles/${article.slug}/`),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absolute(`/articles/${article.slug}/`),
    },
  };
}

/** Articles index page — described as an ItemList for AEO carousel eligibility. */
export function articleListSchema(articles: Article[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Trading & Risk Management Articles',
    description: 'In-depth guides on risk-reward, win rate, position sizing, and trading charges for Indian retail traders.',
    url: absolute('/articles/'),
    itemListElement: articles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: article.title,
      url: absolute(`/articles/${article.slug}/`),
      description: article.metaDescription,
    })),
  };
}
