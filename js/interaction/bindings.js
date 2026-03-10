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
import { isDialogBackdropTarget } from '../utils/dialog.js';
import { normalizeShortcutSearchText } from '../utils/shortcut-search.js';
import { formatShortcutLabel } from '../utils/shortcuts.js';
import { getAnchoredUiPlacement, getUnavailableCornerPositions, resolvePlacementChange } from '../utils/ui-placement.js';
import { bindCanvasInteractions } from './binders/canvas.js';
import { bindEdgeInteractions } from './binders/edges.js';
import { bindFrameInteractions } from './binders/frames.js';
import { bindKeyboardInteractions } from './binders/keyboard.js';
import { bindNodeInteractions } from './binders/nodes.js';
import { bindToolbarInteractions } from './binders/toolbar.js';

const SHORTCUT_CATALOG = [
  {
    id: 'new-graph',
    keys: ['Ctrl/Cmd + Shift + H'],
    title: 'New hypernode',
    description: 'Starts a new hypernode after confirming any discard.',
    searchTokens: ['new', 'graph', 'file', 'create'],
  },
  {
    id: 'open-graph',
    keys: ['Ctrl/Cmd + O'],
    title: 'Open hypernode',
    description: 'Opens a hypernode file when the browser supports file access.',
    searchTokens: ['open', 'graph', 'file', 'import'],
  },
  {
    id: 'add-node',
    keys: ['N', 'Ctrl/Cmd + N'],
    title: 'Add node',
    description: 'Creates a new text node; Ctrl/Cmd + N places it at the current pointer position.',
    searchTokens: ['node', 'create', 'text', 'toolbar', 'pointer', 'mouse', 'cursor'],
  },
  {
    id: 'add-image-node',
    keys: ['I'],
    title: 'Add image node',
    description: 'Opens the image picker and adds a new image node.',
    searchTokens: ['image', 'media', 'create', 'toolbar'],
  },
  {
    id: 'draw-frame',
    keys: ['F'],
    title: 'Toggle frame draw',
    description: 'Turns frame drawing mode on or off.',
    searchTokens: ['frame', 'draw', 'toggle', 'group'],
  },
  {
    id: 'delete-selection',
    keys: ['Delete', 'Backspace'],
    title: 'Delete selection',
    description: 'Deletes the selected node or edge outside Zen mode.',
    searchTokens: ['delete', 'selected', 'node', 'edge', 'remove'],
  },
  {
    id: 'delete-focus',
    keys: ['Ctrl/Cmd + Delete', 'Ctrl/Cmd + Backspace'],
    title: 'Delete in Zen mode',
    description: 'Deletes the focused node in Zen mode after confirmation.',
    searchTokens: ['zen', 'focus', 'focused', 'confirm', 'remove'],
  },
  {
    id: 'create-linked-node',
    keys: ['Ctrl/Cmd + Shift + Enter'],
    title: 'Create linked node',
    description: 'Adds a new node linked from the current selection.',
    searchTokens: ['linked', 'node', 'create', 'connection', 'follow-up'],
  },
  {
    id: 'directional-navigation',
    keys: ['Ctrl/Cmd + Arrow'],
    title: 'Directional navigation',
    description: 'Follows a connected node in that direction, otherwise the nearest candidate.',
    searchTokens: ['up', 'down', 'left', 'right', 'follow', 'connected', 'graph'],
  },
  {
    id: 'undo',
    keys: ['Ctrl/Cmd + Z'],
    title: 'Undo',
    description: 'Reverts the last change.',
    searchTokens: ['undo', 'revert', 'history'],
  },
  {
    id: 'redo',
    keys: ['Ctrl/Cmd + Y', 'Ctrl/Cmd + Shift + Z'],
    title: 'Redo',
    description: 'Reapplies the last undone change.',
    searchTokens: ['redo', 'history', 'repeat'],
  },
  {
    id: 'save',
    keys: ['Ctrl/Cmd + S'],
    title: 'Save hypernode',
    description: 'Saves the current hypernode file.',
    searchTokens: ['save', 'file', 'export'],
  },
  {
    id: 'reset-view',
    keys: ['Ctrl/Cmd + 0'],
    title: 'Reset view',
    description: 'Resets pan and zoom to the default canvas view.',
    searchTokens: ['reset', 'view', 'zoom', 'pan', 'center'],
  },
  {
    id: 'toggle-editor',
    keys: ['Ctrl/Cmd + Enter'],
    title: 'Toggle editor',
    description: 'Toggles the selected node or frame editor.',
    searchTokens: ['edit', 'editor', 'node', 'frame', 'read'],
  },
  {
    id: 'toggle-zen',
    keys: ['Ctrl/Cmd + Alt + Enter'],
    title: 'Toggle Zen mode',
    description: 'Enters or exits Zen mode for the selected node.',
    searchTokens: ['zen', 'focus', 'fullscreen', 'node'],
  },
  {
    id: 'add-to-selection',
    keys: ['Ctrl/Cmd + Click'],
    title: 'Add to selection',
    description: 'Adds a node to the current multi-selection.',
    searchTokens: ['multi-select', 'selection', 'additive', 'node'],
  },
  {
    id: 'open-settings',
    keys: ['Ctrl/Cmd + ,'],
    title: 'Open settings',
    description: 'Opens the hypernode settings dialog.',
    searchTokens: ['settings', 'preferences', 'dialog'],
  },
  {
    id: 'open-shortcuts',
    keys: ['Ctrl/Cmd + /'],
    title: 'Open keyboard shortcuts',
    description: 'Opens the keyboard shortcuts dialog.',
    searchTokens: ['shortcuts', 'help', 'keys', 'dialog'],
  },
  {
    id: 'toggle-theme',
    keys: ['T'],
    title: 'Toggle document theme',
    description: 'Cycles the current hypernode through the curated theme presets.',
    searchTokens: ['theme', 'appearance', 'blueprint', 'graphite', 'fjord', 'slate', 'mist', 'paper', 'ember', 'soft black', 'preset'],
  },
  {
    id: 'open-about',
    keys: ['Shift + ?'],
    title: 'Open about',
    description: 'Opens the about dialog and guide.',
    searchTokens: ['about', 'help', 'guide', 'info'],
  },
  {
    id: 'cancel-exit',
    keys: ['Esc'],
    title: 'Cancel or exit',
    description: 'Exits Zen or edit mode, cancels connect or frame draw, or clears selection.',
    searchTokens: ['escape', 'cancel', 'clear', 'selection', 'frame', 'draw', 'connect'],
  },
];

const TOOLBAR_SHORTCUTS = {
  'new-graph-btn': { label: 'New hypernode', shortcut: 'Ctrl/Cmd+Shift+H' },
  'add-node-btn': { label: 'Add node', shortcut: 'N' },
  'add-image-btn': { label: 'Add image node', shortcut: 'I' },
  'add-frame-btn': { label: 'Draw frame', shortcut: 'F' },
  'open-graph-btn': { label: 'Open hypernode', shortcut: 'Ctrl/Cmd+O' },
  'save-graph-btn': { label: 'Save hypernode', shortcut: 'Ctrl/Cmd+S' },
  'undo-btn': { label: 'Undo', shortcut: 'Ctrl/Cmd+Z' },
  'redo-btn': { label: 'Redo', shortcut: 'Ctrl/Cmd+Y' },
  'reset-view-btn': { label: 'Reset view', shortcut: 'Ctrl/Cmd+0' },
  'settings-btn': { label: 'Hypernode settings', shortcut: 'Ctrl/Cmd+,' },
  'shortcuts-btn': { label: 'Keyboard shortcuts', shortcut: 'Ctrl/Cmd+/' },
  'about-btn': { label: 'About hypernode', shortcut: 'Shift+?' },
};

export function bindInteractions(elements, store, options = {}) {
  const {
    workspace,
    canvas,
    canvasDropZone,
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
  let openToolbarPopoverEl = null;
  let lastNodePress = { id: null, at: 0 };
  let canvasFileDragDepth = 0;
  let focusImageDragDepth = 0;
  let aboutSlideIndex = 0;
  let lastCanvasPointerClient = null;

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

  function getTodayLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getStarterNodePoint(viewport = store.getState().viewport) {
    const center = getCanvasCenterGraphPoint(viewport);
    return {
      x: Math.round(center.x - (NODE_DEFAULTS.width / 2)),
      y: Math.round(center.y - (NODE_DEFAULTS.height / 2)),
    };
  }

  function getCanvasCenterGraphPoint(viewport = store.getState().viewport) {
    const rect = typeof canvas?.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };
    return toGraphPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2), canvas, viewport);
  }

  function resetCanvasView() {
    const rect = typeof canvas?.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : { width: 0, height: 0 };
    store.setViewport({
      panX: Math.round(rect.width / 2),
      panY: Math.round(rect.height / 2),
      zoom: VIEWPORT_LIMITS.defaultZoom,
    });
  }

  function getLastPointerGraphPoint(viewport = store.getState().viewport) {
    if (!lastCanvasPointerClient) {
      return getCanvasCenterGraphPoint(viewport);
    }
    return toGraphPoint(lastCanvasPointerClient.clientX, lastCanvasPointerClient.clientY, canvas, viewport);
  }

  function createStarterHypernode() {
    const state = store.getState();
    if (state.nodes.length || state.frames.length || state.edges.length) {
      return false;
    }
    const title = getTodayLocalDateString();
    store.setGraphName(title);
    const node = store.addNode({
      ...getStarterNodePoint(state.viewport),
      title,
      description: '',
    });
    if (!node) return false;
    store.setStarterNode(node.id);
    openNodeFocus(node.id, { lockFocusMs: 7000, stabilizeFrames: 3 });
    return true;
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
    store.clearFrameMembershipPreview();
    store.clearNodeMembershipPreview();
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

  function setCanvasFileDropActive(active) {
    const enabled = Boolean(active);
    canvas.classList.toggle('is-file-drop-active', enabled);
    if (canvasDropZone instanceof HTMLElement) {
      canvasDropZone.hidden = !enabled;
    }
  }

  function setFocusImageDropActive(active) {
    focusLayer?.classList.toggle('is-file-drop-active', Boolean(active));
  }

  function confirmFocusedDelete(selection) {
    if (!selection) return false;
    const label = selection.type === 'frame'
      ? 'this frame'
      : selection.type === 'edge'
        ? 'this edge'
        : selection.type === 'nodes'
          ? 'these nodes'
          : 'this node';
    return window.confirm(`Delete ${label}?`);
  }

  async function readImageFileInfo(file, options = {}) {
    const dataUrl = await readFileAsDataUrl(file);
    const imageMeta = await loadImageMeta(dataUrl);
    const width = Math.max(IMAGE_NODE_DEFAULTS.minImageWidth, Math.round(Number(options.width) || NODE_DEFAULTS.width));
    const metaHeight = Math.max(IMAGE_NODE_DEFAULTS.metaHeight, Math.round(Number(options.metaHeight) || IMAGE_NODE_DEFAULTS.metaHeight));
    const imageHeight = Math.max(IMAGE_NODE_DEFAULTS.minImageHeight, Math.round(width / imageMeta.aspectRatio));
    return {
      title: deriveNodeTitleFromFilename(file.name),
      dataUrl,
      aspectRatio: imageMeta.aspectRatio,
      width,
      height: imageHeight + metaHeight,
    };
  }

  async function handleDroppedCanvasImage(file, point) {
    try {
      const imageFileInfo = await readImageFileInfo(file);
      createImageNodeInEditMode(point, imageFileInfo);
    } catch {
      store.setImportStatus('Image add failed. Try another file.');
    }
  }

  async function handleFocusedImageReplace(nodeId, file) {
    const state = store.getState();
    const node = state.nodes.find((entry) => entry.id === nodeId);
    if (!node) return;

    const currentWidth = Math.max(IMAGE_NODE_DEFAULTS.minImageWidth, Math.round(Number(node.width) || NODE_DEFAULTS.width));
    const currentHeight = Math.max(IMAGE_NODE_DEFAULTS.metaHeight, Math.round(Number(node.height) || (NODE_DEFAULTS.height + IMAGE_NODE_DEFAULTS.metaHeight)));
    const currentAspectRatio = Number(node.imageAspectRatio);
    const currentImageHeight = Number.isFinite(currentAspectRatio) && currentAspectRatio > 0
      ? Math.round(currentWidth / currentAspectRatio)
      : Math.max(IMAGE_NODE_DEFAULTS.minImageHeight, currentHeight - IMAGE_NODE_DEFAULTS.metaHeight);
    const metaHeight = Math.max(IMAGE_NODE_DEFAULTS.metaHeight, currentHeight - currentImageHeight);

    try {
      const imageFileInfo = await readImageFileInfo(file, {
        width: currentWidth,
        metaHeight,
      });
      store.updateNode(nodeId, {
        kind: IMAGE_NODE_DEFAULTS.kind,
        imageData: imageFileInfo.dataUrl,
        imageAspectRatio: imageFileInfo.aspectRatio,
        width: imageFileInfo.width,
        height: imageFileInfo.height,
      });
      store.setImportStatus(node.kind === IMAGE_NODE_DEFAULTS.kind ? 'Image updated.' : 'Image added.');
    } catch {
      store.setImportStatus(node.kind === IMAGE_NODE_DEFAULTS.kind ? 'Image replace failed. Try another file.' : 'Image add failed. Try another file.');
    }
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

  function openNodeFocus(nodeId, options = {}) {
    if (!nodeId) return false;
    store.setSelection({ type: 'node', id: nodeId });
    activeLiveEditFrameId = null;
    store.setFocusedNode(nodeId);
    openNodeEditor(nodeId, {
      stabilizeFrames: Number(options.stabilizeFrames) || 2,
      lockFocusMs: Number(options.lockFocusMs) || 1200,
    });
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

  function consumeNodeDoublePress(nodeId) {
    const now = performance.now();
    const isRepeat = lastNodePress.id === nodeId && (now - lastNodePress.at) <= 420;
    lastNodePress = isRepeat
      ? { id: null, at: 0 }
      : { id: nodeId, at: now };
    return isRepeat;
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

  function updateFrameDraftNodePreview(nextRect, state) {
    const nodePreview = {};
    const draftFrame = {
      x: nextRect.left,
      y: nextRect.top,
      width: nextRect.right - nextRect.left,
      height: nextRect.bottom - nextRect.top,
    };

    for (const node of state.nodes) {
      if (getNodeFrameOverlapArea(node, draftFrame) > 0) {
        nodePreview[node.id] = 'add';
      }
    }

    if (Object.keys(nodePreview).length > 0) {
      store.setNodeMembershipPreview(nodePreview);
    } else {
      store.clearNodeMembershipPreview();
    }
    store.clearFrameMembershipPreview();
  }

  function applyFrameResizeMembership(frameId, state) {
    const frame = getFrame(frameId, state);
    if (!frame) return;
    const frameRect = getFrameRect(frame);
    const candidates = findFrameResizeCandidateNodeIds(frameId, frameRect, state);
    if (!candidates.length) return;
    store.recomputeNodeFrameMembership(candidates, { skipHistory: true });
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

  function closeToolbarPopover() {
    if (!(openToolbarPopoverEl instanceof HTMLElement)) return;
    const controlEl = openToolbarPopoverEl.closest('.entity-toolbar__control');
    const triggerEl = controlEl?.querySelector('[data-toolbar-popover-toggle]');
    openToolbarPopoverEl.hidden = true;
    openToolbarPopoverEl.style.left = '';
    if (triggerEl instanceof HTMLElement) {
      triggerEl.setAttribute('aria-expanded', 'false');
    }
    openToolbarPopoverEl = null;
  }

  function openToolbarPopover(triggerEl, popoverEl) {
    if (!(triggerEl instanceof HTMLElement) || !(popoverEl instanceof HTMLElement)) return;
    if (openToolbarPopoverEl === popoverEl) {
      closeToolbarPopover();
      return;
    }
    closeToolbarPopover();
    popoverEl.hidden = false;
    triggerEl.setAttribute('aria-expanded', 'true');
    const controlRect = triggerEl.parentElement?.getBoundingClientRect?.();
    const triggerRect = triggerEl.getBoundingClientRect();
    if (controlRect) {
      const viewportGutter = 12;
      const popoverWidth = popoverEl.offsetWidth;
      const preferredLeft = (triggerRect.left - controlRect.left) - ((popoverWidth - triggerRect.width) / 2);
      const absoluteMinLeft = viewportGutter - controlRect.left;
      const absoluteMaxLeft = (window.innerWidth - viewportGutter - popoverWidth) - controlRect.left;
      const left = Math.max(absoluteMinLeft, Math.min(preferredLeft, absoluteMaxLeft));
      popoverEl.style.left = `${left}px`;
    }
    openToolbarPopoverEl = popoverEl;
  }

  function getToolbarContext(target) {
    const toolbarEl = target instanceof HTMLElement
      ? target.closest('[data-toolbar-entity][data-toolbar-target-ids]')
      : null;
    if (!(toolbarEl instanceof HTMLElement)) return null;
    const entity = toolbarEl.dataset.toolbarEntity;
    const ids = String(toolbarEl.dataset.toolbarTargetIds || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!entity || !ids.length) return null;
    return { toolbarEl, entity, ids };
  }

  function applyToolbarColor(target, colorKey) {
    const context = getToolbarContext(target);
    if (!context) return;
    if (context.entity === 'frame') {
      store.setFramesColor(context.ids, colorKey);
      return;
    }
    store.setNodesColor(context.ids, colorKey);
  }

  function applyToolbarBorderWidth(target, borderWidth) {
    const context = getToolbarContext(target);
    if (!context) return;
    if (context.entity === 'frame') {
      store.setFramesBorderWidth(context.ids, borderWidth);
      return;
    }
    store.setNodesBorderWidth(context.ids, borderWidth);
  }

  function applyToolbarBorderStyle(target, borderStyle) {
    const context = getToolbarContext(target);
    if (!context) return;
    if (context.entity === 'frame') {
      store.setFramesBorderStyle(context.ids, borderStyle);
      return;
    }
    store.setNodesBorderStyle(context.ids, borderStyle);
  }

  function syncToolbarRangeValue(inputEl) {
    if (!(inputEl instanceof HTMLInputElement)) return;
    const valueEl = inputEl.closest('[data-toolbar-range]')?.querySelector('[data-toolbar-border-width-value]');
    if (valueEl instanceof HTMLElement) {
      valueEl.textContent = String(Math.round(Number(inputEl.value) || 1));
    }
  }

  function handleToolbarClick(event) {
    const toggleEl = event.target.closest('[data-toolbar-popover-toggle]');
    if (toggleEl instanceof HTMLElement) {
      const popoverName = toggleEl.dataset.toolbarPopoverToggle;
      const popoverEl = toggleEl.parentElement?.querySelector(`[data-toolbar-popover="${popoverName}"]`);
      if (popoverEl instanceof HTMLElement) {
        openToolbarPopover(toggleEl, popoverEl);
      }
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    const colorEl = event.target.closest('[data-toolbar-color-value]');
    if (colorEl instanceof HTMLButtonElement) {
      applyToolbarColor(colorEl, getNormalizedNodeColorValue(colorEl.dataset.toolbarColorValue));
      closeToolbarPopover();
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    const borderStyleEl = event.target.closest('[data-toolbar-border-style-value]');
    if (borderStyleEl instanceof HTMLButtonElement) {
      applyToolbarBorderStyle(borderStyleEl, borderStyleEl.dataset.toolbarBorderStyleValue);
      closeToolbarPopover();
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    const multiDeleteEl = event.target.closest('[data-nodes-delete]');
    if (multiDeleteEl instanceof HTMLButtonElement) {
      activeLiveEditNodeId = null;
      store.deleteSelectedNodes();
      closeToolbarPopover();
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    const frameConfirmEl = event.target.closest('[data-frame-edit-confirm]');
    if (frameConfirmEl instanceof HTMLButtonElement) {
      closeFrameEditor(frameConfirmEl.dataset.frameEditConfirm);
      closeToolbarPopover();
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    return false;
  }

  function handleToolbarInput(event) {
    const rangeEl = event.target.closest('[data-toolbar-border-width-input]');
    if (!(rangeEl instanceof HTMLInputElement)) return false;
    syncToolbarRangeValue(rangeEl);
    event.stopPropagation();
    return true;
  }

  function handleToolbarChange(event) {
    const rangeEl = event.target.closest('[data-toolbar-border-width-input]');
    if (!(rangeEl instanceof HTMLInputElement)) return false;
    applyToolbarBorderWidth(rangeEl, rangeEl.value);
    event.stopPropagation();
    return true;
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
      store.clearFrameMembershipPreview();
      store.clearNodeMembershipPreview();
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
      updateFrameDraftNodePreview(rect, state);
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
    if (store.getState().ui.focusedNodeId) return;
    if (!event.ctrlKey && shouldAllowNativeWheelScroll(event)) return;
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

  function shouldAllowNativeWheelScroll(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    const scrollable = target.closest(
      '.node__focus-value--description, .node__focus-body, .node__editor-textarea, .app-dialog__panel, .shortcuts-dialog__list',
    );
    if (!(scrollable instanceof HTMLElement)) return false;
    return scrollable.scrollHeight > scrollable.clientHeight + 1;
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

    if (event.target.closest('[data-node-editor], [data-node-edit-open], [data-node-delete], [data-nodes-delete], [data-node-focus-toggle], [data-node-start], [data-toolbar-popover-toggle], [data-toolbar-popover]')) {
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
      nodeId,
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
    openNodeFocus(nodeId);
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
    const sessionNodeId = dragSession.nodeId;
    const wasMoved = dragSession.moved;
    if (dragSession.moved) {
      store.recomputeNodeFrameMembership(dragSession.nodes.map((entry) => entry.id));
    }
    store.clearFrameMembershipPreview();
    endDragSession(event.pointerId);
    if (!wasMoved && sessionNodeId && consumeNodeDoublePress(sessionNodeId)) {
      openNodeFocus(sessionNodeId);
    }
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

    if (handleToolbarClick(event)) {
      return;
    }

    const openEl = event.target.closest('[data-node-edit-open]');
    if (openEl) {
      const nodeId = openEl.dataset.nodeEditOpen;
      store.setSelection({ type: 'node', id: nodeId });
      if (store.getState().ui.focusedNodeId === nodeId && store.getState().ui.editingNodeId === nodeId) {
        closeNodeEditor(nodeId);
      } else {
        openNodeEditor(nodeId);
      }
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

    const startEl = event.target.closest('[data-node-start]');
    if (startEl) {
      const nodeId = startEl.dataset.nodeStart;
      if (nodeId) {
        commitStarterHypernode(nodeId);
      }
      event.stopPropagation();
      return;
    }

    const imagePickEl = event.target.closest('[data-node-image-pick]');
    if (imagePickEl) {
      const nodeId = imagePickEl.dataset.nodeImagePick;
      void pickImageFile().then((file) => {
        if (!file || !nodeId) return;
        return handleFocusedImageReplace(nodeId, file);
      });
      event.stopPropagation();
      return;
    }

    if (event.target.closest('[data-node-editor]')) {
      event.stopPropagation();
      return;
    }

    const nodeEl = event.target.closest('[data-node-id]');
    if (!nodeEl) return;
    if (event.detail >= 2) {
      openNodeFocus(nodeEl.dataset.nodeId);
      event.stopPropagation();
      event.preventDefault();
      return;
    }
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
    const starterActive = store.getState().ui.starterNodeId === nodeId;
    const focusedNodeId = store.getState().ui.focusedNodeId;
    const focusShortcut = (event.ctrlKey || event.metaKey) && event.altKey && event.key === 'Enter';

    if (starterActive && (event.key === 'Escape' || event.key === 'Enter' || focusShortcut)) {
      event.stopPropagation();
      return;
    }

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

    if (event.target.closest('[data-node-edit-open], [data-node-delete], [data-nodes-delete], [data-node-focus-toggle], [data-node-start], [data-frame-edit-open], [data-frame-edit-confirm], [data-frame-delete], [data-toolbar-popover-toggle], [data-toolbar-popover]')) {
      event.stopPropagation();
    }
  }

  function onSelectionControlsClick(event) {
    const nodeGroupEl = event.target.closest('.selection-controls__group--node[data-node-id]');
    const clickedToolbarControl = event.target.closest('[data-node-edit-open], [data-node-delete], [data-nodes-delete], [data-node-focus-toggle], [data-node-start], [data-node-resize], [data-node-anchor], [data-toolbar-popover-toggle], [data-toolbar-popover]');
    if (nodeGroupEl && !clickedToolbarControl && event.detail >= 2) {
      openNodeFocus(nodeGroupEl.dataset.nodeId);
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (handleToolbarClick(event)) {
      return;
    }

    const nodeOpenEl = event.target.closest('[data-node-edit-open]');
    if (nodeOpenEl) {
      const nodeId = nodeOpenEl.dataset.nodeEditOpen;
      store.setSelection({ type: 'node', id: nodeId });
      if (store.getState().ui.focusedNodeId === nodeId && store.getState().ui.editingNodeId === nodeId) {
        closeNodeEditor(nodeId);
      } else {
        openNodeEditor(nodeId);
      }
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

    const nodeStartEl = event.target.closest('[data-node-start]');
    if (nodeStartEl) {
      const nodeId = nodeStartEl.dataset.nodeStart;
      if (nodeId) {
        commitStarterHypernode(nodeId);
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

  function onSelectionControlsDoubleClick(event) {
    const nodeGroupEl = event.target.closest('.selection-controls__group--node[data-node-id]');
    if (!nodeGroupEl) return;
    const nodeId = nodeGroupEl.dataset.nodeId;
    if (!nodeId) return;
    openNodeFocus(nodeId);
    event.stopPropagation();
    event.preventDefault();
  }

  function onSelectionControlsInput(event) {
    handleToolbarInput(event);
  }

  function onSelectionControlsChange(event) {
    handleToolbarChange(event);
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
    onSelectionControlsDoubleClick,
    onSelectionControlsInput,
    onSelectionControlsChange,
  });

  canvas.addEventListener('dragenter', (event) => {
    if (!containsImageFile(event.dataTransfer) || store.getState().ui.focusedNodeId) return;
    const imageTarget = getFocusImageTarget(event.target);
    if (imageTarget) {
      event.preventDefault();
      return;
    }
    canvasFileDragDepth += 1;
    setCanvasFileDropActive(true);
    event.preventDefault();
  });

  canvas.addEventListener('dragover', (event) => {
    if (!containsImageFile(event.dataTransfer) || store.getState().ui.focusedNodeId) return;
    const imageTarget = getFocusImageTarget(event.target);
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    if (imageTarget) {
      setCanvasFileDropActive(false);
      return;
    }
    setCanvasFileDropActive(true);
  });

  canvas.addEventListener('dragleave', (event) => {
    if (!containsImageFile(event.dataTransfer)) return;
    canvasFileDragDepth = Math.max(0, canvasFileDragDepth - 1);
    if (canvasFileDragDepth === 0) {
      setCanvasFileDropActive(false);
    }
    event.preventDefault();
  });

  canvas.addEventListener('drop', (event) => {
    if (!containsImageFile(event.dataTransfer) || store.getState().ui.focusedNodeId) return;
    const file = getFirstImageFile(event.dataTransfer);
    const imageTarget = getFocusImageTarget(event.target);
    canvasFileDragDepth = 0;
    setCanvasFileDropActive(false);
    if (!file) return;
    event.preventDefault();
    if (imageTarget?.dataset?.nodeImagePick) {
      void handleFocusedImageReplace(imageTarget.dataset.nodeImagePick, file);
      return;
    }
    const point = toGraphPoint(event.clientX, event.clientY, canvas, store.getState().viewport);
    void handleDroppedCanvasImage(file, point);
  });

  focusLayer?.addEventListener('dragenter', (event) => {
    const imageTarget = getFocusImageTarget(event.target);
    if (!imageTarget || !containsImageFile(event.dataTransfer)) return;
    focusImageDragDepth += 1;
    setFocusImageDropActive(true);
    event.preventDefault();
  });

  focusLayer?.addEventListener('dragover', (event) => {
    const imageTarget = getFocusImageTarget(event.target);
    if (!imageTarget || !containsImageFile(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    setFocusImageDropActive(true);
  });

  focusLayer?.addEventListener('dragleave', (event) => {
    const imageTarget = getFocusImageTarget(event.target);
    if (!imageTarget || !containsImageFile(event.dataTransfer)) return;
    focusImageDragDepth = Math.max(0, focusImageDragDepth - 1);
    if (focusImageDragDepth === 0) {
      setFocusImageDropActive(false);
    }
    event.preventDefault();
  });

  focusLayer?.addEventListener('drop', (event) => {
    const imageTarget = getFocusImageTarget(event.target);
    if (!imageTarget || !containsImageFile(event.dataTransfer)) return;
    const file = getFirstImageFile(event.dataTransfer);
    const nodeId = imageTarget.dataset.focusImageDropzone || imageTarget.dataset.nodeImagePick || null;
    focusImageDragDepth = 0;
    setFocusImageDropActive(false);
    if (!file || !nodeId) return;
    event.preventDefault();
    void handleFocusedImageReplace(nodeId, file);
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

    if (event.target.closest('[data-frame-editor], [data-frame-edit-open], [data-frame-edit-confirm], [data-frame-delete], [data-toolbar-popover-toggle], [data-toolbar-popover]')) {
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

    if (handleToolbarClick(event)) {
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

  canvas?.addEventListener('pointermove', (event) => {
    const rect = typeof canvas.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : null;
    if (!rect) return;
    const withinCanvas = event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
    if (!withinCanvas) return;
    lastCanvasPointerClient = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  });

  const aboutDialog = document.getElementById('about-dialog');
  const aboutBtn = document.getElementById('about-btn');
  const aboutCloseBtn = document.getElementById('about-close-btn');
  const aboutGuideSlides = document.getElementById('about-guide-slides');
  const aboutGuideDots = document.getElementById('about-guide-dots');
  const aboutPrevBtn = document.getElementById('about-prev-btn');
  const aboutNextBtn = document.getElementById('about-next-btn');
  const shortcutsDialog = document.getElementById('shortcuts-dialog');
  const shortcutsBtn = document.getElementById('shortcuts-btn');
  const shortcutsCloseBtn = document.getElementById('shortcuts-close-btn');
  const shortcutsSearchInput = document.getElementById('shortcuts-search-input');
  const shortcutsList = document.getElementById('shortcuts-list');
  const shortcutsEmptyState = document.getElementById('shortcuts-empty-state');
  const settingsDialog = document.getElementById('settings-dialog');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const graphNameInput = document.getElementById('graph-name-input');
  const settingsTabSelect = document.getElementById('settings-tab-select');
  const showShortcutsUiInput = document.getElementById('show-shortcuts-ui-input');
  const settingsTabButtons = settingsDialog?.querySelectorAll('[data-settings-tab]') ?? [];
  const settingsPanels = settingsDialog?.querySelectorAll('[data-settings-panel]') ?? [];
  const positionButtons = settingsDialog?.querySelectorAll('[data-position-target][data-position-value]') ?? [];
  const toolbarOrientationButtons = settingsDialog?.querySelectorAll('[data-toolbar-orientation]') ?? [];
  const arrowheadSizeRange = document.getElementById('arrowhead-size-range');
  const arrowheadSizeValue = document.getElementById('arrowhead-size-value');
  const newGraphBtn = document.getElementById('new-graph-btn');
  const openGraphBtn = document.getElementById('open-graph-btn');
  const saveGraphBtn = document.getElementById('save-graph-btn');
  const toolbarShortcutButtons = Object.entries(TOOLBAR_SHORTCUTS).map(([id, config]) => ({
    button: document.getElementById(id),
    hint: document.getElementById(id)?.querySelector('.toolbar__shortcut-hint'),
    config,
  }));

  function hasGraphData() {
    const state = store.getState();
    return state.nodes.length > 0 || state.frames.length > 0 || state.edges.length > 0;
  }

  function confirmDiscardIfNeeded(action) {
    if (!hasGraphData()) return true;
    return window.confirm(`Discard the current hypernode and ${action}?`);
  }

  async function handleOpenGraph() {
    if (!canUseFileSystemAccess) {
      store.setImportStatus('Open hypernode is unavailable in this browser.');
      return;
    }

    if (!confirmDiscardIfNeeded('open another hypernode')) {
      return;
    }

    try {
      const { handle, graph } = await openGraphFile();
      currentFileHandle = handle;
      store.clearStarterNode();
      store.replaceGraph(graph);
      resetCanvasView();
      syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
      store.setImportStatus('Hypernode opened.');
    } catch (error) {
      if (isAbortError(error)) return;
      store.setImportStatus('Open failed: invalid hypernode JSON file.');
    }
  }

  async function handleSaveGraph() {
    if (!canUseFileSystemAccess) {
      store.setImportStatus('Save hypernode is unavailable in this browser.');
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
      store.setImportStatus('Saved');
    } catch (error) {
      if (isAbortError(error)) return;
      store.setImportStatus('Save failed. Check file permissions and try again.');
    }
  }

  function handleNewGraph() {
    if (!confirmDiscardIfNeeded('create a new hypernode')) {
      return;
    }

    currentFileHandle = null;
    store.clearStarterNode();
    store.replaceGraph({
      name: GRAPH_DEFAULTS.name,
      settings: {
        uiThemePreset: GRAPH_DEFAULTS.uiThemePreset,
        uiRadiusPreset: GRAPH_DEFAULTS.uiRadiusPreset,
        toolbarPosition: GRAPH_DEFAULTS.toolbarPosition,
        toolbarOrientation: GRAPH_DEFAULTS.toolbarOrientation,
        toastPosition: GRAPH_DEFAULTS.toastPosition,
        metaPosition: GRAPH_DEFAULTS.metaPosition,
        backgroundStyle: GRAPH_DEFAULTS.backgroundStyle,
        anchorsMode: GRAPH_DEFAULTS.anchorsMode,
        arrowheads: GRAPH_DEFAULTS.arrowheads,
        arrowheadSizeStep: GRAPH_DEFAULTS.arrowheadSizeStep,
        showShortcutsUi: GRAPH_DEFAULTS.showShortcutsUi,
        nodeColorDefault: GRAPH_DEFAULTS.nodeColorDefault,
      },
      nodes: [],
      frames: [],
      edges: [],
    });
    resetCanvasView();
    createStarterHypernode();
    syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
    store.setImportStatus('New hypernode ready.');
  }

  async function handleAddImageNode() {
    try {
      const file = await pickImageFile();
      if (!file) return;
      const { viewport } = store.getState();
      const point = {
        x: (120 - viewport.panX) / viewport.zoom,
        y: (120 - viewport.panY) / viewport.zoom,
      };
      const imageFileInfo = await readImageFileInfo(file);
      createImageNodeInEditMode(point, imageFileInfo);
    } catch {
      store.setImportStatus('Image add failed. Try another file.');
    }
  }

  function handleAddNode() {
    const { viewport } = store.getState();
    createNodeInEditMode({ x: (120 - viewport.panX) / viewport.zoom, y: (120 - viewport.panY) / viewport.zoom });
  }

  function commitStarterHypernode(nodeId) {
    const state = store.getState();
    if (state.ui.starterNodeId !== nodeId) return false;
    const node = getNode(nodeId, state);
    if (!node) return false;
    const title = String(node.title ?? '').trim() || NODE_DEFAULTS.title;
    node.title = title;
    store.setGraphName(title);
    store.clearStarterNode();
    closeNodeFocus();
    return true;
  }

  function handleAddNodeAtPointer() {
    createNodeInEditMode(getLastPointerGraphPoint(store.getState().viewport));
  }

  function openShortcutsDialog() {
    if (!shortcutsDialog) return;
    if (store.getState().settings?.showShortcutsUi === false) return;
    renderShortcutCatalog();
    if (shortcutsSearchInput instanceof HTMLInputElement) {
      shortcutsSearchInput.value = '';
    }
    filterShortcuts('');
    shortcutsDialog.showModal();
    window.requestAnimationFrame(() => {
      shortcutsSearchInput?.focus({ preventScroll: true });
    });
  }

  function openSettingsDialog() {
    if (!settingsDialog) return;
    syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
    settingsDialog.showModal();
  }

  function openAboutDialog() {
    if (!aboutDialog) return;
    resetAboutDialog();
    aboutDialog.showModal();
  }

  function toggleThemePreference() {
    const currentThemePreset = getThemePresetSequence().includes(store.getState().settings?.uiThemePreset)
      ? store.getState().settings.uiThemePreset
      : 'blueprint';
    const presetSequence = getThemePresetSequence();
    const currentIndex = presetSequence.indexOf(currentThemePreset);
    const nextThemePreset = presetSequence[(currentIndex + 1) % presetSequence.length];
    store.setUiThemePreset(nextThemePreset);
    showThemeToast(store, nextThemePreset);
  }

  function setAboutSlide(nextIndex) {
    const slideEls = aboutGuideSlides?.querySelectorAll('[data-about-slide]');
    if (!slideEls?.length) return;
    const maxIndex = slideEls.length - 1;
    aboutSlideIndex = Math.max(0, Math.min(maxIndex, Number(nextIndex) || 0));
    if (aboutGuideSlides instanceof HTMLElement) {
      aboutGuideSlides.dataset.activeSlide = String(aboutSlideIndex);
    }
    slideEls.forEach((slideEl, index) => {
      const active = index === aboutSlideIndex;
      slideEl.classList.toggle('is-active', active);
      slideEl.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    aboutGuideDots?.querySelectorAll('[data-about-slide-target]').forEach((dotEl, index) => {
      const active = index === aboutSlideIndex;
      dotEl.classList.toggle('is-active', active);
      dotEl.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (aboutPrevBtn instanceof HTMLButtonElement) {
      aboutPrevBtn.disabled = aboutSlideIndex === 0;
    }
    if (aboutNextBtn instanceof HTMLButtonElement) {
      aboutNextBtn.disabled = aboutSlideIndex === maxIndex;
    }
  }

  function filterShortcuts(query) {
    const normalized = normalizeShortcutSearchText(query);
    const items = shortcutsList?.querySelectorAll('[data-shortcut-id]');
    if (!items?.length) return;
    const searchIndex = shortcutsList?._shortcutSearchIndex instanceof Map
      ? shortcutsList._shortcutSearchIndex
      : new Map();
    let visibleCount = 0;
    items.forEach((item) => {
      const haystack = searchIndex.get(item.dataset.shortcutId || '') || '';
      const visible = !normalized || haystack.includes(normalized);
      item.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    });
    if (shortcutsEmptyState instanceof HTMLElement) {
      shortcutsEmptyState.hidden = visibleCount > 0;
    }
  }

  function setActiveSettingsTab(nextTabId, options = {}) {
    const availableTabIds = Array.from(settingsTabButtons)
      .map((button) => button instanceof HTMLElement ? button.dataset.settingsTab : null)
      .filter(Boolean);
    const requestedTabId = typeof nextTabId === 'string' && nextTabId ? nextTabId : 'general';
    const tabId = availableTabIds.includes(requestedTabId) ? requestedTabId : (availableTabIds[0] || 'general');
    settingsTabButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const active = button.dataset.settingsTab === tabId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
      if (active && options.focusButton) {
        button.focus({ preventScroll: true });
      }
    });
    settingsPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const active = panel.dataset.settingsPanel === tabId;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    if (settingsTabSelect instanceof HTMLSelectElement && settingsTabSelect.value !== tabId) {
      settingsTabSelect.value = tabId;
    }
  }

  function renderShortcutCatalog() {
    if (!(shortcutsList instanceof HTMLElement)) return;
    const searchIndex = new Map();
    shortcutsList.innerHTML = SHORTCUT_CATALOG.map((shortcut) => {
      const searchText = normalizeShortcutSearchText([
        shortcut.title,
        shortcut.description,
        ...shortcut.keys,
        ...shortcut.keys.map((key) => formatShortcutLabel(key)),
        ...shortcut.keys.map((key) => formatShortcutLabel(key, { compact: true })),
        ...(Array.isArray(shortcut.searchTokens) ? shortcut.searchTokens : []),
      ].join(' '));
      searchIndex.set(shortcut.id, searchText);
      return `
        <article class="shortcuts-dialog__item" role="listitem" data-shortcut-id="${shortcut.id}">
          <div class="shortcuts-dialog__keys">${shortcut.keys.map((key) => `<kbd>${formatShortcutLabel(key)}</kbd>`).join('')}</div>
          <div class="shortcuts-dialog__meta"><h3>${shortcut.title}</h3><p>${shortcut.description}</p></div>
        </article>
      `;
    }).join('');
    shortcutsList._shortcutSearchIndex = searchIndex;
  }

  function syncShortcutUiFromState(state) {
    const showShortcutsUi = state.settings?.showShortcutsUi !== false;
    if (shortcutsBtn instanceof HTMLElement) {
      shortcutsBtn.hidden = !showShortcutsUi;
    }
    if (!showShortcutsUi && shortcutsDialog?.open) {
      shortcutsDialog.close();
    }
    toolbarShortcutButtons.forEach(({ button, hint, config }) => {
      if (!(button instanceof HTMLButtonElement) || !(hint instanceof HTMLElement)) return;
      if (!canUseFileSystemAccess && (button.id === 'open-graph-btn' || button.id === 'save-graph-btn')) {
        hint.hidden = true;
        hint.textContent = '';
        button.classList.remove('toolbar__icon-btn--hinted');
        return;
      }
      const baseLabel = config.label;
      const hintVisible = false;
      hint.hidden = !hintVisible;
      hint.textContent = '';
      button.classList.toggle('toolbar__icon-btn--hinted', hintVisible);
      button.title = baseLabel;
      button.setAttribute('aria-label', baseLabel);
    });
  }

  function resetAboutDialog() {
    setAboutSlide(0);
  }

  function bindToolbar() {
  bindDialogBackdropClose(aboutDialog);
  bindDialogBackdropClose(shortcutsDialog);
  bindDialogBackdropClose(settingsDialog);

  if (aboutBtn && aboutDialog) {
    aboutBtn.addEventListener('click', () => {
      if (aboutDialog.open) {
        aboutDialog.close();
      } else {
        openAboutDialog();
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

  shortcutsBtn?.addEventListener('click', () => {
    if (!shortcutsDialog) return;
    if (shortcutsDialog.open) {
      shortcutsDialog.close();
      return;
    }
    openShortcutsDialog();
  });

  shortcutsCloseBtn?.addEventListener('click', () => {
    if (shortcutsDialog?.open) {
      shortcutsDialog.close();
    }
  });

  shortcutsSearchInput?.addEventListener('input', () => {
    filterShortcuts(shortcutsSearchInput.value);
  });

  aboutPrevBtn?.addEventListener('click', () => {
    setAboutSlide(aboutSlideIndex - 1);
  });

  aboutNextBtn?.addEventListener('click', () => {
    setAboutSlide(aboutSlideIndex + 1);
  });

  aboutGuideDots?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-about-slide-target]');
    if (!(target instanceof HTMLButtonElement)) return;
    setAboutSlide(Number(target.dataset.aboutSlideTarget));
  });

  if (settingsBtn && settingsDialog) {
    settingsBtn.addEventListener('click', () => {
      if (settingsDialog.open) {
        settingsDialog.close();
      } else {
        openSettingsDialog();
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

  settingsTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!(button instanceof HTMLButtonElement)) return;
      setActiveSettingsTab(button.dataset.settingsTab, { focusButton: false });
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const tabs = Array.from(settingsTabButtons).filter((item) => item instanceof HTMLButtonElement);
      const currentIndex = tabs.indexOf(button);
      if (currentIndex === -1 || tabs.length === 0) return;
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      setActiveSettingsTab(nextTab.dataset.settingsTab, { focusButton: true });
    });
  });

  settingsTabSelect?.addEventListener('change', () => {
    setActiveSettingsTab(settingsTabSelect.value, { focusButton: false });
  });

  graphNameInput?.addEventListener('change', () => {
    store.clearStarterNode();
    store.setGraphName(graphNameInput.value);
  });

  graphNameInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    graphNameInput.blur();
  });

  showShortcutsUiInput?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    store.setShowShortcutsUi(target.checked);
  });

  positionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!(button instanceof HTMLButtonElement)) return;
      const target = button.dataset.positionTarget;
      const value = button.dataset.positionValue;
      if (!target || !value || button.disabled) return;
      const nextPlacement = resolvePlacementChange(store.getState().settings, target, value);
      if (target === 'toolbar') {
        store.setToolbarPosition(nextPlacement.toolbarPosition);
        return;
      }
      if (target === 'toast') {
        store.setToastPosition(nextPlacement.toastPosition);
        store.setMetaPosition(nextPlacement.metaPosition);
        return;
      }
      if (target === 'meta') {
        store.setMetaPosition(nextPlacement.metaPosition);
      }
    });
  });

  toolbarOrientationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!(button instanceof HTMLButtonElement)) return;
      const value = button.dataset.toolbarOrientation;
      if (!value) return;
      store.setToolbarOrientation(value);
    });
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

  settingsDialog?.querySelectorAll('input[name="ui-theme-preset"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.checked) return;
      store.setUiThemePreset(target.value);
      showThemeToast(store, target.value);
    });
  });

  settingsDialog?.querySelectorAll('input[name="ui-radius-preset"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.checked) return;
      store.setUiRadiusPreset(target.value);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!(openToolbarPopoverEl instanceof HTMLElement)) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.entity-toolbar__control')) return;
    closeToolbarPopover();
  });

  document.getElementById('add-node-btn')?.addEventListener('click', handleAddNode);

  document.getElementById('add-image-btn')?.addEventListener('click', () => {
    void handleAddImageNode();
  });

  document.getElementById('add-frame-btn')?.addEventListener('click', () => {
    setFrameDrawMode(!isFrameDrawMode);
  });

  document.getElementById('reset-view-btn')?.addEventListener('click', resetCanvasView);
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
      openGraphBtn.title = 'Open hypernode is unavailable in this browser';
      openGraphBtn.setAttribute('aria-label', 'Open hypernode unavailable in this browser');
    }
    if (saveGraphBtn) {
      saveGraphBtn.disabled = true;
      saveGraphBtn.title = 'Save hypernode is unavailable in this browser';
      saveGraphBtn.setAttribute('aria-label', 'Save hypernode unavailable in this browser');
    }
  }

  }

  function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (aboutDialog?.open || shortcutsDialog?.open || settingsDialog?.open) return;
    if (event.key === 'Escape' && openToolbarPopoverEl) {
      event.preventDefault();
      closeToolbarPopover();
      return;
    }
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    const starterNodeId = store.getState().ui.starterNodeId;
    const starterFocused = Boolean(starterNodeId && store.getState().ui.focusedNodeId === starterNodeId);
    const focusShortcut = ctrlOrCmd && event.altKey && event.key === 'Enter';
    if (starterFocused && (event.key === 'Escape' || event.key === 'Delete' || event.key === 'Backspace' || focusShortcut)) {
      event.preventDefault();
      return;
    }
    if (focusShortcut) {
      if (toggleFocusedSelectionNode()) {
        event.preventDefault();
      }
      return;
    }
    if (isTypingTarget(event.target)) return;

    if (ctrlOrCmd && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      handleNewGraph();
      return;
    }

    if (ctrlOrCmd && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      handleAddNodeAtPointer();
      return;
    }

    if (ctrlOrCmd && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      void handleOpenGraph();
      return;
    }

    if (ctrlOrCmd && !event.shiftKey && !event.altKey && event.key === ',') {
      event.preventDefault();
      openSettingsDialog();
      return;
    }

    if (ctrlOrCmd && !event.altKey && (event.key === '/' || event.key === '?')) {
      event.preventDefault();
      openShortcutsDialog();
      return;
    }

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

    if (ctrlOrCmd && !event.shiftKey && !event.altKey && event.key === '0') {
      event.preventDefault();
      resetCanvasView();
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

    if (!ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      handleAddNode();
      return;
    }

    if (!ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      void handleAddImageNode();
      return;
    }

    if (!ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      setFrameDrawMode(!isFrameDrawMode);
      return;
    }

    if (!ctrlOrCmd && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 't') {
      event.preventDefault();
      toggleThemePreference();
      return;
    }

    if (!ctrlOrCmd && !event.altKey && event.shiftKey && event.key === '?') {
      event.preventDefault();
      openAboutDialog();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selection = store.getState().selection;
      if (!selection) return;
      const focusedNodeId = store.getState().ui.focusedNodeId;
      if (focusedNodeId) {
        if (!ctrlOrCmd) {
          return;
        }
        event.preventDefault();
        if (!confirmFocusedDelete(selection)) {
          return;
        }
        if (selection.type === 'node') store.deleteNode(selection.id);
        if (selection.type === 'nodes') store.deleteSelectedNodes();
        if (selection.type === 'frame') store.deleteFrame(selection.id);
        if (selection.type === 'edge') store.deleteEdge(selection.id);
        return;
      }
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
    void state;
    if (openToolbarPopoverEl && !document.body.contains(openToolbarPopoverEl)) {
      openToolbarPopoverEl = null;
    }
    syncShortcutUiFromState(state);
    syncSettingsDialogFromState(state, settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
  });

  resetAboutDialog();
  renderShortcutCatalog();
  filterShortcuts('');
  syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
  syncShortcutUiFromState(store.getState());
  bindToolbarInteractions({ bindToolbar });
  bindKeyboardInteractions({ bindKeyboard });
  if (options.shouldCreateStarter) {
    resetCanvasView();
    createStarterHypernode();
    syncSettingsDialogFromState(store.getState(), settingsDialog, graphNameInput, showShortcutsUiInput, positionButtons, toolbarOrientationButtons, settingsTabSelect, settingsTabButtons, settingsPanels);
  }
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

function getFocusImageTarget(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('[data-focus-image-dropzone], .node__image-pane[data-node-image-pick], .node__image-dropzone[data-node-image-pick]');
}

function getNodeWidth(node) {
  const width = Number(node?.width);
  return Number.isFinite(width) && width > 0 ? width : NODE_DEFAULTS.width;
}

function getNodeHeight(node) {
  const height = Number(node?.height);
  if (Number.isFinite(height) && height > 0) return height;
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

function containsImageFile(dataTransfer) {
  if (!dataTransfer) return false;
  const items = Array.from(dataTransfer.items || []);
  if (items.some((item) => item.kind === 'file' && typeof item.type === 'string' && item.type.startsWith('image/'))) {
    return true;
  }
  return Array.from(dataTransfer.files || []).some((file) => typeof file.type === 'string' && file.type.startsWith('image/'));
}

function getFirstImageFile(dataTransfer) {
  if (!dataTransfer) return null;
  return Array.from(dataTransfer.files || []).find((file) => typeof file.type === 'string' && file.type.startsWith('image/')) || null;
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

function syncSettingsDialogFromState(
  state,
  settingsDialog,
  graphNameInput,
  showShortcutsUiInput,
  positionButtons = [],
  toolbarOrientationButtons = [],
  settingsTabSelect = null,
  settingsTabButtons = [],
  settingsPanels = [],
) {
  if (!settingsDialog) return;
  if (graphNameInput) {
    graphNameInput.value = state.name;
  }
  const activeTab = Array.from(settingsTabButtons)
    .find((button) => button instanceof HTMLElement && button.classList.contains('is-active'))
    ?.dataset?.settingsTab || settingsTabSelect?.value || 'general';
  settingsTabButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = button.dataset.settingsTab === activeTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
  });
  settingsPanels.forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    const active = panel.dataset.settingsPanel === activeTab;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  if (settingsTabSelect instanceof HTMLSelectElement) {
    settingsTabSelect.value = activeTab;
  }
  if (showShortcutsUiInput instanceof HTMLInputElement) {
    showShortcutsUiInput.checked = state.settings?.showShortcutsUi !== false;
  }
  syncPositionPickers(state, settingsDialog, positionButtons, toolbarOrientationButtons);

  settingsDialog.querySelectorAll('input[name="ui-theme-preset"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === state.settings.uiThemePreset;
    }
  });

  settingsDialog.querySelectorAll('input[name="ui-radius-preset"]').forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === state.settings.uiRadiusPreset;
    }
  });

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

function syncPositionPickers(state, settingsDialog, positionButtons, toolbarOrientationButtons = []) {
  const placement = getAnchoredUiPlacement(state.settings);
  const toolbarPicker = settingsDialog?.querySelector('[data-position-picker="toolbar"]');
  const toastPicker = settingsDialog?.querySelector('[data-position-picker="toast"]');
  const metaPicker = settingsDialog?.querySelector('[data-position-picker="meta"]');
  if (toolbarPicker instanceof HTMLElement) {
    toolbarPicker.dataset.activeValue = placement.toolbarPosition;
  }
  if (toastPicker instanceof HTMLElement) {
    toastPicker.dataset.activeValue = placement.toastPosition;
  }
  if (metaPicker instanceof HTMLElement) {
    metaPicker.dataset.activeValue = placement.metaPosition;
  }

  const unavailableToast = getUnavailableCornerPositions(state.settings, 'toast');
  const unavailableMeta = getUnavailableCornerPositions(state.settings, 'meta');
  positionButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const target = button.dataset.positionTarget;
    const value = button.dataset.positionValue;
    const isActive = (target === 'toolbar' && value === placement.toolbarPosition)
      || (target === 'toast' && value === placement.toastPosition)
      || (target === 'meta' && value === placement.metaPosition);
    const unavailable = (target === 'toast' && unavailableToast.has(value))
      || (target === 'meta' && unavailableMeta.has(value));
    button.classList.toggle('is-active', isActive);
    button.classList.toggle('is-unavailable', unavailable && !isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.disabled = unavailable && !isActive;
  });

  toolbarOrientationButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const isActive = button.dataset.toolbarOrientation === placement.toolbarOrientation;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function bindDialogBackdropClose(dialog) {
  if (!(dialog instanceof HTMLDialogElement)) return;
  dialog.addEventListener('click', (event) => {
    if (isDialogBackdropTarget(dialog, event.target)) {
      dialog.close();
    }
  });
}

function getThemePresetSequence() {
  return ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'soft-black'];
}

function getThemePresetPresentation(uiThemePreset) {
  const presetLabels = {
    blueprint: 'Blueprint',
    fjord: 'Fjord',
    slate: 'Slate',
    paper: 'Paper',
    ember: 'Ember',
    'soft-black': 'Soft Black',
  };
  const iconByPreset = {
    blueprint: 'bi-moon-stars',
    fjord: 'bi-water',
    slate: 'bi-cloud-fog2',
    paper: 'bi-sun',
    ember: 'bi-brightness-alt-high',
    'soft-black': 'bi-circle-half',
  };
  return {
    icon: iconByPreset[uiThemePreset] || iconByPreset.blueprint,
    title: presetLabels[uiThemePreset] || presetLabels.blueprint,
  };
}

function showThemeToast(store, uiThemePreset) {
  const { title } = getThemePresetPresentation(uiThemePreset);
  store.setImportStatus(`${title} theme`);
}

function updateArrowheadSizeLabel(labelEl, step) {
  if (!(labelEl instanceof HTMLElement)) return;
  const level = Math.max(1, Math.min(10, Math.round(Number(step)) + 1));
  const percent = level === 1 ? 100 : (100 + ((level - 1) * 20));
  labelEl.textContent = `Level ${level} (${percent}%)`;
}
