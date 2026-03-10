import { FRAME_DEFAULTS, IMAGE_NODE_DEFAULTS, NODE_DEFAULTS } from '../utils/constants.js';

export function isImageNode(node) {
  return node?.kind === IMAGE_NODE_DEFAULTS.kind
    && typeof node?.imageData === 'string'
    && Number(node?.imageAspectRatio) > 0;
}

export function isFrameEntity(entity) {
  return entity && !Object.prototype.hasOwnProperty.call(entity, 'kind');
}

export function getNodeWidth(node) {
  const width = Number(node?.width);
  return Number.isFinite(width) && width > 0 ? width : NODE_DEFAULTS.width;
}

export function getNodeHeight(node) {
  const height = Number(node?.height);
  if (Number.isFinite(height) && height > 0) return height;
  return NODE_DEFAULTS.height;
}

export function getFrameWidth(frame) {
  const width = Number(frame?.width);
  return Number.isFinite(width) && width > 0 ? width : FRAME_DEFAULTS.width;
}

export function getFrameHeight(frame) {
  const height = Number(frame?.height);
  return Number.isFinite(height) && height > 0 ? height : FRAME_DEFAULTS.height;
}

export function getEntityWidth(entity) {
  return isFrameEntity(entity) ? getFrameWidth(entity) : getNodeWidth(entity);
}

export function getEntityHeight(entity) {
  return isFrameEntity(entity) ? getFrameHeight(entity) : getNodeHeight(entity);
}

export function getNodeRect(node) {
  const left = Number(node?.x) || 0;
  const top = Number(node?.y) || 0;
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

export function getFrameRect(frame) {
  const left = Number(frame?.x) || 0;
  const top = Number(frame?.y) || 0;
  const width = getFrameWidth(frame);
  const height = getFrameHeight(frame);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

export function getEntityCenter(entity) {
  const width = getEntityWidth(entity);
  const height = getEntityHeight(entity);
  return {
    x: (Number(entity?.x) || 0) + (width / 2),
    y: (Number(entity?.y) || 0) + (height / 2),
  };
}

export function findEntityById(state, id) {
  const node = state.nodes.find((item) => item.id === id);
  if (node) return node;
  return state.frames.find((item) => item.id === id) || null;
}

export function getNodeFrameOverlapArea(node, frame) {
  const nodeRect = getNodeRect(node);
  const frameRect = getFrameRect(frame);
  const overlapWidth = Math.max(0, Math.min(nodeRect.right, frameRect.right) - Math.max(nodeRect.left, frameRect.left));
  const overlapHeight = Math.max(0, Math.min(nodeRect.bottom, frameRect.bottom) - Math.max(nodeRect.top, frameRect.top));
  return overlapWidth * overlapHeight;
}

export function findBestFrameIdForNode(node, frames) {
  let best = null;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const area = getNodeFrameOverlapArea(node, frame);
    if (area <= 0) continue;
    if (!best || area > best.area || (area === best.area && index > best.index)) {
      best = { frameId: frame.id, area, index };
    }
  }
  return best?.frameId || null;
}
