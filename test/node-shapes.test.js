import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/state/store.js';
import { sanitizeNode, validateGraphPayload } from '../js/utils/graph.js';

const empty = () => ({ name: 'Shapes', nodes: [], edges: [], frames: [] });
test('shape conversion preserves node content, membership and connections across undo/redo', () => {
  const store = createStore(empty());
  const frame = store.addFrame({ x: 0, y: 0, width: 600, height: 600 });
  const node = store.addNode({ x: 24, y: 24, title: 'Decision', description: 'Keep me', frameId: frame.id });
  const other = store.addNode({ x: 700, y: 0 });
  store.addEdge(node.id, other.id);
  const before = structuredClone(store.getState());
  store.setNodesShape([node.id], 'circle');
  const changed = store.getState().nodes.find(n => n.id === node.id);
  assert.equal(changed.width, changed.height);
  assert.equal(changed.frameId, frame.id);
  assert.equal(changed.description, 'Keep me');
  assert.deepEqual(store.getState().edges, before.edges);
  store.undo();
  assert.deepEqual(store.getState().nodes, before.nodes);
  store.redo();
  assert.equal(store.getState().nodes.find(n => n.id === node.id).shape, 'circle');
});
test('circles remain square on creation, resizing and reload', () => {
  for (const snapToGrid of [true, false]) {
    const store = createStore(empty(), { snapToGrid });
    const node = store.addNode({ x: 0, y: 0, shape: 'circle', width: 300, height: 120 });
    assert.equal(node.width, node.height);
    store.resizeNode(node.id, { x: -24, y: -48, width: 350, height: 380 });
    const resized = store.getState().nodes[0];
    assert.equal(resized.width, resized.height);
    const loaded = createStore(JSON.parse(JSON.stringify(store.getState()))).getState().nodes[0];
    assert.equal(loaded.shape, 'circle');
    assert.equal(loaded.width, loaded.height);
    assert.equal(store.duplicateNode(node.id).shape, 'circle');
  }
});
test('shape validation supports legacy rectangles and rejects unknown shapes', () => {
  const legacy = { id: 'n', x: 0, y: 0 };
  assert.equal(sanitizeNode(legacy).shape, 'rectangle');
  assert.equal(sanitizeNode({ ...legacy, shape: 'circle', width: 300, height: 100 }).height, 300);
  for (const shape of ['rectangle', 'circle', 'diamond']) {
    assert.equal(validateGraphPayload({ ...empty(), nodes: [{ ...legacy, shape }] }), true);
  }
  assert.equal(validateGraphPayload({ ...empty(), nodes: [{ ...legacy, shape: 'oval' }] }), false);
});
