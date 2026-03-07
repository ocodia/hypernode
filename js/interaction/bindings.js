import { GRAPH_DEFAULTS, NODE_DEFAULTS, VIEWPORT_LIMITS } from '../utils/constants.js';
import { openGraphFile, saveGraphFile, supportsFileSystemAccess } from '../persistence/file.js';

const THEME_STORAGE_KEY = 'hypernode.theme.v1';

export function bindInteractions(elements, store) {
  const { workspace, canvas, nodesLayer, edgesGroup, edgeOverlayGroup } = elements;
  const canUseFileSystemAccess = supportsFileSystemAccess();
  let currentFileHandle = null;

  let panSession = null;
  let dragSession = null;
  let resizeSession = null;
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
    store.setDragging(false);
    if (pointerId === null || pointerId === activePointerId) {
      try {
        nodesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function endResizeSession(pointerId = null) {
    if (!resizeSession) return;
    const activePointerId = resizeSession.pointerId;
    resizeSession = null;
    store.setResizing(false);
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
    store.setConnecting(false);
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
    const state = store.getState();
    const pointer = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
    const hoverNodeId = getNodeIdAtClientPoint(event.clientX, event.clientY);
    const sourceNode = getNode(edgeSession.fromNodeId, state);
    const targetNode = hoverNodeId ? getNode(hoverNodeId, state) : null;
    const isValidTarget = sourceNode && targetNode && targetNode.id !== edgeSession.invalidNodeId;
    const hoverAnchor = isValidTarget
      ? resolveSessionTargetAnchor({
        sourceNode,
        targetNode,
        pointer,
        viewport: state.viewport,
        canvasEl: canvas,
        anchorsMode: state.settings.anchorsMode,
      })
      : null;

    store.setEdgeDraft({
      fromNodeId: edgeSession.fromNodeId,
      fromAnchor: edgeSession.fromAnchor,
      pointerX: pointer.x,
      pointerY: pointer.y,
      toNodeId: edgeSession.toNodeId || null,
      toAnchor: edgeSession.toAnchor || null,
      hoverNodeId: isValidTarget ? targetNode.id : null,
      hoverAnchor,
    });
  }

  function beginEdgeSession(event, anchorToken) {
    const parsed = parseAnchorToken(anchorToken);
    if (!parsed) return;

    endPanSession();
    endDragSession();
    endResizeSession();
    cancelEdgeSession();

    edgeSession = {
      pointerId: event.pointerId,
      mode: 'create',
      fromNodeId: parsed.nodeId,
      fromAnchor: parsed.anchor,
      invalidNodeId: parsed.nodeId,
    };

    store.setConnecting(true);
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
    const fixedNode = movingFrom ? toNode : fromNode;
    const movingNode = movingFrom ? fromNode : toNode;
    const fixedStoredAnchor = movingFrom ? edge.toAnchor : edge.fromAnchor;
    const fixedAnchor = resolveEffectiveAnchorForSession(fixedStoredAnchor, fixedNode, movingNode, store.getState().settings.anchorsMode);

    endPanSession();
    endDragSession();
    endResizeSession();
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

    store.setConnecting(true);
    store.setSelection({ type: 'edge', id: edge.id });
    nodesLayer.setPointerCapture(event.pointerId);
    updateEdgeDraft(event);
  }

  function beginResizeSession(event, resizeToken) {
    const parsed = parseNodeResizeToken(resizeToken);
    if (!parsed) return;

    const state = store.getState();
    const node = getNode(parsed.nodeId, state);
    if (!node) return;

    const nodeEl = event.target.closest('[data-node-id]');
    const initialWidth = Number(node.width) > 0
      ? Number(node.width)
      : (nodeEl?.offsetWidth || NODE_DEFAULTS.width);
    const initialHeight = Number(node.height) > 0
      ? Number(node.height)
      : (nodeEl?.offsetHeight || NODE_DEFAULTS.height);

    endPanSession();
    endDragSession();
    cancelEdgeSession();
    endResizeSession();

    resizeSession = {
      pointerId: event.pointerId,
      nodeId: parsed.nodeId,
      corner: parsed.corner,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: node.x,
      startTop: node.y,
      startRight: node.x + initialWidth,
      startBottom: node.y + initialHeight,
      moved: false,
    };

    store.setSelection({ type: 'node', id: parsed.nodeId });
    store.setResizing(true);
    nodesLayer.setPointerCapture(event.pointerId);
  }

  function finishEdgeSession(event) {
    if (!edgeSession || edgeSession.pointerId !== event.pointerId) return;
    const state = store.getState();
    const pointer = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
    const hoverNodeId = getNodeIdAtClientPoint(event.clientX, event.clientY);
    const sourceNode = getNode(edgeSession.fromNodeId, state);
    const targetNode = hoverNodeId ? getNode(hoverNodeId, state) : null;
    const isValidTarget = sourceNode && targetNode && targetNode.id !== edgeSession.invalidNodeId;
    let anchoredEdgeId = null;
    if (isValidTarget) {
      const targetAnchor = resolveSessionTargetAnchor({
        sourceNode,
        targetNode,
        pointer,
        viewport: state.viewport,
        canvasEl: canvas,
        anchorsMode: state.settings.anchorsMode,
      });
      if (edgeSession.mode === 'reconnect') {
        anchoredEdgeId = store.reconnectEdge(
          edgeSession.edgeId,
          edgeSession.movingSide,
          targetNode.id,
          targetAnchor,
        );
      } else {
        anchoredEdgeId = store.connectNodes(
          edgeSession.fromNodeId,
          edgeSession.fromAnchor,
          targetNode.id,
          targetAnchor,
        );
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

  function focusNodeTitleInput(nodeId, retries = 2) {
    const titleInput = nodesLayer.querySelector(`[data-node-edit-title="${nodeId}"]`);
    if (!titleInput) {
      if (retries > 0) {
        window.requestAnimationFrame(() => focusNodeTitleInput(nodeId, retries - 1));
      }
      return;
    }

    titleInput.focus({ preventScroll: true });
    titleInput.select();
  }

  function createNodeInEditMode(point) {
    const node = store.addNode(point);
    if (!node) return;
    store.setEditingNode(node.id);
    focusNodeTitleInput(node.id);
  }

  function saveNodeEditor(nodeId, nodeEl) {
    if (!nodeId || !nodeEl) return;
    const titleInput = nodeEl.querySelector(`[data-node-edit-title="${nodeId}"]`);
    const descriptionInput = nodeEl.querySelector(`[data-node-edit-description="${nodeId}"]`);
    store.updateNode(nodeId, {
      title: titleInput?.value || '',
      description: descriptionInput?.value || '',
    });
    store.clearEditingNode();
  }

  canvas.addEventListener('dblclick', (event) => {
    if (event.target.closest('[data-node-id]')) return;
    const point = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    createNodeInEditMode(point);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-node-id], [data-edge-id], .panel, button, input, textarea, label')) return;

    cancelEdgeSession();
    endPanSession();
    endResizeSession();
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
    const resizeEl = event.target.closest('[data-node-resize]');
    if (resizeEl && event.button === 0) {
      beginResizeSession(event, resizeEl.dataset.nodeResize);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

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
    endResizeSession();
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

    store.setDragging(true);
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

    if (resizeSession && resizeSession.pointerId === event.pointerId) {
      const viewport = store.getState().viewport;
      const dx = (event.clientX - resizeSession.startX) / viewport.zoom;
      const dy = (event.clientY - resizeSession.startY) / viewport.zoom;

      if (!resizeSession.moved) {
        if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) {
          return;
        }
        store.beginNodeResize();
        resizeSession.moved = true;
      }

      const next = computeResizedRect(resizeSession, dx, dy);
      store.resizeNode(resizeSession.nodeId, next, { skipHistory: true });
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
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      finishEdgeSession(event);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('pointercancel', (event) => {
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession(event.pointerId);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    endDragSession(event.pointerId);
  });

  nodesLayer.addEventListener('lostpointercapture', (event) => {
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession();
      return;
    }
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
      saveNodeEditor(nodeId, nodeEl);
      event.stopPropagation();
      return;
    }

    const cancelEl = event.target.closest('[data-node-edit-cancel]');
    if (cancelEl) {
      store.clearEditingNode();
      event.stopPropagation();
      return;
    }

    const deleteEl = event.target.closest('[data-node-edit-delete]');
    if (deleteEl) {
      const nodeId = deleteEl.dataset.nodeEditDelete;
      store.deleteNode(nodeId);
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

  nodesLayer.addEventListener('keydown', (event) => {
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    if (!ctrlOrCmd || event.key !== 'Enter') return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const nodeEl = target.closest('[data-node-id]');
    const editorEl = target.closest('[data-node-editor]');
    if (!nodeEl || !editorEl) return;

    const nodeId = nodeEl.dataset.nodeId;
    if (!nodeId) return;

    event.preventDefault();
    event.stopPropagation();
    saveNodeEditor(nodeId, nodeEl);
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

  const aboutDialog = document.getElementById('about-dialog');
  const aboutBtn = document.getElementById('about-btn');
  const aboutCloseBtn = document.getElementById('about-close-btn');
  const settingsDialog = document.getElementById('settings-dialog');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const graphNameInput = document.getElementById('graph-name-input');
  const arrowheadSizeRange = document.getElementById('arrowhead-size-range');
  const arrowheadSizeValue = document.getElementById('arrowhead-size-value');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const newGraphBtn = document.getElementById('new-graph-btn');
  const openGraphBtn = document.getElementById('open-graph-btn');
  const saveGraphBtn = document.getElementById('save-graph-btn');

  if (aboutBtn && aboutDialog) {
    aboutBtn.addEventListener('click', () => {
      if (aboutDialog.open) {
        aboutDialog.close();
      } else {
        aboutDialog.showModal();
      }
    });
  }

  if (aboutCloseBtn && aboutDialog) {
    aboutCloseBtn.addEventListener('click', () => {
      if (aboutDialog.open) {
        aboutDialog.close();
      }
    });
  }

  if (settingsBtn && settingsDialog) {
    settingsBtn.addEventListener('click', () => {
      if (settingsDialog.open) {
        settingsDialog.close();
      } else {
        syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput);
        settingsDialog.showModal();
      }
    });
  }

  if (settingsCloseBtn && settingsDialog) {
    settingsCloseBtn.addEventListener('click', () => {
      if (settingsDialog.open) {
        settingsDialog.close();
      }
    });
  }

  graphNameInput?.addEventListener('change', () => {
    store.setGraphName(graphNameInput.value);
  });

  graphNameInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    graphNameInput.blur();
  });

  settingsDialog?.querySelectorAll('input[name="background-style"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.checked) return;
      store.setBackgroundStyle(target.value);
    });
  });

  settingsDialog?.querySelectorAll('input[name="anchors-mode"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.checked) return;
      store.setAnchorsMode(target.value);
    });
  });

  settingsDialog?.querySelectorAll('input[name="arrowheads"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.checked) return;
      store.setArrowheads(target.value);
    });
  });

  arrowheadSizeRange?.addEventListener('input', () => {
    const nextStep = Number(arrowheadSizeRange.value);
    updateArrowheadSizeLabel(arrowheadSizeValue, nextStep);
    store.setArrowheadSizeStep(nextStep);
  });

  const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
    ? storedTheme
    : (preferredDark ? 'dark' : 'light');
  applyTheme(initialTheme, themeToggleBtn);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, themeToggleBtn);
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    });
  }

  document.getElementById('add-node-btn')?.addEventListener('click', () => {
    const { viewport } = store.getState();
    createNodeInEditMode({ x: (120 - viewport.panX) / viewport.zoom, y: (120 - viewport.panY) / viewport.zoom });
  });

  document.getElementById('reset-view-btn')?.addEventListener('click', () => store.resetView());
  document.getElementById('undo-btn')?.addEventListener('click', () => store.undo());
  document.getElementById('redo-btn')?.addEventListener('click', () => store.redo());

  function hasGraphData() {
    const state = store.getState();
    return state.nodes.length > 0 || state.edges.length > 0;
  }

  function confirmDiscardIfNeeded(action) {
    if (!hasGraphData()) return true;
    return window.confirm(`Discard current graph and ${action}?`);
  }

  async function handleOpenGraph() {
    if (!canUseFileSystemAccess) {
      store.setImportStatus('Open is unavailable in this browser.');
      return;
    }

    if (!confirmDiscardIfNeeded('open another graph')) {
      return;
    }

    try {
      const { handle, graph } = await openGraphFile();
      currentFileHandle = handle;
      store.replaceGraph(graph);
      store.resetView();
      syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput);
      store.setImportStatus('Graph opened successfully.');
    } catch (error) {
      if (isAbortError(error)) return;
      store.setImportStatus('Open failed: invalid JSON graph file.');
    }
  }

  async function handleSaveGraph() {
    if (!canUseFileSystemAccess) {
      store.setImportStatus('Save is unavailable in this browser.');
      return;
    }

    try {
      const state = store.getState();
      currentFileHandle = await saveGraphFile({
        name: state.name,
        settings: state.settings,
        nodes: state.nodes,
        edges: state.edges,
      }, currentFileHandle);
      store.setImportStatus('Graph saved.');
    } catch (error) {
      if (isAbortError(error)) return;
      store.setImportStatus('Save failed. Check file permissions and try again.');
    }
  }

  function handleNewGraph() {
    if (!confirmDiscardIfNeeded('create a new graph')) {
      return;
    }

    currentFileHandle = null;
    store.replaceGraph({
      name: GRAPH_DEFAULTS.name,
      settings: {
        backgroundStyle: GRAPH_DEFAULTS.backgroundStyle,
        anchorsMode: GRAPH_DEFAULTS.anchorsMode,
        arrowheads: GRAPH_DEFAULTS.arrowheads,
        arrowheadSizeStep: GRAPH_DEFAULTS.arrowheadSizeStep,
      },
      nodes: [],
      edges: [],
    });
    store.resetView();
    syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput);
    store.setImportStatus('New graph created.');
  }

  newGraphBtn?.addEventListener('click', handleNewGraph);
  openGraphBtn?.addEventListener('click', () => {
    void handleOpenGraph();
  });
  saveGraphBtn?.addEventListener('click', () => {
    void handleSaveGraph();
  });

  if (!canUseFileSystemAccess) {
    if (openGraphBtn) {
      openGraphBtn.disabled = true;
      openGraphBtn.title = 'Open is unavailable in this browser';
      openGraphBtn.setAttribute('aria-label', 'Open unavailable in this browser');
    }
    if (saveGraphBtn) {
      saveGraphBtn.disabled = true;
      saveGraphBtn.title = 'Save is unavailable in this browser';
      saveGraphBtn.setAttribute('aria-label', 'Save unavailable in this browser');
    }
  }

  document.addEventListener('keydown', (event) => {
    if (aboutDialog?.open || settingsDialog?.open) return;
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

    if (ctrlOrCmd && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void handleSaveGraph();
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
      if (resizeSession) {
        endResizeSession();
        return;
      }
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

function getNodeIdAtClientPoint(clientX, clientY) {
  const hits = document.elementsFromPoint(clientX, clientY);
  for (const hit of hits) {
    const nodeEl = hit.closest('[data-node-id]');
    if (nodeEl?.dataset?.nodeId) {
      return nodeEl.dataset.nodeId;
    }
  }
  return null;
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

function parseNodeResizeToken(value) {
  if (!value || typeof value !== 'string') return null;
  const [nodeId, corner] = value.split(':');
  if (!nodeId || !isResizeCorner(corner)) return null;
  return { nodeId, corner };
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

function resolveSessionTargetAnchor({
  sourceNode,
  targetNode,
  pointer,
  viewport,
  canvasEl,
  anchorsMode,
}) {
  if (anchorsMode === 'exact') {
    const nearestAnchor = resolveNearestNodeAnchorToPointer(targetNode.id, pointer, canvasEl, viewport);
    if (nearestAnchor) {
      return nearestAnchor;
    }
  }
  return resolveAnchorName(null, targetNode, sourceNode);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isResizeCorner(corner) {
  return corner === 'top-left'
    || corner === 'top-right'
    || corner === 'bottom-right'
    || corner === 'bottom-left';
}

function computeResizedRect(session, deltaX, deltaY) {
  let left = session.startLeft;
  let right = session.startRight;
  let top = session.startTop;
  let bottom = session.startBottom;

  if (session.corner.includes('left')) {
    left = session.startLeft + deltaX;
  }
  if (session.corner.includes('right')) {
    right = session.startRight + deltaX;
  }
  if (session.corner.includes('top')) {
    top = session.startTop + deltaY;
  }
  if (session.corner.includes('bottom')) {
    bottom = session.startBottom + deltaY;
  }

  if (session.corner.includes('left')) {
    left = Math.min(left, right - NODE_DEFAULTS.minWidth);
  }
  if (session.corner.includes('right')) {
    right = Math.max(right, left + NODE_DEFAULTS.minWidth);
  }
  if (session.corner.includes('top')) {
    top = Math.min(top, bottom - NODE_DEFAULTS.minHeight);
  }
  if (session.corner.includes('bottom')) {
    bottom = Math.max(bottom, top + NODE_DEFAULTS.minHeight);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"]');
}

function resolveEffectiveAnchorForSession(storedAnchor, fromNode, toNode, anchorsMode) {
  if (anchorsMode === 'exact' && isAnchorName(storedAnchor)) {
    return storedAnchor;
  }
  return resolveAnchorName(null, fromNode, toNode);
}

function resolveNearestNodeAnchorToPointer(nodeId, pointer, canvasEl, viewport) {
  if (!nodeId || !pointer || !canvasEl || !viewport) return null;
  const nodeEl = getNodeElementById(nodeId);
  if (!nodeEl) return null;

  const rect = nodeEl.getBoundingClientRect();
  const anchors = {
    top: toGraphPoint(rect.left + rect.width / 2, rect.top, canvasEl, viewport),
    right: toGraphPoint(rect.right, rect.top + rect.height / 2, canvasEl, viewport),
    bottom: toGraphPoint(rect.left + rect.width / 2, rect.bottom, canvasEl, viewport),
    left: toGraphPoint(rect.left, rect.top + rect.height / 2, canvasEl, viewport),
  };

  let nearest = null;
  let nearestDistanceSq = Infinity;
  for (const [anchor, point] of Object.entries(anchors)) {
    const dx = pointer.x - point.x;
    const dy = pointer.y - point.y;
    const distanceSq = (dx * dx) + (dy * dy);
    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearest = anchor;
    }
  }

  return isAnchorName(nearest) ? nearest : null;
}

function getNodeElementById(nodeId) {
  const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(nodeId)
    : nodeId;
  const nodeEl = document.querySelector(`[data-node-id="${escapedId}"]`);
  return nodeEl instanceof HTMLElement ? nodeEl : null;
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function applyTheme(theme, toggleButton) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  if (toggleButton) {
    toggleButton.innerHTML = isDark
      ? '<i class="bi bi-sun"></i>'
      : '<i class="bi bi-moon-stars"></i>';
    toggleButton.setAttribute('aria-label', isDark ? 'Enable light mode' : 'Enable dark mode');
    toggleButton.setAttribute('title', isDark ? 'Enable Light Mode' : 'Enable Dark Mode');
  }
}

function syncSettingsDialogFromState(state, settingsDialog, graphNameInput) {
  if (!settingsDialog) return;
  if (graphNameInput) {
    graphNameInput.value = state.name;
  }

  settingsDialog.querySelectorAll('input[name="background-style"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === state.settings.backgroundStyle;
    }
  });

  settingsDialog.querySelectorAll('input[name="anchors-mode"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === state.settings.anchorsMode;
    }
  });

  settingsDialog.querySelectorAll('input[name="arrowheads"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === state.settings.arrowheads;
    }
  });

  const arrowheadSizeRange = document.getElementById('arrowhead-size-range');
  const arrowheadSizeValue = document.getElementById('arrowhead-size-value');
  if (arrowheadSizeRange instanceof HTMLInputElement) {
    const step = Number.isFinite(state.settings.arrowheadSizeStep) ? state.settings.arrowheadSizeStep : 0;
    arrowheadSizeRange.value = String(step);
    updateArrowheadSizeLabel(arrowheadSizeValue, step);
  }
}

function updateArrowheadSizeLabel(labelEl, step) {
  if (!(labelEl instanceof HTMLElement)) return;
  const level = Math.max(1, Math.min(10, Math.round(Number(step)) + 1));
  const percent = level === 1 ? 100 : (100 + ((level - 1) * 20));
  labelEl.textContent = `Level ${level} (${percent}%)`;
}
