import { VIEWPORT_LIMITS } from '../utils/constants.js';
import { exportGraph, importGraphFile } from '../persistence/file.js';

export function bindInteractions(elements, store) {
  const { workspace, canvas, nodesLayer, edgesGroup, edgeOverlayGroup, inspectorContent, importInput } = elements;

  let panSession = null;
  let dragSession = null;
  let edgeSession = null;
  let edgeTwangTimer = null;

  function endPanSession(pointerId = null) {
    if (!panSession) return;
    const activePointerId = panSession.pointerId;
    panSession = null;
    store.setPanning(false);
    if (pointerId === null || pointerId === activePointerId) {
      try {
        canvas.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function endDragSession(pointerId = null) {
    if (!dragSession) return;
    const activePointerId = dragSession.pointerId;
    dragSession = null;
    if (pointerId === null || pointerId === activePointerId) {
      try {
        nodesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function cancelEdgeSession(pointerId = null) {
    if (!edgeSession) return;
    const activePointerId = edgeSession.pointerId;
    edgeSession = null;
    store.clearEdgeDraft();
    if (pointerId === null || pointerId === activePointerId) {
      try {
        nodesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function updateEdgeDraft(event) {
    if (!edgeSession || edgeSession.pointerId !== event.pointerId) return;
    const pointer = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    const hoverAnchor = getAnchorAtClientPoint(event.clientX, event.clientY);
    const isValidTarget = hoverAnchor
      && hoverAnchor.nodeId !== edgeSession.invalidNodeId;

    store.setEdgeDraft({
      fromNodeId: edgeSession.fromNodeId,
      fromAnchor: edgeSession.fromAnchor,
      pointerX: pointer.x,
      pointerY: pointer.y,
      toNodeId: edgeSession.toNodeId || null,
      toAnchor: edgeSession.toAnchor || null,
      hoverNodeId: isValidTarget ? hoverAnchor.nodeId : null,
      hoverAnchor: isValidTarget ? hoverAnchor.anchor : null,
    });
  }

  function beginEdgeSession(event, anchorToken) {
    const parsed = parseAnchorToken(anchorToken);
    if (!parsed) return;

    endPanSession();
    endDragSession();
    cancelEdgeSession();

    edgeSession = {
      pointerId: event.pointerId,
      mode: 'create',
      fromNodeId: parsed.nodeId,
      fromAnchor: parsed.anchor,
      invalidNodeId: parsed.nodeId,
    };

    store.setSelection({ type: 'node', id: parsed.nodeId });
    nodesLayer.setPointerCapture(event.pointerId);
    updateEdgeDraft(event);
  }

  function beginReconnectSession(event, endpointToken) {
    const parsed = parseEdgeEndpointToken(endpointToken);
    if (!parsed) return;

    const state = store.getState();
    const edge = state.edges.find((item) => item.id === parsed.edgeId);
    if (!edge) return;
    const fromNode = getNode(edge.from, state);
    const toNode = getNode(edge.to, state);
    if (!fromNode || !toNode) return;

    const movingFrom = parsed.side === 'from';
    const fixedNodeId = movingFrom ? edge.to : edge.from;
    const fixedAnchor = movingFrom
      ? resolveAnchorName(edge.toAnchor, toNode, fromNode)
      : resolveAnchorName(edge.fromAnchor, fromNode, toNode);

    endPanSession();
    endDragSession();
    cancelEdgeSession();

    edgeSession = {
      pointerId: event.pointerId,
      mode: 'reconnect',
      edgeId: edge.id,
      movingSide: parsed.side,
      fromNodeId: fixedNodeId,
      fromAnchor: fixedAnchor,
      invalidNodeId: fixedNodeId,
      toNodeId: null,
      toAnchor: null,
    };

    store.setSelection({ type: 'edge', id: edge.id });
    nodesLayer.setPointerCapture(event.pointerId);
    updateEdgeDraft(event);
  }

  function finishEdgeSession(event) {
    if (!edgeSession || edgeSession.pointerId !== event.pointerId) return;
    const hoverAnchor = getAnchorAtClientPoint(event.clientX, event.clientY);
    let anchoredEdgeId = null;
    if (hoverAnchor && hoverAnchor.nodeId !== edgeSession.invalidNodeId) {
      if (edgeSession.mode === 'reconnect') {
        anchoredEdgeId = store.reconnectEdge(
          edgeSession.edgeId,
          edgeSession.movingSide,
          hoverAnchor.nodeId,
          hoverAnchor.anchor,
        );
      } else {
        anchoredEdgeId = store.addEdge(edgeSession.fromNodeId, hoverAnchor.nodeId, {
          fromAnchor: edgeSession.fromAnchor,
          toAnchor: hoverAnchor.anchor,
        });
      }
    }

    if (anchoredEdgeId) {
      triggerEdgeTwang(anchoredEdgeId);
    }
    cancelEdgeSession(event.pointerId);
  }

  function triggerEdgeTwang(edgeId) {
    store.setEdgeTwang(edgeId);
    if (edgeTwangTimer) {
      window.clearTimeout(edgeTwangTimer);
    }
    edgeTwangTimer = window.setTimeout(() => {
      edgeTwangTimer = null;
      store.clearEdgeTwang();
    }, 260);
  }

  canvas.addEventListener('dblclick', (event) => {
    if (event.target.closest('[data-node-id]')) return;
    const point = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    store.addNode(point);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-node-id], [data-edge-id], .panel, button, input, textarea, label')) return;

    cancelEdgeSession();
    endPanSession();
    store.clearSelection();
    panSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: store.getState().viewport.panX,
      startPanY: store.getState().viewport.panY,
    };
    store.setPanning(true);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    const dx = event.clientX - panSession.startX;
    const dy = event.clientY - panSession.startY;
    store.setViewport({
      panX: panSession.startPanX + dx,
      panY: panSession.startPanY + dy,
    });
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession(event.pointerId);
  });

  canvas.addEventListener('pointercancel', (event) => {
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession(event.pointerId);
  });

  canvas.addEventListener('lostpointercapture', (event) => {
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession();
  });

  workspace.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();

    const state = store.getState();
    const oldZoom = state.viewport.zoom;
    const zoomStep = Math.exp(-event.deltaY * 0.0015);
    const nextZoom = clamp(oldZoom * zoomStep, VIEWPORT_LIMITS.minZoom, VIEWPORT_LIMITS.maxZoom);

    const rect = canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const worldX = (cursorX - state.viewport.panX) / oldZoom;
    const worldY = (cursorY - state.viewport.panY) / oldZoom;

    store.setViewport({
      zoom: nextZoom,
      panX: cursorX - worldX * nextZoom,
      panY: cursorY - worldY * nextZoom,
    });
  }, { passive: false });

  nodesLayer.addEventListener('pointerdown', (event) => {
    const anchorEl = event.target.closest('[data-node-anchor]');
    if (anchorEl && event.button === 0) {
      beginEdgeSession(event, anchorEl.dataset.nodeAnchor);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (event.target.closest('[data-node-editor], [data-node-edit-save], [data-node-edit-cancel], [data-node-edit-open]')) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl || event.button !== 0) return;

    endDragSession();
    cancelEdgeSession();

    const nodeId = nodeEl.dataset.nodeId;
    store.setSelection({ type: 'node', id: nodeId });
    store.setPanning(false);
    endPanSession();

    const node = getNode(nodeId, store.getState());
    if (!node) return;

    dragSession = {
      pointerId: event.pointerId,
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y,
      moved: false,
    };

    nodesLayer.setPointerCapture(event.pointerId);
    event.stopPropagation();
  });

  nodesLayer.addEventListener('dblclick', (event) => {
    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    const nodeId = nodeEl.dataset.nodeId;
    store.setSelection({ type: 'node', id: nodeId });
    store.setEditingNode(nodeId);
    event.stopPropagation();
    event.preventDefault();
  });

  nodesLayer.addEventListener('pointermove', (event) => {
    if (edgeSession && edgeSession.pointerId === event.pointerId) {
      updateEdgeDraft(event);
      return;
    }

    if (!dragSession || dragSession.pointerId !== event.pointerId) return;
    const viewport = store.getState().viewport;
    const dx = (event.clientX - dragSession.startX) / viewport.zoom;
    const dy = (event.clientY - dragSession.startY) / viewport.zoom;

    if (!dragSession.moved && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      store.beginNodeMove();
      dragSession.moved = true;
    }

    store.moveNode(dragSession.nodeId, dragSession.nodeStartX + dx, dragSession.nodeStartY + dy, { skipHistory: true });
  });

  nodesLayer.addEventListener('pointerup', (event) => {
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      finishEdgeSession(event);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('pointercancel', (event) => {
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession(event.pointerId);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('lostpointercapture', (event) => {
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession();
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession();
  });

  nodesLayer.addEventListener('click', (event) => {
    const openEl = event.target.closest('[data-node-edit-open]');
    if (openEl) {
      const nodeId = openEl.dataset.nodeEditOpen;
      store.setSelection({ type: 'node', id: nodeId });
      store.setEditingNode(nodeId);
      event.stopPropagation();
      return;
    }

    const saveEl = event.target.closest('[data-node-edit-save]');
    if (saveEl) {
      const nodeId = saveEl.dataset.nodeEditSave;
      const nodeEl = saveEl.closest('[data-node-id]');
      const titleInput = nodeEl?.querySelector(`[data-node-edit-title="${nodeId}"]`);
      const descriptionInput = nodeEl?.querySelector(`[data-node-edit-description="${nodeId}"]`);
      store.updateNode(nodeId, {
        title: titleInput?.value || '',
        description: descriptionInput?.value || '',
      });
      store.clearEditingNode();
      event.stopPropagation();
      return;
    }

    const cancelEl = event.target.closest('[data-node-edit-cancel]');
    if (cancelEl) {
      store.clearEditingNode();
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-node-editor]')) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    store.setSelection({ type: 'node', id: nodeEl.dataset.nodeId });
    event.stopPropagation();
  });

  function handleEdgeClick(event) {
    const deleteEl = event.target.closest('[data-edge-delete]');
    if (deleteEl) {
      store.deleteEdge(deleteEl.dataset.edgeDelete);
      event.stopPropagation();
      return;
    }

    const edgeEl = event.target.closest('[data-edge-id]');
    if (!edgeEl) return;
    store.setSelection({ type: 'edge', id: edgeEl.dataset.edgeId });
    event.stopPropagation();
  }

  edgesGroup.addEventListener('click', handleEdgeClick);
  edgeOverlayGroup.addEventListener('click', handleEdgeClick);

  function handleEdgeEndpointPointerDown(event) {
    if (event.button !== 0) return;
    const endpointEl = event.target.closest('[data-edge-endpoint]');
    if (!endpointEl) return;
    beginReconnectSession(event, endpointEl.dataset.edgeEndpoint);
    event.stopPropagation();
    event.preventDefault();
  }

  edgesGroup.addEventListener('pointerdown', handleEdgeEndpointPointerDown);
  edgeOverlayGroup.addEventListener('pointerdown', handleEdgeEndpointPointerDown);

  inspectorContent.addEventListener('click', (event) => {
    if (event.target.id === 'delete-node-btn') {
      const state = store.getState();
      if (state.selection?.type === 'node') {
        store.deleteNode(state.selection.id);
      }
    }
    if (event.target.id === 'delete-edge-btn') {
      const state = store.getState();
      if (state.selection?.type === 'edge') {
        store.deleteEdge(state.selection.id);
      }
    }
  });

  document.getElementById('add-node-btn').addEventListener('click', () => {
    const { viewport } = store.getState();
    store.addNode({ x: (120 - viewport.panX) / viewport.zoom, y: (120 - viewport.panY) / viewport.zoom });
  });

  document.getElementById('reset-view-btn').addEventListener('click', () => store.resetView());
  document.getElementById('undo-btn').addEventListener('click', () => store.undo());
  document.getElementById('redo-btn').addEventListener('click', () => store.redo());

  document.getElementById('export-btn').addEventListener('click', () => {
    const state = store.getState();
    exportGraph({ nodes: state.nodes, edges: state.edges });
    store.setImportStatus('Exported graph JSON.');
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;

    try {
      const graph = await importGraphFile(file);
      store.replaceGraph(graph);
      store.setImportStatus('Graph imported successfully.');
    } catch {
      store.setImportStatus('Import failed: invalid JSON graph file.');
    } finally {
      importInput.value = '';
    }
  });

  document.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;

    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (ctrlOrCmd && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      store.undo();
      return;
    }

    if (ctrlOrCmd && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      store.redo();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selection = store.getState().selection;
      if (!selection) return;
      event.preventDefault();
      if (selection.type === 'node') store.deleteNode(selection.id);
      if (selection.type === 'edge') store.deleteEdge(selection.id);
      return;
    }

    if (event.key === 'Escape') {
      if (store.getState().ui.editingNodeId) {
        store.clearEditingNode();
        return;
      }
      if (edgeSession) {
        cancelEdgeSession();
        return;
      }
      store.clearSelection();
    }
  });
}

function toGraphPoint(clientX, clientY, canvasEl, viewport) {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (clientX - rect.left - viewport.panX) / viewport.zoom,
    y: (clientY - rect.top - viewport.panY) / viewport.zoom,
  };
}

function getNode(id, state) {
  return state.nodes.find((node) => node.id === id) || null;
}

function parseAnchorToken(value) {
  if (!value || typeof value !== 'string') return null;
  const [nodeId, anchor] = value.split(':');
  if (!nodeId || !isAnchorName(anchor)) return null;
  return { nodeId, anchor };
}

function getAnchorAtClientPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const anchorEl = el.closest('[data-node-anchor]');
  if (!anchorEl) return null;
  return parseAnchorToken(anchorEl.dataset.nodeAnchor);
}

function isAnchorName(anchor) {
  return anchor === 'top' || anchor === 'right' || anchor === 'bottom' || anchor === 'left';
}

function parseEdgeEndpointToken(value) {
  if (!value || typeof value !== 'string') return null;
  const [edgeId, side] = value.split(':');
  if (!edgeId || (side !== 'from' && side !== 'to')) return null;
  return { edgeId, side };
}

function resolveAnchorName(anchor, fromNode, toNode) {
  if (isAnchorName(anchor)) return anchor;
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"]');
}
