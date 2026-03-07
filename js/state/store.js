import { createId } from '../utils/id.js';
import { emptyGraphState, sanitizeEdge, sanitizeGraphName, sanitizeGraphSettings, sanitizeNode } from '../utils/graph.js';
import { NODE_DEFAULTS, VIEWPORT_LIMITS } from '../utils/constants.js';

export function createStore(initialGraph = null) {
  let state = emptyGraphState();
  if (initialGraph) {
    state.name = sanitizeGraphName(initialGraph.name);
    state.settings = sanitizeGraphSettings(initialGraph.settings);
    state.nodes = initialGraph.nodes.map(sanitizeNode);
    state.edges = initialGraph.edges.map(sanitizeEdge);
  }

  const listeners = new Set();
  let importStatusTimeoutHandle = null;

  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function snapshot() {
    return {
      name: state.name,
      settings: structuredClone(state.settings),
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
    state.ui.importStatus = String(message ?? '');
    notify();

    if (importStatusTimeoutHandle) {
      clearTimeout(importStatusTimeoutHandle);
      importStatusTimeoutHandle = null;
    }

    const currentMessage = state.ui.importStatus.trim();
    if (!currentMessage) return;

    importStatusTimeoutHandle = setTimeout(() => {
      importStatusTimeoutHandle = null;
      if (!state.ui.importStatus.trim()) return;
      state.ui.importStatus = '';
      notify();
    }, 5000);
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

  function setDragging(isDragging) {
    state.ui.isDragging = Boolean(isDragging);
    notify();
  }

  function setResizing(isResizing) {
    state.ui.isResizing = Boolean(isResizing);
    notify();
  }

  function setConnecting(isConnecting) {
    state.ui.isConnecting = Boolean(isConnecting);
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

  function resizeNode(id, patch, options = {}) {
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    if (!options.skipHistory) pushHistory('resize-node');
    if (typeof patch.x === 'number') {
      node.x = patch.x;
    }
    if (typeof patch.y === 'number') {
      node.y = patch.y;
    }
    if (typeof patch.width === 'number') {
      node.width = patch.width;
    }
    if (typeof patch.height === 'number') {
      node.height = patch.height;
    }
    notify();
  }

  function beginNodeMove() {
    pushHistory('move-node');
  }

  function beginNodeResize() {
    pushHistory('resize-node');
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
    const fromNode = state.nodes.find((node) => node.id === from);
    const toNode = state.nodes.find((node) => node.id === to);
    if (!fromNode || !toNode) return null;

    pushHistory('add-edge');
    const edge = sanitizeEdge({
      id: createId('edge'),
      from,
      to,
      fromAnchor: resolveAutoAnchor(fromNode, toNode),
      toAnchor: resolveAutoAnchor(toNode, fromNode),
    });
    state.edges.push(edge);
    state.selection = { type: 'edge', id: edge.id };
    notify();
    return edge.id;
  }

  function connectNodes(fromNodeId, fromAnchor, toNodeId, toAnchor) {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return null;
    const existingEdge = state.edges.find((edge) => edge.from === fromNodeId && edge.to === toNodeId);
    if (existingEdge) {
      state.selection = { type: 'edge', id: existingEdge.id };
      notify();
      return existingEdge.id;
    }

    const hasNodes = state.nodes.some((node) => node.id === fromNodeId) && state.nodes.some((node) => node.id === toNodeId);
    if (!hasNodes) return null;

    pushHistory('add-edge');
    const edge = sanitizeEdge({
      id: createId('edge'),
      from: fromNodeId,
      to: toNodeId,
      fromAnchor,
      toAnchor,
    });
    state.edges.push(edge);
    state.selection = { type: 'edge', id: edge.id };
    notify();
    return edge.id;
  }

  function reconnectEdge(id, side, nodeId, anchor = null) {
    const edge = state.edges.find((item) => item.id === id);
    if (!edge) return null;
    const hasNode = state.nodes.some((node) => node.id === nodeId);
    if (!hasNode) return null;

    const next = {
      from: edge.from,
      to: edge.to,
      fromAnchor: edge.fromAnchor,
      toAnchor: edge.toAnchor,
    };

    if (side === 'from') {
      next.from = nodeId;
      next.fromAnchor = anchor;
    } else if (side === 'to') {
      next.to = nodeId;
      next.toAnchor = anchor;
    } else {
      return null;
    }

    if (next.from === next.to) return null;

    const duplicate = state.edges.find((item) => item.id !== id && item.from === next.from && item.to === next.to);
    if (duplicate) return null;

    const changed = edge.from !== next.from
      || edge.to !== next.to
      || edge.fromAnchor !== next.fromAnchor
      || edge.toAnchor !== next.toAnchor;
    if (!changed) return edge.id;

    pushHistory('reconnect-edge');
    edge.from = next.from;
    edge.to = next.to;
    edge.fromAnchor = next.fromAnchor;
    edge.toAnchor = next.toAnchor;
    state.selection = { type: 'edge', id: edge.id };
    notify();
    return edge.id;
  }

  function setGraphName(name) {
    const nextName = sanitizeGraphName(name);
    if (state.name === nextName) return;
    pushHistory('set-graph-name');
    state.name = nextName;
    notify();
  }

  function setBackgroundStyle(backgroundStyle) {
    const nextValue = sanitizeGraphSettings({ ...state.settings, backgroundStyle }).backgroundStyle;
    if (state.settings.backgroundStyle === nextValue) return;
    pushHistory('set-background-style');
    state.settings.backgroundStyle = nextValue;
    notify();
  }

  function setAnchorsMode(anchorsMode) {
    const nextValue = sanitizeGraphSettings({ ...state.settings, anchorsMode }).anchorsMode;
    if (state.settings.anchorsMode === nextValue) return;
    pushHistory('set-anchors-mode');
    state.settings.anchorsMode = nextValue;
    notify();
  }

  function setArrowheads(arrowheads) {
    const nextValue = sanitizeGraphSettings({ ...state.settings, arrowheads }).arrowheads;
    if (state.settings.arrowheads === nextValue) return;
    pushHistory('set-arrowheads');
    state.settings.arrowheads = nextValue;
    notify();
  }

  function setArrowheadSizeStep(arrowheadSizeStep) {
    const nextValue = sanitizeGraphSettings({ ...state.settings, arrowheadSizeStep }).arrowheadSizeStep;
    if (state.settings.arrowheadSizeStep === nextValue) return;
    pushHistory('set-arrowhead-size-step');
    state.settings.arrowheadSizeStep = nextValue;
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
    state.name = sanitizeGraphName(graph.name);
    state.settings = sanitizeGraphSettings(graph.settings);
    state.nodes = graph.nodes.map(sanitizeNode);
    state.edges = graph.edges.map(sanitizeEdge);
    state.selection = null;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    state.ui.isPanning = false;
    state.ui.isDragging = false;
    state.ui.isResizing = false;
    state.ui.isConnecting = false;
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
    state.name = entry.data.name;
    state.settings = entry.data.settings;
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    state.ui.isPanning = false;
    state.ui.isDragging = false;
    state.ui.isResizing = false;
    state.ui.isConnecting = false;
    notify();
  }

  function redo() {
    const entry = state.history.future.pop();
    if (!entry) return;
    state.history.past.push({ label: 'redo', data: snapshot() });
    state.name = entry.data.name;
    state.settings = entry.data.settings;
    state.nodes = entry.data.nodes;
    state.edges = entry.data.edges;
    state.selection = entry.data.selection;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    state.ui.isPanning = false;
    state.ui.isDragging = false;
    state.ui.isResizing = false;
    state.ui.isConnecting = false;
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
    setDragging,
    setResizing,
    setConnecting,
    setSelection,
    clearSelection,
    addNode,
    updateNode,
    moveNode,
    resizeNode,
    beginNodeMove,
    beginNodeResize,
    deleteNode,
    addEdge,
    connectNodes,
    reconnectEdge,
    deleteEdge,
    setGraphName,
    setBackgroundStyle,
    setAnchorsMode,
    setArrowheads,
    setArrowheadSizeStep,
    replaceGraph,
    setViewport,
    resetView,
    undo,
    redo,
  };
}

function resolveAutoAnchor(fromNode, toNode) {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}
