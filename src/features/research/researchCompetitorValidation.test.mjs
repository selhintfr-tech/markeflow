import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCompetitor } from './researchCompetitorValidation.ts';

test('competitor requires a non-empty name', () => {
  assert.deepEqual(validateCompetitor({ name: '   ' }), {
    name: 'Enter a competitor name.',
  });
});

test('competitor validation explains malformed optional URL and currency fields', () => {
  assert.deepEqual(validateCompetitor({
    name: 'Example competitor',
    website: 'example dot com',
    evidence: 'javascript:alert(1)',
    currency: 'US',
  }), {
    website: 'Website must be a valid http or https URL.',
    evidence: 'Evidence URL must be a valid http or https URL.',
    currency: 'Enter a three-letter currency code, such as MAD or USD.',
  });
});

test('competitor accepts valid optional values and non-negative prices', () => {
  assert.deepEqual(validateCompetitor({
    name: 'Example competitor',
    website: 'https://example.com',
    evidence: 'https://example.com/source',
    price: '0',
    currency: 'MAD',
    reviewed_on: '2026-10-22',
  }), {});
});

test('competitor rejects negative or non-numeric prices', () => {
  assert.equal(validateCompetitor({ name: 'Example', price: '-2' }).price, 'Price must be a non-negative number.');
  assert.equal(validateCompetitor({ name: 'Example', price: 'unknown' }).price, 'Price must be a non-negative number.');
});

test('competitor rejects impossible review dates', () => {
  assert.equal(validateCompetitor({ name: 'Example', reviewed_on: '2026-02-30' }).reviewed_on, 'Enter a valid review date.');
});
