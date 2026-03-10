import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesShortcutSearch, normalizeShortcutSearchText } from '../js/utils/shortcut-search.js';

test('normalizeShortcutSearchText expands shortcut punctuation and aliases', () => {
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /ctrl/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /command/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + ,'), /comma/);
  assert.match(normalizeShortcutSearchText('Ctrl/Cmd + /'), /slash/);
  assert.match(normalizeShortcutSearchText('Shift + ?'), /question mark/);
});

test('matchesShortcutSearch supports token-based action and key matching', () => {
  const searchText = normalizeShortcutSearchText([
    'Open keyboard shortcuts',
    'Opens the keyboard shortcuts dialog.',
    'Ctrl/Cmd + /',
    'Ctrl+/',
    'shortcuts help keys dialog',
  ].join(' '));

  assert.equal(matchesShortcutSearch('keyboard shortcuts', searchText), true);
  assert.equal(matchesShortcutSearch('open dialog', searchText), true);
  assert.equal(matchesShortcutSearch('ctrl slash', searchText), true);
  assert.equal(matchesShortcutSearch('?', searchText), false);
});
