import { renderEdges, renderDraftEdge } from './modules/edges.js';
import { renderFrames } from './modules/frames.js';
import { renderNodes } from './modules/nodes.js';
import { renderFocusOverlay, renderHypernodeMetadata, renderImportStatus, renderSelectionControls } from './modules/ui.js';
import { THEME_META } from './theme-meta.js';
import { getThemePresetById } from '../shared/themes.js';
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
    toasts,
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
  let activeThemePreset = null;

  function applyThemePreset(themeId) {
    if (activeThemePreset === themeId) return;
    activeThemePreset = themeId;
    const theme = getThemePresetById(themeId);
    Object.entries(theme.tokens).forEach(([token, value]) => {
      document.documentElement.style.setProperty(`--${token}`, value);
    });
  }

  function render(state) {
    applyViewport(viewportElements, state.viewport);
    canvas.dataset.backgroundStyle = state.settings.backgroundStyle;
    applyThemePreset(state.settings.uiThemePreset);
    document.documentElement.dataset.uiTheme = state.settings.uiThemePreset;
    document.documentElement.dataset.uiRadius = state.settings.uiRadiusPreset;
    workspace.dataset.toolbarPosition = state.settings.toolbarPosition;
    workspace.dataset.toolbarOrientation = state.settings.toolbarOrientation;
    workspace.dataset.toastPosition = state.settings.toastPosition;
    workspace.dataset.metaPosition = state.settings.metaPosition;
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
    renderImportStatus(toasts, settingsStatus, state);
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
