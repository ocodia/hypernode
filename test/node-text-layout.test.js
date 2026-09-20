import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/state/store.js';
import { validateGraphPayload } from '../js/utils/graph.js';
test('new nodes are untitled and centered; batch layouts preserve geometry and undo together', () => {
  const store = createStore();
  const a = store.addNode({ x: 24, y: 24 });
  const b = store.addNode({ x: 300, y: 24 });
  assert.equal(a.title, '');
  assert.equal(a.textPosition, 'middle');
  assert.equal(a.textAlign, 'center');
  const before = structuredClone(store.getState().nodes);
  store.setNodesTextLayout([a.id, b.id], {textPosition: 'below', textAlign: 'right'});
  assert.equal(store.getState().nodes[0].width, before[0].width);
  assert.equal(store.getState().nodes[1].textPosition, 'below');
  const reloaded = createStore(JSON.parse(JSON.stringify(store.getState())));
  assert.equal(reloaded.getState().nodes[0].textAlign, 'right');
  store.undo();
  assert.deepEqual(store.getState().nodes, before);
  store.redo();
  assert.equal(store.duplicateNode(a.id).textPosition, 'below');
});
test('invalid text layouts are rejected; legacy nodes default to middle/center', () => {
  const graph = { name: 'Legacy', nodes: [{id:'a', x:0,y:0}], edges:[],frames:[] };
  assert.equal(createStore(graph).getState().nodes[0].textAlign, 'center');
  for (const patch of [{textAlign:'justify'}, {textPosition:'outside'}]) {
    assert.equal(validateGraphPayload({...graph,nodes:[{...graph.nodes[0],...patch}]}),false);
  }
});
