import { NODE_DEFAULTS, VIEWPORT_LIMITS } from './constants.js';

export function emptyGraphState() {
  return {
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
      isPanning: false,
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

export function validateGraphPayload(payload) {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return false;
  }

  const nodeIds = new Set(payload.nodes.map((node) => node.id));
  if (nodeIds.size !== payload.nodes.length) {
    return false;
  }

  return payload.edges.every((edge) => {
    return edge && typeof edge.id === 'string' && nodeIds.has(edge.from) && nodeIds.has(edge.to);
  });
}
