import {
  buildToolbarBorderStylePopoverMarkup,
  buildToolbarBorderWidthPopoverMarkup,
  buildToolbarColorPopoverMarkup,
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
import { formatShortcutLabel } from '../../utils/shortcuts.js';

export function buildNodeToolbarMarkup(nodeId, options = {}) {
  const includeEdit = options.includeEdit !== false;
  const editingActive = Boolean(options.editingActive);
  const includeFocus = options.includeFocus !== false;
  const includeDelete = options.includeDelete !== false;
  const includeStyleControls = options.includeStyleControls !== false;
  const includeImageControls = options.includeImageControls !== false;
  const hasImage = Boolean(options.hasImage);
  const focusActive = Boolean(options.focusActive);
  const toolbarClass = options.toolbarClass || 'node__toolbar';
  const targetIds = Array.isArray(options.targetIds) && options.targetIds.length ? options.targetIds : [nodeId];
  const targetEntity = options.targetEntity || (targetIds.length > 1 ? 'nodes' : 'node');
  const colorKey = typeof options.colorKey === 'string' ? options.colorKey : '';
  const borderWidth = Number.isFinite(Number(options.borderWidth)) ? Math.round(Number(options.borderWidth)) : 1;
  const borderStyle = typeof options.borderStyle === 'string' ? options.borderStyle : 'solid';
  const focusLabel = focusActive ? 'Exit focus mode' : 'Focus node';
  const focusTitle = focusActive ? 'Exit Focus' : 'Focus';
  const editLabel = editingActive ? 'Switch to reading mode' : 'Edit node';
  const editTitle = editingActive ? 'Reading Mode' : 'Edit Node';
  const editIcon = editingActive ? 'bi-eye-fill' : 'bi-pencil-fill';
  const showShortcuts = Boolean(options.showShortcuts);
  const toolbarStyle = options.toolbarStyle ? ` style="${escapeAttr(options.toolbarStyle)}"` : '';
  const toolbarPlacement = options.toolbarPlacement === 'bottom' ? 'bottom' : 'top';
  const selectionCountLabel = targetEntity === 'nodes' && targetIds.length > 1
    ? `<div class="entity-toolbar__selection-count" aria-label="${targetIds.length} nodes selected">${targetIds.length} selected</div>`
    : '';
  const editShortcut = formatShortcutLabel('Ctrl/Cmd + Enter', { compact: true });
  const focusShortcut = focusActive ? 'Esc' : formatShortcutLabel('Ctrl/Cmd + Alt + Enter', { compact: true });
  const deleteShortcut = focusActive ? formatShortcutLabel('Ctrl/Cmd + Delete', { compact: true }) : 'Del';
  const imageActionLabel = hasImage ? 'Replace image' : 'Add image';
  const imageActionTitle = hasImage ? 'Replace Image' : 'Add Image';

  return `
    <div class="${toolbarClass}" data-toolbar-entity="${targetEntity}" data-toolbar-target-ids="${escapeAttr(targetIds.join(','))}" data-toolbar-placement="${toolbarPlacement}"${toolbarStyle}>
      ${selectionCountLabel}
      ${includeEdit ? `
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-node-edit-open="${nodeId}" aria-label="${editLabel}" title="${editTitle}" aria-pressed="${editingActive ? 'true' : 'false'}">
          <i class="bi ${editIcon}"></i>
          <span class="node__tool-btn-copy">
            <span class="node__tool-btn-label">${editingActive ? 'Read' : 'Edit'}</span>
            ${showShortcuts ? `<span class="node__tool-btn-shortcut">${editShortcut}</span>` : ''}
          </span>
        </button>
      ` : ''}
      ${includeFocus ? `
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-node-focus-toggle="${nodeId}" aria-label="${focusLabel}" title="${focusTitle}" aria-pressed="${focusActive ? 'true' : 'false'}">
          <i class="bi ${focusActive ? 'bi-check-lg' : 'bi-arrows-fullscreen'}"></i>
          <span class="node__tool-btn-copy">
            <span class="node__tool-btn-label">${focusActive ? 'Exit' : 'Focus'}</span>
            ${showShortcuts ? `<span class="node__tool-btn-shortcut">${focusShortcut}</span>` : ''}
          </span>
        </button>
      ` : ''}
      ${includeImageControls && targetEntity === 'node' ? `
        <button class="node__tool-btn entity-toolbar__btn" type="button" data-node-image-toolbar-pick="${nodeId}" aria-label="${imageActionLabel}" title="${imageActionTitle}">
          <i class="bi ${hasImage ? 'bi-image-fill' : 'bi-image'}"></i>
        </button>
      ` : ''}
      ${includeImageControls && targetEntity === 'node' && hasImage ? `
        <button class="node__tool-btn entity-toolbar__btn node__tool-btn--danger" type="button" data-node-image-toolbar-remove="${nodeId}" aria-label="Remove image" title="Remove Image">
          <i class="bi bi-image-alt"></i>
        </button>
      ` : ''}
      ${includeStyleControls ? `
        <div class="entity-toolbar__control">
          <button class="node__tool-btn entity-toolbar__btn${colorKey ? ' entity-toolbar__trigger--has-swatch' : ''}" type="button" data-toolbar-popover-toggle="color" aria-label="Node colors" title="Node colors" aria-expanded="false"${colorKey ? ` data-toolbar-color-current="${escapeAttr(colorKey)}"` : ''}>
            <i class="bi bi-palette"></i>
          </button>
          ${buildToolbarColorPopoverMarkup('Colors')}
        </div>
        <div class="entity-toolbar__control">
          <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-width" aria-label="Border width" title="Border width" aria-expanded="false">
            <i class="bi bi-border-width"></i>
          </button>
          ${buildToolbarBorderWidthPopoverMarkup(borderWidth)}
        </div>
        <div class="entity-toolbar__control">
          <button class="node__tool-btn entity-toolbar__btn" type="button" data-toolbar-popover-toggle="border-style" aria-label="Border style" title="Border style" aria-expanded="false">
            <i class="bi bi-border-style"></i>
          </button>
          ${buildToolbarBorderStylePopoverMarkup(borderStyle)}
        </div>
      ` : ''}
      ${includeDelete ? `
      <button class="node__tool-btn entity-toolbar__btn node__tool-btn--danger" type="button" ${targetEntity === 'nodes' ? 'data-nodes-delete="true"' : `data-node-delete="${nodeId}"`} aria-label="${targetEntity === 'nodes' ? 'Delete selected nodes' : 'Delete node'}" title="${targetEntity === 'nodes' ? 'Delete Selected Nodes' : 'Delete Node'}">
        <i class="bi bi-trash"></i>
        <span class="node__tool-btn-copy">
          <span class="node__tool-btn-label">Delete</span>
          ${showShortcuts ? `<span class="node__tool-btn-shortcut">${deleteShortcut}</span>` : ''}
        </span>
      </button>
      ` : ''}
    </div>
  `;
}

export function buildNodeContentMarkup(node, options = {}) {
  const editing = Boolean(options.isEditing);
  const focused = Boolean(options.isFocused);
  const starterActive = Boolean(options.starterActive);
  const imageKind = node.kind === 'image';
  const imageNode = isImageNode(node);
  const hasImageData = typeof node.imageData === 'string' && node.imageData.startsWith('data:image/');
  const contentClass = focused
    ? `node__content node__content--focus${imageNode ? ' node__content--focus-image' : ''}`
    : 'node__content';
  const metaClass = focused ? 'node__meta node__meta--focus' : 'node__meta';
  const imagePickerAttrs = focused && editing
    ? ` data-node-image-pick="${node.id}" role="button" tabindex="0" aria-label="Replace image" title="Replace image"`
    : '';
  const imageMarkup = hasImageData
    ? `
      <div class="node__image-pane${focused ? ' node__image-pane--focus' : ''}"${imagePickerAttrs} style="background-image: url('${escapeCssUrl(node.imageData)}'); --node-image-aspect-ratio: ${escapeAttr(node.imageAspectRatio)};"></div>
    `
    : '';
  const imageRemoveButtonMarkup = focused && editing && hasImageData
    ? `
      <button
        class="node__image-remove-btn"
        type="button"
        data-node-image-remove="${node.id}"
        aria-label="Remove image"
        title="Remove image"
      >
        <i class="bi bi-trash"></i>
        <span>Remove image</span>
      </button>
    `
    : '';
  const imageDropzoneMarkup = focused && editing
    ? `
      <button
        class="node__image-dropzone${focused && hasImageData ? ' node__image-dropzone--overlay' : ''}"
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
  const mediaMarkup = ((focused && editing) || hasImageData)
    ? `
      <div class="node__focus-media${imageNode ? ' node__focus-media--has-image' : ' node__focus-media--empty'}${editing && !focused ? ' node__focus-media--canvas' : ''}">
        ${hasImageData ? imageMarkup : ''}
        ${imageRemoveButtonMarkup}
        ${imageDropzoneMarkup}
      </div>
    `
    : '';
  const focusDoneButtonMarkup = focused
    ? `
      <div class="node__focus-actions">
        <button class="node__focus-done-btn" type="button" data-node-focus-toggle="${node.id}" aria-label="${starterActive ? 'Begin hypernode' : 'Exit focus mode'}" title="${starterActive ? 'Begin hypernode' : 'Exit Focus'}">
          <i class="bi bi-check-lg"></i>
          <span>${starterActive ? 'Begin' : 'Done'}</span>
        </button>
      </div>
    `
    : '';

  if (editing && focused) {
    return `
      <div class="${contentClass} node__content--focus-shell node__content--focus-shell--edit">
        <div class="node__focus-body">
          <div class="node__focus-layout node__focus-layout--edit" data-node-editor="${node.id}">
            <div class="node__focus-text-column node__focus-text-column--edit">
              <div class="node__editor-field node__editor-field--title node__focus-field node__focus-field--title">
                <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" placeholder="Name" aria-label="Name" autocomplete="off" data-1p-ignore="true" />
              </div>
              <div class="node__editor-field node__editor-field--description node__focus-field node__focus-field--description">
                <textarea class="node__editor-textarea node__editor-textarea--focus" data-node-edit-description="${node.id}" placeholder="Description" aria-label="Description">${escapeHTML(node.description)}</textarea>
              </div>
            </div>
            <div class="node__focus-media-column node__focus-media-column--edit">
              ${mediaMarkup}
            </div>
          </div>
        </div>
        ${focusDoneButtonMarkup}
      </div>
    `;
  }

  if (!editing && focused) {
    return `
      <div class="${contentClass} node__content--focus-shell node__content--focus-shell--read">
        <div class="node__focus-body">
          <div class="node__focus-layout node__focus-layout--read">
            <div class="node__focus-text-column node__focus-text-column--read">
              <section class="node__focus-field node__focus-field--title">
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
            ${hasImageData ? `
              <section class="node__focus-media-column node__focus-media-column--read">
                <div class="node__focus-media node__focus-media--has-image">
                  ${imageMarkup}
                </div>
              </section>
            ` : ''}
          </div>
        </div>
        ${focusDoneButtonMarkup}
      </div>
    `;
  }

  const content =
    editing
      ? `
      <div class="node__editor${focused ? ' node__editor--focus' : ''}" data-node-editor="${node.id}">
        ${imageKind && hasImageData
          ? `
            <div class="node__editor-layout node__editor-layout--canvas-image">
              <div class="node__editor-fields node__editor-fields--canvas-image">
                <div class="node__editor-field node__editor-field--title">
                  <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" placeholder="Name" aria-label="Name" autocomplete="off" data-1p-ignore="true" />
                </div>
                <div class="node__editor-field node__editor-field--description">
                  <textarea class="node__editor-textarea${focused ? ' node__editor-textarea--focus' : ''}" data-node-edit-description="${node.id}" placeholder="Description" aria-label="Description">${escapeHTML(node.description)}</textarea>
                </div>
              </div>
              ${mediaMarkup}
            </div>
          `
          : `
            ${mediaMarkup}
            <div class="node__editor-fields">
              <div class="node__editor-field node__editor-field--title">
                <input class="node__editor-input" data-node-edit-title="${node.id}" value="${escapeAttr(node.title)}" maxlength="80" placeholder="Name" aria-label="Name" autocomplete="off" data-1p-ignore="true" />
              </div>
              <div class="node__editor-field node__editor-field--description">
                <textarea class="node__editor-textarea${focused ? ' node__editor-textarea--focus' : ''}" data-node-edit-description="${node.id}" placeholder="Description" aria-label="Description">${escapeHTML(node.description)}</textarea>
              </div>
            </div>
          `}
      </div>
    `
      : `
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
      const hasImageData = typeof node.imageData === 'string' && node.imageData.startsWith('data:image/');
      const inlineSizeStyle = buildNodeInlineSizeStyle(node);
      const nodeStyle = `transform: translate(${node.x}px, ${node.y}px);${inlineSizeStyle}--node-border-width: ${node.borderWidth || 1}px;--node-border-style: ${escapeAttr(node.borderStyle || 'solid')};`;
      const nodeColorAttr = typeof node.colorKey === 'string' ? ` data-node-color="${node.colorKey}"` : '';
      return `
        <article class="node ${selectedClass} ${singleSelectedClass} ${overlayControlsClass} ${editingClass} ${imageClass} ${connectClass} ${fixedSizeClass} ${membershipPreviewClass}" data-node-id="${node.id}"${nodeColorAttr} style="${nodeStyle}">
          ${buildNodeToolbarMarkup(node.id, {
            showShortcuts: true,
            hasImage: hasImageData,
            colorKey: node.colorKey || '',
            borderWidth: node.borderWidth || 1,
            borderStyle: node.borderStyle || 'solid',
          })}
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
