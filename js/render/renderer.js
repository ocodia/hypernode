import { renderEdges, renderDraftEdge } from './modules/edges.js';
import { renderFrames } from './modules/frames.js';
import { renderNodes } from './modules/nodes.js';
import { renderFocusOverlay, renderGraphMetadata, renderImportStatus, renderSelectionControls } from './modules/ui.js';
import { applyViewport } from './modules/viewport.js';

export function createRenderer(elements, _store) {
  void _store;
  const {
    workspace,
    canvas,
    framesLayer,
    nodesLayer,
    edgesGroup,
    edgeDraftGroup,
    edgesLayer,
    edgesOverlayLayer,
    edgeOverlayGroup,
    selectionControlsLayer,
    focusLayer,
    importStatus,
    graphTitle,
    selectionMarquee,
  } = elements;

  const viewportElements = {
    canvas,
    edgesLayer,
    edgesOverlayLayer,
    framesLayer,
    nodesLayer,
    selectionControlsLayer,
  };
  const edgeElements = {
    edgeOverlayGroup,
    edgesGroup,
  };

  function render(state) {
    applyViewport(viewportElements, state.viewport);
    canvas.dataset.backgroundStyle = state.settings.backgroundStyle;
    renderFrames(framesLayer, state);
    renderNodes(nodesLayer, state);
    renderEdges(edgeElements, state);
    renderDraftEdge(edgeDraftGroup, state);
    renderSelectionControls(selectionControlsLayer, state);
    renderFocusOverlay(focusLayer, state);
    renderImportStatus(importStatus, state);
    renderGraphMetadata(graphTitle, state);
    canvas.classList.toggle('is-panning', Boolean(state.ui.isPanning));
    canvas.classList.toggle('is-dragging', Boolean(state.ui.isDragging));
    canvas.classList.toggle('is-resizing', Boolean(state.ui.isResizing));
    canvas.classList.toggle('is-connecting', Boolean(state.ui.isConnecting));
    canvas.classList.toggle('is-drawing-frame', Boolean(state.ui.isDrawingFrame));
    workspace.classList.toggle('is-dragging', Boolean(state.ui.isDragging));
    workspace.classList.toggle('is-resizing', Boolean(state.ui.isResizing));
    workspace.classList.toggle('is-connecting', Boolean(state.ui.isConnecting));
    workspace.classList.toggle('is-drawing-frame', Boolean(state.ui.isDrawingFrame));
    workspace.classList.toggle('is-marquee-selecting', Boolean(state.ui.isMarqueeSelecting));
    workspace.classList.toggle('is-focus-mode', Boolean(state.ui.focusedNodeId));

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
