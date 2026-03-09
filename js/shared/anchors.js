import { getEntityCenter } from './entities.js';

export function isAnchorName(anchor) {
  return anchor === 'top' || anchor === 'right' || anchor === 'bottom' || anchor === 'left';
}

export function resolveAutoAnchor(fromEntity, toEntity) {
  const fromCenter = getEntityCenter(fromEntity);
  const toCenter = getEntityCenter(toEntity);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

export function unitVectorByAnchor(anchor) {
  switch (anchor) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}
