export function bindFrameInteractions({ framesLayer }, handlers) {
  framesLayer.addEventListener('pointerdown', handlers.onFramePointerDown);
  framesLayer.addEventListener('pointermove', handlers.onFramePointerMove);
  framesLayer.addEventListener('pointerup', handlers.onFramePointerUp);
  framesLayer.addEventListener('pointercancel', handlers.onFramePointerCancel);
  framesLayer.addEventListener('lostpointercapture', handlers.onFrameLostPointerCapture);
  framesLayer.addEventListener('click', handlers.onFrameClick);
  framesLayer.addEventListener('keydown', handlers.onFrameKeyDown);
  framesLayer.addEventListener('input', handlers.onFrameInput);
}
