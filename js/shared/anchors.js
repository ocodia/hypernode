import { getEntityWidth, getEntityHeight } from './entities.js';

const ANCHOR_NAMES = ['top', 'right', 'bottom', 'left'];

export function isAnchorName(anchor) {
  return anchor === 'top' || anchor === 'right' || anchor === 'bottom' || anchor === 'left';
}

function getEntityAnchorPoints(entity) {
  const w = getEntityWidth(entity);
  const h = getEntityHeight(entity);
  const x = Number(entity?.x) || 0;
  const y = Number(entity?.y) || 0;
  return {
    top:    { x: x + w / 2, y },
    right:  { x: x + w,     y: y + h / 2 },
    bottom: { x: x + w / 2, y: y + h },
    left:   { x,             y: y + h / 2 },
  };
}

export function resolveAutoAnchors(fromEntity, toEntity) {
  const fp = getEntityAnchorPoints(fromEntity);
  const tp = getEntityAnchorPoints(toEntity);

  let bestFrom = 'right';
  let bestTo = 'left';
  let bestDist = Infinity;

  for (const fa of ANCHOR_NAMES) {
    for (const ta of ANCHOR_NAMES) {
      const dx = fp[fa].x - tp[ta].x;
      const dy = fp[fa].y - tp[ta].y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestFrom = fa;
        bestTo = ta;
      }
    }
  }

  return { fromAnchor: bestFrom, toAnchor: bestTo };
}

export function resolveAutoAnchor(fromEntity, toEntity) {
  return resolveAutoAnchors(fromEntity, toEntity).fromAnchor;
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
