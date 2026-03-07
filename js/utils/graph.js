import { GRAPH_DEFAULTS, NODE_DEFAULTS, VIEWPORT_LIMITS } from './constants.js';

const ANCHORS = new Set(['top', 'right', 'bottom', 'left']);
const BACKGROUND_STYLES = new Set(['dots', 'graph-paper']);
const ANCHORS_MODES = new Set(['auto', 'exact']);

export function emptyGraphState() {
  return {
    name: GRAPH_DEFAULTS.name,
    settings: {
      backgroundStyle: GRAPH_DEFAULTS.backgroundStyle,
      anchorsMode: GRAPH_DEFAULTS.anchorsMode,
    },
    nodes: [],
    edges: [],
    selection: null,
    viewport: {
      panX: VIEWPORT_LIMITS.defaultPanX,
      panY: VIEWPORT_LIMITS.defaultPanY,
      zoom: VIEWPORT_LIMITS.defaultZoom,
    },
    ui: {
      importStatus: '',
      edgeDraft: null,
      edgeTwangId: null,
      editingNodeId: null,
      isPanning: false,
      isDragging: false,
      isConnecting: false,
    },
    history: {
      past: [],
      future: [],
    },
  };
}

export function sanitizeNode(node) {
  return {
    id: String(node.id),
    title: String(node.title || NODE_DEFAULTS.title).trim() || NODE_DEFAULTS.title,
    description: String(node.description || ''),
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
  };
}

export function sanitizeEdge(edge) {
  return {
    id: String(edge.id),
    from: String(edge.from),
    to: String(edge.to),
    fromAnchor: sanitizeAnchor(edge.fromAnchor),
    toAnchor: sanitizeAnchor(edge.toAnchor),
  };
}

export function validateGraphPayload(payload) {
  if (!payload || typeof payload.name !== 'string' || !payload.settings || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return false;
  }

  const hasValidCoreSettings = isValidBackgroundStyle(payload.settings.backgroundStyle);
  const hasValidAnchorsMode = payload.settings.anchorsMode === undefined
    || isValidAnchorsMode(payload.settings.anchorsMode);
  if (!hasValidCoreSettings || !hasValidAnchorsMode) {
    return false;
  }

  const nodeIds = new Set(payload.nodes.map((node) => node.id));
  if (nodeIds.size !== payload.nodes.length) {
    return false;
  }

  return payload.edges.every((edge) => {
    return edge
      && typeof edge.id === 'string'
      && nodeIds.has(edge.from)
      && nodeIds.has(edge.to)
      && isValidAnchor(edge.fromAnchor)
      && isValidAnchor(edge.toAnchor);
  });
}

export function sanitizeGraphName(name) {
  const text = String(name ?? '').trim();
  return text || GRAPH_DEFAULTS.name;
}

export function sanitizeGraphSettings(settings) {
  return {
    backgroundStyle: isValidBackgroundStyle(settings?.backgroundStyle)
      ? settings.backgroundStyle
      : GRAPH_DEFAULTS.backgroundStyle,
    anchorsMode: isValidAnchorsMode(settings?.anchorsMode)
      ? settings.anchorsMode
      : GRAPH_DEFAULTS.anchorsMode,
  };
}

export function isValidAnchor(anchor) {
  return typeof anchor === 'string' && ANCHORS.has(anchor);
}

function sanitizeAnchor(anchor) {
  return isValidAnchor(anchor) ? anchor : null;
}

function isValidBackgroundStyle(value) {
  return typeof value === 'string' && BACKGROUND_STYLES.has(value);
}

function isValidAnchorsMode(value) {
  return typeof value === 'string' && ANCHORS_MODES.has(value);
}
