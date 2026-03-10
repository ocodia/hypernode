import test from 'node:test';
import assert from 'node:assert/strict';

import { isDialogBackdropTarget } from '../js/utils/dialog.js';

test('isDialogBackdropTarget only returns true for direct dialog backdrop clicks', () => {
  const dialog = { id: 'settings-dialog' };
  const child = { id: 'settings-content' };

  assert.equal(isDialogBackdropTarget(dialog, dialog), true);
  assert.equal(isDialogBackdropTarget(dialog, child), false);
  assert.equal(isDialogBackdropTarget(null, child), false);
});
