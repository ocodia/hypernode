
import { createId } from '../utils/id.js';
import {
  emptyGraphState,
  sanitizeEdge,
  sanitizeFrame,
  sanitizeGraphName,
  sanitizeGraphSettings,
  sanitizeNode,
} from '../utils/graph.js';
import {
  FRAME_DEFAULTS,
  IMAGE_NODE_DEFAULTS,
  NODE_COLOR_KEYS,
  NODE_DEFAULTS,
  VIEWPORT_LIMITS,
} from '../utils/constants.js';

export function createStore(initialGraph = null) {
  let state = emptyGraphState();
  if (initialGraph) {
    state.name = sanitizeGraphName(initialGraph.name);
    state.settings = sanitizeGraphSettings(initialGraph.settings);
    state.frames = (Array.isArray(initialGraph.frames) ? initialGraph.frames : []).map(sanitizeFrame);
    const frameIds = new Set(state.frames.map((frame) => frame.id));
    state.nodes = initialGraph.nodes.map((node) => sanitizeNode(node, frameIds));
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
      frames: structuredClone(state.frames),
      edges: structuredClone(state.edges),
      selection: cloneSelection(state.selection),
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
    const nextId = id || null;
    if (state.ui.editingFrameId && state.ui.editingFrameId !== nextId) {
      finalizeEditingFrameText(state.ui.editingFrameId);
      state.ui.editingFrameId = null;
    }
    if (state.ui.editingNodeId && state.ui.editingNodeId !== nextId) {
      finalizeEditingNodeText(state.ui.editingNodeId);
    }
    state.ui.editingNodeId = nextId;
    notify();
  }

  function clearEditingNode() {
    if (!state.ui.editingNodeId) return;
    finalizeEditingNodeText(state.ui.editingNodeId);
    state.ui.editingNodeId = null;
    notify();
  }

  function setEditingFrame(id) {
    const nextId = id || null;
    if (state.ui.editingNodeId && state.ui.editingNodeId !== nextId) {
      finalizeEditingNodeText(state.ui.editingNodeId);
      state.ui.editingNodeId = null;
    }
    if (state.ui.editingFrameId && state.ui.editingFrameId !== nextId) {
      finalizeEditingFrameText(state.ui.editingFrameId);
    }
    state.ui.editingFrameId = nextId;
    notify();
  }

  function clearEditingFrame() {
    if (!state.ui.editingFrameId) return;
    finalizeEditingFrameText(state.ui.editingFrameId);
    state.ui.editingFrameId = null;
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

  function setFrameDrawing(isDrawingFrame) {
    state.ui.isDrawingFrame = Boolean(isDrawingFrame);
    notify();
  }

  function setFrameDraft(frameDraft) {
    state.ui.frameDraft = frameDraft || null;
    notify();
  }

  function clearFrameDraft() {
    if (!state.ui.frameDraft) return;
    state.ui.frameDraft = null;
    notify();
  }

  function setSelectionMarquee(marquee) {
    if (!marquee) {
      state.ui.selectionMarquee = null;
      state.ui.isMarqueeSelecting = false;
      notify();
      return;
    }
    state.ui.selectionMarquee = {
      left: Number(marquee.left) || 0,
      top: Number(marquee.top) || 0,
      width: Math.max(0, Number(marquee.width) || 0),
      height: Math.max(0, Number(marquee.height) || 0),
    };
    state.ui.isMarqueeSelecting = true;
    notify();
  }

  function setSelection(selection) {
    const current = state.selection;
    const sameSelection = areSelectionsEqual(current, selection);
    if (sameSelection) {
      return;
    }

    state.selection = cloneSelection(selection);
    if (state.ui.editingNodeId) {
      const keepEditing = isNodeSelected(state.selection, state.ui.editingNodeId);
      if (!keepEditing) {
        finalizeEditingNodeText(state.ui.editingNodeId);
        state.ui.editingNodeId = null;
      }
    }
    if (state.ui.editingFrameId) {
      const keepEditing = isFrameSelected(state.selection, state.ui.editingFrameId);
      if (!keepEditing) {
        finalizeEditingFrameText(state.ui.editingFrameId);
        state.ui.editingFrameId = null;
      }
    }
    notify();
  }

  function setNodeSelection(ids, options = {}) {
    const normalized = normalizeNodeSelection(ids, state.nodes, options.primaryId);
    setSelection(normalized);
  }

  function addNodeToSelection(nodeId) {
    if (!nodeId) return;
    const nodeExists = state.nodes.some((node) => node.id === nodeId);
    if (!nodeExists) return;
    const ids = getSelectedNodeIds(state.selection);
    if (!ids.includes(nodeId)) {
      ids.push(nodeId);
    }
    setNodeSelection(ids, { primaryId: nodeId });
  }

  function toggleNodeInSelection(nodeId) {
    if (!nodeId) return;
    const nodeExists = state.nodes.some((node) => node.id === nodeId);
    if (!nodeExists) return;
    const ids = getSelectedNodeIds(state.selection);
    const nextIds = ids.includes(nodeId)
      ? ids.filter((id) => id !== nodeId)
      : [...ids, nodeId];
    setNodeSelection(nextIds, { primaryId: nodeId });
  }

  function clearSelection() {
    if (state.ui.editingNodeId) {
      finalizeEditingNodeText(state.ui.editingNodeId);
    }
    if (state.ui.editingFrameId) {
      finalizeEditingFrameText(state.ui.editingFrameId);
    }
    state.selection = null;
    state.ui.editingNodeId = null;
    state.ui.editingFrameId = null;
    notify();
  }

  function addNode({
    x,
    y,
    title = NODE_DEFAULTS.title,
    description = '',
    kind = 'text',
    imageData = null,
    imageAspectRatio = null,
    width = null,
    height = null,
    frameId = null,
  }, options = {}) {
    if (!options.skipHistory) pushHistory('add-node');
    const resolvedColorKey = options.colorKey !== undefined
      ? sanitizeColorKey(options.colorKey)
      : sanitizeColorKey(state.settings.nodeColorDefault);
    const node = sanitizeNode({
      id: createId('node'),
      title,
      description,
      kind,
      ...(kind === IMAGE_NODE_DEFAULTS.kind ? { imageData, imageAspectRatio } : {}),
      x,
      y,
      ...(width === null ? {} : { width }),
      ...(height === null ? {} : { height }),
      ...(frameId ? { frameId } : {}),
      colorKey: resolvedColorKey,
    }, new Set(state.frames.map((frame) => frame.id)));

    if (!node.frameId && options.resolveFrameMembership !== false) {
      const bestFrameId = findBestFrameIdForNode(node);
      if (bestFrameId) {
        node.frameId = bestFrameId;
      }
    }

    state.nodes.push(node);
    state.selection = { type: 'node', id: node.id };
    notify();
    return node;
  }

  function addFrame({
    x,
    y,
    width = FRAME_DEFAULTS.width,
    height = FRAME_DEFAULTS.height,
    title = FRAME_DEFAULTS.title,
    description = '',
    colorKey = null,
  }, options = {}) {
    if (!options.skipHistory) pushHistory('add-frame');

    const frame = sanitizeFrame({
      id: createId('frame'),
      title,
      description,
      x,
      y,
      width,
      height,
      colorKey,
    });

    state.frames.push(frame);

    if (options.assignOverlaps !== false) {
      for (const node of state.nodes) {
        if (node.frameId) continue;
        const area = getNodeFrameOverlapArea(node, frame);
        if (area > 0) {
          node.frameId = frame.id;
        }
      }
    }

    state.selection = { type: 'frame', id: frame.id };
    notify();
    return frame;
  }
  function updateNode(id, patch, options = {}) {
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    if (!options.skipHistory) pushHistory('update-node');
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
    if (patch.frameId === null || patch.frameId === undefined || patch.frameId === '') {
      delete node.frameId;
    } else if (typeof patch.frameId === 'string' && state.frames.some((frame) => frame.id === patch.frameId)) {
      node.frameId = patch.frameId;
    }
    if (!options.skipNotify) {
      notify();
    }
  }

  function updateFrame(id, patch, options = {}) {
    const frame = state.frames.find((item) => item.id === id);
    if (!frame) return;
    if (!options.skipHistory) pushHistory('update-frame');
    if (typeof patch.title === 'string') {
      const title = patch.title.trim();
      frame.title = title || FRAME_DEFAULTS.title;
    }
    if (typeof patch.description === 'string') {
      frame.description = patch.description;
    }
    if (typeof patch.x === 'number') {
      frame.x = patch.x;
    }
    if (typeof patch.y === 'number') {
      frame.y = patch.y;
    }
    if (typeof patch.width === 'number') {
      frame.width = Math.max(FRAME_DEFAULTS.minWidth, patch.width);
    }
    if (typeof patch.height === 'number') {
      frame.height = Math.max(FRAME_DEFAULTS.minHeight, patch.height);
    }
    if (!options.skipNotify) {
      notify();
    }
  }

  function moveNode(id, x, y, options = {}) {
    const node = state.nodes.find((item) => item.id === id);
    if (!node) return;
    if (!options.skipHistory) pushHistory('move-node');
    node.x = x;
    node.y = y;
    notify();
  }

  function moveNodes(batch, options = {}) {
    if (!Array.isArray(batch) || batch.length === 0) return;
    if (!options.skipHistory) pushHistory('move-node');
    for (const entry of batch) {
      if (!entry || typeof entry.id !== 'string') continue;
      const node = state.nodes.find((item) => item.id === entry.id);
      if (!node) continue;
      if (typeof entry.x === 'number') node.x = entry.x;
      if (typeof entry.y === 'number') node.y = entry.y;
    }
    notify();
  }

  function moveFrame(id, x, y, options = {}) {
    const frame = state.frames.find((item) => item.id === id);
    if (!frame) return;
    if (!options.skipHistory) pushHistory('move-frame');
    const dx = x - frame.x;
    const dy = y - frame.y;
    frame.x = x;
    frame.y = y;

    if (options.moveMembers !== false && (dx !== 0 || dy !== 0)) {
      for (const node of state.nodes) {
        if (node.frameId === frame.id) {
          node.x += dx;
          node.y += dy;
        }
      }
    }

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

  function resizeFrame(id, patch, options = {}) {
    const frame = state.frames.find((item) => item.id === id);
    if (!frame) return;
    if (!options.skipHistory) pushHistory('resize-frame');
    if (typeof patch.x === 'number') {
      frame.x = patch.x;
    }
    if (typeof patch.y === 'number') {
      frame.y = patch.y;
    }
    if (typeof patch.width === 'number') {
      frame.width = Math.max(FRAME_DEFAULTS.minWidth, patch.width);
    }
    if (typeof patch.height === 'number') {
      frame.height = Math.max(FRAME_DEFAULTS.minHeight, patch.height);
    }
    notify();
  }

  function beginNodeMove() {
    pushHistory('move-node');
  }

  function beginNodeEdit() {
    pushHistory('update-node');
  }

  function beginNodeResize() {
    pushHistory('resize-node');
  }

  function beginFrameMove() {
    pushHistory('move-frame');
  }

  function beginFrameEdit() {
    pushHistory('update-frame');
  }

  function beginFrameResize() {
    pushHistory('resize-frame');
  }

  function deleteNode(id) {
    const index = state.nodes.findIndex((node) => node.id === id);
    if (index === -1) return;
    pushHistory('delete-node');
    state.nodes.splice(index, 1);
    state.edges = state.edges.filter((edge) => edge.from !== id && edge.to !== id);
    if (state.selection?.type === 'nodes') {
      const ids = state.selection.ids.filter((selectedId) => selectedId !== id);
      state.selection = normalizeNodeSelection(ids, state.nodes, state.selection.primaryId);
    } else if (state.selection?.id === id) {
      state.selection = null;
    }
    if (state.ui.editingNodeId === id) {
      state.ui.editingNodeId = null;
    }
    notify();
  }

  function deleteFrame(id) {
    const index = state.frames.findIndex((frame) => frame.id === id);
    if (index === -1) return;
    pushHistory('delete-frame');

    state.frames.splice(index, 1);
    for (const node of state.nodes) {
      if (node.frameId === id) {
        delete node.frameId;
      }
    }

    state.edges = state.edges.filter((edge) => edge.from !== id && edge.to !== id);

    if (state.selection?.type === 'frame' && state.selection.id === id) {
      state.selection = null;
    }

    if (state.ui.editingFrameId === id) {
      state.ui.editingFrameId = null;
    }

    notify();
  }

  function setNodesColor(ids, colorKey) {
    const targets = dedupeNodeTargets(ids);
    if (!targets.length) return;

    const normalizedColorKey = sanitizeColorKey(colorKey);
    const changed = targets.some((node) => (node.colorKey || null) !== normalizedColorKey);
    if (!changed) return;

    pushHistory('set-node-color');
    for (const node of targets) {
      applyColor(node, normalizedColorKey);
    }
    notify();
  }

  function setFramesColor(ids, colorKey) {
    const targets = dedupeFrameTargets(ids);
    if (!targets.length) return;

    const normalizedColorKey = sanitizeColorKey(colorKey);
    const changed = targets.some((frame) => (frame.colorKey || null) !== normalizedColorKey);
    if (!changed) return;

    pushHistory('set-frame-color');
    for (const frame of targets) {
      applyColor(frame, normalizedColorKey);
    }
    notify();
  }

  function deleteSelectedNodes() {
    const selectedNodeIds = getSelectedNodeIds(state.selection);
    if (!selectedNodeIds.length) return;
    const selected = new Set(selectedNodeIds);
    pushHistory('delete-node');
    state.nodes = state.nodes.filter((node) => !selected.has(node.id));
    state.edges = state.edges.filter((edge) => !selected.has(edge.from) && !selected.has(edge.to));
    if (state.ui.editingNodeId && selected.has(state.ui.editingNodeId)) {
      state.ui.editingNodeId = null;
    }
    state.selection = null;
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
    const fromEntity = getGraphEntity(from);
    const toEntity = getGraphEntity(to);
    if (!fromEntity || !toEntity) return null;

    pushHistory('add-edge');
    const edge = sanitizeEdge({
      id: createId('edge'),
      from,
      to,
      fromAnchor: resolveAutoAnchor(fromEntity, toEntity),
      toAnchor: resolveAutoAnchor(toEntity, fromEntity),
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

    const hasEndpoints = Boolean(getGraphEntity(fromNodeId)) && Boolean(getGraphEntity(toNodeId));
    if (!hasEndpoints) return null;

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

  function reconnectEdge(id, side, entityId, anchor = null) {
    const edge = state.edges.find((item) => item.id === id);
    if (!edge) return null;
    const hasEntity = Boolean(getGraphEntity(entityId));
    if (!hasEntity) return null;

    const next = {
      from: edge.from,
      to: edge.to,
      fromAnchor: edge.fromAnchor,
      toAnchor: edge.toAnchor,
    };

    if (side === 'from') {
      next.from = entityId;
      next.fromAnchor = anchor;
    } else if (side === 'to') {
      next.to = entityId;
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
    state.frames = (Array.isArray(graph.frames) ? graph.frames : []).map(sanitizeFrame);
    const frameIds = new Set(state.frames.map((frame) => frame.id));
    state.nodes = graph.nodes.map((node) => sanitizeNode(node, frameIds));
    state.edges = graph.edges.map(sanitizeEdge);
    state.selection = null;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    state.ui.editingFrameId = null;
    state.ui.isPanning = false;
    state.ui.isDragging = false;
    state.ui.isResizing = false;
    state.ui.isConnecting = false;
    state.ui.isDrawingFrame = false;
    state.ui.frameDraft = null;
    state.ui.isMarqueeSelecting = false;
    state.ui.selectionMarquee = null;
    notify();
  }

  function setNodeColorDefault(colorKey) {
    const nextValue = sanitizeColorKey(colorKey);
    if ((state.settings.nodeColorDefault || null) === nextValue) return;
    pushHistory('set-node-color-default');
    state.settings.nodeColorDefault = nextValue;
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

  function recomputeNodeFrameMembership(nodeIds, options = {}) {
    const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    const normalizedIds = ids.filter((id) => typeof id === 'string');
    if (!normalizedIds.length) return false;

    const changedNodes = [];
    for (const id of normalizedIds) {
      const node = state.nodes.find((entry) => entry.id === id);
      if (!node) continue;
      const nextFrameId = findBestFrameIdForNode(node);
      const current = node.frameId || null;
      if (current === nextFrameId) continue;
      changedNodes.push({ node, nextFrameId });
    }

    if (!changedNodes.length) return false;
    if (!options.skipHistory) {
      pushHistory('set-node-frame');
    }

    for (const entry of changedNodes) {
      if (entry.nextFrameId) {
        entry.node.frameId = entry.nextFrameId;
      } else {
        delete entry.node.frameId;
      }
    }

    notify();
    return true;
  }

  function undo() {
    const entry = state.history.past.pop();
    if (!entry) return;
    state.history.future.push({ label: 'undo', data: snapshot() });
    restoreSnapshot(entry.data);
    notify();
  }

  function redo() {
    const entry = state.history.future.pop();
    if (!entry) return;
    state.history.past.push({ label: 'redo', data: snapshot() });
    restoreSnapshot(entry.data);
    notify();
  }

  function restoreSnapshot(data) {
    state.name = data.name;
    state.settings = data.settings;
    state.nodes = data.nodes;
    state.frames = Array.isArray(data.frames) ? data.frames : [];
    state.edges = data.edges;
    state.selection = data.selection;
    state.ui.edgeDraft = null;
    state.ui.edgeTwangId = null;
    state.ui.editingNodeId = null;
    state.ui.editingFrameId = null;
    state.ui.isPanning = false;
    state.ui.isDragging = false;
    state.ui.isResizing = false;
    state.ui.isConnecting = false;
    state.ui.isDrawingFrame = false;
    state.ui.frameDraft = null;
    state.ui.isMarqueeSelecting = false;
    state.ui.selectionMarquee = null;
  }

  function finalizeEditingNodeText(nodeId) {
    if (!nodeId) return;
    const node = state.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const title = String(node.title ?? '').trim();
    node.title = title || NODE_DEFAULTS.title;
    node.description = String(node.description ?? '');
  }

  function finalizeEditingFrameText(frameId) {
    if (!frameId) return;
    const frame = state.frames.find((item) => item.id === frameId);
    if (!frame) return;
    const title = String(frame.title ?? '').trim();
    frame.title = title || FRAME_DEFAULTS.title;
    frame.description = String(frame.description ?? '');
  }

  function getGraphEntity(id) {
    const node = state.nodes.find((entry) => entry.id === id);
    if (node) return node;
    return state.frames.find((entry) => entry.id === id) || null;
  }

  function dedupeNodeTargets(ids) {
    const selectedIds = [];
    const seen = new Set();
    for (const id of Array.isArray(ids) ? ids : []) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      if (state.nodes.some((node) => node.id === id)) {
        selectedIds.push(id);
      }
    }
    return state.nodes.filter((node) => selectedIds.includes(node.id));
  }

  function dedupeFrameTargets(ids) {
    const selectedIds = [];
    const seen = new Set();
    for (const id of Array.isArray(ids) ? ids : []) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      if (state.frames.some((frame) => frame.id === id)) {
        selectedIds.push(id);
      }
    }
    return state.frames.filter((frame) => selectedIds.includes(frame.id));
  }

  function findBestFrameIdForNode(node) {
    let best = null;
    for (let index = 0; index < state.frames.length; index += 1) {
      const frame = state.frames[index];
      const area = getNodeFrameOverlapArea(node, frame);
      if (area <= 0) continue;
      if (!best || area > best.area || (area === best.area && index > best.index)) {
        best = { frameId: frame.id, area, index };
      }
    }
    return best?.frameId || null;
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
    setEditingFrame,
    clearEditingFrame,
    setPanning,
    setDragging,
    setResizing,
    setConnecting,
    setFrameDrawing,
    setFrameDraft,
    clearFrameDraft,
    setSelectionMarquee,
    setSelection,
    setNodeSelection,
    addNodeToSelection,
    toggleNodeInSelection,
    clearSelection,
    addNode,
    addFrame,
    updateNode,
    updateFrame,
    moveNode,
    moveNodes,
    moveFrame,
    resizeNode,
    resizeFrame,
    beginNodeMove,
    beginNodeEdit,
    beginNodeResize,
    beginFrameMove,
    beginFrameEdit,
    beginFrameResize,
    recomputeNodeFrameMembership,
    setNodesColor,
    setFramesColor,
    deleteNode,
    deleteFrame,
    deleteSelectedNodes,
    addEdge,
    connectNodes,
    reconnectEdge,
    deleteEdge,
    setGraphName,
    setBackgroundStyle,
    setAnchorsMode,
    setArrowheads,
    setArrowheadSizeStep,
    setNodeColorDefault,
    replaceGraph,
    setViewport,
    resetView,
    undo,
    redo,
  };
}
function resolveAutoAnchor(fromEntity, toEntity) {
  const fromCenter = getEntityCenter(fromEntity);
  const toCenter = getEntityCenter(toEntity);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

function getEntityCenter(entity) {
  const width = getEntityWidth(entity);
  const height = getEntityHeight(entity);
  return {
    x: (Number(entity.x) || 0) + (width / 2),
    y: (Number(entity.y) || 0) + (height / 2),
  };
}

function getNodeWidth(node) {
  const width = Number(node?.width);
  return Number.isFinite(width) && width > 0 ? width : NODE_DEFAULTS.width;
}

function getNodeHeight(node) {
  const height = Number(node?.height);
  if (Number.isFinite(height) && height > 0) return height;
  if (node?.kind === IMAGE_NODE_DEFAULTS.kind && Number(node?.imageAspectRatio) > 0) {
    return (getNodeWidth(node) / Number(node.imageAspectRatio)) + IMAGE_NODE_DEFAULTS.metaHeight;
  }
  return NODE_DEFAULTS.height;
}

function isFrameEntity(entity) {
  return entity && Number.isFinite(Number(entity.width)) && Number.isFinite(Number(entity.height))
    && !Object.prototype.hasOwnProperty.call(entity, 'kind');
}

function getEntityWidth(entity) {
  if (isFrameEntity(entity)) {
    const frameWidth = Number(entity?.width);
    return Number.isFinite(frameWidth) && frameWidth > 0 ? frameWidth : FRAME_DEFAULTS.width;
  }
  return getNodeWidth(entity);
}

function getEntityHeight(entity) {
  if (isFrameEntity(entity)) {
    const frameHeight = Number(entity?.height);
    return Number.isFinite(frameHeight) && frameHeight > 0 ? frameHeight : FRAME_DEFAULTS.height;
  }
  return getNodeHeight(entity);
}

function getNodeRect(node) {
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);
  const left = Number(node.x) || 0;
  const top = Number(node.y) || 0;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function getFrameRect(frame) {
  const left = Number(frame.x) || 0;
  const top = Number(frame.y) || 0;
  const width = Number(frame.width) || FRAME_DEFAULTS.width;
  const height = Number(frame.height) || FRAME_DEFAULTS.height;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function getNodeFrameOverlapArea(node, frame) {
  const nodeRect = getNodeRect(node);
  const frameRect = getFrameRect(frame);
  const overlapWidth = Math.max(0, Math.min(nodeRect.right, frameRect.right) - Math.max(nodeRect.left, frameRect.left));
  const overlapHeight = Math.max(0, Math.min(nodeRect.bottom, frameRect.bottom) - Math.max(nodeRect.top, frameRect.top));
  return overlapWidth * overlapHeight;
}

function applyColor(entity, colorKey) {
  if (colorKey === null) {
    delete entity.colorKey;
    return;
  }
  entity.colorKey = colorKey;
}

function sanitizeColorKey(colorKey) {
  if (colorKey === null || colorKey === undefined || colorKey === '') {
    return null;
  }
  if (typeof colorKey !== 'string') {
    return null;
  }
  return NODE_COLOR_KEYS.includes(colorKey) ? colorKey : null;
}

function areSelectionsEqual(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.type !== right.type) return false;
  if (left.type === 'nodes') {
    const leftIds = Array.isArray(left.ids) ? left.ids : [];
    const rightIds = Array.isArray(right.ids) ? right.ids : [];
    if (leftIds.length !== rightIds.length) return false;
    for (let index = 0; index < leftIds.length; index += 1) {
      if (leftIds[index] !== rightIds[index]) return false;
    }
    return (left.primaryId || null) === (right.primaryId || null);
  }
  return left.id === right.id;
}

function cloneSelection(selection) {
  if (!selection) return null;
  if (selection.type === 'nodes') {
    return {
      type: 'nodes',
      ids: Array.isArray(selection.ids) ? [...selection.ids] : [],
      primaryId: selection.primaryId || null,
    };
  }
  return { ...selection };
}

function getSelectedNodeIds(selection) {
  if (!selection) return [];
  if (selection.type === 'node') return [selection.id];
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) ? [...selection.ids] : [];
  }
  return [];
}

function isNodeSelected(selection, nodeId) {
  if (!nodeId || !selection) return false;
  if (selection.type === 'node') return selection.id === nodeId;
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) && selection.ids.includes(nodeId);
  }
  return false;
}

function isFrameSelected(selection, frameId) {
  if (!frameId || !selection) return false;
  return selection.type === 'frame' && selection.id === frameId;
}

function normalizeNodeSelection(ids, nodes, preferredPrimaryId = null) {
  const validIds = new Set((nodes || []).map((node) => node.id));
  const deduped = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || !validIds.has(id) || deduped.includes(id)) continue;
    deduped.push(id);
  }

  if (deduped.length === 0) return null;
  if (deduped.length === 1) {
    return { type: 'node', id: deduped[0] };
  }

  const primaryId = (preferredPrimaryId && deduped.includes(preferredPrimaryId))
    ? preferredPrimaryId
    : deduped[deduped.length - 1];
  return {
    type: 'nodes',
    ids: deduped,
    primaryId: primaryId || null,
  };
}
