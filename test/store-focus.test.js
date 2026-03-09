import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';

test('focused node clears when selection moves away', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [
      { id: 'n1', title: 'One', description: '', kind: 'text', x: 0, y: 0 },
      { id: 'n2', title: 'Two', description: '', kind: 'text', x: 80, y: 0 },
    ],
    frames: [],
    edges: [],
  });

  store.setSelection({ type: 'node', id: 'n1' });
  store.setFocusedNode('n1');
  store.setEditingNode('n1');
  store.setSelection({ type: 'node', id: 'n2' });

  const state = store.getState();
  assert.equal(state.ui.focusedNodeId, null);
  assert.equal(state.ui.editingNodeId, null);
});

test('clearFocusedNode finalizes editing and preserves selection', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [
      { id: 'n1', title: ' Draft ', description: 'hello', kind: 'text', x: 0, y: 0 },
    ],
    frames: [],
    edges: [],
  });

  store.setSelection({ type: 'node', id: 'n1' });
  store.setFocusedNode('n1');
  store.setEditingNode('n1');
  store.updateNode('n1', { title: ' Focused Title ', description: 'copy' }, { skipHistory: true });
  store.clearFocusedNode();

  const state = store.getState();
  assert.equal(state.selection?.id, 'n1');
  assert.equal(state.ui.focusedNodeId, null);
  assert.equal(state.ui.editingNodeId, null);
  assert.equal(state.nodes[0].title, 'Focused Title');
});

test('deleting a focused node clears focus state', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [
      { id: 'n1', title: 'One', description: '', kind: 'text', x: 0, y: 0 },
    ],
    frames: [],
    edges: [],
  });

  store.setSelection({ type: 'node', id: 'n1' });
  store.setFocusedNode('n1');
  store.setEditingNode('n1');
  store.deleteNode('n1');

  const state = store.getState();
  assert.equal(state.ui.focusedNodeId, null);
  assert.equal(state.ui.editingNodeId, null);
  assert.equal(state.selection, null);
});

test('updating a focused image node can replace image payload and size', () => {
  const store = createStore({
    name: 'Graph',
    settings: {},
    nodes: [
      { id: 'n1', title: 'Image', description: '', kind: 'image', x: 0, y: 0, imageData: 'data:image/png;base64,abc', imageAspectRatio: 1.5, width: 210, height: 204 },
    ],
    frames: [],
    edges: [],
  });

  store.setSelection({ type: 'node', id: 'n1' });
  store.setFocusedNode('n1');
  store.updateNode('n1', {
    kind: 'image',
    imageData: 'data:image/jpeg;base64,def',
    imageAspectRatio: 2,
    width: 320,
    height: 224,
  }, { skipHistory: true });

  const state = store.getState();
  assert.equal(state.nodes[0].imageData, 'data:image/jpeg;base64,def');
  assert.equal(state.nodes[0].imageAspectRatio, 2);
  assert.equal(state.nodes[0].width, 320);
  assert.equal(state.nodes[0].height, 224);
  assert.equal(state.ui.focusedNodeId, 'n1');
});
