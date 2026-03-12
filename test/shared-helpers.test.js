import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAutoAnchor, resolveAutoAnchors } from '../js/shared/anchors.js';
import { findBestFrameIdForNode, getNodeFrameOverlapArea } from '../js/shared/entities.js';
import { normalizeNodeSelection, areSelectionsEqual } from '../js/shared/selection.js';
import { createHistoryManager } from '../js/state/history.js';
import { clearTransientUiState } from '../js/state/ui.js';

test('resolveAutoAnchor chooses dominant horizontal direction', () => {
  assert.equal(resolveAutoAnchor({ x: 0, y: 0, width: 100, height: 80 }, { x: 300, y: 20, width: 100, height: 80 }), 'right');
  assert.equal(resolveAutoAnchor({ x: 300, y: 20, width: 100, height: 80 }, { x: 0, y: 0, width: 100, height: 80 }), 'left');
});

test('resolveAutoAnchors picks shortest-distance anchor pair for diagonal layout', () => {
  // Top-left node to bottom-right node: bottom→top is shorter than right→left
  const a = { x: 0, y: 0, width: 100, height: 50 };
  const b = { x: 80, y: 200, width: 100, height: 50 };
  const result = resolveAutoAnchors(a, b);
  assert.equal(result.fromAnchor, 'bottom');
  assert.equal(result.toAnchor, 'top');
});

test('resolveAutoAnchors picks cross-axis anchors when that is shorter', () => {
  // A above-left, B below-right with moderate diagonal offset
  const a = { x: 0, y: 0, width: 200, height: 50 };
  const b = { x: 180, y: 200, width: 200, height: 50 };
  // A bottom anchor: (100, 50), B top anchor: (280, 200) → dist² = 180²+150² = 54900
  // A bottom anchor: (100, 50), B left anchor: (180, 225) → dist² = 80²+175² = 37025
  // A right anchor: (200, 25), B top anchor: (280, 200) → dist² = 80²+175² = 37025
  // A right anchor: (200, 25), B left anchor: (180, 225) → dist² = 20²+200² = 40400
  // Both right→top and bottom→left tie — algorithm picks right→top first
  const result = resolveAutoAnchors(a, b);
  assert.equal(result.fromAnchor, 'right');
  assert.equal(result.toAnchor, 'top');
});

test('findBestFrameIdForNode prefers greatest overlap and later tie', () => {
  const node = { id: 'node-1', x: 40, y: 40, width: 80, height: 80 };
  const frames = [
    { id: 'frame-a', x: 0, y: 0, width: 80, height: 80 },
    { id: 'frame-b', x: 40, y: 40, width: 80, height: 80 },
    { id: 'frame-c', x: 40, y: 40, width: 80, height: 80 },
  ];
  assert.equal(getNodeFrameOverlapArea(node, frames[1]), 6400);
  assert.equal(findBestFrameIdForNode(node, frames), 'frame-c');
});

test('normalizeNodeSelection removes invalid ids and preserves primary when possible', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(normalizeNodeSelection(['a', 'z', 'a', 'c'], nodes, 'a'), {
    type: 'nodes',
    ids: ['a', 'c'],
    primaryId: 'a',
  });
  assert.equal(areSelectionsEqual(
    normalizeNodeSelection(['b'], nodes),
    { type: 'node', id: 'b' },
  ), true);
});

test('history manager snapshots and clears future on push', () => {
  const state = {
    name: 'Graph',
    settings: { backgroundStyle: 'dots' },
    nodes: [{ id: 'node-1' }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'node-1' },
    history: { past: [], future: [{ label: 'redo', data: {} }] },
  };
  const history = createHistoryManager(state);
  history.pushHistory('change');
  assert.equal(state.history.past.length, 1);
  assert.equal(state.history.future.length, 0);
  assert.deepEqual(history.snapshot().settings, { backgroundStyle: 'dots' });
  assert.deepEqual(history.snapshot().selection, { type: 'node', id: 'node-1' });
});

test('clearTransientUiState resets interactive ui flags', () => {
  const state = {
    ui: {
      edgeDraft: { fromNodeId: 'a' },
      edgeTwangId: 'edge-1',
      editingNodeId: 'node-1',
      focusedNodeId: 'node-1',
      editingFrameId: 'frame-1',
      isPanning: true,
      isDragging: true,
      isResizing: true,
      isConnecting: true,
      isDrawingFrame: true,
      frameDraft: { x: 0, y: 0, width: 10, height: 10 },
      frameMembershipPreview: { f: 'add' },
      nodeMembershipPreview: { n: 'remove' },
      isMarqueeSelecting: true,
      selectionMarquee: { left: 0, top: 0, width: 1, height: 1 },
    },
  };
  clearTransientUiState(state);
  assert.equal(state.ui.edgeDraft, null);
  assert.equal(state.ui.focusedNodeId, null);
  assert.deepEqual(state.ui.frameMembershipPreview, {});
  assert.equal(state.ui.isDrawingFrame, false);
  assert.equal(state.ui.selectionMarquee, null);
});
