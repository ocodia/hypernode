import test from 'node:test';
import assert from 'node:assert/strict';

import { GRAPH_DEFAULTS } from '../js/utils/constants.js';
import { sanitizeGraphSettings, validateGraphPayload } from '../js/utils/graph.js';

test('sanitizeGraphSettings defaults showShortcutsUi to true when missing', () => {
  const settings = sanitizeGraphSettings({});

  assert.equal(settings.showShortcutsUi, true);
  assert.equal(settings.showShortcutsUi, GRAPH_DEFAULTS.showShortcutsUi);
});

test('sanitizeGraphSettings preserves explicit showShortcutsUi boolean values', () => {
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: true }).showShortcutsUi, true);
  assert.equal(sanitizeGraphSettings({ showShortcutsUi: false }).showShortcutsUi, false);
});

test('sanitizeGraphSettings accepts new anchored ui positions and migrates legacy toolbar positions', () => {
  const settings = sanitizeGraphSettings({
    toolbarPosition: 'top-center',
    toolbarOrientation: 'vertical',
    toastPosition: 'top-right',
    metaPosition: 'bottom-left',
  });

  assert.equal(settings.toolbarPosition, 'top-left');
  assert.equal(settings.toolbarOrientation, 'vertical');
  assert.equal(settings.toastPosition, 'top-right');
  assert.equal(settings.metaPosition, 'bottom-left');
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
});

test('validateGraphPayload accepts explicit showShortcutsUi booleans and rejects invalid values', () => {
  const makePayload = (showShortcutsUi) => ({
    name: 'Graph',
    settings: {
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      toolbarOrientation: 'horizontal',
      toastPosition: 'top-right',
      metaPosition: 'bottom-left',
      showShortcutsUi,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  assert.equal(validateGraphPayload(makePayload(true)), true);
  assert.equal(validateGraphPayload(makePayload(false)), true);
  assert.equal(validateGraphPayload(makePayload('hidden')), false);
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
      toolbarPosition: 'top-right',
      toolbarOrientation: 'vertical',
      toastPosition: 'bottom-right',
      metaPosition: 'top-left',
      showShortcutsUi: true,
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

test('validateGraphPayload rejects invalid new anchored ui positions', () => {
  assert.equal(validateGraphPayload({
    name: 'Graph',
    settings: {
      toolbarPosition: 'center',
      toolbarOrientation: 'diagonal',
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      toastPosition: 'top-left',
      metaPosition: 'bottom-right',
      showShortcutsUi: true,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  }), false);
});
