import { GRAPH_DEFAULTS, IMAGE_NODE_DEFAULTS, NODE_COLOR_KEYS, NODE_DEFAULTS, VIEWPORT_LIMITS } from './constants.js';

const ANCHORS = new Set(['top', 'right', 'bottom', 'left']);
const BACKGROUND_STYLES = new Set(['dots', 'graph-paper']);
const ANCHORS_MODES = new Set(['auto', 'exact']);
const ARROWHEADS_MODES = new Set(['shown', 'hidden']);
const ARROWHEAD_SIZE_STEP_MIN = 0;
const ARROWHEAD_SIZE_STEP_MAX = 9;
const NODE_KINDS = new Set(['text', 'image']);

export function emptyGraphState() {
  return {
    name: GRAPH_DEFAULTS.name,
    settings: {
      backgroundStyle: GRAPH_DEFAULTS.backgroundStyle,
      anchorsMode: GRAPH_DEFAULTS.anchorsMode,
      arrowheads: GRAPH_DEFAULTS.arrowheads,
      arrowheadSizeStep: GRAPH_DEFAULTS.arrowheadSizeStep,
      nodeColorDefault: GRAPH_DEFAULTS.nodeColorDefault,
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
      isResizing: false,
      isConnecting: false,
      isMarqueeSelecting: false,
      selectionMarquee: null,
    },
    history: {
      past: [],
      future: [],
    },
  };
}

export function sanitizeNode(node) {
  const kind = sanitizeNodeKind(node.kind);
  const width = sanitizeOptionalSize(node.width);
  const height = sanitizeOptionalSize(node.height);
  const colorKey = sanitizeNodeColorKey(node.colorKey);
  const baseNode = {
    id: String(node.id),
    title: String(node.title || NODE_DEFAULTS.title).trim() || NODE_DEFAULTS.title,
    description: String(node.description || ''),
    kind,
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    ...(colorKey === null ? {} : { colorKey }),
  };

  if (kind === IMAGE_NODE_DEFAULTS.kind) {
    const imageData = sanitizeImageData(node.imageData);
    const imageAspectRatio = sanitizeImageAspectRatio(node.imageAspectRatio);
    if (!imageData || imageAspectRatio === null) {
      return {
        ...baseNode,
        kind: 'text',
        ...(width === null ? {} : { width }),
        ...(height === null ? {} : { height }),
      };
    }

    const resolvedWidth = width ?? NODE_DEFAULTS.width;
    const resolvedHeight = height ?? Math.max(
      NODE_DEFAULTS.minHeight,
      Math.round((resolvedWidth / imageAspectRatio) + IMAGE_NODE_DEFAULTS.metaHeight),
    );

    return {
      ...baseNode,
      kind: IMAGE_NODE_DEFAULTS.kind,
      imageData,
      imageAspectRatio,
      width: resolvedWidth,
      height: resolvedHeight,
    };
  }

  return {
    ...baseNode,
    ...(width === null ? {} : { width }),
    ...(height === null ? {} : { height }),
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
  const hasValidArrowheadsMode = payload.settings.arrowheads === undefined
    || isValidArrowheadsMode(payload.settings.arrowheads);
  const hasValidArrowheadSizeStep = payload.settings.arrowheadSizeStep === undefined
    || isValidArrowheadSizeStep(payload.settings.arrowheadSizeStep);
  const hasValidNodeColorDefault = payload.settings.nodeColorDefault === undefined
    || payload.settings.nodeColorDefault === null
    || isValidNodeColorKey(payload.settings.nodeColorDefault);
  if (!hasValidCoreSettings || !hasValidAnchorsMode || !hasValidArrowheadsMode || !hasValidArrowheadSizeStep || !hasValidNodeColorDefault) {
    return false;
  }

  const hasValidNodes = payload.nodes.every((node) => validateGraphNodePayload(node));
  if (!hasValidNodes) {
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
    arrowheads: isValidArrowheadsMode(settings?.arrowheads)
      ? settings.arrowheads
      : GRAPH_DEFAULTS.arrowheads,
    arrowheadSizeStep: sanitizeArrowheadSizeStep(settings?.arrowheadSizeStep),
    nodeColorDefault: sanitizeNodeColorKey(settings?.nodeColorDefault),
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

function isValidArrowheadsMode(value) {
  return typeof value === 'string' && ARROWHEADS_MODES.has(value);
}

function isValidArrowheadSizeStep(value) {
  return Number.isInteger(value)
    && value >= ARROWHEAD_SIZE_STEP_MIN
    && value <= ARROWHEAD_SIZE_STEP_MAX;
}

function sanitizeArrowheadSizeStep(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return GRAPH_DEFAULTS.arrowheadSizeStep;
  }
  const rounded = Math.round(numeric);
  if (rounded < ARROWHEAD_SIZE_STEP_MIN) return ARROWHEAD_SIZE_STEP_MIN;
  if (rounded > ARROWHEAD_SIZE_STEP_MAX) return ARROWHEAD_SIZE_STEP_MAX;
  return rounded;
}

function sanitizeOptionalSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function sanitizeNodeKind(value) {
  return isValidNodeKind(value) ? value : 'text';
}

function isValidNodeKind(value) {
  return typeof value === 'string' && NODE_KINDS.has(value);
}

function sanitizeImageData(value) {
  if (!isValidImageDataUrl(value)) {
    return null;
  }
  return value;
}

function sanitizeImageAspectRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function isValidImageDataUrl(value) {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('data:image/')) return false;
  const markerIndex = value.indexOf(';base64,');
  if (markerIndex <= 'data:image/'.length) return false;
  return markerIndex < (value.length - ';base64,'.length);
}

function validateGraphNodePayload(node) {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.id !== 'string' || !node.id) return false;
  if (node.kind !== undefined && !isValidNodeKind(node.kind)) return false;
  if (node.width !== undefined && sanitizeOptionalSize(node.width) === null) return false;
  if (node.height !== undefined && sanitizeOptionalSize(node.height) === null) return false;

  const resolvedKind = node.kind === 'image' ? 'image' : 'text';
  if (resolvedKind === 'image') {
    return isValidImageDataUrl(node.imageData) && sanitizeImageAspectRatio(node.imageAspectRatio) !== null;
  }

  return true;
}

function sanitizeNodeColorKey(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  return isValidNodeColorKey(value) ? value : null;
}

function isValidNodeColorKey(value) {
  return typeof value === 'string' && NODE_COLOR_KEYS.includes(value);
}
