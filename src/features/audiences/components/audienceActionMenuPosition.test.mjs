import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMenuPosition, MENU_WIDTH, MENU_HEIGHT } from './audienceActionMenuPosition.ts';

test('calculateMenuPosition places dropdown below trigger aligned to right by default', () => {
  const trigger = { top: 200, bottom: 232, left: 800, right: 832 };
  const viewport = { width: 1200, height: 800 };

  const result = calculateMenuPosition(trigger, viewport);

  assert.equal(result.isOffscreen, false);
  assert.equal(result.placement, 'bottom');
  assert.equal(result.top, 236); // bottom (232) + gap (4)
  assert.equal(result.left, 688); // right (832) - MENU_WIDTH (144)
});

test('calculateMenuPosition auto-flips above when insufficient space below', () => {
  // Trigger at the bottom of the screen (e.g. last table row)
  const trigger = { top: 760, bottom: 792, left: 800, right: 832 };
  const viewport = { width: 1200, height: 800 };

  const result = calculateMenuPosition(trigger, viewport);

  assert.equal(result.isOffscreen, false);
  assert.equal(result.placement, 'top');
  assert.equal(result.top, 760 - MENU_HEIGHT - 4); // top (760) - MENU_HEIGHT (114) - gap (4) = 642
  assert.equal(result.left, 688); // right (832) - MENU_WIDTH (144)
});

test('calculateMenuPosition clamps within viewport margins on narrow screens or left edge', () => {
  // Trigger near the left edge
  const triggerLeft = { top: 200, bottom: 232, left: 10, right: 42 };
  const viewport = { width: 1000, height: 800 };

  const resultLeft = calculateMenuPosition(triggerLeft, viewport);
  assert.equal(resultLeft.left, 8); // clamped to margin (8)

  // Trigger near the right edge of a narrow viewport
  const triggerRight = { top: 200, bottom: 232, left: 350, right: 382 };
  const smallViewport = { width: 375, height: 667 };

  const resultRight = calculateMenuPosition(triggerRight, smallViewport);
  // Max left = 375 - 144 - 8 = 223
  assert.equal(resultRight.left, 223);
});

test('calculateMenuPosition identifies when trigger has scrolled completely off-screen', () => {
  const viewport = { width: 1200, height: 800 };

  // Scrolled above
  const scrolledAbove = { top: -50, bottom: -18, left: 800, right: 832 };
  assert.equal(calculateMenuPosition(scrolledAbove, viewport).isOffscreen, true);

  // Scrolled below
  const scrolledBelow = { top: 850, bottom: 882, left: 800, right: 832 };
  assert.equal(calculateMenuPosition(scrolledBelow, viewport).isOffscreen, true);

  // Scrolled off left
  const scrolledOffLeft = { top: 200, bottom: 232, left: -50, right: -18 };
  assert.equal(calculateMenuPosition(scrolledOffLeft, viewport).isOffscreen, true);
});
