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

test('setShowToolbarShortcutHints updates state and undo/redo restores it', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [],
    frames: [],
    edges: [],
  });

  assert.equal(store.getState().settings.showToolbarShortcutHints, false);

  store.setShowToolbarShortcutHints(true);
  assert.equal(store.getState().settings.showToolbarShortcutHints, true);

  store.undo();
  assert.equal(store.getState().settings.showToolbarShortcutHints, false);

  store.redo();
  assert.equal(store.getState().settings.showToolbarShortcutHints, true);
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
      showShortcutsUi: false,
      showToolbarShortcutHints: true,
      nodeColorDefault: null,
    },
    nodes: [],
    frames: [],
    edges: [],
  });

  const state = store.getState();
  assert.equal(state.name, 'Imported Graph');
  assert.equal(state.settings.showShortcutsUi, false);
  assert.equal(state.settings.showToolbarShortcutHints, true);
});
