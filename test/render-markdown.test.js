import test from 'node:test';
import assert from 'node:assert/strict';

import { renderDescriptionMarkdown } from '../js/render/markdown.js';
import { renderFrames } from '../js/render/modules/frames.js';
import { renderNodes } from '../js/render/modules/nodes.js';
import { renderFocusOverlay } from '../js/render/modules/ui.js';

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
    '<p>Line one line two</p><ul><li>item with <a href="https://example.net/" target="_blank" rel="noopener noreferrer">link</a> and <code>code</code></li></ul><p>broken</p>',
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
  assert.match(nodesLayer.innerHTML, /<textarea class="node__editor-textarea" data-node-edit-description="n1"># Title/);

  renderFrames(framesLayer, {
    nodes: [],
    frames: [{ id: 'f1', title: 'Frame', description: markdown, x: 0, y: 0, width: 320, height: 200 }],
    selection: { type: 'frame', id: 'f1' },
    ui: { editingFrameId: null, edgeDraft: null, frameDraft: null, frameMembershipPreview: {} },
  });
  assert.match(framesLayer.innerHTML, /<div class="frame__description"><h1>Title<\/h1><p>Visit <a href="https:\/\/example.net\/"/);
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
  assert.match(focusLayer.innerHTML, /focus-overlay__panel node node--image is-editing/);
  assert.match(focusLayer.innerHTML, /node__content node__content--focus node__content--focus-image/);
  assert.match(focusLayer.innerHTML, /node__editor-label--description-focus/);
  assert.match(focusLayer.innerHTML, /node__focus-media/);
  assert.match(focusLayer.innerHTML, /node__image-pane node__image-pane--focus/);
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

  assert.match(focusLayer.innerHTML, /node__focus-fields/);
  assert.doesNotMatch(focusLayer.innerHTML, /node__focus-label/);
  assert.match(focusLayer.innerHTML, /node__focus-value--description/);
  assert.match(focusLayer.innerHTML, /bi-pencil-fill/);
});
