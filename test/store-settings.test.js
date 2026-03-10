import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';

test('setShowShortcutsUi updates state and undo/redo restores it', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [],
    frames: [],
    edges: [],
  });

  assert.equal(store.getState().settings.showShortcutsUi, true);

  store.setShowShortcutsUi(false);
  assert.equal(store.getState().settings.showShortcutsUi, false);

  store.undo();
  assert.equal(store.getState().settings.showShortcutsUi, true);

  store.redo();
  assert.equal(store.getState().settings.showShortcutsUi, false);
});

test('setToastPosition updates state, resolves conflicts, and undo/redo restores it', () => {
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

test('replaceGraph restores persisted showShortcutsUi from imported graph', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [],
    frames: [],
    edges: [],
  });

  store.replaceGraph({
    name: 'Imported Graph',
    settings: {
      backgroundStyle: 'dots',
      anchorsMode: 'auto',
      arrowheads: 'shown',
      arrowheadSizeStep: 0,
      toolbarPosition: 'top-left',
      toolbarOrientation: 'vertical',
      toastPosition: 'top-right',
      metaPosition: 'bottom-left',
      showShortcutsUi: false,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  const state = store.getState();
  assert.equal(state.name, 'Imported Graph');
  assert.equal(state.settings.toolbarPosition, 'top-left');
  assert.equal(state.settings.toolbarOrientation, 'vertical');
  assert.equal(state.settings.toastPosition, 'top-right');
  assert.equal(state.settings.metaPosition, 'bottom-left');
  assert.equal(state.settings.showShortcutsUi, false);
});
