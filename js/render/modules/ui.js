import {
  buildFrameOverlayControls,
  buildNodeOverlayControls,
  defaultEntitySize,
  getSingleSelectedNodeId,
  measureEntitySizes,
} from '../helpers.js';
import { buildNodeContentMarkup, buildNodeToolbarMarkup } from './nodes.js';

export function renderSelectionControls(selectionControlsLayer, state) {
  if (!(selectionControlsLayer instanceof HTMLElement)) {
    return;
  }

  const selectedNodeId = getSingleSelectedNodeId(state.selection);
  const selectedFrameId = state.selection?.type === 'frame' ? state.selection.id : null;
  const editingNodeId = state.ui.editingNodeId;
  const focusedNodeId = state.ui.focusedNodeId;
  const editingFrameId = state.ui.editingFrameId;
  const draft = state.ui.edgeDraft;
  const bySize = measureEntitySizes(state);
  const viewportZoom = Math.max(0.01, Number(state.viewport?.zoom) || 1);
  const nodeAnchorSize = Math.max(10, 14 / viewportZoom);
  const nodeResizeSize = Math.max(14, 18 / viewportZoom);
  const frameAnchorSize = Math.max(10, 14 / viewportZoom);
  const frameResizeSize = Math.max(14, 18 / viewportZoom);
  const controlBorderWidth = Math.min(2, Math.max(1.5, 1.5 / viewportZoom));
  const node = selectedNodeId ? state.nodes.find((item) => item.id === selectedNodeId) : null;
  const frame = selectedFrameId ? state.frames.find((item) => item.id === selectedFrameId) : null;
  const showShortcuts = state.settings?.showShortcutsUi !== false;

  let markup = '';

  if (frame) {
    const frameSize = bySize.get(frame.id) || defaultEntitySize(frame);
    const connectClass =
      draft?.fromNodeId === frame.id
        ? 'is-connect-source'
        : draft
          ? draft.hoverNodeId === frame.id
            ? 'is-connect-target'
            : 'is-connect-candidate'
          : '';
    const colorAttr = typeof frame.colorKey === 'string' ? ` data-frame-color="${frame.colorKey}"` : '';
    markup += `
      <div
        class="selection-controls__group selection-controls__group--frame ${connectClass}"
        data-frame-id="${frame.id}"
        ${colorAttr}
        style="transform: translate(${frame.x}px, ${frame.y}px); width: ${frameSize.width}px; height: ${frameSize.height}px; --selection-anchor-size: ${frameAnchorSize}px; --selection-resize-size: ${frameResizeSize}px; --selection-control-border-width: ${controlBorderWidth}px;"
      >
        <div class="frame__toolbar selection-controls__toolbar selection-controls__toolbar--frame">
          <button class="frame__tool-btn" type="button" data-frame-edit-open="${frame.id}" data-frame-id="${frame.id}" aria-label="Edit frame" title="Edit Frame">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="frame__tool-btn node__tool-btn--danger" type="button" data-frame-delete="${frame.id}" data-frame-id="${frame.id}" aria-label="Delete frame" title="Delete Frame">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        ${buildFrameOverlayControls(frame.id, { includeResize: editingFrameId !== frame.id })}
      </div>
    `;
  }

  if (node && !focusedNodeId) {
    const nodeSize = bySize.get(node.id) || defaultEntitySize(node);
    const connectClass =
      draft?.fromNodeId === node.id
        ? 'is-connect-source'
        : draft
          ? draft.hoverNodeId === node.id
            ? 'is-connect-target'
            : 'is-connect-candidate'
          : '';
    const colorAttr = typeof node.colorKey === 'string' ? ` data-node-color="${node.colorKey}"` : '';
    markup += `
      <div
        class="selection-controls__group selection-controls__group--node ${connectClass}"
        data-node-id="${node.id}"
        ${colorAttr}
        style="transform: translate(${node.x}px, ${node.y}px); width: ${nodeSize.width}px; height: ${nodeSize.height}px; --selection-anchor-size: ${nodeAnchorSize}px; --selection-resize-size: ${nodeResizeSize}px; --selection-control-border-width: ${controlBorderWidth}px;"
      >
        ${editingNodeId === node.id ? '' : `
          ${buildNodeToolbarMarkup(node.id, {
            toolbarClass: 'node__toolbar selection-controls__toolbar selection-controls__toolbar--node',
            showShortcuts,
          })}
          ${buildNodeOverlayControls(node.id)}
        `}
      </div>
    `;
  }

  selectionControlsLayer.innerHTML = markup;
}

export function renderFocusOverlay(focusLayer, state) {
  if (!focusLayer || typeof focusLayer.innerHTML !== 'string') {
    return;
  }

  const focusedNodeId = state.ui.focusedNodeId;
  const node = focusedNodeId ? state.nodes.find((item) => item.id === focusedNodeId) : null;
  if (!node) {
    focusLayer.hidden = true;
    focusLayer.innerHTML = '';
    focusLayer.classList?.remove('is-file-drop-active');
    if (focusLayer.dataset) {
      delete focusLayer.dataset.focusedNodeId;
    }
    return;
  }

  const colorAttr = typeof node.colorKey === 'string' ? ` data-node-color="${node.colorKey}"` : '';
  focusLayer.hidden = false;
  focusLayer.classList?.remove('is-file-drop-active');
  focusLayer.innerHTML = `
    <div class="focus-overlay__backdrop" aria-hidden="true"></div>
    <div class="focus-overlay__content">
      ${buildNodeToolbarMarkup(node.id, {
        toolbarClass: 'node__toolbar node__toolbar--focus',
        focusActive: true,
        editingActive: state.ui.editingNodeId === node.id,
        showShortcuts: state.settings?.showShortcutsUi !== false,
      })}
      <article class="focus-overlay__panel node ${node.kind === 'image' ? 'node--image' : ''}${state.ui.editingNodeId === node.id ? ' is-editing' : ''}" data-node-id="${node.id}"${colorAttr}>
        ${buildNodeContentMarkup(node, { isEditing: state.ui.editingNodeId === node.id, isFocused: true })}
      </article>
    </div>
  `;
  if (focusLayer.dataset) {
    focusLayer.dataset.focusedNodeId = node.id;
  }
}

export function renderImportStatus(importStatus, state) {
  const message = String(state.ui.importStatus || '').trim();
  importStatus.textContent = message;
  importStatus.hidden = !message;
  importStatus.classList.toggle('is-visible', Boolean(message));
}

export function renderHypernodeMetadata(graphTitle, viewportCoordinates, canvas, state) {
  if (graphTitle && 'textContent' in graphTitle) {
    graphTitle.textContent = state.name;
  }
  if (viewportCoordinates && 'textContent' in viewportCoordinates && canvas && typeof canvas.getBoundingClientRect === 'function') {
    const rect = canvas.getBoundingClientRect();
    const centerX = Math.round(((rect.width / 2) - state.viewport.panX) / state.viewport.zoom);
    const centerY = Math.round(((rect.height / 2) - state.viewport.panY) / state.viewport.zoom);
    viewportCoordinates.textContent = `x: ${centerX}  y: ${centerY}`;
  }
  document.title = `${state.name} - hypernode`;
}
