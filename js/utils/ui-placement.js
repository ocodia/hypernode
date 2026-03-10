const CORNER_POSITIONS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const TOOLBAR_POSITIONS = [...CORNER_POSITIONS];
const TOOLBAR_ORIENTATIONS = ['horizontal', 'vertical'];

const CLOCKWISE_BY_CORNER = {
  'top-left': ['top-left', 'top-right', 'bottom-right', 'bottom-left'],
  'top-right': ['top-right', 'bottom-right', 'bottom-left', 'top-left'],
  'bottom-right': ['bottom-right', 'bottom-left', 'top-left', 'top-right'],
  'bottom-left': ['bottom-left', 'top-left', 'top-right', 'bottom-right'],
};

export function isValidToolbarPosition(value) {
  return typeof value === 'string' && TOOLBAR_POSITIONS.includes(value);
}

export function isValidCornerPosition(value) {
  return typeof value === 'string' && CORNER_POSITIONS.includes(value);
}

export function isValidToolbarOrientation(value) {
  return typeof value === 'string' && TOOLBAR_ORIENTATIONS.includes(value);
}

export function normalizeToolbarPosition(value, fallback) {
  if (isValidToolbarPosition(value)) return value;
  return fallback;
}

export function getToolbarReservedCorners(toolbarPosition) {
  const normalized = isValidToolbarPosition(toolbarPosition) ? toolbarPosition : null;
  return normalized ? [normalized] : [];
}

export function getAnchoredUiPlacement(settings) {
  const toolbarPosition = normalizeToolbarPosition(settings?.toolbarPosition, 'top-left');
  const toolbarOrientation = isValidToolbarOrientation(settings?.toolbarOrientation) ? settings.toolbarOrientation : 'horizontal';
  const requestedToast = isValidCornerPosition(settings?.toastPosition) ? settings.toastPosition : 'bottom-right';
  const requestedMeta = isValidCornerPosition(settings?.metaPosition) ? settings.metaPosition : 'bottom-left';

  const toastPosition = resolveCornerPlacement({
    requestedCorner: requestedToast,
    currentCorner: requestedToast,
    occupiedCorners: getToolbarReservedCorners(toolbarPosition),
  });
  const metaPosition = resolveCornerPlacement({
    requestedCorner: requestedMeta,
    currentCorner: requestedMeta,
    occupiedCorners: [...getToolbarReservedCorners(toolbarPosition), toastPosition].filter(Boolean),
  });

  return {
    toolbarPosition,
    toolbarOrientation,
    toastPosition,
    metaPosition,
  };
}

export function resolvePlacementChange(settings, target, requestedPosition, requestedOrientation = null) {
  const current = getAnchoredUiPlacement(settings);
  const next = {
    toolbarPosition: current.toolbarPosition,
    toolbarOrientation: current.toolbarOrientation,
    toastPosition: current.toastPosition,
    metaPosition: current.metaPosition,
  };

  if (target === 'toolbar') {
    next.toolbarPosition = normalizeToolbarPosition(requestedPosition, current.toolbarPosition);
    if (isValidToolbarOrientation(requestedOrientation)) {
      next.toolbarOrientation = requestedOrientation;
    }
    const occupiedCorners = getToolbarReservedCorners(next.toolbarPosition);
    next.toastPosition = resolveCornerPlacement({
      requestedCorner: current.toastPosition,
      currentCorner: current.toastPosition,
      occupiedCorners,
    });
    next.metaPosition = resolveCornerPlacement({
      requestedCorner: current.metaPosition,
      currentCorner: current.metaPosition,
      occupiedCorners: [...occupiedCorners, next.toastPosition].filter(Boolean),
    });
    return next;
  }

  if (target === 'toast') {
    next.toastPosition = resolveCornerPlacement({
      requestedCorner: requestedPosition,
      currentCorner: current.toastPosition,
      occupiedCorners: getToolbarReservedCorners(current.toolbarPosition),
    });
    next.metaPosition = resolveCornerPlacement({
      requestedCorner: current.metaPosition,
      currentCorner: current.metaPosition,
      occupiedCorners: [...getToolbarReservedCorners(current.toolbarPosition), next.toastPosition].filter(Boolean),
    });
    return next;
  }

  if (target === 'meta') {
    next.toastPosition = current.toastPosition;
    next.metaPosition = resolveCornerPlacement({
      requestedCorner: requestedPosition,
      currentCorner: current.metaPosition,
      occupiedCorners: [...getToolbarReservedCorners(current.toolbarPosition), current.toastPosition].filter(Boolean),
    });
    return next;
  }

  return current;
}

export function getUnavailableCornerPositions(settings, target) {
  const current = getAnchoredUiPlacement(settings);
  const baseOccupied = getToolbarReservedCorners(current.toolbarPosition);
  if (target === 'toast') {
    return new Set(baseOccupied);
  }
  if (target === 'meta') {
    return new Set([...baseOccupied, current.toastPosition].filter(Boolean));
  }
  return new Set();
}

function resolveCornerPlacement({ requestedCorner, currentCorner, occupiedCorners }) {
  const occupied = new Set((Array.isArray(occupiedCorners) ? occupiedCorners : []).filter(Boolean));
  const normalizedRequested = isValidCornerPosition(requestedCorner) ? requestedCorner : null;
  const normalizedCurrent = isValidCornerPosition(currentCorner) ? currentCorner : null;

  if (normalizedRequested && !occupied.has(normalizedRequested)) {
    return normalizedRequested;
  }

  const preferredOrder = normalizedRequested ? CLOCKWISE_BY_CORNER[normalizedRequested] : CORNER_POSITIONS;
  const fallbackOrder = normalizedCurrent && !preferredOrder.includes(normalizedCurrent)
    ? [...preferredOrder, normalizedCurrent]
    : preferredOrder;
  return fallbackOrder.find((corner) => !occupied.has(corner)) ?? normalizedCurrent ?? null;
}
