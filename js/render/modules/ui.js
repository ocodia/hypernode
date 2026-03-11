import {
  buildFrameOverlayControls,
  buildNodeOverlayControls,
  cubicPointAt,
  defaultEntitySize,
  getAnchorPoint,
  getSelectedNodeIds,
  getSingleSelectedNodeId,
  getTautControls,
  measureEntitySizes,
  orthogonalMidpoint,
  resolveEdgeAnchor,
  straightLineMidpoint,
} from "../helpers.js";
import { buildFrameMetaMarkup, buildFrameToolbarMarkup } from "./frames.js";
import { buildNodeContentMarkup, buildNodeToolbarMarkup } from "./nodes.js";
import { buildEdgeToolbarMarkup, buildMultiEdgeToolbarMarkup } from "./edges.js";

export function renderSelectionControls(selectionControlsLayer, state) {
  if (!(selectionControlsLayer instanceof HTMLElement)) {
    return;
  }

  const selectedNodeId = getSingleSelectedNodeId(state.selection);
  const selectedFrameId =
    state.selection?.type === "frame" ? state.selection.id : null;
  const selectedEdgeId =
    state.selection?.type === "edge" ? state.selection.id : null;
  const editingNodeId = state.ui.editingNodeId;
  const focusedNodeId = state.ui.focusedNodeId;
  const editingFrameId = state.ui.editingFrameId;
  const draft = state.ui.edgeDraft;
  const bySize = measureEntitySizes(state);
  const viewportZoom = Math.max(0.01, Number(state.viewport?.zoom) || 1);
  const toolbarScale = 1 / viewportZoom;
  const nodeAnchorSize = Math.max(10, 14 / viewportZoom);
  const nodeResizeSize = Math.max(14, 18 / viewportZoom);
  const frameAnchorSize = Math.max(10, 14 / viewportZoom);
  const frameResizeSize = Math.max(14, 18 / viewportZoom);
  const controlBorderWidth = Math.min(2, Math.max(1.5, 1.5 / viewportZoom));
  const node = selectedNodeId
    ? state.nodes.find((item) => item.id === selectedNodeId)
    : null;
  const frame = selectedFrameId
    ? state.frames.find((item) => item.id === selectedFrameId)
    : null;
  const selectedEdge = selectedEdgeId
    ? state.edges.find((item) => item.id === selectedEdgeId)
    : null;
  const selectedNodeIds = getSelectedNodeIds(state.selection);
  let markup = "";

  if (selectedEdge && !focusedNodeId) {
    const byId = new Map([
      ...state.nodes.map((n) => [n.id, n]),
      ...state.frames.map((f) => [f.id, f]),
    ]);
    const fromEntity = byId.get(selectedEdge.from);
    const toEntity = byId.get(selectedEdge.to);
    if (fromEntity && toEntity) {
      const useExactAnchors = state.settings.anchorsMode === "exact";
      const fromSize =
        bySize.get(fromEntity.id) || defaultEntitySize(fromEntity);
      const toSize = bySize.get(toEntity.id) || defaultEntitySize(toEntity);
      const fromAnchor = resolveEdgeAnchor(
        selectedEdge.fromAnchor,
        fromEntity,
        toEntity,
        useExactAnchors,
      );
      const toAnchor = resolveEdgeAnchor(
        selectedEdge.toAnchor,
        toEntity,
        fromEntity,
        useExactAnchors,
      );
      const start = getAnchorPoint(fromEntity, fromSize, fromAnchor);
      const end = getAnchorPoint(toEntity, toSize, toAnchor);
      const edgeType = selectedEdge.edgeType || "curved";
      let midpoint;
      if (edgeType === "straight") {
        midpoint = straightLineMidpoint(start, end);
      } else if (edgeType === "orthogonal") {
        const fromRect = { x: fromEntity.x, y: fromEntity.y, width: fromSize.width, height: fromSize.height };
        const toRect = { x: toEntity.x, y: toEntity.y, width: toSize.width, height: toSize.height };
        midpoint = orthogonalMidpoint(start, end, fromAnchor, toAnchor, fromRect, toRect);
      } else {
        const controls = getTautControls(start, end, fromAnchor, toAnchor);
        midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
      }
      markup += `
        <div
          class="selection-controls__group selection-controls__group--edge"
          data-edge-id="${selectedEdge.id}"
          style="transform: translate(${midpoint.x}px, ${midpoint.y}px); --selection-toolbar-scale: ${toolbarScale};"
        >
          ${buildEdgeToolbarMarkup(selectedEdge.id, {
            colorKey: selectedEdge.colorKey || "",
            strokeWidth: selectedEdge.strokeWidth ?? 2,
            strokeStyle: selectedEdge.strokeStyle || "solid",
            edgeType: selectedEdge.edgeType || "curved",
          })}
        </div>
      `;
    }
  }

  const selectedEdgeIds =
    state.selection?.type === "edges" ? state.selection.ids : [];
  if (selectedEdgeIds.length > 1 && !focusedNodeId) {
    const byId = new Map([
      ...state.nodes.map((n) => [n.id, n]),
      ...state.frames.map((f) => [f.id, f]),
    ]);
    const useExactAnchors = state.settings.anchorsMode === "exact";
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let uniformColorKey = null;
    let uniformStrokeWidth = null;
    let uniformStrokeStyle = null;
    let uniformEdgeType = null;
    const selectedEdges = state.edges.filter((e) =>
      selectedEdgeIds.includes(e.id),
    );
    for (const edge of selectedEdges) {
      const fromEntity = byId.get(edge.from);
      const toEntity = byId.get(edge.to);
      if (!fromEntity || !toEntity) continue;
      const fromSize =
        bySize.get(fromEntity.id) || defaultEntitySize(fromEntity);
      const toSize = bySize.get(toEntity.id) || defaultEntitySize(toEntity);
      const fromAnchor = resolveEdgeAnchor(
        edge.fromAnchor,
        fromEntity,
        toEntity,
        useExactAnchors,
      );
      const toAnchor = resolveEdgeAnchor(
        edge.toAnchor,
        toEntity,
        fromEntity,
        useExactAnchors,
      );
      const start = getAnchorPoint(fromEntity, fromSize, fromAnchor);
      const end = getAnchorPoint(toEntity, toSize, toAnchor);
      const edgeType = edge.edgeType || "curved";
      let midpoint;
      if (edgeType === "straight") {
        midpoint = straightLineMidpoint(start, end);
      } else if (edgeType === "orthogonal") {
        const fromRect = { x: fromEntity.x, y: fromEntity.y, width: fromSize.width, height: fromSize.height };
        const toRect = { x: toEntity.x, y: toEntity.y, width: toSize.width, height: toSize.height };
        midpoint = orthogonalMidpoint(start, end, fromAnchor, toAnchor, fromRect, toRect);
      } else {
        const controls = getTautControls(start, end, fromAnchor, toAnchor);
        midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
      }
      sumX += midpoint.x;
      sumY += midpoint.y;
      count += 1;
      const ck = edge.colorKey || "";
      const sw = edge.strokeWidth ?? 2;
      const ss = edge.strokeStyle || "solid";
      const et = edge.edgeType || "curved";
      if (uniformColorKey === null) uniformColorKey = ck;
      else if (uniformColorKey !== ck) uniformColorKey = "";
      if (uniformStrokeWidth === null) uniformStrokeWidth = sw;
      else if (uniformStrokeWidth !== sw) uniformStrokeWidth = 2;
      if (uniformStrokeStyle === null) uniformStrokeStyle = ss;
      else if (uniformStrokeStyle !== ss) uniformStrokeStyle = "solid";
      if (uniformEdgeType === null) uniformEdgeType = et;
      else if (uniformEdgeType !== et) uniformEdgeType = "curved";
    }
    if (count > 0) {
      const avgX = sumX / count;
      const avgY = sumY / count;
      markup += `
        <div
          class="selection-controls__group selection-controls__group--edges"
          style="transform: translate(${avgX}px, ${avgY}px); --selection-toolbar-scale: ${toolbarScale};"
        >
          ${buildMultiEdgeToolbarMarkup(selectedEdgeIds, {
            colorKey: uniformColorKey || "",
            strokeWidth: uniformStrokeWidth ?? 2,
            strokeStyle: uniformStrokeStyle || "solid",
            edgeType: uniformEdgeType || "curved",
          })}
        </div>
      `;
    }
  }

  if (frame) {
    const frameSize = bySize.get(frame.id) || defaultEntitySize(frame);
    const connectClass =
      draft?.fromNodeId === frame.id
        ? "is-connect-source"
        : draft
          ? draft.hoverNodeId === frame.id
            ? "is-connect-target"
            : "is-connect-candidate"
          : "";
    const colorAttr =
      typeof frame.colorKey === "string"
        ? ` data-frame-color="${frame.colorKey}"`
        : "";
    markup += `
      <div
        class="selection-controls__group selection-controls__group--frame ${connectClass}"
        data-frame-id="${frame.id}"
        ${colorAttr}
        style="transform: translate(${frame.x}px, ${frame.y}px); width: ${frameSize.width}px; height: ${frameSize.height}px; --selection-anchor-size: ${frameAnchorSize}px; --selection-resize-size: ${frameResizeSize}px; --selection-control-border-width: ${controlBorderWidth}px; --selection-toolbar-scale: ${toolbarScale};"
      >
        ${buildFrameToolbarMarkup(frame.id, {
          toolbarClass:
            "frame__toolbar selection-controls__toolbar selection-controls__toolbar--frame",
          colorKey: frame.colorKey || "",
          borderWidth: frame.borderWidth || 1,
          borderStyle: frame.borderStyle || "solid",
          editingActive: editingFrameId === frame.id,
        })}
        ${editingFrameId === frame.id ? `
          <div class="frame__meta selection-controls__frame-meta">
            ${buildFrameMetaMarkup(frame, { editingActive: true })}
          </div>
        ` : ""}
        ${buildFrameOverlayControls(frame.id, { includeResize: editingFrameId !== frame.id })}
      </div>
    `;
  }

  if (!node && selectedNodeIds.length > 1 && !focusedNodeId) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const selectedNodes = state.nodes.filter((item) =>
      selectedNodeIds.includes(item.id),
    );
    let uniformColorKey = selectedNodes[0]?.colorKey || "";
    let uniformBorderWidth = selectedNodes[0]?.borderWidth || 1;
    let uniformBorderStyle = selectedNodes[0]?.borderStyle || "solid";
    for (const selectedNode of selectedNodes) {
      const size =
        bySize.get(selectedNode.id) || defaultEntitySize(selectedNode);
      minX = Math.min(minX, selectedNode.x);
      minY = Math.min(minY, selectedNode.y);
      maxX = Math.max(maxX, selectedNode.x + size.width);
      maxY = Math.max(maxY, selectedNode.y + size.height);
      if ((selectedNode.colorKey || "") !== uniformColorKey)
        uniformColorKey = "";
      if ((selectedNode.borderWidth || 1) !== uniformBorderWidth)
        uniformBorderWidth = 1;
      if ((selectedNode.borderStyle || "solid") !== uniformBorderStyle)
        uniformBorderStyle = "solid";
    }
    const canvasRect = document
      .getElementById("canvas")
      ?.getBoundingClientRect?.();
    const visibleMinX = (0 - (state.viewport?.panX || 0)) / viewportZoom;
    const visibleMaxX =
      ((canvasRect?.width || 0) - (state.viewport?.panX || 0)) / viewportZoom;
    const approxHalfToolbarWidth = 96 / viewportZoom;
    const centerX = Math.max(
      visibleMinX + approxHalfToolbarWidth,
      Math.min((minX + maxX) / 2, visibleMaxX - approxHalfToolbarWidth),
    );
    markup += `
      <div
        class="selection-controls__group selection-controls__group--nodes"
        data-node-ids="${selectedNodeIds.join(",")}"
        style="transform: translate(${minX}px, ${minY}px); width: ${Math.max(0, maxX - minX)}px; height: ${Math.max(0, maxY - minY)}px; --selection-toolbar-scale: ${toolbarScale};"
      >
        ${buildNodeToolbarMarkup(selectedNodeIds[0], {
          toolbarClass:
            "node__toolbar selection-controls__toolbar selection-controls__toolbar--nodes",
          toolbarStyle: `left: ${centerX - minX}px;`,
          includeEdit: false,
          includeFocus: false,
          includeDelete: true,
          targetEntity: "nodes",
          targetIds: selectedNodeIds,
          colorKey: uniformColorKey,
          borderWidth: uniformBorderWidth,
          borderStyle: uniformBorderStyle,
          showShortcuts: true,
        })}
      </div>
    `;
  }

  if (node && !focusedNodeId) {
    const nodeSize = bySize.get(node.id) || defaultEntitySize(node);
    const connectClass =
      draft?.fromNodeId === node.id
        ? "is-connect-source"
        : draft
          ? draft.hoverNodeId === node.id
            ? "is-connect-target"
            : "is-connect-candidate"
          : "";
    const colorAttr =
      typeof node.colorKey === "string"
        ? ` data-node-color="${node.colorKey}"`
        : "";
    markup += `
      <div
        class="selection-controls__group selection-controls__group--node ${connectClass}"
        data-node-id="${node.id}"
        ${colorAttr}
        style="transform: translate(${node.x}px, ${node.y}px); width: ${nodeSize.width}px; height: ${nodeSize.height}px; --selection-anchor-size: ${nodeAnchorSize}px; --selection-resize-size: ${nodeResizeSize}px; --selection-control-border-width: ${controlBorderWidth}px; --selection-toolbar-scale: ${toolbarScale};"
      >
        ${buildNodeToolbarMarkup(node.id, {
          toolbarClass:
            "node__toolbar selection-controls__toolbar selection-controls__toolbar--node",
          toolbarStyle: "left: 50%;",
          toolbarPlacement: "top",
          editingActive: editingNodeId === node.id,
          showShortcuts: true,
          colorKey: node.colorKey || "",
          borderWidth: node.borderWidth || 1,
          borderStyle: node.borderStyle || "solid",
        })}
        ${buildNodeOverlayControls(node.id)}
      </div>
    `;
  }

  selectionControlsLayer.innerHTML = markup;
}

export function renderFocusOverlay(focusLayer, state) {
  if (!focusLayer || typeof focusLayer.innerHTML !== "string") {
    return;
  }

  const focusedNodeId = state.ui.focusedNodeId;
  const node = focusedNodeId
    ? state.nodes.find((item) => item.id === focusedNodeId)
    : null;
  if (!node) {
    focusLayer.hidden = true;
    focusLayer.innerHTML = "";
    focusLayer.classList?.remove("is-file-drop-active");
    if (focusLayer.dataset) {
      delete focusLayer.dataset.focusedNodeId;
    }
    return;
  }

  const colorAttr =
    typeof node.colorKey === "string"
      ? ` data-node-color="${node.colorKey}"`
      : "";
  const focusPanelStyle = `--node-border-width: ${node.borderWidth || 1}px; --node-border-style: ${escapeHtml(node.borderStyle || "solid")};`;
  const starterActive = state.ui.starterNodeId === node.id;
  focusLayer.hidden = false;
  focusLayer.innerHTML = `
    <div class="focus-overlay__backdrop" aria-hidden="true"></div>
    <div class="focus-overlay__content">
      ${buildNodeToolbarMarkup(node.id, {
        toolbarClass: "node__toolbar node__toolbar--focus",
        focusActive: true,
        editingActive: state.ui.editingNodeId === node.id,
        starterActive,
        includeEdit: !starterActive,
        includeFocus: false,
        includeDelete: !starterActive,
        includeStyleControls: !starterActive,
        colorKey: node.colorKey || "",
        borderWidth: node.borderWidth || 1,
        borderStyle: node.borderStyle || "solid",
        showShortcuts: true,
      })}
      <article class="focus-overlay__panel node ${node.kind === "image" ? "node--image" : ""}${state.ui.editingNodeId === node.id ? " is-editing" : ""}" data-node-id="${node.id}"${colorAttr} style="${focusPanelStyle}">
        ${buildNodeContentMarkup(node, {
          isEditing: state.ui.editingNodeId === node.id,
          isFocused: true,
          starterActive,
        })}
      </article>
    </div>
  `;
  if (focusLayer.dataset) {
    focusLayer.dataset.focusedNodeId = node.id;
  }
}

export function renderImportStatus(importStatus, secondaryImportStatus, state) {
  const message = state.ui.importStatus;
  const text =
    typeof message === "string"
      ? String(message || "").trim()
      : [message?.title, message?.description]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" ")
          .trim();
  const markup = buildToastMarkup(message, text);
  renderToastTarget(importStatus, markup, text);
  renderToastTarget(secondaryImportStatus, markup, text);
}

function buildToastMarkup(message, fallbackText) {
  if (message && typeof message === "object") {
    const title = escapeHtml(String(message.title || "").trim());
    const icon =
      String(message.icon || "").trim() ||
      inferToastIcon(title, String(message.description || "").trim());
    const description = escapeHtml(String(message.description || "").trim());
    return `
      <span class="toast__content">
        <span class="toast__icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
        <span class="toast__title">${title}</span>
        ${description ? `<span class="toast__description">${description}</span>` : ""}
      </span>
    `;
  }
  const icon = inferToastIcon(fallbackText, "");
  return `
    <span class="toast__content">
      <span class="toast__icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
      <span class="toast__title">${escapeHtml(fallbackText)}</span>
    </span>
  `;
}

function renderToastTarget(target, markup, text) {
  if (!(target instanceof HTMLElement)) return;
  if (target.__toastHideTimer) {
    window.clearTimeout(target.__toastHideTimer);
    target.__toastHideTimer = null;
  }
  if (text) {
    target.innerHTML = markup;
    target.hidden = false;
    target.classList.add("is-visible");
    return;
  }
  target.classList.remove("is-visible");
  target.__toastHideTimer = window.setTimeout(() => {
    target.hidden = true;
    target.innerHTML = "";
    target.__toastHideTimer = null;
  }, 120);
}

function inferToastIcon(title, description) {
  const haystack =
    `${String(title || "")} ${String(description || "")}`.toLowerCase();
  if (haystack.includes("theme")) return "bi-palette";
  if (
    haystack.includes("fail") ||
    haystack.includes("invalid") ||
    haystack.includes("unavailable") ||
    haystack.includes("error")
  ) {
    return "bi-exclamation-triangle";
  }
  if (
    haystack.includes("save") ||
    haystack.includes("open") ||
    haystack.includes("ready") ||
    haystack.includes("updated")
  ) {
    return "bi-check-circle";
  }
  return "bi-info-circle";
}

export function renderHypernodeMetadata(
  graphTitle,
  viewportCoordinates,
  canvas,
  state,
) {
  if (graphTitle && "textContent" in graphTitle) {
    graphTitle.textContent = state.name;
  }
  if (
    viewportCoordinates &&
    "textContent" in viewportCoordinates &&
    canvas &&
    typeof canvas.getBoundingClientRect === "function"
  ) {
    const rect = canvas.getBoundingClientRect();
    const centerX = Math.round(
      (rect.width / 2 - state.viewport.panX) / state.viewport.zoom,
    );
    const centerY = Math.round(
      (rect.height / 2 - state.viewport.panY) / state.viewport.zoom,
    );
    viewportCoordinates.textContent = `x: ${centerX}  y: ${centerY}`;
  }
  document.title = `hypernode: ${state.name}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
