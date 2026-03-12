export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function positiveModulo(value, divisor) {
  if (!Number.isFinite(divisor) || divisor === 0) return 0;
  return ((value % divisor) + divisor) % divisor;
}

/** Grid size used for snap-to-grid (matches --bg-step). */
export const GRID_SIZE = 24;

/** Round a value to the nearest grid line. */
export function snapToGrid(value, gridSize = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a rect's position while preserving its size.
 * Returns a new { x, y } with both coordinates snapped.
 */
export function snapPositionToGrid(x, y, gridSize = GRID_SIZE) {
  return { x: snapToGrid(x, gridSize), y: snapToGrid(y, gridSize) };
}

/**
 * Snap a resized rect so that each movable edge aligns to the grid,
 * while respecting minimum size constraints.
 * @param {{ x, y, width, height }} rect
 * @param {string} corner - e.g. "top-left", "bottom-right", "left", "right", etc.
 * @param {{ minWidth: number, minHeight: number }} limits
 * @param {number} [gridSize]
 * @returns {{ x, y, width, height }}
 */
export function snapResizeToGrid(rect, corner, limits, gridSize = GRID_SIZE) {
  let { x, y, width, height } = rect;
  const right = x + width;
  const bottom = y + height;

  if (corner.includes("left")) {
    const snappedLeft = snapToGrid(x, gridSize);
    const maxLeft = right - limits.minWidth;
    x = Math.min(snappedLeft, maxLeft);
    width = right - x;
  }
  if (corner.includes("right")) {
    const snappedRight = snapToGrid(right, gridSize);
    const minRight = x + limits.minWidth;
    width = Math.max(snappedRight, minRight) - x;
  }
  if (corner.includes("top")) {
    const snappedTop = snapToGrid(y, gridSize);
    const maxTop = bottom - limits.minHeight;
    y = Math.min(snappedTop, maxTop);
    height = bottom - y;
  }
  if (corner.includes("bottom")) {
    const snappedBottom = snapToGrid(bottom, gridSize);
    const minBottom = y + limits.minHeight;
    height = Math.max(snappedBottom, minBottom) - y;
  }

  return { x, y, width, height };
}
