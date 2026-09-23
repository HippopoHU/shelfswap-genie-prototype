import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeShelf, simulateSwap } from '../server.js';

const products = [
  { id: 'a', name: 'A', slot: 0, baseRevenue: 100, category: 'snacks' },
  { id: 'b', name: 'B', slot: 3, baseRevenue: 100, category: 'drinks' }
];

test('simulation swaps slots and returns KPI explanation', () => {
  const result = simulateSwap({ products, leftId: 'a', rightId: 'b' });
  assert.equal(result.products.find((p) => p.id === 'a').slot, 3);
  assert.equal(result.products.find((p) => p.id === 'b').slot, 0);
  assert.equal(typeof result.revenueDelta, 'number');
  assert.match(result.explanation, /visibility/);
});

test('optimizer returns a complete shelf arrangement', () => {
  const result = optimizeShelf({ products });
  assert.equal(result.products.length, 2);
  assert.equal(new Set(result.products.map((p) => p.slot)).size, 2);
  assert.match(result.explanation, /Whole-shelf/);
});

test('simulation rejects same product', () => {
  assert.throws(() => simulateSwap({ products, leftId: 'a', rightId: 'a' }), /different/);
});
