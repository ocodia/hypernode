const TOKEN_ALIASES = [
  { pattern: /\?/g, replacement: ' question mark ' },
  { pattern: /\//g, replacement: ' slash ' },
  { pattern: /,/g, replacement: ' comma ' },
  { pattern: /\+/g, replacement: ' plus ' },
];

export function normalizeShortcutSearchText(value) {
  let text = String(value ?? '').trim().toLowerCase();
  for (const alias of TOKEN_ALIASES) {
    text = text.replace(alias.pattern, alias.replacement);
  }
  return text
    .replace(/ctrl\/cmd/g, 'ctrl cmd command control')
    .replace(/cmd/g, 'cmd command')
    .replace(/ctrl/g, 'ctrl control')
    .replace(/esc/g, 'esc escape')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesShortcutSearch(query, searchText) {
  const normalizedQuery = normalizeShortcutSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const normalizedSearchText = normalizeShortcutSearchText(searchText);
  if (!normalizedSearchText) {
    return false;
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  return queryTokens.every((token) => normalizedSearchText.includes(token));
}
