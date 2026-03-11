export function areSelectionsEqual(left, right) {
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
  if (left.type === 'edges') {
    const leftIds = Array.isArray(left.ids) ? left.ids : [];
    const rightIds = Array.isArray(right.ids) ? right.ids : [];
    if (leftIds.length !== rightIds.length) return false;
    for (let index = 0; index < leftIds.length; index += 1) {
      if (leftIds[index] !== rightIds[index]) return false;
    }
    return true;
  }
  return left.id === right.id;
}

export function cloneSelection(selection) {
  if (!selection) return null;
  if (selection.type === 'nodes') {
    return {
      type: 'nodes',
      ids: Array.isArray(selection.ids) ? [...selection.ids] : [],
      primaryId: selection.primaryId || null,
    };
  }
  if (selection.type === 'edges') {
    return {
      type: 'edges',
      ids: Array.isArray(selection.ids) ? [...selection.ids] : [],
    };
  }
  return { ...selection };
}

export function getSelectedNodeIds(selection) {
  if (!selection) return [];
  if (selection.type === 'node') return [selection.id];
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) ? [...selection.ids] : [];
  }
  return [];
}

export function getSingleSelectedNodeId(selection) {
  if (!selection) return null;
  if (selection.type === 'node') return selection.id;
  if (selection.type === 'nodes' && selection.ids?.length === 1) {
    return selection.ids[0];
  }
  return null;
}

export function isNodeSelected(selection, nodeId) {
  if (!nodeId || !selection) return false;
  if (selection.type === 'node') return selection.id === nodeId;
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) && selection.ids.includes(nodeId);
  }
  return false;
}

export function isFrameSelected(selection, frameId) {
  if (!frameId || !selection) return false;
  return selection.type === 'frame' && selection.id === frameId;
}

export function normalizeNodeSelection(ids, nodes, preferredPrimaryId = null) {
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

export function isEdgeSelected(selection, edgeId) {
  if (!edgeId || !selection) return false;
  if (selection.type === 'edge') return selection.id === edgeId;
  if (selection.type === 'edges') {
    return Array.isArray(selection.ids) && selection.ids.includes(edgeId);
  }
  return false;
}

export function getSelectedEdgeIds(selection) {
  if (!selection) return [];
  if (selection.type === 'edge') return [selection.id];
  if (selection.type === 'edges') {
    return Array.isArray(selection.ids) ? [...selection.ids] : [];
  }
  return [];
}

export function normalizeEdgeSelection(ids, edges) {
  const validIds = new Set((edges || []).map((edge) => edge.id));
  const deduped = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || !validIds.has(id) || deduped.includes(id)) continue;
    deduped.push(id);
  }

  if (deduped.length === 0) return null;
  if (deduped.length === 1) {
    return { type: 'edge', id: deduped[0] };
  }

  return {
    type: 'edges',
    ids: deduped,
  };
}
