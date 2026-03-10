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

test('sanitizeGraphSettings accepts all curated ui theme presets', () => {
  for (const preset of ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'soft-black']) {
    assert.equal(sanitizeGraphSettings({ uiThemePreset: preset }).uiThemePreset, preset);
  }
});

test('sanitizeGraphSettings migrates legacy ui theme preset ids', () => {
  assert.equal(sanitizeGraphSettings({ uiThemePreset: 'graphite' }).uiThemePreset, 'blueprint');
  assert.equal(sanitizeGraphSettings({ uiThemePreset: 'mist' }).uiThemePreset, 'slate');
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

test('validateGraphPayload accepts the expanded curated ui theme preset list', () => {
  const makePayload = (uiThemePreset) => ({
    name: 'Graph',
    settings: {
      uiThemePreset,
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      showShortcutsUi: true,
      showToolbarShortcutHints: false,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  for (const preset of ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'soft-black']) {
    assert.equal(validateGraphPayload(makePayload(preset)), true);
  }
  assert.equal(validateGraphPayload(makePayload('graphite')), true);
  assert.equal(validateGraphPayload(makePayload('mist')), true);
  assert.equal(validateGraphPayload(makePayload('nocturne')), false);
});
