import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/state/store.js';
import { sanitizeNode, validateGraphPayload } from '../js/utils/graph.js';
import { buildNodeContentMarkup, renderNodes } from '../js/render/modules/nodes.js';
const imageData = 'data:image/png;base64,aGVsbG8=';

test('empty and missing titles survive edit completion, reload, and duplication without headings', () => {
  const store = createStore();
  const node = store.addNode({ x: 0, y: 0, title: 'Remove me' });
  store.setEditingNode(node.id);
  store.updateNode(node.id, { title: '   ' });
  store.clearEditingNode();
  assert.equal(store.getState().nodes[0].title, '');
  assert.equal(sanitizeNode({ id: 'missing' }).title, '');
  assert.equal(sanitizeNode(store.getState().nodes[0]).title, '');
  assert.equal(store.duplicateNode(node.id).title, '');
  for (const isFocused of [true, false]) {
    const markup = buildNodeContentMarkup(store.getState().nodes[0], { isFocused });
    assert.doesNotMatch(markup, /<h3|Untitled Node/);
    assert.match(buildNodeContentMarkup(store.getState().nodes[0], { isFocused, isEditing: true }), /aria-label="Name"/);
  }
});

test('image fill round-trips and supports undo and normal layout restoration', () => {
  const store = createStore();
  const node = store.addNode({ x: 0, y: 0, kind: 'image', imageData, imageAspectRatio: 2, title: '' });
  store.updateNode(node.id, { imageFill: true });
  assert.equal(sanitizeNode(store.getState().nodes[0]).imageFill, true);
  assert.equal(store.duplicateNode(node.id).imageFill, true);
  store.undo();
  store.undo();
  assert.equal(Boolean(store.getState().nodes[0].imageFill), false);
  store.redo();
  for (const shape of ['rectangle', 'circle', 'diamond']) {
    store.setNodesShape([node.id], shape);
    const layer = { innerHTML: '' };
    renderNodes(layer, store.getState());
    assert.match(layer.innerHTML, /class="node__image-fill"/);
    assert.doesNotMatch(buildNodeContentMarkup(store.getState().nodes[0]), /node__image-pane/);
    assert.match(buildNodeContentMarkup(store.getState().nodes[0], { isFocused: true }), /node__image-pane/);
  }
  store.updateNode(node.id, { imageFill: false });
  assert.match(buildNodeContentMarkup(store.getState().nodes[0]), /node__image-pane/);
  assert.equal(validateGraphPayload({name: 'Test', nodes: [{...node, imageFill: 'yes'}], frames: [], edges: []}), false);
});
