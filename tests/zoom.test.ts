import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale, stepZoom } from '../src/zoom';

test('fit-page contains portrait, landscape, and oversized sheets without a minimum-scale overflow', () => {
  for (const [pw, ph] of [[612, 792], [792, 612], [14400, 14400]]) {
    const scale = fitScale('page', pw, ph, 300, 400);
    assert.ok(pw * scale <= 300);
    assert.ok(ph * scale <= 400);
    assert.ok(Math.abs(pw * scale - 299) < 0.001 || Math.abs(ph * scale - 399) < 0.001);
  }
  assert.equal(fitScale('width', 612, 792, 1225, 400), 2);
  assert.equal(fitScale(1.25, 612, 792, 300, 400), 1.25);
});

test('zoom steps from the fitted scale, in both directions, and respects limits', () => {
  assert.equal(stepZoom(0.4, 1), 0.5);
  assert.equal(stepZoom(1.5, -1), 1.2);
  assert.equal(stepZoom(stepZoom(0.4, 1), -1), 0.4);
  assert.equal(stepZoom(7, 1), 8);
  assert.equal(stepZoom(0.11, -1), 0.1);
});
