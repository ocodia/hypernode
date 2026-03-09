import { resolveAutoAnchor } from '../../shared/anchors.js';
import {
  buildArrowheadPath,
  buildTautPath,
  cubicPointAt,
  defaultEntitySize,
  findEntityById,
  getAnchorPoint,
  getArrowheadSizeScale,
  getTautControls,
  inferIncomingAnchor,
  measureEntitySizes,
  resolveAnchorToPoint,
  resolveEdgeAnchor,
} from '../helpers.js';

export function renderEdges(elements, state) {
  const { edgeOverlayGroup, edgesGroup } = elements;
  const byId = new Map([
    ...state.nodes.map((node) => [node.id, node]),
    ...state.frames.map((frame) => [frame.id, frame]),
  ]);
  const bySize = measureEntitySizes(state);
  const useExactAnchors = state.settings.anchorsMode === 'exact';
  const showArrowheads = state.settings.arrowheads === 'shown';
  const arrowheadScale = getArrowheadSizeScale(state.settings.arrowheadSizeStep);
  const selectedEdgeId = state.selection?.type === 'edge' ? state.selection.id : null;
  const twangEdgeId = state.ui.edgeTwangId;
  const edgeEndpointRadius = Math.max(5.5, 8 / Math.max(0.01, Number(state.viewport?.zoom) || 1));
  let selectedOverlayMarkup = '';

  edgesGroup.innerHTML = state.edges
    .map((edge) => {
      const fromEntity = byId.get(edge.from);
      const toEntity = byId.get(edge.to);
      if (!fromEntity || !toEntity) {
        return '';
      }

      const fromSize = bySize.get(fromEntity.id) || defaultEntitySize(fromEntity);
      const toSize = bySize.get(toEntity.id) || defaultEntitySize(toEntity);
      const fromAnchor = resolveEdgeAnchor(edge.fromAnchor, fromEntity, toEntity, useExactAnchors);
      const toAnchor = resolveEdgeAnchor(edge.toAnchor, toEntity, fromEntity, useExactAnchors);
      const start = getAnchorPoint(fromEntity, fromSize, fromAnchor);
      const end = getAnchorPoint(toEntity, toSize, toAnchor);
      const controls = getTautControls(start, end, fromAnchor, toAnchor);
      const d = buildTautPath(start, end, fromAnchor, toAnchor);
      const midpoint = cubicPointAt(start, controls.start, controls.end, end, 0.5);
      const selected = selectedEdgeId === edge.id ? 'is-selected' : '';
      const twang = twangEdgeId === edge.id ? 'is-twang' : '';
      const arrowMarkup = showArrowheads
        ? `<path class="edge__arrowhead" d="${buildArrowheadPath(start, controls.start, controls.end, end, toAnchor, arrowheadScale)}"></path>`
        : '';
      if (selectedEdgeId === edge.id) {
        selectedOverlayMarkup = `
          <g class="edge-overlay" data-edge-id="${edge.id}">
            <g class="edge__delete" data-edge-delete="${edge.id}" transform="translate(${midpoint.x}, ${midpoint.y})" aria-label="Delete edge">
              <circle r="9"></circle>
              <path class="edge__delete-icon" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" transform="translate(-8, -8)"></path>
            </g>
            <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:from" cx="${start.x}" cy="${start.y}" r="${edgeEndpointRadius}"></circle>
            <circle class="edge__endpoint" data-edge-endpoint="${edge.id}:to" cx="${end.x}" cy="${end.y}" r="${edgeEndpointRadius}"></circle>
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
    .join('');
  edgeOverlayGroup.innerHTML = selectedOverlayMarkup;
}

export function renderDraftEdge(edgeDraftGroup, state) {
  const draft = state.ui.edgeDraft;
  if (!draft) {
    edgeDraftGroup.innerHTML = '';
    return;
  }

  const bySize = measureEntitySizes(state);
  const sourceEntity = findEntityById(state, draft.fromNodeId);
  if (!sourceEntity) {
    edgeDraftGroup.innerHTML = '';
    return;
  }

  const sourceSize = bySize.get(sourceEntity.id) || defaultEntitySize(sourceEntity);
  let end = { x: draft.pointerX, y: draft.pointerY };
  let fromAnchor = draft.fromAnchor || resolveAnchorToPoint(sourceEntity, sourceSize, end);
  let toAnchor = null;

  const targetNodeId = draft.hoverNodeId || draft.toNodeId;
  const targetAnchor = draft.hoverAnchor || draft.toAnchor;
  if (targetNodeId && targetAnchor) {
    const targetEntity = findEntityById(state, targetNodeId);
    if (targetEntity) {
      const targetSize = bySize.get(targetEntity.id) || defaultEntitySize(targetEntity);
      fromAnchor = draft.fromAnchor || resolveAutoAnchor(sourceEntity, targetEntity);
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
