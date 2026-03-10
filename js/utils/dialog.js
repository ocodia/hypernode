export function isDialogBackdropTarget(dialog, eventTarget) {
  return Boolean(dialog) && eventTarget === dialog;
}
