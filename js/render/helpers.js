import { FRAME_DEFAULTS, NODE_DEFAULTS } from '../utils/constants.js';
import { isAnchorName, resolveAutoAnchor, unitVectorByAnchor } from '../shared/anchors.js';
import { findEntityById, isFrameEntity, isImageNode } from '../shared/entities.js';
import { getSelectedNodeIds, getSingleSelectedNodeId } from '../shared/selection.js';
import { clamp, positiveModulo } from '../shared/math.js';

export {
  findEntityById,
  getSelectedNodeIds,
  getSingleSelectedNodeId,
  isFrameEntity,
  isImageNode,
  positiveModulo,
  clamp,
};

const BORDER_STYLE_OPTIONS = ['solid', 'dashed', 'dotted'];

export function buildToolbarColorPopoverMarkup(label = 'Colors') {
  return `
    <div class="entity-toolbar__popover" data-toolbar-popover="color" role="dialog" aria-label="${escapeAttr(label)}" hidden>
      <p class="entity-toolbar__popover-title">${escapeHTML(label)}</p>
      <div class="node-color-picker" role="group" aria-label="${escapeAttr(label)}">
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="sage" aria-label="Apply sage color" title="Sage"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="sky" aria-label="Apply sky color" title="Sky"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="amber" aria-label="Apply amber color" title="Amber"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="rose" aria-label="Apply rose color" title="Rose"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="slate" aria-label="Apply slate color" title="Slate"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="teal" aria-label="Apply teal color" title="Teal"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="violet" aria-label="Apply violet color" title="Violet"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="peach" aria-label="Apply peach color" title="Peach"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="mint" aria-label="Apply mint color" title="Mint"></button>
        <button class="node-color-picker__swatch" type="button" data-toolbar-color-value="indigo" aria-label="Apply indigo color" title="Indigo"></button>
        <button class="node-color-picker__reset" type="button" data-toolbar-color-value="default" aria-label="Reset color" title="Reset color">Reset</button>
      </div>
    </div>
  `;
}

export function buildToolbarBorderWidthPopoverMarkup(value, label = 'Border Width') {
  const resolvedValue = Number.isFinite(Number(value)) ? Math.round(Number(value)) : NODE_DEFAULTS.borderWidth;
  return `
    <div class="entity-toolbar__popover entity-toolbar__popover--range" data-toolbar-popover="border-width" role="dialog" aria-label="${escapeAttr(label)}" hidden>
      <label class="entity-toolbar__range" data-toolbar-range>
        <span class="entity-toolbar__range-header">
          <span class="entity-toolbar__popover-title">${escapeHTML(label)}</span>
          <span class="entity-toolbar__range-value" data-toolbar-border-width-value>${resolvedValue}</span>
        </span>
        <input class="entity-toolbar__range-input" data-toolbar-border-width-input type="range" min="1" max="8" step="1" value="${escapeAttr(resolvedValue)}" />
      </label>
    </div>
  `;
}

export function buildToolbarBorderStylePopoverMarkup(currentStyle, label = 'Border Style') {
  const resolvedStyle = BORDER_STYLE_OPTIONS.includes(currentStyle) ? currentStyle : NODE_DEFAULTS.borderStyle;
  return `
    <div class="entity-toolbar__popover" data-toolbar-popover="border-style" role="dialog" aria-label="${escapeAttr(label)}" hidden>
      <p class="entity-toolbar__popover-title">${escapeHTML(label)}</p>
      <div class="entity-toolbar__style-options" role="group" aria-label="${escapeAttr(label)}">
        ${BORDER_STYLE_OPTIONS.map((style) => `
          <button
            class="entity-toolbar__style-btn"
            type="button"
            data-toolbar-border-style-value="${style}"
            aria-pressed="${resolvedStyle === style ? 'true' : 'false'}"
          >${escapeHTML(style)}</button>
        `).join('')}
      </div>
    </div>
  `;
}

export function mapZoomOpacity(zoom, minOpacity, midOpacity, maxOpacity) {
  const minZoom = 0.35;
  const midZoom = 1.0;
  const maxZoom = 2.5;
  if (zoom <= midZoom) {
    const t = clamp((zoom - minZoom) / (midZoom - minZoom), 0, 1);
    return lerp(minOpacity, midOpacity, t);
  }
  const t = clamp((zoom - midZoom) / (maxZoom - midZoom), 0, 1);
  return lerp(midOpacity, maxOpacity, t);
}

export function lerp(from, to, t) {
  return from + (to - from) * t;
}

export function measureEntitySizes(state) {
  const sizes = new Map();
  document.querySelectorAll('#nodes-layer > [data-node-id]').forEach((nodeEl) => {
    const nodeId = nodeEl.dataset.nodeId;
    sizes.set(nodeId, {
      width: nodeEl.offsetWidth || NODE_DEFAULTS.width,
      height: nodeEl.offsetHeight || NODE_DEFAULTS.height,
    });
  });
  for (const frame of state.frames || []) {
    const frameEl = document.querySelector(`#frames-layer > [data-frame-id="${escapeSelector(frame.id)}"]`);
    sizes.set(frame.id, {
      width: frameEl?.offsetWidth || Number(frame.width) || FRAME_DEFAULTS.width,
      height: frameEl?.offsetHeight || Number(frame.height) || FRAME_DEFAULTS.height,
    });
  }
  return sizes;
}

export function defaultEntitySize(entity) {
  if (isFrameEntity(entity)) {
    return {
      width: Number(entity.width) || FRAME_DEFAULTS.width,
      height: Number(entity.height) || FRAME_DEFAULTS.height,
    };
  }
  return { width: NODE_DEFAULTS.width, height: NODE_DEFAULTS.height };
}

export function buildNodeInlineSizeStyle(node) {
  const width = Number(node.width);
  const height = Number(node.height);
  const hasWidth = Number.isFinite(width) && width > 0;
  const hasHeight = Number.isFinite(height) && height > 0;
  if (!hasWidth && !hasHeight) {
    return '';
  }
  let style = '';
  if (hasWidth) {
    style += `width: ${width}px;`;
  }
  if (hasHeight) {
    style += `height: ${height}px;`;
  }
  return style;
}

export function hasExplicitNodeSize(node) {
  const width = Number(node.width);
  const height = Number(node.height);
  return (Number.isFinite(width) && width > 0) || (Number.isFinite(height) && height > 0);
}

export function getNodeCenter(node, size) {
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height / 2,
  };
}

export function getAnchorPoint(node, size, anchor) {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  switch (anchor) {
    case 'top':
      return { x: node.x + halfWidth, y: node.y };
    case 'right':
      return { x: node.x + size.width, y: node.y + halfHeight };
    case 'bottom':
      return { x: node.x + halfWidth, y: node.y + size.height };
    case 'left':
    default:
      return { x: node.x, y: node.y + halfHeight };
  }
}

export function resolveEdgeAnchor(preferredAnchor, fromNode, toNode, useExactAnchors) {
  if (isAnchorName(preferredAnchor)) {
    return preferredAnchor;
  }
  if (useExactAnchors) {
    return resolveAutoAnchor(fromNode, toNode);
  }
  return resolveAutoAnchor(fromNode, toNode);
}

export function resolveAnchorToPoint(node, size, targetPoint) {
  const center = getNodeCenter(node, size);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

export function buildTautPath(start, end, fromAnchor, toAnchor) {
  const controls = getTautControls(start, end, fromAnchor, toAnchor);
  return `M ${start.x} ${start.y} C ${controls.start.x} ${controls.start.y}, ${controls.end.x} ${controls.end.y}, ${end.x} ${end.y}`;
}

export function getTautControls(start, end, fromAnchor, toAnchor) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const strength = Math.max(32, distance * 0.32);
  const startControl = moveByAnchor(start, fromAnchor, strength);
  const endControl = moveByAnchor(end, toAnchor, strength);
  return { start: startControl, end: endControl };
}

export function inferIncomingAnchor(start, end) {
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

export function moveByAnchor(point, anchor, distance) {
  switch (anchor) {
    case 'top':
      return { x: point.x, y: point.y - distance };
    case 'right':
      return { x: point.x + distance, y: point.y };
    case 'bottom':
      return { x: point.x, y: point.y + distance };
    case 'left':
      return { x: point.x - distance, y: point.y };
    default:
      return { x: point.x, y: point.y };
  }
}

export function cubicPointAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t2 * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export function buildArrowheadPath(start, controlStart, controlEnd, end, toAnchor, sizeScale = 1) {
  const tangentT = 0.96;
  const approach = cubicPointAt(start, controlStart, controlEnd, end, tangentT);
  const tangent = cubicDerivativeAt(start, controlStart, controlEnd, end, tangentT);
  const vx = tangent.x;
  const vy = tangent.y;
  const length = 12.5 * sizeScale;
  const halfWidth = 5 * sizeScale;
  const inset = 2 + (sizeScale * 0.8);
  const magnitude = Math.hypot(vx, vy);
  let ux = 0;
  let uy = 0;

  if (magnitude > 0.0001) {
    ux = vx / magnitude;
    uy = vy / magnitude;
    const toEndX = end.x - approach.x;
    const toEndY = end.y - approach.y;
    const dot = (ux * toEndX) + (uy * toEndY);
    if (dot < 0) {
      ux = -ux;
      uy = -uy;
    }
  } else {
    const fallback = unitVectorByAnchor(toAnchor);
    ux = fallback.x;
    uy = fallback.y;
  }

  const px = -uy;
  const py = ux;
  const tipX = end.x + (ux * inset);
  const tipY = end.y + (uy * inset);
  const baseX = tipX - (ux * length);
  const baseY = tipY - (uy * length);
  const leftX = baseX + (px * halfWidth);
  const leftY = baseY + (py * halfWidth);
  const rightX = baseX - (px * halfWidth);
  const rightY = baseY - (py * halfWidth);
  return `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}

export function cubicDerivativeAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = 3 * mt * mt;
  const b = 6 * mt * t;
  const c = 3 * t * t;
  return {
    x: (a * (p1.x - p0.x)) + (b * (p2.x - p1.x)) + (c * (p3.x - p2.x)),
    y: (a * (p1.y - p0.y)) + (b * (p2.y - p1.y)) + (c * (p3.y - p2.y)),
  };
}

export function getArrowheadSizeScale(step) {
  const safeStep = clamp(Math.round(Number(step) || 0), 0, 9);
  return 1 + (safeStep * 0.2);
}

export function escapeHTML(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function escapeAttr(value) {
  return escapeHTML(value).replaceAll('`', '&#096;');
}

export function buildNodeOverlayControls(nodeId) {
  return `
    <button class="node__resize node__resize--top-left selection-controls__resize" type="button" data-node-resize="${nodeId}:top-left" data-node-id="${nodeId}" aria-label="Resize from top left corner"></button>
    <button class="node__resize node__resize--top-right selection-controls__resize" type="button" data-node-resize="${nodeId}:top-right" data-node-id="${nodeId}" aria-label="Resize from top right corner"></button>
    <button class="node__resize node__resize--bottom-right selection-controls__resize" type="button" data-node-resize="${nodeId}:bottom-right" data-node-id="${nodeId}" aria-label="Resize from bottom right corner"></button>
    <button class="node__resize node__resize--bottom-left selection-controls__resize" type="button" data-node-resize="${nodeId}:bottom-left" data-node-id="${nodeId}" aria-label="Resize from bottom left corner"></button>
    <button class="node__anchor node__anchor--top selection-controls__anchor" type="button" data-node-anchor="${nodeId}:top" data-node-id="${nodeId}" aria-label="Connect from top anchor"></button>
    <button class="node__anchor node__anchor--right selection-controls__anchor" type="button" data-node-anchor="${nodeId}:right" data-node-id="${nodeId}" aria-label="Connect from right anchor"></button>
    <button class="node__anchor node__anchor--bottom selection-controls__anchor" type="button" data-node-anchor="${nodeId}:bottom" data-node-id="${nodeId}" aria-label="Connect from bottom anchor"></button>
    <button class="node__anchor node__anchor--left selection-controls__anchor" type="button" data-node-anchor="${nodeId}:left" data-node-id="${nodeId}" aria-label="Connect from left anchor"></button>
  `;
}

export function buildFrameOverlayControls(frameId, options = {}) {
  const includeResize = options.includeResize !== false;
  return `
    ${includeResize ? `<button class="frame__resize frame__resize--top-left selection-controls__resize" type="button" data-frame-resize="${frameId}:top-left" data-frame-id="${frameId}" aria-label="Resize frame from top left corner"></button>
    <button class="frame__resize frame__resize--top-right selection-controls__resize" type="button" data-frame-resize="${frameId}:top-right" data-frame-id="${frameId}" aria-label="Resize frame from top right corner"></button>
    <button class="frame__resize frame__resize--bottom-right selection-controls__resize" type="button" data-frame-resize="${frameId}:bottom-right" data-frame-id="${frameId}" aria-label="Resize frame from bottom right corner"></button>
    <button class="frame__resize frame__resize--bottom-left selection-controls__resize" type="button" data-frame-resize="${frameId}:bottom-left" data-frame-id="${frameId}" aria-label="Resize frame from bottom left corner"></button>` : ''}
    <button class="frame__anchor frame__anchor--top selection-controls__anchor" type="button" data-frame-anchor="${frameId}:top" data-frame-id="${frameId}" aria-label="Connect from top anchor"></button>
    <button class="frame__anchor frame__anchor--right selection-controls__anchor" type="button" data-frame-anchor="${frameId}:right" data-frame-id="${frameId}" aria-label="Connect from right anchor"></button>
    <button class="frame__anchor frame__anchor--bottom selection-controls__anchor" type="button" data-frame-anchor="${frameId}:bottom" data-frame-id="${frameId}" aria-label="Connect from bottom anchor"></button>
    <button class="frame__anchor frame__anchor--left selection-controls__anchor" type="button" data-frame-anchor="${frameId}:left" data-frame-id="${frameId}" aria-label="Connect from left anchor"></button>
  `;
}

export function escapeCssUrl(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

export function escapeSelector(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(String(value));
  }
  return String(value);
}

export function getNodeStackPriority(nodeId, selectedNodeIds, editingNodeId) {
  if (editingNodeId === nodeId) return 2;
  if (selectedNodeIds.has(nodeId)) return 1;
  return 0;
}
