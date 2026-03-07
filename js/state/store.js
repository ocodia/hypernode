import { createId } from '../utils/id.js';
import { emptyGraphState, sanitizeEdge, sanitizeNode } from '../utils/graph.js';
import { NODE_DEFAULTS, VIEWPORT_LIMITS } from '../utils/constants.js';

export function createStore(initialGraph = null) {
  let state = emptyGraphState();
  if (initialGraph) {
    state.nodes = initialGraph.nodes.map(sanitizeNode);
    state.edges = initialGraph.edges.map(sanitizeEdge);
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

  function setEdgeDraft(draft) {
    state.ui.edgeDraft = draft;
    notify();
  }

  function clearEdgeDraft() {
    if (!state.ui.edgeDraft) return;
    state.ui.edgeDraft = null;
    notify();
  }

  function setEdgeTwang(edgeId) {
    state.ui.edgeTwangId = edgeId || null;
    notify();
  }

  function clearEdgeTwang() {
    if (!state.ui.edgeTwangId) return;
    state.ui.edgeTwangId = null;
    notify();
  }

  function setEditingNode(id) {
    state.ui.editingNodeId = id || null;
    notify();
  }

  function clearEditingNode() {
    if (!state.ui.editingNodeId) return;
    state.ui.editingNodeId = null;
    notify();
  }

  function setPanning(isPanning) {
    state.ui.isPanning = Boolean(isPanning);
    notify();
  }

  function setSelection(selection) {
    const current = state.selection;
    const sameSelection = (!current && !selection)
      || (current && selection && current.type === selection.type && current.id === selection.id);
    if (sameSelection) {
      return;
    }

    state.selection = selection;
    if (state.ui.editingNodeId) {
      const keepEditing = selection?.type === 'node' && selection.id === state.ui.editingNodeId;
      if (!keepEditing) {
        state.ui.editingNodeId = null;
      }
    }
    notify();
  }

  function clearSelection() {
    state.selection = null;
    state.ui.editingNodeId = null;
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
    if (state.ui.editingNodeId === id) {
      state.ui.editingNodeId = null;
    }
    notify();
  }

  function addEdge(from, to) {
    if (!from || !to || from === to) return;
    const existingEdge = state.edges.find((edge) => edge.from === from && edge.to === to);
    if (existingEdge) {
      state.selection = { type: 'edge', id: existingEdge.id };
      notify();
      return existingEdge.id;
    }
    const hasNodes = state.nodes.some((node) => node.id === from) && state.nodes.some((node) => node.id === to);
    if (!hasNodes) return null;
    pushHistory('add-edge');
    const edge = {
      id: createId('edge'),
      from,
      to,
    };
    state.edges.push(edge);
    state.selection = { type: 'edge', id: edge.id };
    notify();
    return edge.id;
  }

  function reconnectEdge(id, side, nodeId) {
    const edge = state.edges.find((item) => item.id === id);
    if (!edge) return null;
    const hasNode = state.nodes.some((node) => node.id === nodeId);
    if (!hasNode) return null;

    const next = {
      from: edge.from,
      to: edge.to,
    };

    if (side === 'from') {
      next.from = nodeId;
    } else if (side === 'to') {
      next.to = nodeId;
    } else {
      return null;
    }

    if (next.from === next.to) return null;

    const duplicate = state.edges.find((item) => item.id !== id && item.from === next.from && item.to === next.to);
    if (duplicate) return null;

    const changed = edge.from !== next.from
      || edge.to !== next.to;
    if (!changed) return edge.id;

    pushHistory('reconnect-edge');
    edge.from = next.from;
    edge.to = next.to;
    state.selection = { type: 'edge', id: edge.id };
    notify();
    return edge.id;
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
    state.edges = graph.edges.map(sanitizeEdge);
    state.selection = null;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
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

  function undo() {
    const entry = state.history.past.pop();
    if (!entry) return;
    state.history.future.push({ label: 'undo', data: snapshot() });
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    notify();
  }

  function redo() {
    const entry = state.history.future.pop();
    if (!entry) return;
    state.history.past.push({ label: 'redo', data: snapshot() });
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    notify();
  }

  return {
    getState,
    subscribe,
    setImportStatus,
    setEdgeDraft,
    clearEdgeDraft,
    setEdgeTwang,
    clearEdgeTwang,
    setEditingNode,
    clearEditingNode,
    setPanning,
    setSelection,
    clearSelection,
    addNode,
    updateNode,
    moveNode,
    beginNodeMove,
    deleteNode,
    addEdge,
    reconnectEdge,
    deleteEdge,
    replaceGraph,
    setViewport,
    resetView,
    undo,
    redo,
  };
}
