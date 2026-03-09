import { clamp } from '../../shared/math.js';
import { mapZoomOpacity, positiveModulo } from '../helpers.js';

export function applyViewport(elements, viewport) {
  const {
    canvas,
    edgesLayer,
    edgesOverlayLayer,
    framesLayer,
    nodesLayer,
    selectionControlsLayer,
  } = elements;
  const zoom = Math.max(0.01, Number(viewport.zoom) || 1);
  const transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
  framesLayer.style.transform = transform;
  nodesLayer.style.transform = transform;
  edgesLayer.style.transform = transform;
  edgesOverlayLayer.style.transform = transform;
  canvas.style.setProperty('--graph-anchor-size', `${Math.max(10, 14 / zoom)}px`);
  canvas.style.setProperty('--graph-control-border-width', `${Math.min(2, Math.max(1.5, 1.5 / zoom))}px`);
  canvas.style.setProperty('--graph-edge-endpoint-radius', `${Math.max(5.5, 8 / zoom)}px`);
  if (selectionControlsLayer instanceof HTMLElement) {
    selectionControlsLayer.style.transform = transform;
    selectionControlsLayer.style.setProperty('--viewport-zoom', String(zoom));
  }
  applyBackgroundViewport(canvas, viewport);
}

function applyBackgroundViewport(canvas, viewport) {
  const zoom = Math.max(0.01, Number(viewport.zoom) || 1);
  const minorStep = 24 * zoom;
  const majorStep = 120 * zoom;
  const minorOffsetX = positiveModulo(viewport.panX, minorStep);
  const minorOffsetY = positiveModulo(viewport.panY, minorStep);
  const majorOffsetX = positiveModulo(viewport.panX, majorStep);
  const majorOffsetY = positiveModulo(viewport.panY, majorStep);
  const dotRadius = clamp(zoom, 0.65, 2.2);
  const dotOrigin = dotRadius;
  const gridMinorAlpha = mapZoomOpacity(zoom, 0.08, 0.45, 0.62);
  const gridMajorAlpha = 0.72;
  const dotAlpha = mapZoomOpacity(zoom, 0.10, 0.52, 0.78);

  canvas.style.setProperty('--bg-step', `${minorStep}px`);
  canvas.style.setProperty('--bg-major-step', `${majorStep}px`);
  canvas.style.setProperty('--bg-minor-offset-x', `${minorOffsetX}px`);
  canvas.style.setProperty('--bg-minor-offset-y', `${minorOffsetY}px`);
  canvas.style.setProperty('--bg-major-offset-x', `${majorOffsetX}px`);
  canvas.style.setProperty('--bg-major-offset-y', `${majorOffsetY}px`);
  canvas.style.setProperty('--bg-dot-radius', `${dotRadius}px`);
  canvas.style.setProperty('--bg-dot-origin', `${dotOrigin}px`);
  canvas.style.setProperty('--bg-grid-minor-alpha', String(gridMinorAlpha));
  canvas.style.setProperty('--bg-grid-major-alpha', String(gridMajorAlpha));
  canvas.style.setProperty('--bg-dot-alpha', String(dotAlpha));
}
