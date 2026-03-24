import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../js/state/store.js";
import { sanitizeEdge, validateGraphPayload } from "../js/utils/graph.js";

function createGraph(overrides = {}) {
  return {
    name: "Graph",
    settings: {},
    nodes: [
      { id: "a", title: "A", description: "", x: 0, y: 0, width: 100, height: 100 },
      { id: "b", title: "B", description: "", x: 320, y: 0, width: 100, height: 100 },
    ],
    frames: [],
    edges: [],
    ...overrides,
  };
}

test("sanitizeEdge defaults label to an empty string and clamps long labels", () => {
  assert.equal(
    sanitizeEdge({ id: "edge-1", from: "a", to: "b" }).label,
    "",
  );

  const longLabel = "x".repeat(140);
  assert.equal(
    sanitizeEdge({
      id: "edge-1",
      from: "a",
      to: "b",
      label: longLabel,
    }).label.length,
    120,
  );
});

test("validateGraphPayload accepts string edge labels and rejects non-string labels", () => {
  assert.equal(
    validateGraphPayload(
      createGraph({
        edges: [
          {
            id: "edge-1",
            from: "a",
            to: "b",
            fromAnchor: null,
            toAnchor: null,
            label: "depends on",
          },
        ],
      }),
    ),
    true,
  );

  assert.equal(
    validateGraphPayload(
      createGraph({
        edges: [
          {
            id: "edge-1",
            from: "a",
            to: "b",
            fromAnchor: null,
            toAnchor: null,
            label: 42,
          },
        ],
      }),
    ),
    false,
  );
});

test("edge labels persist through updateEdge and undo redo", () => {
  const store = createStore(
    createGraph({
      edges: [{ id: "edge-1", from: "a", to: "b", label: "" }],
    }),
  );

  store.updateEdge("edge-1", { label: "supports" });
  assert.equal(store.getState().edges[0].label, "supports");

  store.undo();
  assert.equal(store.getState().edges[0].label, "");

  store.redo();
  assert.equal(store.getState().edges[0].label, "supports");
});

test("clearing edge editing finalizes trimmed labels and allows empty values", () => {
  const store = createStore(
    createGraph({
      edges: [{ id: "edge-1", from: "a", to: "b", label: "start" }],
    }),
  );

  store.setSelection({ type: "edge", id: "edge-1" });
  store.setEditingEdge("edge-1");
  store.beginEdgeEdit();
  store.getState().edges[0].label = "  trimmed label  ";
  store.clearEditingEdge();
  assert.equal(store.getState().edges[0].label, "trimmed label");

  store.setSelection({ type: "edge", id: "edge-1" });
  store.setEditingEdge("edge-1");
  store.beginEdgeEdit();
  store.getState().edges[0].label = "   ";
  store.clearEditingEdge();
  assert.equal(store.getState().edges[0].label, "");
});

test("deleting a node clears edge editing state when its edited edge is removed", () => {
  const store = createStore(
    createGraph({
      edges: [{ id: "edge-1", from: "a", to: "b", label: "linked" }],
    }),
  );

  store.setSelection({ type: "edge", id: "edge-1" });
  store.setEditingEdge("edge-1");
  store.deleteNode("a");

  assert.equal(store.getState().ui.editingEdgeId, null);
  assert.equal(store.getState().edges.length, 0);
});
