export function bindNodeInteractions({ nodesLayer, selectionControlsLayer, focusLayer }, handlers) {
  nodesLayer.addEventListener('pointerdown', handlers.onNodePointerDown);
  nodesLayer.addEventListener('dblclick', handlers.onNodeDoubleClick);
  nodesLayer.addEventListener('pointermove', handlers.onNodePointerMove);
  nodesLayer.addEventListener('pointerup', handlers.onNodePointerUp);
  nodesLayer.addEventListener('pointercancel', handlers.onNodePointerCancel);
  nodesLayer.addEventListener('lostpointercapture', handlers.onNodeLostPointerCapture);
  nodesLayer.addEventListener('click', handlers.onNodeClick);
  nodesLayer.addEventListener('keydown', handlers.onNodeKeyDown);
  nodesLayer.addEventListener('input', handlers.onNodeInput);

  selectionControlsLayer?.addEventListener('pointerdown', handlers.onSelectionControlsPointerDown);
  selectionControlsLayer?.addEventListener('click', handlers.onSelectionControlsClick);
  selectionControlsLayer?.addEventListener('dblclick', handlers.onSelectionControlsDoubleClick);
  selectionControlsLayer?.addEventListener('keydown', handlers.onSelectionControlsKeyDown);
  selectionControlsLayer?.addEventListener('input', handlers.onSelectionControlsInput);
  selectionControlsLayer?.addEventListener('change', handlers.onSelectionControlsChange);
  selectionControlsLayer?.addEventListener('focusout', handlers.onSelectionControlsFocusOut);

  focusLayer?.addEventListener('click', handlers.onNodeClick);
  focusLayer?.addEventListener('keydown', handlers.onNodeKeyDown);
  focusLayer?.addEventListener('input', handlers.onNodeInput);
  focusLayer?.addEventListener('input', handlers.onSelectionControlsInput);
  focusLayer?.addEventListener('change', handlers.onSelectionControlsChange);
}
