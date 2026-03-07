import { NODE_DEFAULTS } from "../utils/constants.js";

export function createRenderer(elements, store) {
  const { canvas, nodesLayer, edgesGroup, edgeDraftGroup, edgesLayer, edgesOverlayLayer, edgeOverlayGroup, importStatus } = elements;

  function applyViewport(viewport) {
    const transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
    nodesLayer.style.transform = transform;
    edgesLayer.style.transform = transform;
    edgesOverlayLayer.style.transform = transform;
  }

  function renderNodes(state) {
    const selectedNodeId = state.selection?.type === "node" ? state.selection.id : null;
    const editingNodeId = state.ui.editingNodeId;
    const draft = state.ui.edgeDraft;
    nodesLayer.innerHTML = state.nodes
      .map((node) => {
        const selectedClass = selectedNodeId === node.id ? "is-selected" : "";
        const editingClass = editingNodeId === node.id ? "is-editing" : "";
        const connectClass =
          draft?.fromNodeId === node.id
            ? "is-connect-source"
            : draft
              ? draft.hoverNodeId === node.id
                ? "is-connect-target"
                : "is-connect-candidate"
              : "";
        const content =
          editingNodeId === node.id
            ? `
            <div class="node__editor" data-node-editor="${node.id}">
              <label class="node__editor-label">
                Name
                <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" />
              </label>
              <label class="node__editor-label">
                Description
                <textarea class="node__editor-textarea" data-node-edit-description="${node.id}">${escapeHTML(node.description)}</textarea>
              </label>
              <div class="node__editor-actions">
                <button type="button" data-node-edit-save="${node.id}">Save</button>
                <button type="button" data-node-edit-cancel="${node.id}">Cancel</button>
                <button type="button" data-node-edit-delete="${node.id}"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          `
            : `
            <div class="node__head">
              <h3 class="node__title">${escapeHTML(node.title)}</h3>
              <button class="node__edit-btn" type="button" data-node-edit-open="${node.id}"><i class="bi bi-pencil-fill"></i></button>
            </div>
            ${node.description ? `<p class="node__description">${escapeHTML(node.description)}</p>` : ""}
          `;
        return `
          <article class="node ${selectedClass} ${editingClass} ${connectClass}" data-node-id="${node.id}" style="transform: translate(${node.x}px, ${node.y}px)">
            ${content}
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
        const fromAnchor = resolveAutoAnchor(fromNode, toNode);
        const toAnchor = resolveAutoAnchor(toNode, fromNode);
        const start = getAnchorPoint(fromNode, fromSize, fromAnchor);
        const end = getAnchorPoint(toNode, toSize, toAnchor);
        const controls = getTautControls(start, end, fromAnchor, toAnchor);
        const d = buildTautPath(start, end, fromAnchor, toAnchor);
        const midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
        const selected = selectedEdgeId === edge.id ? "is-selected" : "";
        const twang = twangEdgeId === edge.id ? "is-twang" : "";
        if (selectedEdgeId === edge.id) {
          selectedOverlayMarkup = `
            <g class="edge-overlay" data-edge-id="${edge.id}">
              <g class="edge__delete" data-edge-delete="${edge.id}" transform="translate(${midpoint.x}, ${midpoint.y})" aria-label="Delete edge">
                <circle r="9"></circle>
                <text text-anchor="middle" dominant-baseline="central">x</text>
              </g>
              <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:from" cx="${start.x}" cy="${start.y}" r="5.5"></circle>
              <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:to" cx="${end.x}" cy="${end.y}" r="5.5"></circle>
            </g>
          `;
        }

        return `
          <g class="edge ${selected} ${twang}" data-edge-id="${edge.id}">
            <path class="edge__line" d="${d}"></path>
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
    let fromAnchor = resolveAnchorToPoint(sourceNode, sourceSize, end);
    let toAnchor = null;

    const targetNodeId = draft.hoverNodeId || draft.toNodeId;
    const targetAnchor = draft.hoverAnchor || draft.toAnchor;
    if (targetNodeId && targetAnchor) {
      const targetNode = state.nodes.find((node) => node.id === targetNodeId);
      if (targetNode) {
        const targetSize = bySize.get(targetNode.id) || defaultNodeSize();
        fromAnchor = resolveAutoAnchor(sourceNode, targetNode);
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

  function render(state) {
    applyViewport(state.viewport);
    renderNodes(state);
    renderEdges(state);
    renderDraftEdge(state);
    renderImportStatus(state);
    canvas.classList.toggle("is-panning", Boolean(state.ui.isPanning));
  }

  return { render };
}

function measureNodeSizes() {
  const sizes = new Map();
  document.querySelectorAll("[data-node-id]").forEach((nodeEl) => {
    const nodeId = nodeEl.dataset.nodeId;
    sizes.set(nodeId, {
      width: nodeEl.offsetWidth || NODE_DEFAULTS.width,
      height: nodeEl.offsetHeight || 80,
    });
  });
  return sizes;
}

function defaultNodeSize() {
  return { width: NODE_DEFAULTS.width, height: 80 };
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

function escapeHTML(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}
