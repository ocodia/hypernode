import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/state/store.js';
import { createRenderer } from '../js/render/renderer.js';
import { bindInteractions } from '../js/interaction/bindings.js';

test('top-level entry modules import successfully', () => {
  assert.equal(typeof createStore, 'function');
  assert.equal(typeof createRenderer, 'function');
  assert.equal(typeof bindInteractions, 'function');
});
