import { resolveAutoAnchor } from "../../shared/anchors.js";
import {
  buildArrowheadFromDirection,
  buildArrowheadPath,
  buildOrthogonalPath,
  buildStraightPath,
  buildTautPath,
  buildToolbarColorPopoverMarkup,
  buildToolbarBorderWidthPopoverMarkup,
  buildToolbarBorderStylePopoverMarkup,
  buildToolbarEdgeTypePopoverMarkup,
  cubicPointAt,
  defaultEntitySize,
  escapeAttr,
  findEntityById,
  getAnchorPoint,
  getArrowheadSizeScale,
  getTautControls,
  inferIncomingAnchor,
  measureEntitySizes,
  orthogonalMidpoint,
  resolveAnchorToPoint,
  resolveEdgeAnchor,
  straightLineMidpoint,
} from "../helpers.js";
import { unitVectorByAnchor } from "../../shared/anchors.js";

export function renderEdges(elements, state) {
  const { edgeOverlayGroup, edgesGroup } = elements;
  const byId = new Map([
    ...state.nodes.map((node) => [node.id, node]),
    ...state.frames.map((frame) => [frame.id, frame]),
  ]);
  const bySize = measureEntitySizes(state);
  const useExactAnchors = state.settings.anchorsMode === "exact";
  const showArrowheads = state.settings.arrowheads === "shown";
  const globalArrowheadScale = getArrowheadSizeScale(
    state.settings.arrowheadSizeStep,
  );
  const selectedEdgeId =
    state.selection?.type === "edge" ? state.selection.id : null;
  const selectedEdgeIds =
    state.selection?.type === "edges" ? new Set(state.selection.ids) : null;
  const twangEdgeId = state.ui.edgeTwangId;
  const edgeEndpointRadius = Math.max(
    5.5,
    8 / Math.max(0.01, Number(state.viewport?.zoom) || 1),
  );
  let selectedOverlayMarkup = "";

  edgesGroup.innerHTML = state.edges
    .map((edge) => {
      const fromEntity = byId.get(edge.from);
      const toEntity = byId.get(edge.to);
      if (!fromEntity || !toEntity) {
        return "";
      }

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
      const strokeWidth = edge.strokeWidth ?? 2;
      const strokeStyle = edge.strokeStyle || "solid";
      const colorKey = edge.colorKey || null;
      const arrowheadScale = globalArrowheadScale * (strokeWidth / 2);

      let d;
      let midpoint;
      let arrowMarkup = "";

      if (edgeType === "straight") {
        d = buildStraightPath(start, end);
        midpoint = straightLineMidpoint(start, end);
        if (showArrowheads) {
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const mag = Math.hypot(dx, dy);
          const ux = mag > 0.0001 ? dx / mag : unitVectorByAnchor(toAnchor).x;
          const uy = mag > 0.0001 ? dy / mag : unitVectorByAnchor(toAnchor).y;
          arrowMarkup = `<path class="edge__arrowhead" d="${buildArrowheadFromDirection(end, ux, uy, arrowheadScale)}"></path>`;
        }
      } else if (edgeType === "orthogonal") {
        d = buildOrthogonalPath(start, end, fromAnchor, toAnchor);
        midpoint = orthogonalMidpoint(start, end, fromAnchor, toAnchor);
        if (showArrowheads) {
          // The path arrives at `end` coming FROM the toAnchor's outward direction,
          // so negate it to get the direction of travel toward end.
          const uv = unitVectorByAnchor(toAnchor);
          arrowMarkup = `<path class="edge__arrowhead" d="${buildArrowheadFromDirection(end, -uv.x, -uv.y, arrowheadScale)}"></path>`;
        }
      } else {
        const controls = getTautControls(start, end, fromAnchor, toAnchor);
        d = buildTautPath(start, end, fromAnchor, toAnchor);
        midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
        if (showArrowheads) {
          arrowMarkup = `<path class="edge__arrowhead" d="${buildArrowheadPath(start, controls.start, controls.end, end, toAnchor, arrowheadScale)}"></path>`;
        }
      }

      const isSelected = selectedEdgeId === edge.id || (selectedEdgeIds && selectedEdgeIds.has(edge.id));
      const selected = isSelected ? "is-selected" : "";
      const twang = twangEdgeId === edge.id ? "is-twang" : "";
      const colorAttr = colorKey
        ? ` data-edge-color="${escapeAttr(colorKey)}"`
        : "";
      const swAttr = strokeWidth !== 2 ? `--edge-sw:${strokeWidth};` : "";
      const daAttr =
        strokeStyle === "dashed"
          ? `--edge-da:${strokeWidth * 4} ${strokeWidth * 3};`
          : strokeStyle === "dotted"
            ? `--edge-da:${strokeWidth} ${strokeWidth * 2.5};`
            : "";
      const styleAttr = swAttr || daAttr ? ` style="${swAttr}${daAttr}"` : "";

      if (selectedEdgeId === edge.id) {
        selectedOverlayMarkup = `
          <g class="edge-overlay" data-edge-id="${edge.id}">
            <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:from" cx="${start.x}" cy="${start.y}" r="${edgeEndpointRadius}"></circle>
            <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:to" cx="${end.x}" cy="${end.y}" r="${edgeEndpointRadius}"></circle>
          </g>
        `;
      }

      return `
        <g class="edge ${selected} ${twang}"${colorAttr} data-edge-id="${edge.id}"${styleAttr}>
          <path class="edge__hit" d="${d}"></path>
          <path class="edge__line" d="${d}"></path>
          ${arrowMarkup}
        </g>
      `;
    })
    .join("");
  edgeOverlayGroup.innerHTML = selectedOverlayMarkup;
}

export function buildEdgeToolbarMarkup(edgeId, options = {}) {
  const colorKey = typeof options.colorKey === "string" ? options.colorKey : "";
  const strokeWidth = Number.isFinite(Number(options.strokeWidth))
    ? Math.round(Number(options.strokeWidth))
    : 2;
  const strokeStyle =
    typeof options.strokeStyle === "string" ? options.strokeStyle : "solid";
  const edgeType =
    typeof options.edgeType === "string" ? options.edgeType : "curved";
  const toolbarPlacement =
    options.toolbarPlacement === "bottom" ? "bottom" : "top";

  return `
    <div class="edge__toolbar selection-controls__toolbar selection-controls__toolbar--edge entity-toolbar" data-toolbar-entity="edge" data-toolbar-target-ids="${escapeAttr(edgeId)}" data-toolbar-placement="${toolbarPlacement}">
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn${colorKey ? " entity-toolbar__trigger--has-swatch" : ""}" type="button" data-toolbar-popover-toggle="color" aria-label="Edge colour" title="Edge colour" aria-expanded="false"${colorKey ? ` data-toolbar-color-current="${escapeAttr(colorKey)}"` : ""}>
          <i class="bi bi-palette"></i>
        </button>
        ${buildToolbarColorPopoverMarkup("Colour")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-width" aria-label="Line thickness" title="Line thickness" aria-expanded="false">
          <i class="bi bi-distribute-vertical"></i>
        </button>
        ${buildToolbarBorderWidthPopoverMarkup(strokeWidth, "Line Thickness")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-style" aria-label="Line style" title="Line style" aria-expanded="false">
          <i class="bi bi-border-style"></i>
        </button>
        ${buildToolbarBorderStylePopoverMarkup(strokeStyle, "Line Style")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="edge-type" aria-label="Edge type" title="Edge type" aria-expanded="false">
          <i class="bi bi-bezier2"></i>
        </button>
        ${buildToolbarEdgeTypePopoverMarkup(edgeType)}
      </div>
      <button class="node__tool-btn entity-toolbar__btn node__tool-btn--danger" type="button" data-edge-delete="${escapeAttr(edgeId)}" aria-label="Delete edge" title="Delete Edge">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
}

export function buildMultiEdgeToolbarMarkup(edgeIds, options = {}) {
  const colorKey = typeof options.colorKey === "string" ? options.colorKey : "";
  const strokeWidth = Number.isFinite(Number(options.strokeWidth))
    ? Math.round(Number(options.strokeWidth))
    : 2;
  const strokeStyle =
    typeof options.strokeStyle === "string" ? options.strokeStyle : "solid";
  const edgeType =
    typeof options.edgeType === "string" ? options.edgeType : "curved";
  const toolbarPlacement =
    options.toolbarPlacement === "bottom" ? "bottom" : "top";
  const count = Array.isArray(edgeIds) ? edgeIds.length : 0;
  const idsAttr = Array.isArray(edgeIds) ? edgeIds.join(",") : "";

  return `
    <div class="edge__toolbar selection-controls__toolbar selection-controls__toolbar--edges entity-toolbar" data-toolbar-entity="edges" data-toolbar-target-ids="${escapeAttr(idsAttr)}" data-toolbar-placement="${toolbarPlacement}">
      <div class="entity-toolbar__selection-count" aria-label="${count} edges selected">${count} selected</div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn${colorKey ? " entity-toolbar__trigger--has-swatch" : ""}" type="button" data-toolbar-popover-toggle="color" aria-label="Edge colour" title="Edge colour" aria-expanded="false"${colorKey ? ` data-toolbar-color-current="${escapeAttr(colorKey)}"` : ""}>
          <i class="bi bi-palette"></i>
        </button>
        ${buildToolbarColorPopoverMarkup("Colour")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-width" aria-label="Line thickness" title="Line thickness" aria-expanded="false">
          <i class="bi bi-distribute-vertical"></i>
        </button>
        ${buildToolbarBorderWidthPopoverMarkup(strokeWidth, "Line Thickness")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-style" aria-label="Line style" title="Line style" aria-expanded="false">
          <i class="bi bi-border-style"></i>
        </button>
        ${buildToolbarBorderStylePopoverMarkup(strokeStyle, "Line Style")}
      </div>
      <div class="entity-toolbar__control">
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="edge-type" aria-label="Edge type" title="Edge type" aria-expanded="false">
          <i class="bi bi-bezier2"></i>
        </button>
        ${buildToolbarEdgeTypePopoverMarkup(edgeType)}
      </div>
      <button class="node__tool-btn entity-toolbar__btn node__tool-btn--danger" type="button" data-edges-delete="true" aria-label="Delete selected edges" title="Delete Selected Edges">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
}

export function renderDraftEdge(edgeDraftGroup, state) {
  const draft = state.ui.edgeDraft;
  if (!draft) {
    edgeDraftGroup.innerHTML = "";
    return;
  }

  const bySize = measureEntitySizes(state);
  const sourceEntity = findEntityById(state, draft.fromNodeId);
  if (!sourceEntity) {
    edgeDraftGroup.innerHTML = "";
    return;
  }

  const sourceSize =
    bySize.get(sourceEntity.id) || defaultEntitySize(sourceEntity);
  let end = { x: draft.pointerX, y: draft.pointerY };
  let fromAnchor =
    draft.fromAnchor || resolveAnchorToPoint(sourceEntity, sourceSize, end);
  let toAnchor = null;

  const targetNodeId = draft.hoverNodeId || draft.toNodeId;
  const targetAnchor = draft.hoverAnchor || draft.toAnchor;
  if (targetNodeId && targetAnchor) {
    const targetEntity = findEntityById(state, targetNodeId);
    if (targetEntity) {
      const targetSize =
        bySize.get(targetEntity.id) || defaultEntitySize(targetEntity);
      fromAnchor =
        draft.fromAnchor || resolveAutoAnchor(sourceEntity, targetEntity);
      end = getAnchorPoint(targetEntity, targetSize, targetAnchor);
      toAnchor = targetAnchor;
    }
  }

  const start = getAnchorPoint(sourceEntity, sourceSize, fromAnchor);
  const resolvedToAnchor = toAnchor || inferIncomingAnchor(start, end);
  const d = buildTautPath(start, end, fromAnchor, resolvedToAnchor);
  edgeDraftGroup.innerHTML = `
    <path class="is-draft" d="${d}"></path>
    <circle class="edge__draft-end" cx="${end.x}" cy="${end.y}" r="5.5"></circle>
  `;
}
