import {
  buildToolbarBorderStylePopoverMarkup,
  buildToolbarBorderWidthPopoverMarkup,
  buildToolbarColorPopoverMarkup,
  escapeAttr,
  escapeHTML,
} from '../helpers.js';
import { renderDescriptionMarkdown } from '../markdown.js';

export function buildFrameToolbarMarkup(frameId, options = {}) {
  const toolbarClass = options.toolbarClass || 'frame__toolbar';
  const colorKey = typeof options.colorKey === 'string' ? options.colorKey : '';
  const borderWidth = Number.isFinite(Number(options.borderWidth)) ? Math.round(Number(options.borderWidth)) : 1;
  const borderStyle = typeof options.borderStyle === 'string' ? options.borderStyle : 'solid';
  const editingActive = Boolean(options.editingActive);
  const editAttr = editingActive ? `data-frame-edit-confirm="${frameId}"` : `data-frame-edit-open="${frameId}"`;
  const editLabel = editingActive ? 'Confirm frame edit' : 'Edit frame';
  const editTitle = editingActive ? 'Confirm Frame' : 'Edit Frame';
  const editIcon = editingActive ? 'bi-check-lg' : 'bi-pencil-fill';
  const editClass = editingActive ? ' frame__tool-btn--confirm' : '';

  return `
    <div class="${toolbarClass}" data-toolbar-entity="frame" data-toolbar-target-ids="${escapeAttr(frameId)}">
      <button class="frame__tool-btn entity-toolbar__btn${editClass}" type="button" ${editAttr} aria-label="${editLabel}" title="${editTitle}">
        <i class="bi ${editIcon}"></i>
      </button>
      <div class="entity-toolbar__control">
        <button class="frame__tool-btn entity-toolbar__btn${colorKey ? ' entity-toolbar__trigger--has-swatch' : ''}" type="button" data-toolbar-popover-toggle="color" aria-label="Frame colors" title="Frame colors" aria-expanded="false"${colorKey ? ` data-toolbar-color-current="${escapeAttr(colorKey)}"` : ''}>
          <i class="bi bi-palette"></i>
        </button>
        ${buildToolbarColorPopoverMarkup('Colors')}
      </div>
      <div class="entity-toolbar__control">
        <button class="frame__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-width" aria-label="Border width" title="Border width" aria-expanded="false">
          <i class="bi bi-border-width"></i>
        </button>
        ${buildToolbarBorderWidthPopoverMarkup(borderWidth)}
      </div>
      <div class="entity-toolbar__control">
        <button class="frame__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-style" aria-label="Border style" title="Border style" aria-expanded="false">
          <i class="bi bi-border-style"></i>
        </button>
        ${buildToolbarBorderStylePopoverMarkup(borderStyle)}
      </div>
      <button class="frame__tool-btn entity-toolbar__btn node__tool-btn--danger" type="button" data-frame-delete="${frameId}" aria-label="Delete frame" title="Delete Frame">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
}

export function renderFrames(framesLayer, state) {
  const selectedFrameId = state.selection?.type === 'frame' ? state.selection.id : null;
  const editingFrameId = state.ui.editingFrameId;
  const draft = state.ui.edgeDraft;
  const frameDraft = state.ui.frameDraft;
  const membershipPreview = state.ui.frameMembershipPreview || {};

  const framesMarkup = state.frames
    .map((frame) => {
      const selectedClass = selectedFrameId === frame.id ? 'is-selected' : '';
      const overlayControlsClass = selectedFrameId === frame.id ? 'has-overlay-controls' : '';
      const editingClass = editingFrameId === frame.id ? 'is-editing' : '';
      const connectClass =
        draft?.fromNodeId === frame.id
          ? 'is-connect-source'
          : draft
            ? draft.hoverNodeId === frame.id
              ? 'is-connect-target'
              : 'is-connect-candidate'
            : '';
      const membershipPreviewClass = membershipPreview[frame.id] === 'add'
        ? 'is-membership-add-preview'
        : membershipPreview[frame.id] === 'remove'
          ? 'is-membership-remove-preview'
          : '';
      const frameColorAttr = typeof frame.colorKey === 'string' ? ` data-frame-color="${frame.colorKey}"` : '';
      const frameStyle = `transform: translate(${frame.x}px, ${frame.y}px); width: ${frame.width}px; height: ${frame.height}px; --frame-border-width: ${frame.borderWidth || 1}px; --frame-border-style: ${escapeAttr(frame.borderStyle || 'solid')};`;
      const meta = editingFrameId === frame.id
        ? `
          <div class="frame__editor" data-frame-editor="${frame.id}">
            <label class="frame__editor-label">
              Name
              <input class="frame__editor-input" data-frame-edit-title="${frame.id}" value="${escapeAttr(frame.title)}" maxlength="80" />
            </label>
            <label class="frame__editor-label">
              Description
              <textarea class="frame__editor-textarea" data-frame-edit-description="${frame.id}">${escapeHTML(frame.description)}</textarea>
            </label>
          </div>
        `
        : `
          <h3 class="frame__title">${escapeHTML(frame.title)}</h3>
          ${frame.description ? `<div class="frame__description">${renderDescriptionMarkdown(frame.description)}</div>` : ''}
        `;
      return `
        <article class="frame ${selectedClass} ${overlayControlsClass} ${editingClass} ${connectClass} ${membershipPreviewClass}" data-frame-id="${frame.id}"${frameColorAttr} style="${frameStyle}">
          <div class="frame__box"></div>
          ${buildFrameToolbarMarkup(frame.id, {
            colorKey: frame.colorKey || '',
            borderWidth: frame.borderWidth || 1,
            borderStyle: frame.borderStyle || 'solid',
            editingActive: editingFrameId === frame.id,
          })}
          <div class="frame__meta">
            ${meta}
          </div>
          <button class="frame__resize frame__resize--top-left" type="button" data-frame-resize="${frame.id}:top-left" aria-label="Resize frame from top left corner"></button>
          <button class="frame__resize frame__resize--top-right" type="button" data-frame-resize="${frame.id}:top-right" aria-label="Resize frame from top right corner"></button>
          <button class="frame__resize frame__resize--bottom-right" type="button" data-frame-resize="${frame.id}:bottom-right" aria-label="Resize frame from bottom right corner"></button>
          <button class="frame__resize frame__resize--bottom-left" type="button" data-frame-resize="${frame.id}:bottom-left" aria-label="Resize frame from bottom left corner"></button>
          <button class="frame__anchor frame__anchor--top" type="button" data-frame-anchor="${frame.id}:top" aria-label="Connect from top anchor"></button>
          <button class="frame__anchor frame__anchor--right" type="button" data-frame-anchor="${frame.id}:right" aria-label="Connect from right anchor"></button>
          <button class="frame__anchor frame__anchor--bottom" type="button" data-frame-anchor="${frame.id}:bottom" aria-label="Connect from bottom anchor"></button>
          <button class="frame__anchor frame__anchor--left" type="button" data-frame-anchor="${frame.id}:left" aria-label="Connect from left anchor"></button>
        </article>
      `;
    })
    .join('');

  const draftMarkup = frameDraft
    ? `<div class="frame__draft" style="left:${frameDraft.x}px;top:${frameDraft.y}px;width:${frameDraft.width}px;height:${frameDraft.height}px;"></div>`
    : '';

  framesLayer.innerHTML = `${framesMarkup}${draftMarkup}`;
}
