import { NODE_DEFAULTS } from '../utils/constants.js';

export function createRenderer(elements, store) {
  const { canvas, nodesLayer, edgesGroup, edgesLayer, inspectorContent, emptyHint, edgeHint, importStatus } = elements;

  function applyViewport(viewport) {
    const transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
    nodesLayer.style.transform = transform;
    edgesLayer.style.transform = transform;
  }

  function renderNodes(state) {
    const selectedNodeId = state.selection?.type === 'node' ? state.selection.id : null;
    const draftSourceId = state.ui.edgeDraftFrom;
    nodesLayer.innerHTML = state.nodes
      .map((node) => {
        const selectedClass = selectedNodeId === node.id ? 'is-selected' : '';
        const edgeClass = draftSourceId
          ? (draftSourceId === node.id ? 'is-connect-source' : 'is-connect-target')
          : '';
        const edgeDraft = state.ui.edgeDraftFrom === node.id ? 'Connecting… choose target' : 'Connect edge';
        const edgeLabel = state.ui.edgeDraftFrom === node.id ? 'Source' : 'Connect';
        return `
          <article class="node ${selectedClass} ${edgeClass}" data-node-id="${node.id}" style="transform: translate(${node.x}px, ${node.y}px)">
            <h3 class="node__title">${escapeHTML(node.title)}</h3>
            ${node.description ? `<p class="node__description">${escapeHTML(node.description)}</p>` : ''}
            <button class="node__handle" type="button" title="Create edge" data-edge-handle="${node.id}" aria-label="${edgeDraft}">${edgeLabel}</button>
          </article>
        `;
      })
      .join('');
  }

  function renderEdges(state) {
    const byId = new Map(state.nodes.map((node) => [node.id, node]));
    const selectedEdgeId = state.selection?.type === 'edge' ? state.selection.id : null;

    edgesGroup.innerHTML = state.edges
      .map((edge) => {
        const fromNode = byId.get(edge.from);
        const toNode = byId.get(edge.to);
        if (!fromNode || !toNode) {
          return '';
        }

        const startX = fromNode.x + NODE_DEFAULTS.width;
        const startY = fromNode.y + 32;
        const endX = toNode.x;
        const endY = toNode.y + 32;
        const midX = (startX + endX) / 2;
        const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        const selected = selectedEdgeId === edge.id ? 'is-selected' : '';

        return `<path class="${selected}" data-edge-id="${edge.id}" d="${d}"></path>`;
      })
      .join('');
  }

  function renderInspector(state) {
    if (state.selection?.type === 'node') {
      const node = state.nodes.find((item) => item.id === state.selection.id);
      if (!node) {
        inspectorContent.innerHTML = '<p class="inspector-meta">Node no longer exists.</p>';
        return;
      }
      inspectorContent.innerHTML = `
        <div class="inspector-fields">
          <label>Title <input id="node-title-input" value="${escapeAttr(node.title)}" maxlength="80" /></label>
          <label>Description <textarea id="node-description-input">${escapeHTML(node.description)}</textarea></label>
          <button id="delete-node-btn" type="button">Delete Node</button>
        </div>
      `;
      return;
    }

    if (state.selection?.type === 'edge') {
      const edge = state.edges.find((item) => item.id === state.selection.id);
      inspectorContent.innerHTML = edge
        ? `
        <p class="inspector-meta">Edge from <strong>${escapeHTML(edge.from)}</strong> to <strong>${escapeHTML(edge.to)}</strong>.</p>
        <div class="inspector-fields">
          <button id="delete-edge-btn" type="button">Delete Edge</button>
        </div>
      `
        : '<p class="inspector-meta">Edge no longer exists.</p>';
      return;
    }

    inspectorContent.innerHTML = '<p class="inspector-meta">Select a node or edge to edit its details.</p>';
  }

  function renderEmptyHint(state) {
    emptyHint.hidden = state.nodes.length > 0;
  }

  function renderImportStatus(state) {
    importStatus.textContent = state.ui.importStatus;
  }

  function renderEdgeHint(state) {
    if (!state.ui.edgeDraftFrom) {
      edgeHint.textContent = 'Tip: click Connect on node A, then Connect on node B to create an edge.';
      return;
    }
    edgeHint.textContent = 'Edge mode: click Connect on a target node (or click the target node body). Press Esc to cancel.';
  }

  function render(state) {
    applyViewport(state.viewport);
    renderNodes(state);
    renderEdges(state);
    renderInspector(state);
    renderEmptyHint(state);
    renderEdgeHint(state);
    renderImportStatus(state);
    canvas.classList.toggle('is-panning', Boolean(state.ui.isPanning));
  }

  return { render };
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll('`', '&#096;');
}
