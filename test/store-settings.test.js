import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';

test('setToastPosition resolves conflicts and undo/redo restores settings', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      toolbarPosition: 'bottom-right',
      toastPosition: 'bottom-left',
      metaPosition: 'top-left',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  store.setToastPosition('bottom-right');
  assert.equal(store.getState().settings.toastPosition, 'bottom-left');
  assert.equal(store.getState().settings.metaPosition, 'top-left');

  store.undo();
  assert.equal(store.getState().settings.toastPosition, 'bottom-left');

  store.redo();
  assert.equal(store.getState().settings.toastPosition, 'bottom-left');
});

test('setToolbarPosition updates dependent anchored ui positions and undo restores them together', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      toolbarPosition: 'top-left',
      toolbarOrientation: 'horizontal',
      toastPosition: 'top-right',
      metaPosition: 'bottom-right',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  store.setToolbarPosition('bottom-right');
  assert.equal(store.getState().settings.toolbarPosition, 'bottom-right');
  assert.equal(store.getState().settings.toastPosition, 'top-right');
  assert.equal(store.getState().settings.metaPosition, 'bottom-left');

  store.undo();
  assert.equal(store.getState().settings.toolbarPosition, 'top-left');
  assert.equal(store.getState().settings.metaPosition, 'bottom-right');
});

test('setToolbarOrientation updates state and undo/redo restores it', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      toolbarPosition: 'top-left',
      toolbarOrientation: 'horizontal',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  store.setToolbarOrientation('vertical');
  assert.equal(store.getState().settings.toolbarOrientation, 'vertical');

  store.undo();
  assert.equal(store.getState().settings.toolbarOrientation, 'horizontal');

  store.redo();
  assert.equal(store.getState().settings.toolbarOrientation, 'vertical');
});

test('setEnabledThemePresets rehomes the active theme and undo/redo restores the list', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      uiThemePreset: 'blueprint',
      enabledThemePresets: ['blueprint', 'paper', 'dusk'],
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  store.setEnabledThemePresets(['paper', 'dusk']);
  assert.deepEqual(store.getState().settings.enabledThemePresets, ['paper', 'dusk']);
  assert.equal(store.getState().settings.uiThemePreset, 'paper');

  store.undo();
  assert.deepEqual(store.getState().settings.enabledThemePresets, ['blueprint', 'paper', 'dusk']);
  assert.equal(store.getState().settings.uiThemePreset, 'blueprint');

  store.redo();
  assert.deepEqual(store.getState().settings.enabledThemePresets, ['paper', 'dusk']);
  assert.equal(store.getState().settings.uiThemePreset, 'paper');
});

test('replaceGraph preserves current app settings instead of adopting imported graph settings', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      backgroundStyle: 'graph-paper',
      uiThemePreset: 'paper',
      enabledThemePresets: ['paper', 'dusk'],
      uiRadiusPreset: 'rounded',
      toolbarPosition: 'bottom-left',
      toolbarOrientation: 'horizontal',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  store.replaceGraph({
    name: 'Imported Graph',
    settings: {
      backgroundStyle: 'dots',
      uiThemePreset: 'chalkboard',
      enabledThemePresets: ['chalkboard', 'dusk'],
      uiRadiusPreset: 'soft',
      toolbarPosition: 'top-left',
      toolbarOrientation: 'vertical',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  const state = store.getState();
  assert.equal(state.name, 'Imported Graph');
  assert.equal(state.settings.backgroundStyle, 'graph-paper');
  assert.equal(state.settings.uiThemePreset, 'paper');
  assert.deepEqual(state.settings.enabledThemePresets, ['paper', 'dusk']);
  assert.equal(state.settings.uiRadiusPreset, 'rounded');
  assert.equal(state.settings.toolbarPosition, 'bottom-left');
  assert.equal(state.settings.toolbarOrientation, 'horizontal');
});

test('createStore uses graph settings when explicit app settings are not provided', () => {
  const store = createStore({
    name: 'Graph',
    settings: {
      uiThemePreset: 'chalkboard',
      enabledThemePresets: ['chalkboard', 'paper'],
      uiRadiusPreset: 'soft',
      toolbarPosition: 'bottom-right',
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  const { settings } = store.getState();
  assert.equal(settings.uiThemePreset, 'chalkboard');
  assert.deepEqual(settings.enabledThemePresets, ['chalkboard', 'paper']);
  assert.equal(settings.uiRadiusPreset, 'soft');
  assert.equal(settings.toolbarPosition, 'bottom-right');
});
