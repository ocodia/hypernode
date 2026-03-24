import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';
import { FRAME_DEFAULTS, NODE_DEFAULTS } from '../js/utils/constants.js';

test('new nodes default to grid-aligned position and size', () => {
  const store = createStore({
    name: 'Graph',
    nodes: [],
    frames: [],
    edges: [],
  });

  const node = store.addNode({ x: 13, y: 37 });

  assert.equal(node.x, 24);
  assert.equal(node.y, 48);
  assert.equal(node.width, NODE_DEFAULTS.width);
  assert.equal(node.height, NODE_DEFAULTS.height);
});

test('node move and resize stay snapped while snap-to-grid is enabled', () => {
  const store = createStore({
    name: 'Graph',
    nodes: [],
    frames: [],
    edges: [],
  });

  const node = store.addNode({ x: 0, y: 0 });
  store.moveNode(node.id, 25, 49);
  store.resizeNode(node.id, { x: 11, y: 13, width: 193, height: 70 });

  const updated = store.getState().nodes.find((entry) => entry.id === node.id);
  assert.equal(updated.x, 0);
  assert.equal(updated.y, 24);
  assert.equal(updated.width, 192);
  assert.equal(updated.height, 72);
});

test('new frames and frame geometry updates stay snapped to grid', () => {
  const store = createStore({
    name: 'Graph',
    nodes: [],
    frames: [],
    edges: [],
  });

  const frame = store.addFrame({ x: 13, y: 37, width: 350, height: 205 });
  store.moveFrame(frame.id, 61, 86, { moveMembers: false });
  store.resizeFrame(frame.id, { x: 85, y: 97, width: 227, height: 151 });

  const updated = store.getState().frames.find((entry) => entry.id === frame.id);
  assert.equal(updated.x, 96);
  assert.equal(updated.y, 96);
  assert.equal(updated.width, 216);
  assert.equal(updated.height, FRAME_DEFAULTS.minHeight);
});
