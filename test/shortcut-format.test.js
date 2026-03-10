import test from 'node:test';
import assert from 'node:assert/strict';

import { formatShortcutLabel } from '../js/utils/shortcuts.js';

test('formatShortcutLabel uses Ctrl on non-Apple platforms', () => {
  assert.equal(
    formatShortcutLabel('Ctrl/Cmd + Shift + Enter', { appleDevice: false }),
    'Ctrl + Shift + Enter',
  );
});

test('formatShortcutLabel uses Cmd on Apple platforms', () => {
  assert.equal(
    formatShortcutLabel('Ctrl/Cmd + Shift + Enter', { appleDevice: true }),
    'Cmd + Shift + Enter',
  );
});

test('formatShortcutLabel supports compact toolbar output', () => {
  assert.equal(
    formatShortcutLabel('Ctrl/Cmd + /', { appleDevice: true, compact: true }),
    'Cmd+/',
  );
  assert.equal(
    formatShortcutLabel('Ctrl/Cmd + 0', { appleDevice: false, compact: true }),
    'Ctrl+0',
  );
});
