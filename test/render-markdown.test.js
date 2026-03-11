import test from 'node:test';
import assert from 'node:assert/strict';

import { getNodeHeight } from '../js/shared/entities.js';
import { renderDescriptionMarkdown } from '../js/render/markdown.js';
import { renderFrames } from '../js/render/modules/frames.js';
import { renderNodes } from '../js/render/modules/nodes.js';
import { renderFocusOverlay, renderHypernodeMetadata, renderSelectionControls } from '../js/render/modules/ui.js';

test('renderDescriptionMarkdown escapes raw html', () => {
  assert.equal(renderDescriptionMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('renderDescriptionMarkdown supports atx headers and paragraphs', () => {
  assert.equal(
    renderDescriptionMarkdown('# Heading\n\nBody copy'),
    '<h1>Heading</h1><p>Body copy</p>',
  );
  assert.equal(renderDescriptionMarkdown('###### Tiny'), '<h6>Tiny</h6>');
});

test('renderDescriptionMarkdown supports unordered and ordered lists', () => {
  assert.equal(
    renderDescriptionMarkdown('- one\n- two\n\n1. first\n2. second'),
    '<ul><li>one</li><li>two</li></ul><ol><li>first</li><li>second</li></ol>',
  );
});

test('renderDescriptionMarkdown supports emphasis and inline code', () => {
  assert.equal(
    renderDescriptionMarkdown('**bold** and *italic* with `code <x>`'),
    '<p><strong>bold</strong> and <em>italic</em> with <code>code &lt;x&gt;</code></p>',
  );
  assert.equal(
    renderDescriptionMarkdown('__bold__ and _italic_'),
    '<p><strong>bold</strong> and <em>italic</em></p>',
  );
});

test('renderDescriptionMarkdown renders safe links and drops unsafe urls', () => {
  assert.equal(
    renderDescriptionMarkdown('[This link](http://example.net/)'),
    '<p><a href="http://example.net/" target="_blank" rel="noopener noreferrer">This link</a></p>',
  );
  assert.equal(
    renderDescriptionMarkdown('[Bad](javascript:alert(1))'),
    '<p>Bad</p>',
  );
});

test('renderDescriptionMarkdown supports mixed content and malformed links remain text', () => {
  assert.equal(
    renderDescriptionMarkdown('Line one\nline two\n\n- item with [link](https://example.net/) and `code`\n\n[broken](notaurl)'),
    '<p>Line one<br>line two</p><ul><li>item with <a href="https://example.net/" target="_blank" rel="noopener noreferrer">link</a> and <code>code</code></li></ul><p>broken</p>',
  );
});

test('renderers use markdown output in view mode and raw text in edit mode', () => {
  const nodesLayer = { innerHTML: '' };
  const framesLayer = { innerHTML: '' };
  const markdown = '# Title\n\nVisit [site](https://example.net/)';

  renderNodes(nodesLayer, {
    nodes: [{ id: 'n1', title: 'Node', description: markdown, kind: 'text', x: 0, y: 0 }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { editingNodeId: null, edgeDraft: null, nodeMembershipPreview: {} },
  });
  assert.match(nodesLayer.innerHTML, /<div class="node__description"><h1>Title<\/h1><p>Visit <a href="https:\/\/example.net\/"/);

  renderNodes(nodesLayer, {
    nodes: [{ id: 'n1', title: 'Node', description: markdown, kind: 'text', x: 0, y: 0 }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { editingNodeId: 'n1', edgeDraft: null, nodeMembershipPreview: {} },
  });
  assert.match(nodesLayer.innerHTML, /<textarea class="node__editor-textarea" data-node-edit-description="n1" placeholder="Description" aria-label="Description"># Title/);

  renderFrames(framesLayer, {
    nodes: [],
    frames: [{ id: 'f1', title: 'Frame', description: markdown, x: 0, y: 0, width: 320, height: 200 }],
    selection: { type: 'frame', id: 'f1' },
    ui: { editingFrameId: null, edgeDraft: null, frameDraft: null, frameMembershipPreview: {} },
  });
  assert.match(framesLayer.innerHTML, /<div class="frame__description"><h1>Title<\/h1><p>Visit <a href="https:\/\/example.net\/"/);

  renderFrames(framesLayer, {
    nodes: [],
    frames: [{ id: 'f1', title: 'Frame', description: markdown, x: 0, y: 0, width: 320, height: 200 }],
    selection: { type: 'frame', id: 'f1' },
    ui: { editingFrameId: 'f1', edgeDraft: null, frameDraft: null, frameMembershipPreview: {} },
  });
  assert.match(framesLayer.innerHTML, /data-frame-edit-title="f1"/);
  assert.match(framesLayer.innerHTML, /<textarea class="frame__editor-textarea" data-frame-edit-description="f1"># Title/);
});

test('single selected node renders focus toolbar action', () => {
  const nodesLayer = { innerHTML: '' };

  renderNodes(nodesLayer, {
    nodes: [{ id: 'n1', title: 'Node', description: '', kind: 'text', x: 0, y: 0 }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { editingNodeId: null, edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.match(nodesLayer.innerHTML, /data-node-focus-toggle="n1"/);
});

test('canvas inline edit keeps the single-node overlay toolbar visible', () => {
  const previousHTMLElement = globalThis.HTMLElement;
  const previousDocument = globalThis.document;
  class MockHTMLElement {
    constructor() {
      this.innerHTML = '';
    }
  }
  globalThis.HTMLElement = MockHTMLElement;

  try {
    const selectionControlsLayer = new MockHTMLElement();
    globalThis.document = {
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getElementById() {
        return null;
      },
    };

    renderSelectionControls(selectionControlsLayer, {
      nodes: [{ id: 'n1', title: 'Node', description: '', kind: 'text', x: 0, y: 0 }],
      frames: [],
      edges: [],
      selection: { type: 'node', id: 'n1' },
      ui: { editingNodeId: 'n1', focusedNodeId: null, editingFrameId: null, edgeDraft: null },
      viewport: { zoom: 1, panX: 0, panY: 0 },
      settings: {},
    });

    assert.match(selectionControlsLayer.innerHTML, /selection-controls__toolbar--node/);
    assert.match(selectionControlsLayer.innerHTML, /data-node-focus-toggle="n1"/);
    assert.match(selectionControlsLayer.innerHTML, /data-node-edit-open="n1"/);
    assert.match(selectionControlsLayer.innerHTML, /node__tool-btn-label">Read</);
    assert.match(selectionControlsLayer.innerHTML, /bi-eye-fill/);
    assert.equal((selectionControlsLayer.innerHTML.match(/selection-controls__toolbar--node/g) || []).length, 1);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
    globalThis.document = previousDocument;
  }
});

test('frame edit keeps the single-frame overlay toolbar visible with reading icon', () => {
  const previousHTMLElement = globalThis.HTMLElement;
  const previousDocument = globalThis.document;
  class MockHTMLElement {
    constructor() {
      this.innerHTML = '';
    }
  }
  globalThis.HTMLElement = MockHTMLElement;

  try {
    const selectionControlsLayer = new MockHTMLElement();
    globalThis.document = {
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getElementById() {
        return null;
      },
    };

    renderSelectionControls(selectionControlsLayer, {
      nodes: [],
      frames: [{ id: 'f1', title: 'Frame', description: '', x: 0, y: 0, width: 320, height: 200 }],
      edges: [],
      selection: { type: 'frame', id: 'f1' },
      ui: { editingNodeId: null, focusedNodeId: null, editingFrameId: 'f1', edgeDraft: null },
      viewport: { zoom: 1, panX: 0, panY: 0 },
      settings: {},
    });

    assert.match(selectionControlsLayer.innerHTML, /selection-controls__toolbar--frame/);
    assert.match(selectionControlsLayer.innerHTML, /data-frame-edit-confirm="f1"/);
    assert.match(selectionControlsLayer.innerHTML, /bi-eye-fill/);
    assert.equal((selectionControlsLayer.innerHTML.match(/selection-controls__toolbar--frame/g) || []).length, 1);
  } finally {
    globalThis.HTMLElement = previousHTMLElement;
    globalThis.document = previousDocument;
  }
});

test('focus overlay renders constrained focused editor with image pane on the media side', () => {
  const focusLayer = { innerHTML: '', hidden: true };

  renderFocusOverlay(focusLayer, {
    nodes: [{
      id: 'n1',
      title: 'Image Node',
      description: 'Body copy',
      kind: 'image',
      x: 0,
      y: 0,
      imageData: 'data:image/png;base64,abc',
      imageAspectRatio: 1.5,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { focusedNodeId: 'n1', editingNodeId: 'n1', edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.equal(focusLayer.hidden, false);
  assert.match(focusLayer.innerHTML, /focus-overlay__content/);
  assert.match(focusLayer.innerHTML, /node__toolbar node__toolbar--focus/);
  assert.match(focusLayer.innerHTML, /data-node-edit-open="n1"/);
  assert.match(focusLayer.innerHTML, /bi-eye-fill/);
  assert.match(focusLayer.innerHTML, /Read/);
  assert.match(focusLayer.innerHTML, /(?:Ctrl|Cmd)\+Enter/);
  assert.doesNotMatch(focusLayer.innerHTML, /node__tool-btn-label">Exit</);
  assert.doesNotMatch(focusLayer.innerHTML, />Esc</);
  assert.match(focusLayer.innerHTML, /focus-overlay__panel node node--image is-editing/);
  assert.match(focusLayer.innerHTML, /node__content node__content--focus node__content--focus-image node__content--focus-shell node__content--focus-shell--edit/);
  assert.match(focusLayer.innerHTML, /node__focus-layout node__focus-layout--edit/);
  assert.match(focusLayer.innerHTML, /node__focus-text-column node__focus-text-column--edit/);
  assert.match(focusLayer.innerHTML, /node__focus-media/);
  assert.match(focusLayer.innerHTML, /node__image-pane node__image-pane--focus/);
  assert.match(focusLayer.innerHTML, /data-focus-image-dropzone="n1"/);
  assert.match(focusLayer.innerHTML, /data-node-image-pick="n1"/);
  assert.match(focusLayer.innerHTML, /data-node-image-remove="n1"/);
  assert.match(focusLayer.innerHTML, /placeholder="Name"/);
  assert.match(focusLayer.innerHTML, /placeholder="Description"/);
  assert.match(focusLayer.innerHTML, /data-node-focus-toggle="n1"/);
  assert.match(focusLayer.innerHTML, />\s*<i class="bi bi-check-lg"><\/i>\s*<span>Done<\/span>/);
  assert.match(focusLayer.innerHTML, /node__focus-text-column--edit[^]*data-node-edit-title="n1"[^]*data-node-edit-description="n1"/);
  assert.match(focusLayer.innerHTML, /node__focus-media-column node__focus-media-column--edit[^]*node__focus-media/);
  assert.match(focusLayer.innerHTML, /node__editor-textarea node__editor-textarea--focus/);
});

test('focus overlay reading mode uses enlarged labeled fields', () => {
  const focusLayer = { innerHTML: '', hidden: true };

  renderFocusOverlay(focusLayer, {
    nodes: [{
      id: 'n1',
      title: 'Readable Node',
      description: 'Hello **world**',
      kind: 'text',
      x: 0,
      y: 0,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { focusedNodeId: 'n1', editingNodeId: null, edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.match(focusLayer.innerHTML, /node__focus-text-column node__focus-text-column--read/);
  assert.doesNotMatch(focusLayer.innerHTML, /node__focus-label/);
  assert.match(focusLayer.innerHTML, /node__focus-value--description/);
  assert.match(focusLayer.innerHTML, /bi-pencil-fill/);
  assert.match(focusLayer.innerHTML, /Edit/);
  assert.match(focusLayer.innerHTML, /(?:Ctrl|Cmd)\+Enter/);
  assert.doesNotMatch(focusLayer.innerHTML, /data-focus-image-dropzone/);
  assert.match(focusLayer.innerHTML, /data-node-focus-toggle="n1"/);
  assert.match(focusLayer.innerHTML, /<span>Done<\/span>/);
  assert.match(focusLayer.innerHTML, /node__focus-value node__focus-value--description/);
  assert.match(focusLayer.innerHTML, /node__content--focus-shell--read/);
  assert.match(focusLayer.innerHTML, /node__focus-layout node__focus-layout--read/);
  assert.match(focusLayer.innerHTML, /node__focus-text-column node__focus-text-column--read/);
});

test('starter node focus overlay hides the start button and uses Begin as the action label', () => {
  const focusLayer = { innerHTML: '', hidden: true };

  renderFocusOverlay(focusLayer, {
    nodes: [{
      id: 'n1',
      title: 'Starter Node',
      description: '',
      kind: 'text',
      x: 0,
      y: 0,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { focusedNodeId: 'n1', editingNodeId: 'n1', starterNodeId: 'n1', edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.doesNotMatch(focusLayer.innerHTML, /data-node-start="n1"/);
  assert.match(focusLayer.innerHTML, /<span>Begin<\/span>/);
  assert.doesNotMatch(focusLayer.innerHTML, /<span>Done<\/span>/);
});

test('focus overlay reading mode renders image before title and description', () => {
  const focusLayer = { innerHTML: '', hidden: true };

  renderFocusOverlay(focusLayer, {
    nodes: [{
      id: 'n1',
      title: 'Readable Image Node',
      description: 'Longer copy',
      kind: 'image',
      x: 0,
      y: 0,
      imageData: 'data:image/png;base64,abc',
      imageAspectRatio: 1.5,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { focusedNodeId: 'n1', editingNodeId: null, edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.match(focusLayer.innerHTML, /node__focus-layout[^]*node__focus-text-column[^]*node__focus-media-column/);
  assert.match(focusLayer.innerHTML, /node__focus-value node__focus-value--description/);
  assert.doesNotMatch(focusLayer.innerHTML, /data-focus-image-dropzone/);
  assert.doesNotMatch(focusLayer.innerHTML, /data-node-image-pick="n1"/);
});

test('canvas node editing shows image without add or replace controls', () => {
  const nodesLayer = { innerHTML: '' };

  renderNodes(nodesLayer, {
    nodes: [{
      id: 'n1',
      title: 'Image Node',
      description: 'Body copy',
      kind: 'image',
      x: 0,
      y: 0,
      imageData: 'data:image/png;base64,abc',
      imageAspectRatio: 1.5,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { editingNodeId: 'n1', edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.match(nodesLayer.innerHTML, /node__editor-layout node__editor-layout--canvas-image/);
  assert.match(nodesLayer.innerHTML, /node__editor-fields node__editor-fields--canvas-image/);
  assert.match(nodesLayer.innerHTML, /node__focus-media node__focus-media--has-image node__focus-media--canvas/);
  assert.match(nodesLayer.innerHTML, /data-node-edit-title="n1"[^]*data-node-edit-description="n1"[^]*node__image-pane/);
  assert.doesNotMatch(nodesLayer.innerHTML, /data-focus-image-dropzone="n1"/);
  assert.doesNotMatch(nodesLayer.innerHTML, /data-node-image-pick="n1"/);
  assert.doesNotMatch(nodesLayer.innerHTML, /data-node-image-remove="n1"/);
  assert.match(nodesLayer.innerHTML, /placeholder="Name"/);
  assert.match(nodesLayer.innerHTML, /placeholder="Description"/);
});

test('canvas image node editing without image data renders text-only fields', () => {
  const nodesLayer = { innerHTML: '' };

  renderNodes(nodesLayer, {
    nodes: [{
      id: 'n1',
      title: 'Image Node',
      description: '',
      kind: 'image',
      x: 0,
      y: 0,
    }],
    frames: [],
    edges: [],
    selection: { type: 'node', id: 'n1' },
    ui: { editingNodeId: 'n1', edgeDraft: null, nodeMembershipPreview: {} },
  });

  assert.doesNotMatch(nodesLayer.innerHTML, /node__editor-layout node__editor-layout--canvas-image/);
  assert.doesNotMatch(nodesLayer.innerHTML, /node__focus-media/);
  assert.doesNotMatch(nodesLayer.innerHTML, /data-focus-image-dropzone="n1"/);
  assert.doesNotMatch(nodesLayer.innerHTML, /data-node-image-pick="n1"/);
  assert.match(nodesLayer.innerHTML, /placeholder="Name"/);
  assert.match(nodesLayer.innerHTML, /placeholder="Description"/);
});

test('image nodes without explicit height no longer derive height from image aspect ratio', () => {
  assert.equal(getNodeHeight({
    id: 'n1',
    kind: 'image',
    width: 320,
    imageAspectRatio: 1.5,
    imageData: 'data:image/png;base64,abc',
  }), 80);
});

test('renderHypernodeMetadata updates name, viewport center coordinates, and document title', () => {
  const graphTitle = { textContent: '' };
  const viewportCoordinates = { textContent: '' };
  const canvas = {
    getBoundingClientRect() {
      return { width: 800, height: 600 };
    },
  };
  const previousDocument = globalThis.document;
  const mockDocument = { title: '' };
  globalThis.document = mockDocument;

  try {
    renderHypernodeMetadata(graphTitle, viewportCoordinates, canvas, {
      name: '2026-03-09',
      viewport: {
        panX: -100,
        panY: 50,
        zoom: 2,
      },
    });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(graphTitle.textContent, '2026-03-09');
  assert.equal(viewportCoordinates.textContent, 'x: 250  y: 125');
  assert.equal(mockDocument.title, 'hypernode: 2026-03-09');
});
