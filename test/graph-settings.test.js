import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeAppSettings, validateGraphPayload } from '../js/utils/graph.js';

test('sanitizeAppSettings accepts current anchored ui positions', () => {
  const settings = sanitizeAppSettings({
    toolbarPosition: 'top-left',
    toolbarOrientation: 'vertical',
    toastPosition: 'top-right',
    metaPosition: 'bottom-left',
  });

  assert.equal(settings.toolbarPosition, 'top-left');
  assert.equal(settings.toolbarOrientation, 'vertical');
  assert.equal(settings.toastPosition, 'top-right');
  assert.equal(settings.metaPosition, 'bottom-left');
});

test('sanitizeAppSettings accepts all current curated ui theme presets', () => {
  for (const preset of ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'chalkboard']) {
    assert.equal(sanitizeAppSettings({ uiThemePreset: preset }).uiThemePreset, preset);
  }
});

test('sanitizeAppSettings accepts only current radius presets', () => {
  for (const preset of ['sharp', 'soft', 'rounded']) {
    assert.equal(sanitizeAppSettings({ uiRadiusPreset: preset }).uiRadiusPreset, preset);
  }
  assert.equal(sanitizeAppSettings({ uiRadiusPreset: 'square' }).uiRadiusPreset, 'rounded');
});

test('validateGraphPayload accepts the current curated ui theme preset list', () => {
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
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  for (const preset of ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'chalkboard']) {
    assert.equal(validateGraphPayload(makePayload(preset)), true);
  }
  assert.equal(validateGraphPayload(makePayload('soft-black')), false);
  assert.equal(validateGraphPayload(makePayload('graphite')), false);
});

test('validateGraphPayload rejects invalid current ui settings', () => {
  assert.equal(validateGraphPayload({
    name: 'Graph',
    settings: {
      uiRadiusPreset: 'square',
      toolbarPosition: 'center',
      toolbarOrientation: 'diagonal',
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      toastPosition: 'top-left',
      metaPosition: 'bottom-right',
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  }), false);
});
