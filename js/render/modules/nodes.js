import {
  buildNodeInlineSizeStyle,
  escapeAttr,
  escapeCssUrl,
  escapeHTML,
  getNodeStackPriority,
  getSelectedNodeIds,
  getSingleSelectedNodeId,
  hasExplicitNodeSize,
  isImageNode,
} from '../helpers.js';
import { renderDescriptionMarkdown } from '../markdown.js';

export function renderNodes(nodesLayer, state) {
  const selectedNodeIds = new Set(getSelectedNodeIds(state.selection));
  const previewNodeMap = state.ui.nodeMembershipPreview || {};
  const singleSelectedNodeId = getSingleSelectedNodeId(state.selection);
  const editingNodeId = state.ui.editingNodeId;
  const draft = state.ui.edgeDraft;
  const orderedNodes = [...state.nodes].sort((left, right) => {
    const leftPriority = getNodeStackPriority(left.id, selectedNodeIds, editingNodeId);
    const rightPriority = getNodeStackPriority(right.id, selectedNodeIds, editingNodeId);
    return leftPriority - rightPriority;
  });

  nodesLayer.innerHTML = orderedNodes
    .map((node) => {
      const imageNode = isImageNode(node);
      const selectedClass = selectedNodeIds.has(node.id) ? 'is-selected' : '';
      const singleSelectedClass = singleSelectedNodeId === node.id ? 'is-single-selected' : '';
      const overlayControlsClass = singleSelectedNodeId === node.id ? 'has-overlay-controls' : '';
      const editingClass = editingNodeId === node.id ? 'is-editing' : '';
      const imageClass = imageNode ? 'node--image' : '';
      const membershipPreviewClass = previewNodeMap[node.id] === 'add'
        ? 'is-frame-membership-add-preview'
        : previewNodeMap[node.id] === 'remove'
          ? 'is-frame-membership-remove-preview'
          : '';
      const connectClass =
        draft?.fromNodeId === node.id
          ? 'is-connect-source'
          : draft
            ? draft.hoverNodeId === node.id
              ? 'is-connect-target'
              : 'is-connect-candidate'
            : '';
      const fixedSizeClass = hasExplicitNodeSize(node) ? 'has-fixed-size' : '';
      const inlineSizeStyle = buildNodeInlineSizeStyle(node);
      const nodeStyle = `transform: translate(${node.x}px, ${node.y}px);${inlineSizeStyle}`;
      const nodeColorAttr = typeof node.colorKey === 'string' ? ` data-node-color="${node.colorKey}"` : '';
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
            ${node.description ? `<div class="node__description">${renderDescriptionMarkdown(node.description)}</div>` : ''}
          </div>
        `;
      return `
        <article class="node ${selectedClass} ${singleSelectedClass} ${overlayControlsClass} ${editingClass} ${imageClass} ${connectClass} ${fixedSizeClass} ${membershipPreviewClass}" data-node-id="${node.id}"${nodeColorAttr} style="${nodeStyle}">
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
    .join('');
}
