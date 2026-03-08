import { NODE_DEFAULTS } from "../utils/constants.js";

export function createRenderer(elements, store) {
  const {
    workspace,
    canvas,
    nodesLayer,
    edgesGroup,
    edgeDraftGroup,
    edgesLayer,
    edgesOverlayLayer,
    edgeOverlayGroup,
    importStatus,
    graphTitle,
    selectionMarquee,
  } = elements;

  function applyViewport(viewport) {
    const transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
    nodesLayer.style.transform = transform;
    edgesLayer.style.transform = transform;
    edgesOverlayLayer.style.transform = transform;
    applyBackgroundViewport(viewport);
  }

  function applyBackgroundViewport(viewport) {
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

  function renderNodes(state) {
    const selectedNodeIds = new Set(getSelectedNodeIds(state.selection));
    const singleSelectedNodeId = getSingleSelectedNodeId(state.selection);
    const editingNodeId = state.ui.editingNodeId;
    const draft = state.ui.edgeDraft;
    nodesLayer.innerHTML = state.nodes
      .map((node) => {
        const imageNode = isImageNode(node);
        const selectedClass = selectedNodeIds.has(node.id) ? "is-selected" : "";
        const singleSelectedClass = singleSelectedNodeId === node.id ? "is-single-selected" : "";
        const editingClass = editingNodeId === node.id ? "is-editing" : "";
        const imageClass = imageNode ? "node--image" : "";
        const connectClass =
          draft?.fromNodeId === node.id
            ? "is-connect-source"
            : draft
              ? draft.hoverNodeId === node.id
                ? "is-connect-target"
                : "is-connect-candidate"
              : "";
        const fixedSizeClass = hasExplicitNodeSize(node) ? "has-fixed-size" : "";
        const inlineSizeStyle = buildNodeInlineSizeStyle(node);
        const nodeStyle = `transform: translate(${node.x}px, ${node.y}px);${inlineSizeStyle}`;
        const nodeColorAttr = !imageNode && typeof node.colorKey === 'string' ? ` data-node-color="${node.colorKey}"` : '';
        const imageMarkup = imageNode
          ? `
            <div class="node__image-pane" style="background-image: url('${escapeCssUrl(node.imageData)}'); --node-image-aspect-ratio: ${escapeAttr(node.imageAspectRatio)};"></div>
          `
          : '';
        const content =
          editingNodeId === node.id
            ? `
            <div class="node__editor" data-node-editor="${node.id}">
              <label class="node__editor-label">
                Name
                <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" />
              </label>
              <label class="node__editor-label node__editor-label--description">
                Description
                <textarea class="node__editor-textarea" data-node-edit-description="${node.id}">${escapeHTML(node.description)}</textarea>
              </label>
            </div>
          `
            : `
            ${imageMarkup}
            <div class="node__meta">
              <div class="node__head">
                <h3 class="node__title">${escapeHTML(node.title)}</h3>
              </div>
              ${node.description ? `<p class="node__description">${escapeHTML(node.description)}</p>` : ""}
            </div>
          `;
        return `
          <article class="node ${selectedClass} ${singleSelectedClass} ${editingClass} ${imageClass} ${connectClass} ${fixedSizeClass}" data-node-id="${node.id}"${nodeColorAttr} style="${nodeStyle}">
            <div class="node__toolbar">
              <button class="node__tool-btn" type="button" data-node-edit-open="${node.id}" aria-label="Edit node" title="Edit Node">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button class="node__tool-btn node__tool-btn--danger" type="button" data-node-delete="${node.id}" aria-label="Delete node" title="Delete Node">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <div class="node__content">
              ${content}
            </div>
            <button class="node__resize node__resize--top-left" type="button" data-node-resize="${node.id}:top-left" aria-label="Resize from top left corner"></button>
            <button class="node__resize node__resize--top-right" type="button" data-node-resize="${node.id}:top-right" aria-label="Resize from top right corner"></button>
            <button class="node__resize node__resize--bottom-right" type="button" data-node-resize="${node.id}:bottom-right" aria-label="Resize from bottom right corner"></button>
            <button class="node__resize node__resize--bottom-left" type="button" data-node-resize="${node.id}:bottom-left" aria-label="Resize from bottom left corner"></button>
            <button class="node__anchor node__anchor--top" type="button" data-node-anchor="${node.id}:top" aria-label="Connect from top anchor"></button>
            <button class="node__anchor node__anchor--right" type="button" data-node-anchor="${node.id}:right" aria-label="Connect from right anchor"></button>
            <button class="node__anchor node__anchor--bottom" type="button" data-node-anchor="${node.id}:bottom" aria-label="Connect from bottom anchor"></button>
            <button class="node__anchor node__anchor--left" type="button" data-node-anchor="${node.id}:left" aria-label="Connect from left anchor"></button>
          </article>
        `;
      })
      .join("");
  }

  function renderEdges(state) {
    const byId = new Map(state.nodes.map((node) => [node.id, node]));
    const bySize = measureNodeSizes();
    const useExactAnchors = state.settings.anchorsMode === 'exact';
    const showArrowheads = state.settings.arrowheads === 'shown';
    const arrowheadScale = getArrowheadSizeScale(state.settings.arrowheadSizeStep);
    const selectedEdgeId = state.selection?.type === "edge" ? state.selection.id : null;
    const twangEdgeId = state.ui.edgeTwangId;
    let selectedOverlayMarkup = "";

    edgesGroup.innerHTML = state.edges
      .map((edge) => {
        const fromNode = byId.get(edge.from);
        const toNode = byId.get(edge.to);
        if (!fromNode || !toNode) {
          return "";
        }

        const fromSize = bySize.get(fromNode.id) || defaultNodeSize();
        const toSize = bySize.get(toNode.id) || defaultNodeSize();
        const fromAnchor = resolveEdgeAnchor(edge.fromAnchor, fromNode, toNode, useExactAnchors);
        const toAnchor = resolveEdgeAnchor(edge.toAnchor, toNode, fromNode, useExactAnchors);
        const start = getAnchorPoint(fromNode, fromSize, fromAnchor);
        const end = getAnchorPoint(toNode, toSize, toAnchor);
        const controls = getTautControls(start, end, fromAnchor, toAnchor);
        const d = buildTautPath(start, end, fromAnchor, toAnchor);
        const midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
        const selected = selectedEdgeId === edge.id ? "is-selected" : "";
        const twang = twangEdgeId === edge.id ? "is-twang" : "";
        const arrowMarkup = showArrowheads
          ? `<path class="edge__arrowhead" d="${buildArrowheadPath(start, controls.start, controls.end, end, toAnchor, arrowheadScale)}"></path>`
          : "";
        if (selectedEdgeId === edge.id) {
          selectedOverlayMarkup = `
            <g class="edge-overlay" data-edge-id="${edge.id}">
              <g class="edge__delete" data-edge-delete="${edge.id}" transform="translate(${midpoint.x}, ${midpoint.y})" aria-label="Delete edge">
                <circle r="9"></circle>
                <path class="edge__delete-icon" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" transform="translate(-8, -8)"></path>
              </g>
              <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:from" cx="${start.x}" cy="${start.y}" r="5.5"></circle>
              <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:to" cx="${end.x}" cy="${end.y}" r="5.5"></circle>
            </g>
          `;
        }

        return `
          <g class="edge ${selected} ${twang}" data-edge-id="${edge.id}">
            <path class="edge__hit" d="${d}"></path>
            <path class="edge__line" d="${d}"></path>
            ${arrowMarkup}
          </g>
        `;
      })
      .join("");
    edgeOverlayGroup.innerHTML = selectedOverlayMarkup;
  }

  function renderDraftEdge(state) {
    const draft = state.ui.edgeDraft;
    if (!draft) {
      edgeDraftGroup.innerHTML = "";
      return;
    }

    const bySize = measureNodeSizes();
    const sourceNode = state.nodes.find((node) => node.id === draft.fromNodeId);
    if (!sourceNode) {
      edgeDraftGroup.innerHTML = "";
      return;
    }

    const sourceSize = bySize.get(sourceNode.id) || defaultNodeSize();
    let end = { x: draft.pointerX, y: draft.pointerY };
    let fromAnchor = draft.fromAnchor || resolveAnchorToPoint(sourceNode, sourceSize, end);
    let toAnchor = null;

    const targetNodeId = draft.hoverNodeId || draft.toNodeId;
    const targetAnchor = draft.hoverAnchor || draft.toAnchor;
    if (targetNodeId && targetAnchor) {
      const targetNode = state.nodes.find((node) => node.id === targetNodeId);
      if (targetNode) {
        const targetSize = bySize.get(targetNode.id) || defaultNodeSize();
        fromAnchor = draft.fromAnchor || resolveAutoAnchor(sourceNode, targetNode);
        end = getAnchorPoint(targetNode, targetSize, targetAnchor);
        toAnchor = targetAnchor;
      }
    }

    const start = getAnchorPoint(sourceNode, sourceSize, fromAnchor);
    const resolvedToAnchor = toAnchor || inferIncomingAnchor(start, end);
    const d = buildTautPath(start, end, fromAnchor, resolvedToAnchor);
    edgeDraftGroup.innerHTML = `
      <path class="is-draft" d="${d}"></path>
      <circle class="edge__draft-end" cx="${end.x}" cy="${end.y}" r="5.5"></circle>
    `;
  }

  function renderImportStatus(state) {
    const message = String(state.ui.importStatus || "").trim();
    importStatus.textContent = message;
    importStatus.hidden = !message;
    importStatus.classList.toggle("is-visible", Boolean(message));
  }

  function renderGraphMetadata(state) {
    if (graphTitle) {
      graphTitle.textContent = state.name;
    }
    document.title = `${state.name} - hypernode`;
  }

  function render(state) {
    applyViewport(state.viewport);
    canvas.dataset.backgroundStyle = state.settings.backgroundStyle;
    renderNodes(state);
    renderEdges(state);
    renderDraftEdge(state);
    renderImportStatus(state);
    renderGraphMetadata(state);
    canvas.classList.toggle("is-panning", Boolean(state.ui.isPanning));
    canvas.classList.toggle("is-dragging", Boolean(state.ui.isDragging));
    canvas.classList.toggle("is-resizing", Boolean(state.ui.isResizing));
    canvas.classList.toggle("is-connecting", Boolean(state.ui.isConnecting));
    workspace.classList.toggle("is-dragging", Boolean(state.ui.isDragging));
    workspace.classList.toggle("is-resizing", Boolean(state.ui.isResizing));
    workspace.classList.toggle("is-connecting", Boolean(state.ui.isConnecting));
    workspace.classList.toggle("is-marquee-selecting", Boolean(state.ui.isMarqueeSelecting));

    if (selectionMarquee instanceof HTMLElement) {
      const marquee = state.ui.selectionMarquee;
      const visible = Boolean(state.ui.isMarqueeSelecting && marquee);
      selectionMarquee.hidden = !visible;
      if (visible) {
        selectionMarquee.style.left = `${marquee.left}px`;
        selectionMarquee.style.top = `${marquee.top}px`;
        selectionMarquee.style.width = `${marquee.width}px`;
        selectionMarquee.style.height = `${marquee.height}px`;
      }
    }
  }

  return { render };
}

function positiveModulo(value, divisor) {
  if (!Number.isFinite(value) || !Number.isFinite(divisor) || divisor <= 0) {
    return 0;
  }
  return ((value % divisor) + divisor) % divisor;
}

function mapZoomOpacity(zoom, minOpacity, midOpacity, maxOpacity) {
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

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function measureNodeSizes() {
  const sizes = new Map();
  document.querySelectorAll("[data-node-id]").forEach((nodeEl) => {
    const nodeId = nodeEl.dataset.nodeId;
    sizes.set(nodeId, {
      width: nodeEl.offsetWidth || NODE_DEFAULTS.width,
      height: nodeEl.offsetHeight || NODE_DEFAULTS.height,
    });
  });
  return sizes;
}

function defaultNodeSize() {
  return { width: NODE_DEFAULTS.width, height: NODE_DEFAULTS.height };
}

function buildNodeInlineSizeStyle(node) {
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
    if (!isImageNode(node)) {
      style += `--node-description-lines: ${computeDescriptionLineClamp(height)};`;
    }
  }
  return style;
}

function hasExplicitNodeSize(node) {
  const width = Number(node.width);
  const height = Number(node.height);
  return (Number.isFinite(width) && width > 0) || (Number.isFinite(height) && height > 0);
}

function computeDescriptionLineClamp(height) {
  const availableHeight = Math.max(0, height - 58);
  const lineHeightPx = 19;
  return Math.max(1, Math.floor(availableHeight / lineHeightPx));
}

function getNodeCenter(node, size) {
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height / 2,
  };
}

function getAnchorPoint(node, size, anchor) {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  switch (anchor) {
    case "top":
      return { x: node.x + halfWidth, y: node.y };
    case "right":
      return { x: node.x + size.width, y: node.y + halfHeight };
    case "bottom":
      return { x: node.x + halfWidth, y: node.y + size.height };
    case "left":
    default:
      return { x: node.x, y: node.y + halfHeight };
  }
}

function resolveAutoAnchor(fromNode, toNode) {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function resolveEdgeAnchor(preferredAnchor, fromNode, toNode, useExactAnchors) {
  if (useExactAnchors && isAnchorName(preferredAnchor)) {
    return preferredAnchor;
  }
  return resolveAutoAnchor(fromNode, toNode);
}

function resolveAnchorToPoint(node, size, targetPoint) {
  const center = getNodeCenter(node, size);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function buildTautPath(start, end, fromAnchor, toAnchor) {
  const controls = getTautControls(start, end, fromAnchor, toAnchor);
  return `M ${start.x} ${start.y} C ${controls.start.x} ${controls.start.y}, ${controls.end.x} ${controls.end.y}, ${end.x} ${end.y}`;
}

function getTautControls(start, end, fromAnchor, toAnchor) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const strength = Math.max(32, distance * 0.32);
  const startControl = moveByAnchor(start, fromAnchor, strength);
  const endControl = moveByAnchor(end, toAnchor, strength);
  return { start: startControl, end: endControl };
}

function buildLoosePath(start, end, fromAnchor, toAnchor) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const ropeSlack = clamp(distance * 0.2, 14, 80);
  const startStrength = Math.max(18, distance * 0.18);
  const endStrength = Math.max(18, distance * 0.12);
  const startControl = moveByAnchor(start, fromAnchor, startStrength);
  const fallbackToAnchor = toAnchor || inferIncomingAnchor(start, end);
  const endControl = moveByAnchor(end, fallbackToAnchor, endStrength);
  return `M ${start.x} ${start.y} C ${startControl.x} ${startControl.y + ropeSlack}, ${endControl.x} ${endControl.y + ropeSlack}, ${end.x} ${end.y}`;
}

function inferIncomingAnchor(start, end) {
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function moveByAnchor(point, anchor, distance) {
  switch (anchor) {
    case "top":
      return { x: point.x, y: point.y - distance };
    case "right":
      return { x: point.x + distance, y: point.y };
    case "bottom":
      return { x: point.x, y: point.y + distance };
    case "left":
      return { x: point.x - distance, y: point.y };
    default:
      return { x: point.x, y: point.y };
  }
}

function isAnchorName(anchor) {
  return anchor === "top" || anchor === "right" || anchor === "bottom" || anchor === "left";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cubicPointAt(p0, p1, p2, p3, t) {
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

function buildArrowheadPath(start, controlStart, controlEnd, end, toAnchor, sizeScale = 1) {
  // Use near-end curve approach for natural rotation on curved edges.
  const tangentT = 0.96;
  const approach = cubicPointAt(start, controlStart, controlEnd, end, tangentT);
  const tangent = cubicDerivativeAt(start, controlStart, controlEnd, end, tangentT);
  let vx = tangent.x;
  let vy = tangent.y;
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

function cubicDerivativeAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = 3 * mt * mt;
  const b = 6 * mt * t;
  const c = 3 * t * t;
  return {
    x: (a * (p1.x - p0.x)) + (b * (p2.x - p1.x)) + (c * (p3.x - p2.x)),
    y: (a * (p1.y - p0.y)) + (b * (p2.y - p1.y)) + (c * (p3.y - p2.y)),
  };
}

function getArrowheadSizeScale(step) {
  const safeStep = clamp(Math.round(Number(step) || 0), 0, 9);
  return 1 + (safeStep * 0.2);
}

function unitVectorByAnchor(anchor) {
  switch (anchor) {
    case "top":
      return { x: 0, y: -1 };
    case "right":
      return { x: 1, y: 0 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}

function escapeHTML(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}

function escapeCssUrl(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function isImageNode(node) {
  return node?.kind === 'image' && typeof node?.imageData === 'string' && Number(node?.imageAspectRatio) > 0;
}

function getSelectedNodeIds(selection) {
  if (!selection) return [];
  if (selection.type === 'node') return [selection.id];
  if (selection.type === 'nodes') {
    return Array.isArray(selection.ids) ? selection.ids : [];
  }
  return [];
}

function getSingleSelectedNodeId(selection) {
  if (!selection) return null;
  if (selection.type === 'node') return selection.id;
  if (selection.type === 'nodes' && selection.ids?.length === 1) {
    return selection.ids[0];
  }
  return null;
}
