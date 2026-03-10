import {
  APP_SETTINGS_DEFAULTS,
  FRAME_DEFAULTS,
  GRAPH_DEFAULTS,
  IMAGE_NODE_DEFAULTS,
  NODE_COLOR_KEYS,
  NODE_DEFAULTS,
  VIEWPORT_LIMITS,
} from './constants.js';
import {
  getAnchoredUiPlacement,
  isValidCornerPosition,
  isValidToolbarOrientation,
  isValidToolbarPosition,
  normalizeToolbarPosition,
} from './ui-placement.js';

const ANCHORS = new Set(['top', 'right', 'bottom', 'left']);
const BACKGROUND_STYLES = new Set(['blank', 'dots', 'graph-paper']);
const ANCHORS_MODES = new Set(['auto', 'exact']);
const ARROWHEADS_MODES = new Set(['shown', 'hidden']);
const UI_THEME_PRESETS = new Set(['blueprint', 'fjord', 'slate', 'paper', 'ember', 'soft-black']);
const UI_RADIUS_PRESETS = new Set(['sharp', 'soft', 'rounded', 'square']);
const ARROWHEAD_SIZE_STEP_MIN = 0;
const ARROWHEAD_SIZE_STEP_MAX = 9;
const NODE_KINDS = new Set(['text', 'image']);
const FRAME_BORDER_STYLES = new Set(['solid', 'dashed', 'dotted']);

export function emptyGraphState() {
  return {
    name: GRAPH_DEFAULTS.name,
    settings: sanitizeAppSettings(),
    nodes: [],
    frames: [],
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
      focusedNodeId: null,
      starterNodeId: null,
      editingFrameId: null,
      isPanning: false,
      isDragging: false,
      isResizing: false,
      isConnecting: false,
      isDrawingFrame: false,
      frameDraft: null,
      frameMembershipPreview: {},
      nodeMembershipPreview: {},
      isMarqueeSelecting: false,
      selectionMarquee: null,
    },
    history: {
      past: [],
      future: [],
    },
  };
}

export function sanitizeNode(node, frameIds = null) {
  const kind = sanitizeNodeKind(node.kind);
  const width = sanitizeOptionalSize(node.width);
  const height = sanitizeOptionalSize(node.height);
  const borderWidth = sanitizeNodeBorderWidth(node.borderWidth);
  const borderStyle = sanitizeNodeBorderStyle(node.borderStyle);
  const colorKey = sanitizeNodeColorKey(node.colorKey);
  const frameId = sanitizeFrameRef(node.frameId, frameIds);
  const baseNode = {
    id: String(node.id),
    title: String(node.title || NODE_DEFAULTS.title).trim() || NODE_DEFAULTS.title,
    description: String(node.description || ''),
    kind,
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    borderWidth,
    borderStyle,
    ...(frameId === null ? {} : { frameId }),
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

export function sanitizeFrame(frame) {
  const width = sanitizeOptionalSize(frame.width) ?? FRAME_DEFAULTS.width;
  const height = sanitizeOptionalSize(frame.height) ?? FRAME_DEFAULTS.height;
  const borderWidth = sanitizeFrameBorderWidth(frame.borderWidth);
  const borderStyle = sanitizeFrameBorderStyle(frame.borderStyle);
  const colorKey = sanitizeNodeColorKey(frame.colorKey);

  return {
    id: String(frame.id),
    title: String(frame.title || FRAME_DEFAULTS.title).trim() || FRAME_DEFAULTS.title,
    description: String(frame.description || ''),
    x: Number(frame.x) || 0,
    y: Number(frame.y) || 0,
    width: Math.max(FRAME_DEFAULTS.minWidth, width),
    height: Math.max(FRAME_DEFAULTS.minHeight, height),
    borderWidth,
    borderStyle,
    ...(colorKey === null ? {} : { colorKey }),
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
  if (!payload || typeof payload.name !== 'string' || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return false;
  }

  if (payload.frames !== undefined && !Array.isArray(payload.frames)) {
    return false;
  }

  const settings = payload.settings ?? {};
  const hasValidUiThemePreset = settings.uiThemePreset === undefined
    || normalizeUiThemePreset(settings.uiThemePreset) !== null;
  const hasValidUiRadiusPreset = settings.uiRadiusPreset === undefined
    || normalizeUiRadiusPreset(settings.uiRadiusPreset) !== null;
  const hasValidToolbarPosition = settings.toolbarPosition === undefined
    || normalizeToolbarPosition(settings.toolbarPosition, null) !== null;
  const hasValidToolbarOrientation = settings.toolbarOrientation === undefined
    || isValidToolbarOrientation(settings.toolbarOrientation);
  const hasValidToastPosition = settings.toastPosition === undefined
    || isValidCornerPosition(settings.toastPosition);
  const hasValidMetaPosition = settings.metaPosition === undefined
    || isValidCornerPosition(settings.metaPosition);
  const hasValidCoreSettings = settings.backgroundStyle === undefined
    || isValidBackgroundStyle(settings.backgroundStyle);
  const hasValidAnchorsMode = settings.anchorsMode === undefined
    || isValidAnchorsMode(settings.anchorsMode);
  const hasValidArrowheadsMode = settings.arrowheads === undefined
    || isValidArrowheadsMode(settings.arrowheads);
  const hasValidArrowheadSizeStep = settings.arrowheadSizeStep === undefined
    || isValidArrowheadSizeStep(settings.arrowheadSizeStep);
  const hasValidNodeColorDefault = settings.nodeColorDefault === undefined
    || settings.nodeColorDefault === null
    || isValidNodeColorKey(settings.nodeColorDefault);
  if (!hasValidUiThemePreset || !hasValidUiRadiusPreset || !hasValidToolbarPosition || !hasValidToolbarOrientation || !hasValidToastPosition || !hasValidMetaPosition || !hasValidCoreSettings || !hasValidAnchorsMode || !hasValidArrowheadsMode || !hasValidArrowheadSizeStep || !hasValidNodeColorDefault) {
    return false;
  }

  const frames = Array.isArray(payload.frames) ? payload.frames : [];
  const hasValidFrames = frames.every((frame) => validateGraphFramePayload(frame));
  if (!hasValidFrames) {
    return false;
  }

  const frameIds = new Set(frames.map((frame) => frame.id));
  if (frameIds.size !== frames.length) {
    return false;
  }

  const hasValidNodes = payload.nodes.every((node) => validateGraphNodePayload(node, frameIds));
  if (!hasValidNodes) {
    return false;
  }

  const nodeIds = new Set(payload.nodes.map((node) => node.id));
  if (nodeIds.size !== payload.nodes.length) {
    return false;
  }

  const endpointIds = new Set([...nodeIds, ...frameIds]);
  return payload.edges.every((edge) => {
    return edge
      && typeof edge.id === 'string'
      && endpointIds.has(edge.from)
      && endpointIds.has(edge.to)
      && edge.from !== edge.to
      && isValidAnchor(edge.fromAnchor)
      && isValidAnchor(edge.toAnchor);
  });
}

export function sanitizeGraphName(name) {
  const text = String(name ?? '').trim();
  return text || GRAPH_DEFAULTS.name;
}

export function sanitizeAppSettings(settings) {
  const sanitized = {
    uiThemePreset: normalizeUiThemePreset(settings?.uiThemePreset) ?? APP_SETTINGS_DEFAULTS.uiThemePreset,
    uiRadiusPreset: normalizeUiRadiusPreset(settings?.uiRadiusPreset) ?? APP_SETTINGS_DEFAULTS.uiRadiusPreset,
    toolbarPosition: normalizeToolbarPosition(settings?.toolbarPosition, APP_SETTINGS_DEFAULTS.toolbarPosition),
    toolbarOrientation: isValidToolbarOrientation(settings?.toolbarOrientation)
      ? settings.toolbarOrientation
      : APP_SETTINGS_DEFAULTS.toolbarOrientation,
    toastPosition: isValidCornerPosition(settings?.toastPosition)
      ? settings.toastPosition
      : APP_SETTINGS_DEFAULTS.toastPosition,
    metaPosition: isValidCornerPosition(settings?.metaPosition)
      ? settings.metaPosition
      : APP_SETTINGS_DEFAULTS.metaPosition,
    backgroundStyle: isValidBackgroundStyle(settings?.backgroundStyle)
      ? settings.backgroundStyle
      : APP_SETTINGS_DEFAULTS.backgroundStyle,
    anchorsMode: isValidAnchorsMode(settings?.anchorsMode)
      ? settings.anchorsMode
      : APP_SETTINGS_DEFAULTS.anchorsMode,
    arrowheads: isValidArrowheadsMode(settings?.arrowheads)
      ? settings.arrowheads
      : APP_SETTINGS_DEFAULTS.arrowheads,
    arrowheadSizeStep: sanitizeArrowheadSizeStep(settings?.arrowheadSizeStep),
    nodeColorDefault: sanitizeNodeColorKey(settings?.nodeColorDefault),
  };
  const resolvedPlacement = getAnchoredUiPlacement(sanitized);
  return {
    ...sanitized,
    toolbarPosition: resolvedPlacement.toolbarPosition,
    toolbarOrientation: resolvedPlacement.toolbarOrientation,
    toastPosition: resolvedPlacement.toastPosition,
    metaPosition: resolvedPlacement.metaPosition,
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

function isValidUiThemePreset(value) {
  return typeof value === 'string' && UI_THEME_PRESETS.has(value);
}

function normalizeUiThemePreset(value) {
  if (value === 'graphite') {
    return 'blueprint';
  }
  if (value === 'mist') {
    return 'slate';
  }
  return isValidUiThemePreset(value) ? value : null;
}

function isValidUiRadiusPreset(value) {
  return typeof value === 'string' && UI_RADIUS_PRESETS.has(value);
}

function normalizeUiRadiusPreset(value) {
  if (!isValidUiRadiusPreset(value)) {
    return null;
  }
  if (value === 'square') {
    return 'soft';
  }
  return value;
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
    return APP_SETTINGS_DEFAULTS.arrowheadSizeStep;
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

function validateGraphNodePayload(node, frameIds) {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.id !== 'string' || !node.id) return false;
  if (node.kind !== undefined && !isValidNodeKind(node.kind)) return false;
  if (node.width !== undefined && sanitizeOptionalSize(node.width) === null) return false;
  if (node.height !== undefined && sanitizeOptionalSize(node.height) === null) return false;
  if (node.borderWidth !== undefined && !isValidNodeBorderWidth(node.borderWidth)) return false;
  if (node.borderStyle !== undefined && !isValidNodeBorderStyle(node.borderStyle)) return false;
  if (node.frameId !== undefined && node.frameId !== null) {
    if (typeof node.frameId !== 'string' || !frameIds.has(node.frameId)) return false;
  }

  const resolvedKind = node.kind === 'image' ? 'image' : 'text';
  if (resolvedKind === 'image') {
    return isValidImageDataUrl(node.imageData) && sanitizeImageAspectRatio(node.imageAspectRatio) !== null;
  }

  return true;
}

function validateGraphFramePayload(frame) {
  if (!frame || typeof frame !== 'object') return false;
  if (typeof frame.id !== 'string' || !frame.id) return false;
  if (frame.width !== undefined && sanitizeOptionalSize(frame.width) === null) return false;
  if (frame.height !== undefined && sanitizeOptionalSize(frame.height) === null) return false;
  if (frame.borderWidth !== undefined && !isValidFrameBorderWidth(frame.borderWidth)) return false;
  if (frame.borderStyle !== undefined && !isValidFrameBorderStyle(frame.borderStyle)) return false;
  if (frame.colorKey !== undefined && frame.colorKey !== null && !isValidNodeColorKey(frame.colorKey)) {
    return false;
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

function sanitizeFrameRef(value, frameIds = null) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  if (frameIds instanceof Set && !frameIds.has(value)) {
    return null;
  }
  return value;
}

function sanitizeFrameBorderWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return FRAME_DEFAULTS.borderWidth;
  }
  const rounded = Math.round(numeric);
  if (rounded < FRAME_DEFAULTS.borderWidthMin) return FRAME_DEFAULTS.borderWidthMin;
  if (rounded > FRAME_DEFAULTS.borderWidthMax) return FRAME_DEFAULTS.borderWidthMax;
  return rounded;
}

function sanitizeFrameBorderStyle(value) {
  if (typeof value !== 'string' || !FRAME_BORDER_STYLES.has(value)) {
    return FRAME_DEFAULTS.borderStyle;
  }
  return value;
}

function isValidFrameBorderWidth(value) {
  return Number.isInteger(Number(value))
    && Number(value) >= FRAME_DEFAULTS.borderWidthMin
    && Number(value) <= FRAME_DEFAULTS.borderWidthMax;
}

function isValidFrameBorderStyle(value) {
  return typeof value === 'string' && FRAME_BORDER_STYLES.has(value);
}

function sanitizeNodeBorderWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return NODE_DEFAULTS.borderWidth;
  }
  const rounded = Math.round(numeric);
  if (rounded < NODE_DEFAULTS.borderWidthMin) return NODE_DEFAULTS.borderWidthMin;
  if (rounded > NODE_DEFAULTS.borderWidthMax) return NODE_DEFAULTS.borderWidthMax;
  return rounded;
}

function sanitizeNodeBorderStyle(value) {
  if (typeof value !== 'string' || !FRAME_BORDER_STYLES.has(value)) {
    return NODE_DEFAULTS.borderStyle;
  }
  return value;
}

function isValidNodeBorderWidth(value) {
  return Number.isInteger(Number(value))
    && Number(value) >= NODE_DEFAULTS.borderWidthMin
    && Number(value) <= NODE_DEFAULTS.borderWidthMax;
}

function isValidNodeBorderStyle(value) {
  return typeof value === 'string' && FRAME_BORDER_STYLES.has(value);
}
