import { VIEWPORT_LIMITS } from '../utils/constants.js';
import { exportGraph, importGraphFile } from '../persistence/file.js';

export function bindInteractions(elements, store) {
  const { workspace, canvas, nodesLayer, edgesGroup, inspectorContent, importInput } = elements;

  let panSession = null;
  let dragSession = null;

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

  canvas.addEventListener('dblclick', (event) => {
    if (event.target.closest('[data-node-id]')) return;
    const point = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    store.addNode(point);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-node-id], [data-edge-id], .panel, button, input, textarea, label')) return;

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
    const handleEl = event.target.closest('[data-edge-handle]');
    if (handleEl && event.button === 0) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl || event.button !== 0) return;

    endDragSession();
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

  nodesLayer.addEventListener('pointermove', (event) => {
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
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('pointercancel', (event) => {
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('lostpointercapture', (event) => {
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession();
  });

  nodesLayer.addEventListener('click', (event) => {
    const handle = event.target.closest('[data-edge-handle]');
    if (handle) {
      const sourceId = handle.dataset.edgeHandle;
      const draft = store.getState().ui.edgeDraftFrom;
      if (!draft) {
        store.setEdgeDraftFrom(sourceId);
      } else if (draft !== sourceId) {
        store.addEdge(draft, sourceId);
        store.setEdgeDraftFrom(null);
      } else {
        store.setEdgeDraftFrom(null);
      }
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    const targetId = nodeEl.dataset.nodeId;
    const draft = store.getState().ui.edgeDraftFrom;
    if (draft && draft !== targetId) {
      store.addEdge(draft, targetId);
      store.setEdgeDraftFrom(null);
      event.stopPropagation();
      return;
    }
    store.setSelection({ type: 'node', id: targetId });
    event.stopPropagation();
  });

  edgesGroup.addEventListener('click', (event) => {
    const edgeEl = event.target.closest('[data-edge-id]');
    if (!edgeEl) return;
    store.setSelection({ type: 'edge', id: edgeEl.dataset.edgeId });
    event.stopPropagation();
  });

  inspectorContent.addEventListener('input', (event) => {
    const state = store.getState();
    if (state.selection?.type !== 'node') return;
    if (event.target.id === 'node-title-input') {
      store.updateNode(state.selection.id, { title: event.target.value });
    }
    if (event.target.id === 'node-description-input') {
      store.updateNode(state.selection.id, { description: event.target.value });
    }
  });

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
    }

    if (event.key === 'Escape') {
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"]');
}
