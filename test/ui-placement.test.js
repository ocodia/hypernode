import test from 'node:test';
import assert from 'node:assert/strict';

import { getAnchoredUiPlacement, normalizeToolbarPosition, resolvePlacementChange } from '../js/utils/ui-placement.js';

test('normalizeToolbarPosition migrates legacy toolbar positions', () => {
  assert.equal(normalizeToolbarPosition('top-center', 'top-left'), 'top-left');
  assert.equal(normalizeToolbarPosition('bottom-center', 'top-left'), 'bottom-right');
  assert.equal(normalizeToolbarPosition('left-column', 'top-left'), 'top-left');
});

test('getAnchoredUiPlacement resolves toast and meta conflicts against toolbar', () => {
  const placement = getAnchoredUiPlacement({
    toolbarPosition: 'bottom-right',
    toastPosition: 'bottom-right',
    metaPosition: 'bottom-right',
  });

  assert.equal(placement.toolbarPosition, 'bottom-right');
  assert.equal(placement.toastPosition, 'bottom-left');
  assert.equal(placement.metaPosition, 'top-left');
});

test('resolvePlacementChange auto-resolves toast conflicts clockwise', () => {
  const next = resolvePlacementChange({
    toolbarPosition: 'top-left',
    toastPosition: 'bottom-right',
    metaPosition: 'bottom-left',
  }, 'toast', 'top-left');

  assert.equal(next.toastPosition, 'top-right');
  assert.equal(next.metaPosition, 'bottom-left');
});

test('resolvePlacementChange moves dependents when toolbar claims a corner', () => {
  const next = resolvePlacementChange({
    toolbarPosition: 'top-left',
    toastPosition: 'top-right',
    metaPosition: 'bottom-right',
  }, 'toolbar', 'bottom-right');

  assert.equal(next.toolbarPosition, 'bottom-right');
  assert.equal(next.toastPosition, 'top-right');
  assert.equal(next.metaPosition, 'bottom-left');
});
