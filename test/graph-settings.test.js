import test from 'node:test';
import assert from 'node:assert/strict';

import { GRAPH_DEFAULTS } from '../js/utils/constants.js';
import { sanitizeGraphSettings, validateGraphPayload } from '../js/utils/graph.js';

test('sanitizeGraphSettings defaults showShortcutsUi to true when missing', () => {
  const settings = sanitizeGraphSettings({});

  assert.equal(settings.showShortcutsUi, true);
  assert.equal(settings.showShortcutsUi, GRAPH_DEFAULTS.showShortcutsUi);
  assert.equal(settings.showToolbarShortcutHints, GRAPH_DEFAULTS.showToolbarShortcutHints);
});

test('sanitizeGraphSettings preserves explicit showShortcutsUi boolean values', () => {
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: true }).showShortcutsUi, true);
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: false }).showShortcutsUi, false);
  assert.equal(sanitizeGraphSettings({ showToolbarShortcutHints: true }).showToolbarShortcutHints, true);
  assert.equal(sanitizeGraphSettings({ showToolbarShortcutHints: false }).showToolbarShortcutHints, false);
});

test('sanitizeGraphSettings resets invalid showShortcutsUi values to true', () => {
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: 'nope' }).showShortcutsUi, true);
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: 0 }).showShortcutsUi, true);
  assert.equal(sanitizeGraphSettings({ showToolbarShortcutHints: 'nope' }).showToolbarShortcutHints, GRAPH_DEFAULTS.showToolbarShortcutHints);
});

test('validateGraphPayload accepts explicit showShortcutsUi booleans and rejects invalid values', () => {
  const makePayload = (showShortcutsUi) => ({
    name: 'Graph',
    settings: {
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      showShortcutsUi,
      showToolbarShortcutHints: true,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  assert.equal(validateGraphPayload(makePayload(true)), true);
  assert.equal(validateGraphPayload(makePayload(false)), true);
  assert.equal(validateGraphPayload(makePayload('hidden')), false);
  assert.equal(validateGraphPayload({
    ...makePayload(true),
    settings: {
      ...makePayload(true).settings,
      showToolbarShortcutHints: 'invalid',
    },
  }), false);
});
