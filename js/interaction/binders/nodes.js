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

  focusLayer?.addEventListener('click', handlers.onNodeClick);
  focusLayer?.addEventListener('keydown', handlers.onNodeKeyDown);
  focusLayer?.addEventListener('input', handlers.onNodeInput);
}
