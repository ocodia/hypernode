import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeShortcutSearchText } from '../js/utils/shortcut-search.js';

test('normalizeShortcutSearchText expands shortcut punctuation and aliases', () => {
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /ctrl/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /command/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /comma/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + /'), /slash/);
  assert.match(normalizeShortcutSearchText('Shift + ?'), /question mark/);
});
