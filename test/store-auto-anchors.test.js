import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';
import { validateGraphPayload } from '../js/utils/graph.js';

function createGraph(overrides = {}) {
  return {
    name: 'Graph',
    settings: {
      anchorsMode: 'auto',
      ...overrides.settings,
    },
    nodes: [
      { id: 'a', title: 'A', description: '', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', title: 'B', description: '', x: 320, y: 0, width: 100, height: 100 },
      { id: 'c', title: 'C', description: '', x: 0, y: 320, width: 100, height: 100 },
    ],
    frames: [],
    edges: [],
    ...overrides,
  };
}

test('connectNodes rewrites stored anchors to resolved auto anchors', () => {
  const store = createStore(createGraph(), { anchorsMode: 'auto' });

  store.connectNodes('a', 'top', 'b', 'top');

  assert.deepEqual(store.getState().edges[0], {
    id: store.getState().edges[0].id,
    from: 'a',
    to: 'b',
    fromAnchor: 'right',
    toAnchor: 'left',
  });
});

test('reconnectEdge rewrites both stored anchors in auto mode', () => {
  const store = createStore(createGraph({
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: 'right', toAnchor: 'left' }],
  }), { anchorsMode: 'auto' });

  store.reconnectEdge('edge-1', 'to', 'c', 'left');

  assert.deepEqual(store.getState().edges[0], {
    id: 'edge-1',
    from: 'a',
    to: 'c',
    fromAnchor: 'bottom',
    toAnchor: 'top',
  });
});

test('moving a node updates stored anchors when auto resolution changes sides', () => {
  const store = createStore(createGraph({
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: 'right', toAnchor: 'left' }],
  }), { anchorsMode: 'auto' });

  store.moveNode('b', 40, 320);

  assert.equal(store.getState().edges[0].fromAnchor, 'bottom');
  assert.equal(store.getState().edges[0].toAnchor, 'top');
});

test('resizing a node updates stored anchors when centers cross dominant axis', () => {
  const store = createStore(createGraph({
    nodes: [
      { id: 'a', title: 'A', description: '', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', title: 'B', description: '', x: 320, y: 0, width: 100, height: 100 },
    ],
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: 'right', toAnchor: 'left' }],
  }), { anchorsMode: 'auto' });

  store.resizeNode('b', { width: 100, height: 900 });

  assert.equal(store.getState().edges[0].fromAnchor, 'bottom');
  assert.equal(store.getState().edges[0].toAnchor, 'top');
});

test('switching from auto to exact freezes the last synchronized anchors', () => {
  const store = createStore(createGraph({
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: 'right', toAnchor: 'left' }],
  }), { anchorsMode: 'auto' });

  store.moveNode('b', 40, 320);
  store.setAnchorsMode('exact');
  store.moveNode('b', 320, 0);

  assert.equal(store.getState().settings.anchorsMode, 'exact');
  assert.equal(store.getState().edges[0].fromAnchor, 'bottom');
  assert.equal(store.getState().edges[0].toAnchor, 'top');
});

test('replaceGraph normalizes stale and null anchors immediately when current app settings use auto anchors', () => {
  const store = createStore(createGraph({
    settings: { anchorsMode: 'auto' },
  }), { anchorsMode: 'auto' });

  store.replaceGraph(createGraph({
    nodes: [
      { id: 'a', title: 'A', description: '', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', title: 'B', description: '', x: 0, y: 320, width: 100, height: 100 },
    ],
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: null, toAnchor: 'left' }],
  }));

  assert.equal(store.getState().settings.anchorsMode, 'auto');
  assert.equal(store.getState().edges[0].fromAnchor, 'bottom');
  assert.equal(store.getState().edges[0].toAnchor, 'top');
});

test('validateGraphPayload accepts null stored anchors for backward-compatible auto normalization', () => {
  assert.equal(validateGraphPayload(createGraph({
    edges: [{ id: 'edge-1', from: 'a', to: 'b', fromAnchor: null, toAnchor: null }],
  })), true);
});
