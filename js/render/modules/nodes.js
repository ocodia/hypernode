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

export function buildNodeToolbarMarkup(nodeId, options = {}) {
  const includeEdit = options.includeEdit !== false;
  const editingActive = Boolean(options.editingActive);
  const includeFocus = options.includeFocus !== false;
  const focusActive = Boolean(options.focusActive);
  const toolbarClass = options.toolbarClass || 'node__toolbar';
  const focusLabel = focusActive ? 'Exit focus mode' : 'Focus node';
  const focusTitle = focusActive ? 'Exit Focus' : 'Focus';
  const editLabel = editingActive ? 'Switch to reading mode' : 'Edit node';
  const editTitle = editingActive ? 'Reading Mode' : 'Edit Node';
  const editIcon = editingActive ? 'bi-eye-fill' : 'bi-pencil-fill';
  const showShortcuts = Boolean(options.showShortcuts);
  const editShortcut = 'Ctrl/Cmd+Enter';
  const focusShortcut = focusActive ? 'Esc' : 'Ctrl/Cmd+Alt+Enter';
  const deleteShortcut = focusActive ? 'Ctrl/Cmd+Del' : 'Del';

  return `
    <div class="${toolbarClass}">
      ${includeEdit ? `
        <button class="node__tool-btn" type="button" data-node-edit-open="${nodeId}" aria-label="${editLabel}" title="${editTitle}" aria-pressed="${editingActive ? 'true' : 'false'}">
          <i class="bi ${editIcon}"></i>
          <span class="node__tool-btn-copy">
            <span class="node__tool-btn-label">${editingActive ? 'Read' : 'Edit'}</span>
            ${showShortcuts ? `<span class="node__tool-btn-shortcut">${editShortcut}</span>` : ''}
          </span>
        </button>
      ` : ''}
      ${includeFocus ? `
        <button class="node__tool-btn" type="button" data-node-focus-toggle="${nodeId}" aria-label="${focusLabel}" title="${focusTitle}" aria-pressed="${focusActive ? 'true' : 'false'}">
          <i class="bi ${focusActive ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}"></i>
          <span class="node__tool-btn-copy">
            <span class="node__tool-btn-label">${focusActive ? 'Exit' : 'Focus'}</span>
            ${showShortcuts ? `<span class="node__tool-btn-shortcut">${focusShortcut}</span>` : ''}
          </span>
        </button>
      ` : ''}
      <button class="node__tool-btn node__tool-btn--danger" type="button" data-node-delete="${nodeId}" aria-label="Delete node" title="Delete Node">
        <i class="bi bi-trash"></i>
        <span class="node__tool-btn-copy">
          <span class="node__tool-btn-label">Delete</span>
          ${showShortcuts ? `<span class="node__tool-btn-shortcut">${deleteShortcut}</span>` : ''}
        </span>
      </button>
    </div>
  `;
}

export function buildNodeContentMarkup(node, options = {}) {
  const editing = Boolean(options.isEditing);
  const focused = Boolean(options.isFocused);
  const imageNode = isImageNode(node);
  const hasImageData = typeof node.imageData === 'string' && node.imageData.startsWith('data:image/');
  const contentClass = focused
    ? `node__content node__content--focus${imageNode ? ' node__content--focus-image' : ' node__content--focus-text'}`
    : 'node__content';
  const metaClass = focused ? 'node__meta node__meta--focus' : 'node__meta';
  const imageMarkup = imageNode
    ? `
      <div class="node__image-pane${focused ? ' node__image-pane--focus' : ''}" style="background-image: url('${escapeCssUrl(node.imageData)}'); --node-image-aspect-ratio: ${escapeAttr(node.imageAspectRatio)};"></div>
    `
    : '';
  const focusImageDropzoneMarkup = focused && imageNode
    ? `
      <button
        class="node__image-dropzone"
        type="button"
        data-focus-image-dropzone="${node.id}"
        data-node-image-pick="${node.id}"
        aria-label="${hasImageData ? 'Replace image' : 'Add image'}"
        title="${hasImageData ? 'Replace image' : 'Add image'}"
      >
        <span class="node__image-dropzone-title">${hasImageData ? 'Replace image' : 'Add image'}</span>
        <span class="node__image-dropzone-hint">Drop a file here or click to choose.</span>
      </button>
    `
    : '';
  const focusMediaMarkup = focused && imageNode
    ? `
      <div class="node__focus-media">
        ${imageMarkup}
        ${focusImageDropzoneMarkup}
      </div>
    `
    : '';

  if (editing && focused && imageNode) {
    return `
      <div class="${contentClass}">
        <div class="node__editor node__editor--focus" data-node-editor="${node.id}">
          <label class="node__editor-label node__editor-label--focus node__editor-label--focus-title">
            Name
            <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" />
          </label>
          ${focusMediaMarkup}
          <label class="node__editor-label node__editor-label--description node__editor-label--description-focus node__editor-label--focus node__editor-label--focus-description">
            Description
            <textarea class="node__editor-textarea node__editor-textarea--focus" data-node-edit-description="${node.id}">${escapeHTML(node.description)}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  if (!editing && focused && imageNode) {
    return `
      <div class="${contentClass}">
        <section class="node__focus-field node__focus-field--title">
          <div class="node__focus-value node__focus-value--title">
            <h3 class="node__title node__title--focus">${escapeHTML(node.title)}</h3>
          </div>
        </section>
        ${focusMediaMarkup}
        <section class="node__focus-field node__focus-field--description">
          <div class="node__focus-value node__focus-value--description">
            ${node.description ? `<div class="node__description node__description--focus">${renderDescriptionMarkdown(node.description)}</div>` : '<div class="node__description node__description--focus node__description--empty">No description</div>'}
          </div>
        </section>
      </div>
    `;
  }

  const content =
    editing
      ? `
      <div class="node__editor${focused ? ' node__editor--focus' : ''}" data-node-editor="${node.id}">
        <div class="node__editor-fields">
          <label class="node__editor-label${focused ? ' node__editor-label--focus' : ''}">
            Name
            <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" />
          </label>
          <label class="node__editor-label node__editor-label--description${focused ? ' node__editor-label--description-focus' : ''}${focused ? ' node__editor-label--focus' : ''}">
            Description
            <textarea class="node__editor-textarea${focused ? ' node__editor-textarea--focus' : ''}" data-node-edit-description="${node.id}">${escapeHTML(node.description)}</textarea>
          </label>
        </div>
        ${focusMediaMarkup}
      </div>
    `
      : `
      ${focused && imageNode ? '<div class="node__focus-copy">' : ''}
      ${!focused && imageNode ? imageMarkup : ''}
      ${focused
        ? `
          <div class="node__focus-fields">
            <section class="node__focus-field">
              <div class="node__focus-value node__focus-value--title">
                <h3 class="node__title node__title--focus">${escapeHTML(node.title)}</h3>
              </div>
            </section>
            <section class="node__focus-field node__focus-field--description">
              <div class="node__focus-value node__focus-value--description">
                ${node.description ? `<div class="node__description node__description--focus">${renderDescriptionMarkdown(node.description)}</div>` : '<div class="node__description node__description--focus node__description--empty">No description</div>'}
              </div>
            </section>
          </div>
        `
        : `
          <div class="${metaClass}">
            <div class="node__head">
              <h3 class="node__title">${escapeHTML(node.title)}</h3>
            </div>
            ${node.description ? `<div class="node__description">${renderDescriptionMarkdown(node.description)}</div>` : ''}
          </div>
        `}
      ${focused && imageNode ? '</div>' : ''}
      ${focusMediaMarkup}
    `;

  return `<div class="${contentClass}">${content}</div>`;
}

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
      return `
        <article class="node ${selectedClass} ${singleSelectedClass} ${overlayControlsClass} ${editingClass} ${imageClass} ${connectClass} ${fixedSizeClass} ${membershipPreviewClass}" data-node-id="${node.id}"${nodeColorAttr} style="${nodeStyle}">
          ${buildNodeToolbarMarkup(node.id)}
          ${buildNodeContentMarkup(node, { isEditing: editingNodeId === node.id })}
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
