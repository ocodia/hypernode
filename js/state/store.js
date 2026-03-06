import { createId } from '../utils/id.js';
import { emptyGraphState, sanitizeNode } from '../utils/graph.js';
import { NODE_DEFAULTS, VIEWPORT_LIMITS } from '../utils/constants.js';

export function createStore(initialGraph = null) {
  let state = emptyGraphState();
  if (initialGraph) {
    state.nodes = initialGraph.nodes.map(sanitizeNode);
    state.edges = initialGraph.edges.map((edge) => ({ ...edge }));
  }

  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function snapshot() {
    return {
      nodes: structuredClone(state.nodes),
      edges: structuredClone(state.edges),
      selection: state.selection ? { ...state.selection } : null,
    };
  }

  function pushHistory(actionLabel) {
    state.history.past.push({ label: actionLabel, data: snapshot() });
    if (state.history.past.length > 100) {
      state.history.past.shift();
    }
    state.history.future = [];
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setImportStatus(message) {
    state.ui.importStatus = message;
    notify();
  }

  function setSelection(selection) {
    state.selection = selection;
    notify();
  }

  function clearSelection() {
    state.selection = null;
    state.ui.edgeDraftFrom = null;
    notify();
  }

  function addNode({ x, y, title = NODE_DEFAULTS.title, description = '' }, options = {}) {
    if (!options.skipHistory) pushHistory('add-node');
    const node = sanitizeNode({ id: createId('node'), title, description, x, y });
    state.nodes.push(node);
    state.selection = { type: 'node', id: node.id };
    notify();
    return node;
  }

  function updateNode(id, patch) {
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    pushHistory('update-node');
    if (typeof patch.title === 'string') {
      const title = patch.title.trim();
      node.title = title || NODE_DEFAULTS.title;
    }
    if (typeof patch.description === 'string') {
      node.description = patch.description;
    }
    if (typeof patch.x === 'number') {
      node.x = patch.x;
    }
    if (typeof patch.y === 'number') {
      node.y = patch.y;
    }
    notify();
  }

  function moveNode(id, x, y, options = {}) {
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    if (!options.skipHistory) pushHistory('move-node');
    node.x = x;
    node.y = y;
    notify();
  }

  function beginNodeMove() {
    pushHistory('move-node');
  }

  function deleteNode(id) {
    const index = state.nodes.findIndex((node) => node.id === id);
    if (index === -1) return;
    pushHistory('delete-node');
    state.nodes.splice(index, 1);
    state.edges = state.edges.filter((edge) => edge.from !== id && edge.to !== id);
    if (state.selection?.id === id) {
      state.selection = null;
    }
    notify();
  }

  function addEdge(from, to) {
    if (!from || !to || from === to) return;
    const exists = state.edges.some((edge) => edge.from === from && edge.to === to);
    if (exists) return;
    const hasNodes = state.nodes.some((node) => node.id === from) && state.nodes.some((node) => node.id === to);
    if (!hasNodes) return;
    pushHistory('add-edge');
    const edge = { id: createId('edge'), from, to };
    state.edges.push(edge);
    state.selection = { type: 'edge', id: edge.id };
    notify();
  }

  function deleteEdge(id) {
    const index = state.edges.findIndex((edge) => edge.id === id);
    if (index === -1) return;
    pushHistory('delete-edge');
    state.edges.splice(index, 1);
    if (state.selection?.id === id) {
      state.selection = null;
    }
    notify();
  }

  function replaceGraph(graph) {
    pushHistory('import-graph');
    state.nodes = graph.nodes.map(sanitizeNode);
    state.edges = graph.edges.map((edge) => ({ ...edge }));
    state.selection = null;
    state.ui.edgeDraftFrom = null;
    notify();
  }

  function setViewport(next) {
    state.viewport.panX = Number.isFinite(next.panX) ? next.panX : state.viewport.panX;
    state.viewport.panY = Number.isFinite(next.panY) ? next.panY : state.viewport.panY;
    state.viewport.zoom = Math.min(
      VIEWPORT_LIMITS.maxZoom,
      Math.max(VIEWPORT_LIMITS.minZoom, Number.isFinite(next.zoom) ? next.zoom : state.viewport.zoom),
    );
    notify();
  }

  function resetView() {
    setViewport({
      panX: VIEWPORT_LIMITS.defaultPanX,
      panY: VIEWPORT_LIMITS.defaultPanY,
      zoom: VIEWPORT_LIMITS.defaultZoom,
    });
  }

  function setEdgeDraftFrom(nodeId) {
    state.ui.edgeDraftFrom = nodeId;
    notify();
  }

  function undo() {
    const entry = state.history.past.pop();
    if (!entry) return;
    state.history.future.push({ label: 'undo', data: snapshot() });
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraftFrom = null;
    notify();
  }

  function redo() {
    const entry = state.history.future.pop();
    if (!entry) return;
    state.history.past.push({ label: 'redo', data: snapshot() });
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraftFrom = null;
    notify();
  }

  return {
    getState,
    subscribe,
    setImportStatus,
    setSelection,
    clearSelection,
    addNode,
    updateNode,
    moveNode,
    beginNodeMove,
    deleteNode,
    addEdge,
    deleteEdge,
    replaceGraph,
    setViewport,
    resetView,
    setEdgeDraftFrom,
    undo,
    redo,
  };
}
