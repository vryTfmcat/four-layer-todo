import assert from 'node:assert/strict';
import test from 'node:test';
import { getConnectionCoordinates } from '../src/ui/canvasGeometry.ts';

test('anchors use each card size and touch the horizontal borders', () => {
  assert.deepEqual(getConnectionCoordinates(
    { x: 0, y: 0, width: 250, height: 280 },
    { x: 500, y: 90, width: 210, height: 100 },
  ), { x1: 250, y1: 140, x2: 500, y2: 140 });
});
test('vertical anchors follow different content heights', () => {
  assert.deepEqual(getConnectionCoordinates(
    { x: 0, y: 0, width: 250, height: 100 },
    { x: 20, y: 400, width: 210, height: 240 },
  ), { x1: 125, y1: 100, x2: 125, y2: 400 });
});
test('coincident centers and unmeasured cards have no line', () => {
  const card = { x: 0, y: 0, width: 250, height: 280 };
  assert.equal(getConnectionCoordinates(card, card), null);
  assert.equal(getConnectionCoordinates(card, { ...card, width: 0 }), null);
});
