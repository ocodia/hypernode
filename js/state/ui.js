export function clearTransientUiState(state) {
  state.ui.edgeDraft = null;
  state.ui.edgeTwangId = null;
  state.ui.editingNodeId = null;
  state.ui.focusedNodeId = null;
  state.ui.starterNodeId = null;
  state.ui.editingFrameId = null;
  state.ui.isPanning = false;
  state.ui.isDragging = false;
  state.ui.isResizing = false;
  state.ui.isConnecting = false;
  state.ui.isDrawingFrame = false;
  state.ui.frameDraft = null;
  state.ui.frameMembershipPreview = {};
  state.ui.nodeMembershipPreview = {};
  state.ui.isMarqueeSelecting = false;
  state.ui.selectionMarquee = null;
}
