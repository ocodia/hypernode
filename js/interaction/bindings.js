import {
  GRAPH_DEFAULTS,
  FRAME_DEFAULTS,
  IMAGE_NODE_DEFAULTS,
  KEYBOARD_DIRECTIONAL_SELECTION,
  KEYBOARD_LINKED_NODE,
  NODE_COLOR_KEYS,
  NODE_DEFAULTS,
  VIEWPORT_LIMITS,
} from '../utils/constants.js';
import { openGraphFile, saveGraphFile, supportsFileSystemAccess } from '../persistence/file.js';
import { bindCanvasInteractions } from './binders/canvas.js';
import { bindEdgeInteractions } from './binders/edges.js';
import { bindFrameInteractions } from './binders/frames.js';
import { bindKeyboardInteractions } from './binders/keyboard.js';
import { bindNodeInteractions } from './binders/nodes.js';
import { bindToolbarInteractions } from './binders/toolbar.js';

const THEME_STORAGE_KEY = 'hypernode.theme.v1';

export function bindInteractions(elements, store) {
  const {
    workspace,
    canvas,
    framesLayer,
    nodesLayer,
    focusLayer,
    edgesGroup,
    edgeOverlayGroup,
    selectionControlsLayer,
  } = elements;
  const canUseFileSystemAccess = supportsFileSystemAccess();
  let currentFileHandle = null;

  let panSession = null;
  let dragSession = null;
  let marqueeSession = null;
  let resizeSession = null;
  let frameResizeSession = null;
  let frameDragSession = null;
  let frameDrawSession = null;
  let isFrameDrawMode = false;
  let edgeSession = null;
  let edgeTwangTimer = null;
  let activeLiveEditNodeId = null;
  let activeLiveEditFrameId = null;
  let editorFocusLock = null;
  let isNodeColorPopoverOpen = false;

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
    store.clearFrameMembershipPreview();
    if (pointerId === null || pointerId === activePointerId) {
      try {
        nodesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function endMarqueeSession(pointerId = null) {
    if (!marqueeSession) return;
    const activePointerId = marqueeSession.pointerId;
    marqueeSession = null;
    store.setSelectionMarquee(null);
    if (pointerId === null || pointerId === activePointerId) {
      try {
        canvas.releasePointerCapture(activePointerId);
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
    const hoverEntityId = getGraphEntityIdAtClientPoint(event.clientX, event.clientY);
    const sourceNode = getEntity(edgeSession.fromNodeId, state);
    const targetNode = hoverEntityId ? getEntity(hoverEntityId, state) : null;
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
    endMarqueeSession();
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
    const sourceFrame = getFrame(parsed.nodeId, store.getState());
    store.setSelection(sourceFrame ? { type: 'frame', id: parsed.nodeId } : { type: 'node', id: parsed.nodeId });
    nodesLayer.setPointerCapture(event.pointerId);
    updateEdgeDraft(event);
  }

  function beginReconnectSession(event, endpointToken) {
    const parsed = parseEdgeEndpointToken(endpointToken);
    if (!parsed) return;

    const state = store.getState();
    const edge = state.edges.find((item) => item.id === parsed.edgeId);
    if (!edge) return;
    const fromNode = getEntity(edge.from, state);
    const toNode = getEntity(edge.to, state);
    if (!fromNode || !toNode) return;

    const movingFrom = parsed.side === 'from';
    const fixedNodeId = movingFrom ? edge.to : edge.from;
    const fixedNode = movingFrom ? toNode : fromNode;
    const movingNode = movingFrom ? fromNode : toNode;
    const fixedStoredAnchor = movingFrom ? edge.toAnchor : edge.fromAnchor;
    const fixedAnchor = resolveEffectiveAnchorForSession(fixedStoredAnchor, fixedNode, movingNode, store.getState().settings.anchorsMode);

    endPanSession();
    endDragSession();
    endFrameDragSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
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
    endFrameDragSession();
    endMarqueeSession();
    cancelEdgeSession();
    endResizeSession();
    endFrameResizeSession();

    const imageAspectRatio = Number(node.imageAspectRatio);
    const imagePaneEl = nodeEl?.querySelector('.node__image-pane');
    const isImageNode = node.kind === IMAGE_NODE_DEFAULTS.kind
      && Number.isFinite(imageAspectRatio)
      && imageAspectRatio > 0;
    const imagePaneHeight = isImageNode
      ? (imagePaneEl?.offsetHeight || (initialWidth / imageAspectRatio))
      : null;
    const imageMetaHeight = isImageNode
      ? Math.max(0, initialHeight - imagePaneHeight)
      : null;

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
      isImageNode,
      imageAspectRatio: isImageNode ? imageAspectRatio : null,
      imageMetaHeight,
    };

    store.setSelection({ type: 'node', id: parsed.nodeId });
    store.setResizing(true);
    nodesLayer.setPointerCapture(event.pointerId);
  }

  function finishEdgeSession(event) {
    if (!edgeSession || edgeSession.pointerId !== event.pointerId) return;
    const state = store.getState();
    const pointer = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
    const hoverNodeId = getGraphEntityIdAtClientPoint(event.clientX, event.clientY);
    const sourceNode = getEntity(edgeSession.fromNodeId, state);
    const targetNode = hoverNodeId ? getEntity(hoverNodeId, state) : null;
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
    const titleInput = getNodeTitleInput(nodeId);
    if (!titleInput) {
      if (retries > 0) {
        window.requestAnimationFrame(() => focusNodeTitleInput(nodeId, retries - 1));
      }
      return;
    }

    titleInput.focus({ preventScroll: true });
    titleInput.select();
  }

  function endFrameResizeSession(pointerId = null) {
    if (!frameResizeSession) return;
    const activePointerId = frameResizeSession.pointerId;
    frameResizeSession = null;
    store.setResizing(false);
    store.clearFrameMembershipPreview();
    store.clearNodeMembershipPreview();
    if (pointerId === null || pointerId === activePointerId) {
      try {
        framesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function endFrameDragSession(pointerId = null) {
    if (!frameDragSession) return;
    const activePointerId = frameDragSession.pointerId;
    frameDragSession = null;
    store.setDragging(false);
    if (pointerId === null || pointerId === activePointerId) {
      try {
        framesLayer.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function endFrameDrawSession(pointerId = null) {
    if (!frameDrawSession) return;
    const activePointerId = frameDrawSession.pointerId;
    frameDrawSession = null;
    store.setFrameDrawing(false);
    store.clearFrameDraft();
    if (pointerId === null || pointerId === activePointerId) {
      try {
        canvas.releasePointerCapture(activePointerId);
      } catch {
        // Pointer may already be released.
      }
    }
  }

  function beginFrameResizeSession(event, resizeToken) {
    const parsed = parseFrameResizeToken(resizeToken);
    if (!parsed) return;
    const state = store.getState();
    const frame = getFrame(parsed.frameId, state);
    if (!frame) return;

    endPanSession();
    endDragSession();
    endFrameDragSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
    cancelEdgeSession();

    frameResizeSession = {
      pointerId: event.pointerId,
      frameId: parsed.frameId,
      corner: parsed.corner,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: frame.x,
      startTop: frame.y,
      startRight: frame.x + frame.width,
      startBottom: frame.y + frame.height,
      moved: false,
    };

    store.setSelection({ type: 'frame', id: parsed.frameId });
    store.setResizing(true);
    framesLayer.setPointerCapture(event.pointerId);
  }

  function beginMarqueeSession(event) {
    endPanSession();
    endDragSession();
    endFrameDragSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
    cancelEdgeSession();

    const state = store.getState();
    const startGraph = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
    marqueeSession = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGraphX: startGraph.x,
      startGraphY: startGraph.y,
      baseSelectionIds: getSelectedNodeIds(state.selection),
    };

    const rect = canvas.getBoundingClientRect();
    store.setSelectionMarquee({
      left: event.clientX - rect.left,
      top: event.clientY - rect.top,
      width: 0,
      height: 0,
    });
    canvas.setPointerCapture(event.pointerId);
  }

  function updateMarqueeSession(event) {
    if (!marqueeSession || marqueeSession.pointerId !== event.pointerId) return;
    const state = store.getState();
    const currentGraph = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
    const graphRect = toRectFromPoints(
      marqueeSession.startGraphX,
      marqueeSession.startGraphY,
      currentGraph.x,
      currentGraph.y,
    );
    const hitNodeIds = getIntersectingNodeIds(state.nodes, graphRect);
    const mergedIds = uniqueIds([...marqueeSession.baseSelectionIds, ...hitNodeIds]);

    const rect = canvas.getBoundingClientRect();
    const startX = marqueeSession.startClientX - rect.left;
    const startY = marqueeSession.startClientY - rect.top;
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    const screenRect = toRectFromPoints(startX, startY, currentX, currentY);
    store.setSelectionMarquee(screenRect);
    store.setNodeSelection(mergedIds, { primaryId: hitNodeIds[hitNodeIds.length - 1] || null });
  }

  function setEditorFocusLock(nodeId, durationMs = 900) {
    if (!nodeId) return;
    const safeDuration = Math.max(0, Number(durationMs) || 0);
    if (safeDuration <= 0) {
      editorFocusLock = null;
      return;
    }
    editorFocusLock = {
      nodeId,
      expiresAt: Date.now() + safeDuration,
    };
  }

  function clearEditorFocusLock(nodeId = null) {
    if (!editorFocusLock) return;
    if (nodeId && editorFocusLock.nodeId !== nodeId) return;
    editorFocusLock = null;
  }

  function stabilizeNodeEditorFocus(nodeId, frames = 0) {
    const frameCount = Math.max(0, Number(frames) || 0);
    if (frameCount <= 0) return;
    let remaining = frameCount;
    const run = () => {
      focusNodeTitleInput(nodeId, 0);
      remaining -= 1;
      if (remaining > 0) {
        window.requestAnimationFrame(run);
      }
    };
    window.requestAnimationFrame(run);
  }

  function createNodeInEditMode(point) {
    const node = store.addNode(point);
    if (!node) return;
    openNodeEditor(node.id);
  }

  function createImageNodeInEditMode(point, imageFileInfo) {
    const node = store.addNode({
      x: point.x,
      y: point.y,
      title: imageFileInfo.title || NODE_DEFAULTS.title,
      description: '',
      kind: IMAGE_NODE_DEFAULTS.kind,
      imageData: imageFileInfo.dataUrl,
      imageAspectRatio: imageFileInfo.aspectRatio,
      width: imageFileInfo.width,
      height: imageFileInfo.height,
    });
    if (!node) return;
    openNodeEditor(node.id);
  }

  function setFrameDrawMode(nextEnabled) {
    isFrameDrawMode = Boolean(nextEnabled);
    store.setFrameDrawing(isFrameDrawMode);
    if (!isFrameDrawMode) {
      store.clearFrameDraft();
      if (frameDrawSession) {
        endFrameDrawSession();
      }
    }
  }

  function createFrameFromDraft(draftRect) {
    const width = Math.max(FRAME_DEFAULTS.minWidth, draftRect.width);
    const height = Math.max(FRAME_DEFAULTS.minHeight, draftRect.height);
    const frame = store.addFrame({
      x: draftRect.left,
      y: draftRect.top,
      width,
      height,
    });
    if (!frame) return;
    openFrameEditor(frame.id);
  }

  function createLinkedNodeFromSelection() {
    const state = store.getState();
    const selection = state.selection;
    if (!selection || selection.type !== 'node') return false;
    const sourceNode = getNode(selection.id, state);
    if (!sourceNode) return false;

    if (resizeSession) {
      endResizeSession();
    }
    if (edgeSession) {
      cancelEdgeSession();
    }

    const point = computeLinkedNodePosition(sourceNode, state.nodes);
    const node = store.addNode(point);
    if (!node) return false;

    const fromAnchor = resolveAnchorName(null, sourceNode, node);
    const toAnchor = resolveAnchorName(null, node, sourceNode);
    const edgeId = store.connectNodes(sourceNode.id, fromAnchor, node.id, toAnchor);
    if (edgeId) {
      triggerEdgeTwang(edgeId);
    }

    store.setSelection({ type: 'node', id: node.id });
    openNodeEditor(node.id, { stabilizeFrames: 3, lockFocusMs: 1200 });
    return true;
  }

  function selectDirectionalNode(key) {
    const state = store.getState();
    const selection = state.selection;
    if (!isDirectionalArrowKey(key)) return false;

    if (!selection || selection.type !== 'node') {
      if (!state.nodes.length) return false;
      return selectNodeById(state.nodes[0].id);
    }

    const currentNode = getNode(selection.id, state);
    if (!currentNode) {
      if (!state.nodes.length) return false;
      return selectNodeById(state.nodes[0].id);
    }

    const edgeFollowNodeId = resolveDirectionalEdgeFollowCandidate(currentNode, key, state);
    if (edgeFollowNodeId) {
      return selectNodeById(edgeFollowNodeId);
    }

    const nearestNodeId = resolveNearestDirectionalNodeCandidate(currentNode, key, state.nodes);
    if (!nearestNodeId) return false;
    return selectNodeById(nearestNodeId);
  }

  function selectNodeById(nodeId) {
    if (!nodeId) return false;
    if (editorFocusLock && editorFocusLock.nodeId !== nodeId) {
      clearEditorFocusLock();
    }

    if (resizeSession) {
      endResizeSession();
    }
    if (edgeSession) {
      cancelEdgeSession();
    }

    store.setSelection({ type: 'node', id: nodeId });
    return true;
  }

  function resolveNearestDirectionalNodeCandidate(currentNode, key, nodes) {
    const currentCenter = getNodeCenter(currentNode);
    let best = null;

    for (const node of nodes) {
      if (node.id === currentNode.id) continue;
      const score = buildDirectionalScore(currentCenter, node, key);
      if (!score) continue;
      if (!best || compareDirectionalScores(score, best.score) < 0) {
        best = { nodeId: node.id, score };
      }
    }

    return best?.nodeId || null;
  }

  function resolveDirectionalEdgeFollowCandidate(currentNode, key, state) {
    const byId = new Map(state.nodes.map((node) => [node.id, node]));
    const candidates = new Map();
    const expectedAnchor = getExpectedDirectionalAnchor(key);
    if (!expectedAnchor) return null;

    for (const edge of state.edges) {
      let side = null;
      let otherId = null;
      if (edge.from === currentNode.id) {
        side = 'from';
        otherId = edge.to;
      } else if (edge.to === currentNode.id) {
        side = 'to';
        otherId = edge.from;
      }
      if (!side || !otherId) continue;

      const otherNode = byId.get(otherId);
      if (!otherNode) continue;

      const currentAnchor = resolveDirectionalAnchorForEdgeSide({
        edge,
        side,
        currentNode,
        otherNode,
        anchorsMode: state.settings.anchorsMode,
      });
      if (currentAnchor !== expectedAnchor) continue;

      const score = buildDirectionalScore(getNodeCenter(currentNode), otherNode, key);
      if (!score) continue;

      const existing = candidates.get(otherNode.id);
      if (!existing || compareDirectionalScores(score, existing) < 0) {
        candidates.set(otherNode.id, score);
      }
    }

    let best = null;
    for (const [nodeId, score] of candidates.entries()) {
      if (!best || compareDirectionalScores(score, best.score) < 0) {
        best = { nodeId, score };
      }
    }

    return best?.nodeId || null;
  }

  function toggleSelectedEditor() {
    const state = store.getState();
    const selection = state.selection;
    if (!selection) return false;

    if (selection.type === 'node') {
      if (state.ui.editingNodeId === selection.id) {
        closeNodeEditor(selection.id);
        return true;
      }
      openNodeEditor(selection.id);
      return true;
    }

    if (selection.type === 'frame') {
      if (state.ui.editingFrameId === selection.id) {
        closeFrameEditor(selection.id);
        return true;
      }
      openFrameEditor(selection.id);
      return true;
    }

    return false;
  }

  function openNodeEditor(nodeId, options = {}) {
    const stabilizeFrames = Number(options.stabilizeFrames) || 0;
    const lockFocusMs = Number(options.lockFocusMs) || 0;
    activeLiveEditNodeId = null;
    store.setEditingNode(nodeId);
    focusNodeTitleInput(nodeId);
    stabilizeNodeEditorFocus(nodeId, stabilizeFrames);
    setEditorFocusLock(nodeId, lockFocusMs);
  }

  function closeNodeEditor(nodeId = null) {
    const resolvedNodeId = nodeId || store.getState().ui.editingNodeId;
    if (resolvedNodeId && activeLiveEditNodeId === resolvedNodeId) {
      activeLiveEditNodeId = null;
    }
    clearEditorFocusLock(resolvedNodeId || null);
    store.clearEditingNode();
  }

  function openNodeFocus(nodeId) {
    if (!nodeId) return false;
    store.setSelection({ type: 'node', id: nodeId });
    activeLiveEditFrameId = null;
    store.setFocusedNode(nodeId);
    openNodeEditor(nodeId, { stabilizeFrames: 2, lockFocusMs: 1200 });
    return true;
  }

  function closeNodeFocus() {
    const focusedNodeId = store.getState().ui.focusedNodeId;
    if (!focusedNodeId) return false;
    if (activeLiveEditNodeId === focusedNodeId) {
      activeLiveEditNodeId = null;
    }
    clearEditorFocusLock(focusedNodeId);
    store.clearFocusedNode();
    return true;
  }

  function toggleFocusedSelectionNode() {
    const state = store.getState();
    if (state.selection?.type !== 'node') return false;
    if (state.ui.focusedNodeId === state.selection.id) {
      return closeNodeFocus();
    }
    return openNodeFocus(state.selection.id);
  }

  function openFrameEditor(frameId) {
    activeLiveEditFrameId = null;
    store.setEditingFrame(frameId);
    focusFrameTitleInput(frameId);
  }

  function closeFrameEditor(frameId = null) {
    const resolvedFrameId = frameId || store.getState().ui.editingFrameId;
    if (resolvedFrameId && activeLiveEditFrameId === resolvedFrameId) {
      activeLiveEditFrameId = null;
    }
    store.clearEditingFrame();
  }

  function applyLiveFrameEditorInput(frameId, patch) {
    const frame = getFrame(frameId, store.getState());
    if (!frame) return;
    if (activeLiveEditFrameId !== frameId) {
      store.beginFrameEdit();
      activeLiveEditFrameId = frameId;
    }
    if (typeof patch.title === 'string') {
      frame.title = patch.title;
    }
    if (typeof patch.description === 'string') {
      frame.description = patch.description;
    }
    if (patch.borderWidth !== undefined) {
      const numeric = Math.round(Number(patch.borderWidth));
      if (Number.isFinite(numeric)) {
        frame.borderWidth = clamp(numeric, FRAME_DEFAULTS.borderWidthMin, FRAME_DEFAULTS.borderWidthMax);
      }
    }
    if (typeof patch.borderStyle === 'string' && ['solid', 'dashed', 'dotted'].includes(patch.borderStyle)) {
      frame.borderStyle = patch.borderStyle;
    }
  }

  function focusFrameTitleInput(frameId, retries = 2) {
    const titleInput = framesLayer.querySelector(`[data-frame-edit-title="${frameId}"]`);
    if (!titleInput) {
      if (retries > 0) {
        window.requestAnimationFrame(() => focusFrameTitleInput(frameId, retries - 1));
      }
      return;
    }
    titleInput.focus({ preventScroll: true });
    titleInput.select();
  }

  function applyLiveNodeEditorInput(nodeId, patch) {
    const node = getNode(nodeId, store.getState());
    if (!node) return;
    if (activeLiveEditNodeId !== nodeId) {
      store.beginNodeEdit();
      activeLiveEditNodeId = nodeId;
    }
    if (typeof patch.title === 'string') {
      node.title = patch.title;
    }
    if (typeof patch.description === 'string') {
      node.description = patch.description;
    }
  }

  function updateFrameMembershipPreview(dragNodes, dx, dy) {
    const state = store.getState();
    if (!Array.isArray(state.frames) || state.frames.length === 0) {
      store.clearFrameMembershipPreview();
      return;
    }

    const preview = {};
    for (const nodeEntry of dragNodes) {
      const node = getNode(nodeEntry.id, state);
      if (!node) continue;
      const simulatedNode = {
        ...node,
        x: nodeEntry.nodeStartX + dx,
        y: nodeEntry.nodeStartY + dy,
      };
      const bestFrameId = findBestFrameIdForNodeFromRects(simulatedNode, state.frames);
      const currentFrameId = node.frameId || null;

      if (currentFrameId && currentFrameId !== bestFrameId) {
        preview[currentFrameId] = 'remove';
      }
      if (bestFrameId && bestFrameId !== currentFrameId) {
        preview[bestFrameId] = 'add';
      }
    }

    store.setFrameMembershipPreview(preview);
  }

  function updateFrameResizeMembershipPreview(frameId, nextRect, state) {
    const { addNodeIds, removeNodeIds } = getFrameResizeMembershipDelta(frameId, nextRect, state);
    const nodePreview = {};
    for (const id of addNodeIds) {
      nodePreview[id] = 'add';
    }
    for (const id of removeNodeIds) {
      if (!(id in nodePreview)) {
        nodePreview[id] = 'remove';
      }
    }

    if (Object.keys(nodePreview).length) {
      store.setNodeMembershipPreview(nodePreview);
      store.setFrameMembershipPreview({ [frameId]: addNodeIds.length ? 'add' : 'remove' });
      return;
    }

    store.clearFrameMembershipPreview();
    store.clearNodeMembershipPreview();
  }

  function applyFrameResizeMembership(frameId, state) {
    const frame = getFrame(frameId, state);
    if (!frame) return;
    const frameRect = getFrameRect(frame);
    const candidates = findFrameResizeCandidateNodeIds(frameId, frameRect, state);
    if (!candidates.length) return;
    store.recomputeNodeFrameMembership(candidates, { skipHistory: true });
  }

  function setNodeColorPopoverOpen(nextOpen, buttonEl, popoverEl) {
    if (!(buttonEl instanceof HTMLButtonElement) || !(popoverEl instanceof HTMLElement)) {
      return;
    }
    const canOpen = !buttonEl.disabled;
    const open = Boolean(nextOpen && canOpen);
    isNodeColorPopoverOpen = open;
    popoverEl.hidden = !open;
    buttonEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function getNormalizedNodeColorValue(value) {
    if (value === 'default') {
      return null;
    }
    if (typeof value !== 'string') {
      return null;
    }
    return NODE_COLOR_KEYS.includes(value) ? value : null;
  }

  function syncNodeColorButtonState(state, buttonEl, _popoverEl) {
    void _popoverEl;
    if (!(buttonEl instanceof HTMLButtonElement)) return;
    const currentColorKey = getNormalizedNodeColorValue(state.settings?.nodeColorDefault);
    if (currentColorKey) {
      buttonEl.dataset.nodeColorCurrent = currentColorKey;
      buttonEl.classList.add('toolbar__icon-btn--has-swatch');
    } else {
      delete buttonEl.dataset.nodeColorCurrent;
      buttonEl.classList.remove('toolbar__icon-btn--has-swatch');
    }
    buttonEl.disabled = false;
  }

  function onCanvasDoubleClick(event) {
    if (isFrameDrawMode) return;
    if (event.target.closest('[data-node-id], [data-frame-id]')) return;
    const point = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    createNodeInEditMode(point);
  }

  function onCanvasPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('[data-node-id], [data-frame-id], [data-edge-id], .panel, button, input, textarea, label')) return;

    if (isFrameDrawMode) {
      const state = store.getState();
      const start = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
      frameDrawSession = {
        pointerId: event.pointerId,
        startX: start.x,
        startY: start.y,
      };
      store.clearSelection();
      store.setFrameDrawing(true);
      store.setFrameDraft({
        x: start.x,
        y: start.y,
        width: 0,
        height: 0,
      });
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (isAdditiveModifier(event)) {
      beginMarqueeSession(event);
      event.preventDefault();
      return;
    }

    cancelEdgeSession();
    endPanSession();
    endFrameDrawSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
    endFrameDragSession();
    activeLiveEditNodeId = null;
    activeLiveEditFrameId = null;
    const state = store.getState();
    if (state.selection) {
      store.clearSelection();
    }
    panSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: state.viewport.panX,
      startPanY: state.viewport.panY,
    };
    store.setPanning(true);
    canvas.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event) {
    if (frameDrawSession && event.pointerId === frameDrawSession.pointerId) {
      const state = store.getState();
      const current = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
      const rect = toRectFromPoints(frameDrawSession.startX, frameDrawSession.startY, current.x, current.y);
      store.setFrameDraft({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
      return;
    }
    if (marqueeSession && event.pointerId === marqueeSession.pointerId) {
      updateMarqueeSession(event);
      return;
    }
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    const dx = event.clientX - panSession.startX;
    const dy = event.clientY - panSession.startY;
    store.setViewport({
      panX: panSession.startPanX + dx,
      panY: panSession.startPanY + dy,
    });
  }

  function onCanvasPointerUp(event) {
    if (frameDrawSession && event.pointerId === frameDrawSession.pointerId) {
      const state = store.getState();
      const current = toGraphPoint(event.clientX, event.clientY, canvas, state.viewport);
      const rect = toRectFromPoints(frameDrawSession.startX, frameDrawSession.startY, current.x, current.y);
      if (rect.width >= 24 && rect.height >= 24) {
        createFrameFromDraft(rect);
      }
      endFrameDrawSession(event.pointerId);
      setFrameDrawMode(false);
      return;
    }
    if (marqueeSession && event.pointerId === marqueeSession.pointerId) {
      endMarqueeSession(event.pointerId);
      return;
    }
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession(event.pointerId);
  }

  function onCanvasPointerCancel(event) {
    if (frameDrawSession && event.pointerId === frameDrawSession.pointerId) {
      endFrameDrawSession(event.pointerId);
      return;
    }
    if (marqueeSession && event.pointerId === marqueeSession.pointerId) {
      endMarqueeSession(event.pointerId);
      return;
    }
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession(event.pointerId);
  }

  function onCanvasLostPointerCapture(event) {
    if (frameDrawSession && event.pointerId === frameDrawSession.pointerId) {
      endFrameDrawSession();
      return;
    }
    if (marqueeSession && event.pointerId === marqueeSession.pointerId) {
      endMarqueeSession();
      return;
    }
    if (!panSession || event.pointerId !== panSession.pointerId) return;
    endPanSession();
  }

  function onWorkspaceWheel(event) {
    if (isTypingTarget(event.target)) return;
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
  }

  bindCanvasInteractions({ canvas, workspace }, {
    onCanvasDoubleClick,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasPointerCancel,
    onCanvasLostPointerCapture,
    onWorkspaceWheel,
  });

  function isDescriptionLinkTarget(target) {
    return target instanceof Element && Boolean(target.closest('.node__description a, .frame__description a'));
  }

  function onNodePointerDown(event) {
    if (isFrameDrawMode) return;
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

    if (isDescriptionLinkTarget(event.target)) {
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-node-editor], [data-node-edit-open], [data-node-delete]')) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl || event.button !== 0) return;

    endDragSession();
    endFrameDragSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
    endFrameDrawSession();
    cancelEdgeSession();

    const nodeId = nodeEl.dataset.nodeId;
    const state = store.getState();
    const selectedNodeIds = getSelectedNodeIds(state.selection);
    const isNodeAlreadySelected = selectedNodeIds.includes(nodeId);
    if (state.ui.editingNodeId && state.ui.editingNodeId !== nodeId) {
      activeLiveEditNodeId = null;
    }
    if (isAdditiveModifier(event)) {
      store.toggleNodeInSelection(nodeId);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const dragNodeIds = (selectedNodeIds.length > 1 && isNodeAlreadySelected)
      ? selectedNodeIds
      : [nodeId];
    if (!(selectedNodeIds.length > 1 && isNodeAlreadySelected)) {
      store.setSelection({ type: 'node', id: nodeId });
    }
    store.setPanning(false);
    endPanSession();

    const dragNodes = dragNodeIds
      .map((id) => getNode(id, store.getState()))
      .filter(Boolean);
    if (!dragNodes.length) return;

    dragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      nodes: dragNodes.map((node) => ({
        id: node.id,
        nodeStartX: node.x,
        nodeStartY: node.y,
      })),
      moved: false,
    };

    store.setDragging(true);
    nodesLayer.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function onNodeDoubleClick(event) {
    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    const nodeId = nodeEl.dataset.nodeId;
    store.setSelection({ type: 'node', id: nodeId });
    openNodeEditor(nodeId);
    event.stopPropagation();
    event.preventDefault();
  }

  function onNodePointerMove(event) {
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

      const next = resizeSession.isImageNode
        ? computeImageResizedRect(resizeSession, dx)
        : computeResizedRect(resizeSession, dx, dy);
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

    if (dragSession.nodes.length === 1) {
      const single = dragSession.nodes[0];
      store.moveNode(single.id, single.nodeStartX + dx, single.nodeStartY + dy, { skipHistory: true });
      if (dragSession.moved) {
        updateFrameMembershipPreview(dragSession.nodes, dx, dy);
      }
      return;
    }
    const batch = dragSession.nodes.map((entry) => ({
      id: entry.id,
      x: entry.nodeStartX + dx,
      y: entry.nodeStartY + dy,
    }));
    store.moveNodes(batch, { skipHistory: true });
    if (dragSession.moved) {
      updateFrameMembershipPreview(dragSession.nodes, dx, dy);
    }
  }

  function onNodePointerUp(event) {
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      finishEdgeSession(event);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    if (dragSession.moved) {
      store.recomputeNodeFrameMembership(dragSession.nodes.map((entry) => entry.id));
    }
    store.clearFrameMembershipPreview();
    endDragSession(event.pointerId);
  }

  function onNodePointerCancel(event) {
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession(event.pointerId);
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    store.clearFrameMembershipPreview();
    endDragSession(event.pointerId);
  }

  function onNodeLostPointerCapture(event) {
    if (resizeSession && event.pointerId === resizeSession.pointerId) {
      endResizeSession();
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession();
      return;
    }
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    store.clearFrameMembershipPreview();
    endDragSession();
  }

  function onNodeClick(event) {
    if (isDescriptionLinkTarget(event.target)) {
      event.stopPropagation();
      return;
    }

    const openEl = event.target.closest('[data-node-edit-open]');
    if (openEl) {
      const nodeId = openEl.dataset.nodeEditOpen;
      store.setSelection({ type: 'node', id: nodeId });
      openNodeEditor(nodeId);
      event.stopPropagation();
      return;
    }

    const deleteEl = event.target.closest('[data-node-delete]');
    if (deleteEl) {
      const nodeId = deleteEl.dataset.nodeDelete;
      activeLiveEditNodeId = null;
      store.deleteNode(nodeId);
      event.stopPropagation();
      return;
    }

    const focusEl = event.target.closest('[data-node-focus-toggle]');
    if (focusEl) {
      const nodeId = focusEl.dataset.nodeFocusToggle;
      if (store.getState().ui.focusedNodeId === nodeId) {
        closeNodeFocus();
      } else {
        openNodeFocus(nodeId);
      }
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-node-editor]')) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    if (isAdditiveModifier(event)) {
      store.toggleNodeInSelection(nodeEl.dataset.nodeId);
      event.stopPropagation();
      return;
    }
    const state = store.getState();
    if (state.selection?.type === 'nodes' && state.selection.ids.includes(nodeEl.dataset.nodeId)) {
      event.stopPropagation();
      return;
    }
    if (store.getState().ui.editingNodeId && store.getState().ui.editingNodeId !== nodeEl.dataset.nodeId) {
      activeLiveEditNodeId = null;
    }
    store.setSelection({ type: 'node', id: nodeEl.dataset.nodeId });
    event.stopPropagation();
  }

  function onNodeKeyDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const nodeEl = target.closest('[data-node-id]');
    const editorEl = target.closest('[data-node-editor]');
    if (!nodeEl || !editorEl) return;

    const nodeId = nodeEl.dataset.nodeId;
    if (!nodeId) return;
    const focusedNodeId = store.getState().ui.focusedNodeId;
    const focusShortcut = (event.ctrlKey || event.metaKey) && event.altKey && event.key === 'Enter';

    if (event.key === 'Escape' && focusedNodeId === nodeId) {
      event.preventDefault();
      event.stopPropagation();
      closeNodeFocus();
      return;
    }

    if (focusShortcut && focusedNodeId === nodeId) {
      event.preventDefault();
      event.stopPropagation();
      closeNodeFocus();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeNodeEditor(nodeId);
      return;
    }

    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    if (ctrlOrCmd && event.key === 'Enter' && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      closeNodeEditor(nodeId);
    }
  }

  function onNodeInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const nodeEl = target.closest('[data-node-id]');
    if (!nodeEl) return;
    const nodeId = nodeEl.dataset.nodeId;
    if (!nodeId) return;

    if (target.matches('[data-node-edit-title]')) {
      applyLiveNodeEditorInput(nodeId, { title: target.value });
      event.stopPropagation();
      return;
    }

    if (target.matches('[data-node-edit-description]')) {
      applyLiveNodeEditorInput(nodeId, { description: target.value });
      event.stopPropagation();
    }
  }

  function onSelectionControlsPointerDown(event) {
    if (isFrameDrawMode || event.button !== 0) return;

    const nodeResizeEl = event.target.closest('[data-node-resize]');
    if (nodeResizeEl) {
      beginResizeSession(event, nodeResizeEl.dataset.nodeResize);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const frameResizeEl = event.target.closest('[data-frame-resize]');
    if (frameResizeEl) {
      beginFrameResizeSession(event, frameResizeEl.dataset.frameResize);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const nodeAnchorEl = event.target.closest('[data-node-anchor]');
    if (nodeAnchorEl) {
      beginEdgeSession(event, nodeAnchorEl.dataset.nodeAnchor);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const frameAnchorEl = event.target.closest('[data-frame-anchor]');
    if (frameAnchorEl) {
      beginEdgeSession(event, frameAnchorEl.dataset.frameAnchor);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (event.target.closest('[data-node-edit-open], [data-node-delete], [data-node-focus-toggle], [data-frame-edit-open], [data-frame-delete]')) {
      event.stopPropagation();
    }
  }

  function onSelectionControlsClick(event) {
    const nodeOpenEl = event.target.closest('[data-node-edit-open]');
    if (nodeOpenEl) {
      const nodeId = nodeOpenEl.dataset.nodeEditOpen;
      store.setSelection({ type: 'node', id: nodeId });
      openNodeEditor(nodeId);
      event.stopPropagation();
      return;
    }

    const nodeDeleteEl = event.target.closest('[data-node-delete]');
    if (nodeDeleteEl) {
      const nodeId = nodeDeleteEl.dataset.nodeDelete;
      activeLiveEditNodeId = null;
      store.deleteNode(nodeId);
      event.stopPropagation();
      return;
    }

    const nodeFocusEl = event.target.closest('[data-node-focus-toggle]');
    if (nodeFocusEl) {
      const nodeId = nodeFocusEl.dataset.nodeFocusToggle;
      store.setSelection({ type: 'node', id: nodeId });
      if (store.getState().ui.focusedNodeId === nodeId) {
        closeNodeFocus();
      } else {
        openNodeFocus(nodeId);
      }
      event.stopPropagation();
      return;
    }

    const frameOpenEl = event.target.closest('[data-frame-edit-open]');
    if (frameOpenEl) {
      const frameId = frameOpenEl.dataset.frameEditOpen;
      store.setSelection({ type: 'frame', id: frameId });
      openFrameEditor(frameId);
      event.stopPropagation();
      return;
    }

    const frameDeleteEl = event.target.closest('[data-frame-delete]');
    if (frameDeleteEl) {
      const frameId = frameDeleteEl.dataset.frameDelete;
      activeLiveEditFrameId = null;
      store.deleteFrame(frameId);
      event.stopPropagation();
    }
  }

  bindNodeInteractions({ nodesLayer, selectionControlsLayer, focusLayer }, {
    onNodePointerDown,
    onNodeDoubleClick,
    onNodePointerMove,
    onNodePointerUp,
    onNodePointerCancel,
    onNodeLostPointerCapture,
    onNodeClick,
    onNodeKeyDown,
    onNodeInput,
    onSelectionControlsPointerDown,
    onSelectionControlsClick,
  });

  function onFramePointerDown(event) {
    if (isFrameDrawMode) return;
    const resizeEl = event.target.closest('[data-frame-resize]');
    if (resizeEl && event.button === 0) {
      beginFrameResizeSession(event, resizeEl.dataset.frameResize);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const anchorEl = event.target.closest('[data-frame-anchor]');
    if (anchorEl && event.button === 0) {
      beginEdgeSession(event, anchorEl.dataset.frameAnchor);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (isDescriptionLinkTarget(event.target)) {
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-frame-editor], [data-frame-edit-open], [data-frame-delete]')) {
      event.stopPropagation();
      return;
    }

    const frameEl = event.target.closest('[data-frame-id]');
    if (!frameEl || event.button !== 0) return;

    endPanSession();
    endDragSession();
    endFrameDragSession();
    endMarqueeSession();
    endResizeSession();
    endFrameResizeSession();
    cancelEdgeSession();
    endFrameDrawSession();

    const frameId = frameEl.dataset.frameId;
    const state = store.getState();
    const frame = getFrame(frameId, state);
    if (!frame) return;

    if (state.ui.editingNodeId) {
      closeNodeEditor();
    }
    store.setSelection({ type: 'frame', id: frameId });

    frameDragSession = {
      pointerId: event.pointerId,
      frameId,
      startX: event.clientX,
      startY: event.clientY,
      frameStartX: frame.x,
      frameStartY: frame.y,
      moved: false,
    };

    store.setDragging(true);
    framesLayer.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }

  function onFramePointerMove(event) {
    if (edgeSession && edgeSession.pointerId === event.pointerId) {
      updateEdgeDraft(event);
      return;
    }

    if (frameResizeSession && frameResizeSession.pointerId === event.pointerId) {
      const state = store.getState();
      const viewport = state.viewport;
      const dx = (event.clientX - frameResizeSession.startX) / viewport.zoom;
      const dy = (event.clientY - frameResizeSession.startY) / viewport.zoom;

      if (!frameResizeSession.moved) {
        if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) {
          return;
        }
        store.beginFrameResize();
        frameResizeSession.moved = true;
      }

      const next = computeFrameResizedRect(frameResizeSession, dx, dy);
      store.resizeFrame(frameResizeSession.frameId, next, { skipHistory: true });
      updateFrameResizeMembershipPreview(frameResizeSession.frameId, {
        left: next.x,
        top: next.y,
        right: next.x + next.width,
        bottom: next.y + next.height,
      }, state);
      return;
    }

    if (!frameDragSession || frameDragSession.pointerId !== event.pointerId) return;
    const viewport = store.getState().viewport;
    const dx = (event.clientX - frameDragSession.startX) / viewport.zoom;
    const dy = (event.clientY - frameDragSession.startY) / viewport.zoom;

    if (!frameDragSession.moved && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      store.beginFrameMove();
      frameDragSession.moved = true;
    }

    store.moveFrame(
      frameDragSession.frameId,
      frameDragSession.frameStartX + dx,
      frameDragSession.frameStartY + dy,
      { skipHistory: true, moveMembers: true },
    );
  }

  function onFramePointerUp(event) {
    if (frameResizeSession && event.pointerId === frameResizeSession.pointerId) {
      if (frameResizeSession.moved) {
        applyFrameResizeMembership(frameResizeSession.frameId, store.getState());
      }
      endFrameResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      finishEdgeSession(event);
      return;
    }
    if (!frameDragSession || event.pointerId !== frameDragSession.pointerId) return;
    endFrameDragSession(event.pointerId);
  }

  function onFramePointerCancel(event) {
    if (frameResizeSession && event.pointerId === frameResizeSession.pointerId) {
      endFrameResizeSession(event.pointerId);
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession(event.pointerId);
      return;
    }
    if (!frameDragSession || event.pointerId !== frameDragSession.pointerId) return;
    endFrameDragSession(event.pointerId);
  }

  function onFrameLostPointerCapture(event) {
    if (frameResizeSession && event.pointerId === frameResizeSession.pointerId) {
      endFrameResizeSession();
      return;
    }
    if (edgeSession && event.pointerId === edgeSession.pointerId) {
      cancelEdgeSession();
      return;
    }
    if (!frameDragSession || event.pointerId !== frameDragSession.pointerId) return;
    endFrameDragSession();
  }

  function onFrameClick(event) {
    if (isDescriptionLinkTarget(event.target)) {
      event.stopPropagation();
      return;
    }

    const openEl = event.target.closest('[data-frame-edit-open]');
    if (openEl) {
      const frameId = openEl.dataset.frameEditOpen;
      store.setSelection({ type: 'frame', id: frameId });
      openFrameEditor(frameId);
      event.stopPropagation();
      return;
    }

    const deleteEl = event.target.closest('[data-frame-delete]');
    if (deleteEl) {
      const frameId = deleteEl.dataset.frameDelete;
      activeLiveEditFrameId = null;
      store.deleteFrame(frameId);
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-frame-editor]')) {
      event.stopPropagation();
      return;
    }

    const frameEl = event.target.closest('[data-frame-id]');
    if (!frameEl) return;
    store.setSelection({ type: 'frame', id: frameEl.dataset.frameId });
    event.stopPropagation();
  }

  function onFrameKeyDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const frameEl = target.closest('[data-frame-id]');
    const editorEl = target.closest('[data-frame-editor]');
    if (!frameEl || !editorEl) return;
    const frameId = frameEl.dataset.frameId;
    if (!frameId) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeFrameEditor(frameId);
      return;
    }

    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    if (ctrlOrCmd && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      closeFrameEditor(frameId);
    }
  }

  function onFrameInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const frameEl = target.closest('[data-frame-id]');
    if (!frameEl) return;
    const frameId = frameEl.dataset.frameId;
    if (!frameId) return;

    if (target.matches('[data-frame-edit-title]')) {
      applyLiveFrameEditorInput(frameId, { title: target.value });
      event.stopPropagation();
      return;
    }

    if (target.matches('[data-frame-edit-description]')) {
      applyLiveFrameEditorInput(frameId, { description: target.value });
      event.stopPropagation();
      return;
    }

    if (target.matches('[data-frame-edit-border-width]')) {
      applyLiveFrameEditorInput(frameId, { borderWidth: target.value });
      event.stopPropagation();
      return;
    }

    if (target.matches('[data-frame-edit-border-style]')) {
      applyLiveFrameEditorInput(frameId, { borderStyle: target.value });
      event.stopPropagation();
    }
  }

  function handleEdgeClick(event) {
    const deleteEl = event.target.closest('[data-edge-delete]');
    if (deleteEl) {
      store.deleteEdge(deleteEl.dataset.edgeDelete);
      event.stopPropagation();
      return;
    }

    const edgeEl = event.target.closest('[data-edge-id]');
    if (!edgeEl) return;
    activeLiveEditNodeId = null;
    store.setSelection({ type: 'edge', id: edgeEl.dataset.edgeId });
    event.stopPropagation();
  }

  function onEdgePointerDown(event) {
    if (event.button !== 0) return;
    const endpointEl = event.target.closest('[data-edge-endpoint]');
    if (!endpointEl) return;
    beginReconnectSession(event, endpointEl.dataset.edgeEndpoint);
    event.stopPropagation();
    event.preventDefault();
  }

  bindFrameInteractions({ framesLayer }, {
    onFramePointerDown,
    onFramePointerMove,
    onFramePointerUp,
    onFramePointerCancel,
    onFrameLostPointerCapture,
    onFrameClick,
    onFrameKeyDown,
    onFrameInput,
  });

  bindEdgeInteractions({ edgeOverlayGroup, edgesGroup }, {
    onEdgeClick: handleEdgeClick,
    onEdgePointerDown,
  });

  store.subscribe((state) => {
    if (!editorFocusLock) return;
    const lock = editorFocusLock;
    if (Date.now() > lock.expiresAt) {
      clearEditorFocusLock();
      return;
    }
    if (state.ui.editingNodeId !== lock.nodeId) {
      clearEditorFocusLock();
      return;
    }
    if (state.selection?.type !== 'node' || state.selection.id !== lock.nodeId) {
      clearEditorFocusLock();
      return;
    }

    const titleInput = getNodeTitleInput(lock.nodeId);
    if (!(titleInput instanceof HTMLInputElement)) return;

    const active = document.activeElement;
    if (active instanceof HTMLElement && isTypingTarget(active) && active !== titleInput) {
      clearEditorFocusLock();
      return;
    }
    if (active !== titleInput) {
      titleInput.focus({ preventScroll: true });
      titleInput.select();
    }
  });

  document.addEventListener('focusin', (event) => {
    if (!editorFocusLock) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!isTypingTarget(target)) return;
    const titleInput = getNodeTitleInput(editorFocusLock.nodeId);
    if (target !== titleInput) {
      clearEditorFocusLock();
    }
  });

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
  const nodeColorBtn = document.getElementById('node-color-btn');
  const nodeColorPopover = document.getElementById('node-color-popover');

  function hasGraphData() {
    const state = store.getState();
    return state.nodes.length > 0 || state.frames.length > 0 || state.edges.length > 0;
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
        frames: state.frames,
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
        nodeColorDefault: GRAPH_DEFAULTS.nodeColorDefault,
      },
      nodes: [],
      frames: [],
      edges: [],
    });
    store.resetView();
    syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput);
    store.setImportStatus('New graph created.');
  }

  async function handleAddImageNode() {
    try {
      const file = await pickImageFile();
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const imageMeta = await loadImageMeta(dataUrl);
      const { viewport } = store.getState();
      const point = {
        x: (120 - viewport.panX) / viewport.zoom,
        y: (120 - viewport.panY) / viewport.zoom,
      };
      const defaultWidth = NODE_DEFAULTS.width;
      const imageHeight = Math.round(defaultWidth / imageMeta.aspectRatio);
      const nodeTitle = deriveNodeTitleFromFilename(file.name);
      createImageNodeInEditMode(point, {
        title: nodeTitle,
        dataUrl,
        aspectRatio: imageMeta.aspectRatio,
        width: defaultWidth,
        height: imageHeight + IMAGE_NODE_DEFAULTS.metaHeight,
      });
    } catch {
      store.setImportStatus('Image add failed. Try another file.');
    }
  }

  function bindToolbar() {
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

  syncNodeColorButtonState(store.getState(), nodeColorBtn, nodeColorPopover);

  if (nodeColorBtn instanceof HTMLButtonElement && nodeColorPopover instanceof HTMLElement) {
    nodeColorBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setNodeColorPopoverOpen(!isNodeColorPopoverOpen, nodeColorBtn, nodeColorPopover);
    });

    nodeColorPopover.addEventListener('click', (event) => {
      const swatchBtn = event.target.closest('[data-node-color-value]');
      if (!(swatchBtn instanceof HTMLButtonElement)) return;
      const selection = store.getState().selection;
      const selectionIds = getSelectedNodeIds(selection);
      const colorKey = getNormalizedNodeColorValue(swatchBtn.dataset.nodeColorValue);
      store.setNodeColorDefault(colorKey);
      if (selection?.type === 'frame') {
        store.setFramesColor([selection.id], colorKey);
        setNodeColorPopoverOpen(false, nodeColorBtn, nodeColorPopover);
        return;
      }
      if (!selectionIds.length) {
        setNodeColorPopoverOpen(false, nodeColorBtn, nodeColorPopover);
        return;
      }
      store.setNodesColor(selectionIds, colorKey);
      setNodeColorPopoverOpen(false, nodeColorBtn, nodeColorPopover);
      event.stopPropagation();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!isNodeColorPopoverOpen) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('#node-color-popover') || target.closest('#node-color-btn')) return;
      setNodeColorPopoverOpen(false, nodeColorBtn, nodeColorPopover);
    });
  }

  document.getElementById('add-node-btn')?.addEventListener('click', () => {
    const { viewport } = store.getState();
    createNodeInEditMode({ x: (120 - viewport.panX) / viewport.zoom, y: (120 - viewport.panY) / viewport.zoom });
  });

  document.getElementById('add-image-btn')?.addEventListener('click', () => {
    void handleAddImageNode();
  });

  document.getElementById('add-frame-btn')?.addEventListener('click', () => {
    setFrameDrawMode(!isFrameDrawMode);
  });

  document.getElementById('reset-view-btn')?.addEventListener('click', () => store.resetView());
  document.getElementById('undo-btn')?.addEventListener('click', () => store.undo());
  document.getElementById('redo-btn')?.addEventListener('click', () => store.redo());

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

  }

  function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (aboutDialog?.open || settingsDialog?.open) return;
    if (event.key === 'Escape' && isNodeColorPopoverOpen) {
      event.preventDefault();
      setNodeColorPopoverOpen(false, nodeColorBtn, nodeColorPopover);
      return;
    }
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    const focusShortcut = ctrlOrCmd && event.altKey && event.key === 'Enter';
    if (focusShortcut) {
      if (toggleFocusedSelectionNode()) {
        event.preventDefault();
      }
      return;
    }
    if (isTypingTarget(event.target)) return;

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

    if (ctrlOrCmd && !event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      toggleSelectedEditor();
      return;
    }

    if (ctrlOrCmd && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      createLinkedNodeFromSelection();
      return;
    }

    if (ctrlOrCmd && isDirectionalArrowKey(event.key)) {
      event.preventDefault();
      selectDirectionalNode(event.key);
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selection = store.getState().selection;
      if (!selection) return;
      event.preventDefault();
      if (selection.type === 'node') store.deleteNode(selection.id);
      if (selection.type === 'nodes') store.deleteSelectedNodes();
      if (selection.type === 'frame') store.deleteFrame(selection.id);
      if (selection.type === 'edge') store.deleteEdge(selection.id);
      return;
    }

    if (event.key === 'Escape') {
      if (store.getState().ui.focusedNodeId) {
        closeNodeFocus();
        return;
      }
      if (frameDrawSession || isFrameDrawMode) {
        endFrameDrawSession();
        setFrameDrawMode(false);
        return;
      }
      if (marqueeSession) {
        endMarqueeSession();
        return;
      }
      if (frameResizeSession) {
        endFrameResizeSession();
        return;
      }
      if (resizeSession) {
        endResizeSession();
        return;
      }
      if (store.getState().ui.editingFrameId) {
        closeFrameEditor();
        return;
      }
      if (store.getState().ui.editingNodeId) {
        closeNodeEditor();
        return;
      }
      if (edgeSession) {
        cancelEdgeSession();
        return;
      }
      if (frameDragSession) {
        endFrameDragSession();
        return;
      }
      store.clearSelection();
    }
  });
  }

  store.subscribe((state) => {
    syncNodeColorButtonState(state, nodeColorBtn, nodeColorPopover);
  });

  bindToolbarInteractions({ bindToolbar });
  bindKeyboardInteractions({ bindKeyboard });
}

function isAdditiveModifier(event) {
  return Boolean(event?.ctrlKey || event?.metaKey);
}

function getSelectedNodeIds(selection) {
  if (!selection) return [];
  if (selection.type === 'node') return [selection.id];
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) ? selection.ids : [];
  }
  return [];
}

function toRectFromPoints(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function getIntersectingNodeIds(nodes, rect) {
  if (!rect) return [];
  const hitIds = [];
  for (const node of nodes) {
    const nodeRect = getNodeInteractionRect(node);
    const intersects = rect.left < nodeRect.right
      && rect.right > nodeRect.left
      && rect.top < nodeRect.bottom
      && rect.bottom > nodeRect.top;
    if (intersects) {
      hitIds.push(node.id);
    }
  }
  return hitIds;
}

function uniqueIds(ids) {
  const seen = new Set();
  const output = [];
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    output.push(id);
  }
  return output;
}

function getNodeInteractionRect(node) {
  const nodeEl = document.querySelector(`[data-node-id="${typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(node.id) : node.id}"]`);
  if (nodeEl) {
    const width = nodeEl.offsetWidth || getNodeWidth(node);
    const height = nodeEl.offsetHeight || getNodeHeight(node);
    return {
      left: node.x,
      top: node.y,
      right: node.x + width,
      bottom: node.y + height,
    };
  }
  return {
    left: node.x,
    top: node.y,
    right: node.x + getNodeWidth(node),
    bottom: node.y + getNodeHeight(node),
  };
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

function getFrame(id, state) {
  return state.frames.find((frame) => frame.id === id) || null;
}

function getEntity(id, state) {
  return getNode(id, state) || getFrame(id, state);
}

function parseAnchorToken(value) {
  if (!value || typeof value !== 'string') return null;
  const [nodeId, anchor] = value.split(':');
  if (!nodeId || !isAnchorName(anchor)) return null;
  return { nodeId, anchor };
}

function getGraphEntityIdAtClientPoint(clientX, clientY) {
  const hits = document.elementsFromPoint(clientX, clientY);
  for (const hit of hits) {
    const frameEl = hit.closest('[data-frame-id]');
    if (frameEl?.dataset?.frameId) {
      return frameEl.dataset.frameId;
    }
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
    const nearestAnchor = resolveNearestEntityAnchorToPointer(targetNode.id, pointer, canvasEl, viewport);
    if (nearestAnchor) {
      return nearestAnchor;
    }
  }
  return resolveAnchorName(null, targetNode, sourceNode);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseFrameResizeToken(value) {
  if (!value || typeof value !== 'string') return null;
  const [frameId, corner] = value.split(':');
  if (!frameId || !isResizeCorner(corner)) return null;
  return { frameId, corner };
}

function isDirectionalArrowKey(key) {
  return key === 'ArrowUp'
    || key === 'ArrowDown'
    || key === 'ArrowLeft'
    || key === 'ArrowRight';
}

function getNodeCenter(node) {
  return {
    x: node.x + (getNodeWidth(node) / 2),
    y: node.y + (getNodeHeight(node) / 2),
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

function getFrameWidth(frame) {
  const width = Number(frame?.width);
  return Number.isFinite(width) && width > 0 ? width : FRAME_DEFAULTS.width;
}

function getFrameHeight(frame) {
  const height = Number(frame?.height);
  return Number.isFinite(height) && height > 0 ? height : FRAME_DEFAULTS.height;
}

function getNodeRect(node) {
  const left = Number(node.x) || 0;
  const top = Number(node.y) || 0;
  return {
    left,
    top,
    right: left + getNodeWidth(node),
    bottom: top + getNodeHeight(node),
  };
}

function getFrameRect(frame) {
  const left = Number(frame.x) || 0;
  const top = Number(frame.y) || 0;
  return {
    left,
    top,
    right: left + getFrameWidth(frame),
    bottom: top + getFrameHeight(frame),
  };
}

function getNodeFrameOverlapArea(node, frame) {
  const nodeRect = getNodeRect(node);
  const frameRect = getFrameRect(frame);
  const overlapWidth = Math.max(0, Math.min(nodeRect.right, frameRect.right) - Math.max(nodeRect.left, frameRect.left));
  const overlapHeight = Math.max(0, Math.min(nodeRect.bottom, frameRect.bottom) - Math.max(nodeRect.top, frameRect.top));
  return overlapWidth * overlapHeight;
}

function findBestFrameIdForNodeFromRects(node, frames) {
  let best = null;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const overlap = getNodeFrameOverlapArea(node, frame);
    if (overlap <= 0) continue;
    if (!best || overlap > best.overlap || (overlap === best.overlap && index > best.index)) {
      best = { frameId: frame.id, overlap, index };
    }
  }
  return best?.frameId || null;
}

function getFrameResizeMembershipDelta(frameId, frameRect, state) {
  const addNodeIds = [];
  const removeNodeIds = [];
  const candidateIds = findFrameResizeCandidateNodeIds(frameId, frameRect, state);
  if (!candidateIds.length) {
    return { addNodeIds, removeNodeIds };
  }

  const simulatedFrames = state.frames.map((frame) => {
    if (frame.id !== frameId) return frame;
    return {
      ...frame,
      x: frameRect.left,
      y: frameRect.top,
      width: frameRect.right - frameRect.left,
      height: frameRect.bottom - frameRect.top,
    };
  });

  for (const nodeId of candidateIds) {
    const node = getNode(nodeId, state);
    if (!node) continue;
    const bestFrameId = findBestFrameIdForNodeFromRects(node, simulatedFrames);
    const currentFrameId = node.frameId || null;
    if (bestFrameId === frameId && currentFrameId !== frameId) {
      addNodeIds.push(node.id);
      continue;
    }
    if (currentFrameId === frameId && bestFrameId !== frameId) {
      removeNodeIds.push(node.id);
    }
  }

  return { addNodeIds, removeNodeIds };
}

function findFrameResizeCandidateNodeIds(frameId, frameRect, state) {
  const ids = [];
  for (const node of state.nodes) {
    const currentlyInFrame = node.frameId === frameId;
    const overlapsResizedFrame = getNodeFrameOverlapArea(node, {
      x: frameRect.left,
      y: frameRect.top,
      width: frameRect.right - frameRect.left,
      height: frameRect.bottom - frameRect.top,
    }) > 0;
    if (currentlyInFrame || overlapsResizedFrame) {
      ids.push(node.id);
    }
  }
  return ids;
}

function buildDirectionalScore(originCenter, candidateNode, key) {
  const center = getNodeCenter(candidateNode);
  const dx = center.x - originCenter.x;
  const dy = center.y - originCenter.y;
  if (!isDirectionalCandidate(dx, dy, key)) return null;
  return {
    primary: getDirectionalPrimaryDistance(dx, dy, key),
    secondary: getDirectionalSecondaryOffset(dx, dy, key),
    distance: Math.hypot(dx, dy),
    nodeId: candidateNode.id,
  };
}

function getExpectedDirectionalAnchor(key) {
  if (key === 'ArrowUp') return 'top';
  if (key === 'ArrowDown') return 'bottom';
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowRight') return 'right';
  return null;
}

function resolveDirectionalAnchorForEdgeSide({
  edge,
  side,
  currentNode,
  otherNode,
  anchorsMode,
}) {
  if (!edge || !side || !currentNode || !otherNode) return null;
  if (anchorsMode === 'exact') {
    const storedAnchor = side === 'from' ? edge.fromAnchor : edge.toAnchor;
    return isAnchorName(storedAnchor) ? storedAnchor : null;
  }
  return resolveAnchorName(null, currentNode, otherNode);
}

function computeLinkedNodePosition(sourceNode, nodes) {
  const sourceWidth = getNodeWidth(sourceNode);
  const sourceHeight = getNodeHeight(sourceNode);
  const baseX = sourceNode.x + sourceWidth + KEYBOARD_LINKED_NODE.horizontalGap;
  const centeredBaseY = sourceNode.y
    + KEYBOARD_LINKED_NODE.verticalOffset
    + ((sourceHeight - NODE_DEFAULTS.height) / 2);

  for (let attempt = 0; attempt <= KEYBOARD_LINKED_NODE.maxCollisionChecks; attempt += 1) {
    const candidate = {
      x: baseX,
      y: centeredBaseY + (attempt * KEYBOARD_LINKED_NODE.collisionStepY),
    };
    if (!doesNodeOverlap(candidate, nodes, KEYBOARD_LINKED_NODE.overlapPadding)) {
      return candidate;
    }
  }

  return {
    x: baseX,
    y: centeredBaseY + ((KEYBOARD_LINKED_NODE.maxCollisionChecks + 1) * KEYBOARD_LINKED_NODE.collisionStepY),
  };
}

function doesNodeOverlap(candidate, nodes, padding = 0) {
  const left = candidate.x - padding;
  const right = candidate.x + NODE_DEFAULTS.width + padding;
  const top = candidate.y - padding;
  const bottom = candidate.y + NODE_DEFAULTS.height + padding;

  for (const node of nodes) {
    const nodeLeft = node.x;
    const nodeRight = node.x + getNodeWidth(node);
    const nodeTop = node.y;
    const nodeBottom = node.y + getNodeHeight(node);
    const intersects = left < nodeRight
      && right > nodeLeft
      && top < nodeBottom
      && bottom > nodeTop;
    if (intersects) {
      return true;
    }
  }

  return false;
}

function isDirectionalCandidate(dx, dy, key) {
  const epsilon = KEYBOARD_DIRECTIONAL_SELECTION.axisEpsilon;
  if (key === 'ArrowUp') return dy < -epsilon;
  if (key === 'ArrowDown') return dy > epsilon;
  if (key === 'ArrowLeft') return dx < -epsilon;
  if (key === 'ArrowRight') return dx > epsilon;
  return false;
}

function getDirectionalPrimaryDistance(dx, dy, key) {
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return Math.abs(dx);
  }
  return Math.abs(dy);
}

function getDirectionalSecondaryOffset(dx, dy, key) {
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return Math.abs(dy);
  }
  return Math.abs(dx);
}

function compareDirectionalScores(left, right) {
  const epsilon = KEYBOARD_DIRECTIONAL_SELECTION.tieEpsilon;
  if (Math.abs(left.primary - right.primary) > epsilon) {
    return left.primary - right.primary;
  }
  if (Math.abs(left.secondary - right.secondary) > epsilon) {
    return left.secondary - right.secondary;
  }
  if (Math.abs(left.distance - right.distance) > epsilon) {
    return left.distance - right.distance;
  }
  return left.nodeId.localeCompare(right.nodeId);
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

function computeFrameResizedRect(session, deltaX, deltaY) {
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
    left = Math.min(left, right - FRAME_DEFAULTS.minWidth);
  }
  if (session.corner.includes('right')) {
    right = Math.max(right, left + FRAME_DEFAULTS.minWidth);
  }
  if (session.corner.includes('top')) {
    top = Math.min(top, bottom - FRAME_DEFAULTS.minHeight);
  }
  if (session.corner.includes('bottom')) {
    bottom = Math.max(bottom, top + FRAME_DEFAULTS.minHeight);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function computeImageResizedRect(session, deltaX) {
  const startWidth = session.startRight - session.startLeft;
  const aspectRatio = Number(session.imageAspectRatio) > 0 ? Number(session.imageAspectRatio) : 1;
  const metaHeight = Math.max(0, Number(session.imageMetaHeight) || 0);
  const minImageWidth = IMAGE_NODE_DEFAULTS.minImageWidth;
  const minImageHeight = IMAGE_NODE_DEFAULTS.minImageHeight;
  const minWidthByHeight = minImageHeight * aspectRatio;
  const minWidth = Math.max(minImageWidth, minWidthByHeight);

  let nextWidth = startWidth;
  if (session.corner.includes('left')) {
    nextWidth = startWidth - deltaX;
  } else if (session.corner.includes('right')) {
    nextWidth = startWidth + deltaX;
  }
  nextWidth = Math.max(minWidth, nextWidth);

  const nextImageHeight = Math.max(minImageHeight, nextWidth / aspectRatio);
  const nextHeight = nextImageHeight + metaHeight;

  const left = session.corner.includes('left')
    ? session.startRight - nextWidth
    : session.startLeft;
  const top = session.corner.includes('top')
    ? session.startBottom - nextHeight
    : session.startTop;

  return {
    x: left,
    y: top,
    width: nextWidth,
    height: nextHeight,
  };
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"]');
}

function getNodeTitleInput(nodeId) {
  const selector = `[data-node-edit-title="${nodeId}"]`;
  return document.querySelector(`#focus-layer ${selector}`) || document.querySelector(`#nodes-layer ${selector}`);
}

function resolveEffectiveAnchorForSession(storedAnchor, fromNode, toNode, anchorsMode) {
  if (anchorsMode === 'exact' && isAnchorName(storedAnchor)) {
    return storedAnchor;
  }
  return resolveAnchorName(null, fromNode, toNode);
}

function resolveNearestEntityAnchorToPointer(nodeId, pointer, canvasEl, viewport) {
  if (!nodeId || !pointer || !canvasEl || !viewport) return null;
  const nodeEl = getGraphElementById(nodeId);
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

function getGraphElementById(nodeId) {
  const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(nodeId)
    : nodeId;
  const nodeEl = document.querySelector(`[data-node-id="${escapedId}"], [data-frame-id="${escapedId}"]`);
  return nodeEl instanceof HTMLElement ? nodeEl : null;
}

function pickImageFile() {
  return new Promise((resolve) => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.multiple = false;
    picker.style.position = 'fixed';
    picker.style.left = '-9999px';
    document.body.appendChild(picker);

    const finalize = (file = null) => {
      picker.remove();
      resolve(file);
    };

    picker.addEventListener('change', () => {
      finalize(picker.files?.[0] || null);
    }, { once: true });
    picker.addEventListener('cancel', () => finalize(null), { once: true });
    picker.click();
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
        reject(new Error('Invalid image data'));
        return;
      }
      resolve(reader.result);
    });
    reader.addEventListener('error', () => reject(reader.error || new Error('Failed to read image')));
    reader.readAsDataURL(file);
  });
}

function loadImageMeta(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) {
        reject(new Error('Unsupported image dimensions'));
        return;
      }
      resolve({
        width,
        height,
        aspectRatio: width / height,
      });
    });
    image.addEventListener('error', () => reject(new Error('Failed to decode image')));
    image.src = dataUrl;
  });
}

function deriveNodeTitleFromFilename(fileName) {
  const raw = String(fileName || '').trim();
  if (!raw) return NODE_DEFAULTS.title;
  const trimmedExtension = raw.replace(/\.[^/.]+$/, '').trim();
  return trimmedExtension || NODE_DEFAULTS.title;
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
