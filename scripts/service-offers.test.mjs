import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Check the approved offer contract against Hugo output. Stripe amounts are
// verified separately through read-only API and hosted-checkout checks.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.env.KEEGOID_PUBLIC_DIR || resolve(root, 'public'));
const links = JSON.parse(await readFile(resolve(root, 'data/service_links.json'), 'utf8'));
const html = route => readFile(resolve(output, route.replace(/^\//, ''), 'index.html'), 'utf8');
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const offers = [
  { slug: 'personal-ai-session', title: 'Personal AI assessment', initial: '$100', implementation: '$150', minutes: 60, anchor: 'personal-ai-session' },
  { slug: 'business-ai-assessment', title: 'Business AI assessment', initial: '$250', implementation: '$500', minutes: 90, anchor: 'business-ai-assessment' },
];

for (const offer of offers) {
  test(`${offer.title}: standalone assessment and optional implementation`, async () => {
    const page = await html(`/services/${offer.slug}/`);
    const copy = text(page);
    const entry = links[offer.slug];
    assert.match(entry.url, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
    assert.match(entry.follow_up.url, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
    assert.notEqual(entry.url, entry.follow_up.url);
    assert.notEqual(entry.price_id, entry.follow_up.price_id);
    assert.equal(page.split(`href="${entry.url}"`).length - 1, 2, 'Both primary CTAs buy only the initial assessment');
    assert.equal(page.split(`href="${entry.follow_up.url}"`).length - 1, 1, 'Implementation has its own purchase path');
    assert(copy.includes(`Pay for the initial assessment`));
    assert(copy.includes(`${offer.minutes}-minute virtual assessment`) || copy.includes(`${offer.minutes}-minute virtual personal AI assessment`));
    assert.match(copy, /You can stop after the assessment/);
    assert.match(copy, /demonstration/);
    assert.match(copy, /Before purchasing, agree the written scope/);
    const implementation = page.split('id="optional-implementation"')[1].split('<div class="get-started')[0];
    assert(!/\d+[ -]minute|timed session/i.test(text(implementation)), 'Implementation has no invented session duration');
    for (const tag of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
      const meta = [...page.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]).find(value => value.includes(tag));
      assert(meta?.includes(offer.initial) && meta.includes(offer.implementation), `${tag} includes both prices`);
    }
    for (const route of ['/', '/services/', `/services/${offer.slug}/`]) {
      const rendered = await html(route);
      const block = route === `/services/${offer.slug}/`
        ? rendered.match(/<aside class="price-panel"[\s\S]*?<\/aside>/)?.[0]
        : [...rendered.matchAll(/<article class="service-card">([\s\S]*?)<\/article>/g)].map(match => match[1]).find(value => value.includes(`href="/services/${offer.slug}/"`));
      assert(block, `${route} contains the offer`);
      assert(text(block).includes(`Initial assessment ${offer.initial}`), `${route}: initial price`);
      assert(text(block).includes(`Optional implementation ${offer.implementation}`), `${route}: optional price`);
      assert(text(block).includes('applicable tax'), `${route}: tax disclosure`);
    }
    const terms = await html('/terms/ai-consulting/');
    const section = terms.split(`id="${offer.anchor}"`)[1]?.split('<h2')[0];
    assert(section?.includes(offer.initial), 'Assessment terms agree with marketing');
    assert.match(text(section), /optional/);
  });
}

test('superseded prices and checkouts are absent from public offer pages', async () => {
  for (const route of ['/', '/services/', '/services/personal-ai-session/', '/services/business-ai-assessment/', '/terms/ai-consulting/']) {
    const rendered = await html(route);
    assert(!rendered.includes('https://buy.stripe.com/14A28r3hqaVZ5iGeAl9Zm00'), route);
    assert(!rendered.includes('https://buy.stripe.com/8x23cv7xGc03h1ogIt9Zm01'), route);
    assert(!rendered.includes('$750'), route);
  }
  const terms = await html('/terms/ai-consulting/');
  for (const anchor of ['personal-implementation-follow-up', 'business-implementation-follow-up']) assert(terms.includes(`id="${anchor}"`));
  assert(terms.includes('$150') && terms.includes('$500'));
  assert.match(text(terms), /Cancel before the scheduled session or assessment begins for a full refund/);
  assert.match(text(terms), /A purchase made under an earlier offer keeps its agreed scope and terms/);
});
