import { renderEdges, renderDraftEdge } from './modules/edges.js';
import { renderFrames } from './modules/frames.js';
import { renderNodes } from './modules/nodes.js';
import { renderFocusOverlay, renderHypernodeMetadata, renderImportStatus, renderSelectionControls } from './modules/ui.js';
import { applyViewport } from './modules/viewport.js';

const THEME_META = {
  blueprint: { mode: 'dark', color: '#0f172a' },
  fjord: { mode: 'dark', color: '#0d1b24' },
  slate: { mode: 'light', color: '#e6e9ed' },
  paper: { mode: 'light', color: '#f4f7fb' },
  ember: { mode: 'light', color: '#f3eadf' },
  'soft-black': { mode: 'dark', color: '#121315' },
};

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
    settingsStatus,
    graphTitle,
    viewportCoordinates,
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
    document.documentElement.dataset.uiTheme = state.settings.uiThemePreset;
    document.documentElement.dataset.uiRadius = state.settings.uiRadiusPreset;
    workspace.dataset.toolbarPosition = state.settings.toolbarPosition;
    const themeMetaConfig = THEME_META[state.settings.uiThemePreset] ?? THEME_META.blueprint;
    document.documentElement.dataset.theme = themeMetaConfig.mode;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta instanceof HTMLMetaElement) {
      themeMeta.content = themeMetaConfig.color;
    }
    renderFrames(framesLayer, state);
    renderNodes(nodesLayer, state);
    renderEdges(edgeElements, state);
    renderDraftEdge(edgeDraftGroup, state);
    renderSelectionControls(selectionControlsLayer, state);
    renderFocusOverlay(focusLayer, state);
    renderImportStatus(importStatus, settingsStatus, state);
    renderHypernodeMetadata(graphTitle, viewportCoordinates, canvas, state);
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
