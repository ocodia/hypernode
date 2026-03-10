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
