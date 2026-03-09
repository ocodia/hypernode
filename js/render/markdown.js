import { escapeAttr, escapeHTML } from './helpers.js';

const HEADER_PATTERN = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const UNORDERED_LIST_PATTERN = /^([*+-])[ \t]+(.+)$/;
const ORDERED_LIST_PATTERN = /^(\d+)\.[ \t]+(.+)$/;
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function renderDescriptionMarkdown(text) {
  const source = String(text ?? '').replaceAll('\r\n', '\n').trim();
  if (!source) {
    return '';
  }

  const lines = source.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const headerMatch = lines[index].match(HEADER_PATTERN);
    if (headerMatch) {
      const level = headerMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headerMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    const unorderedMatch = lines[index].match(UNORDERED_LIST_PATTERN);
    const orderedMatch = lines[index].match(ORDERED_LIST_PATTERN);
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const pattern = ordered ? ORDERED_LIST_PATTERN : UNORDERED_LIST_PATTERN;
      const tagName = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          break;
        }
        const match = line.match(pattern);
        if (!match) {
          break;
        }
        items.push(`<li>${renderInlineMarkdown(match[2].trim())}</li>`);
        index += 1;
      }
      blocks.push(`<${tagName}>${items.join('')}</${tagName}>`);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        break;
      }
      if (paragraphLines.length === 0 && line.match(HEADER_PATTERN)) {
        break;
      }
      if (paragraphLines.length === 0 && (line.match(UNORDERED_LIST_PATTERN) || line.match(ORDERED_LIST_PATTERN))) {
        break;
      }
      paragraphLines.push(line.trim());
      index += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  return blocks.join('');
}

function renderInlineMarkdown(text) {
  const parts = [];
  let cursor = 0;
  const codePattern = /`([^`\n]+)`/g;
  let match = codePattern.exec(text);

  while (match) {
    if (match.index > cursor) {
      parts.push(renderLinkedText(text.slice(cursor, match.index)));
    }
    parts.push(`<code>${escapeHTML(match[1])}</code>`);
    cursor = match.index + match[0].length;
    match = codePattern.exec(text);
  }

  if (cursor < text.length) {
    parts.push(renderLinkedText(text.slice(cursor)));
  }

  return parts.join('');
}

function renderLinkedText(text) {
  const parts = [];
  let cursor = 0;
  while (cursor < text.length) {
    const link = consumeMarkdownLink(text, cursor);
    if (!link) {
      parts.push(renderEmphasis(text.slice(cursor)));
      break;
    }
    if (link.index > cursor) {
      parts.push(renderEmphasis(text.slice(cursor, link.index)));
    }
    const label = renderEmphasis(link.label);
    const href = sanitizeHref(link.href.trim());
    if (href) {
      parts.push(`<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    } else {
      parts.push(renderEmphasis(link.label));
    }
    cursor = link.nextIndex;
  }

  return parts.join('');
}

function renderEmphasis(text) {
  let html = escapeHTML(text);
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  return html;
}

function sanitizeHref(value) {
  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function consumeMarkdownLink(text, startIndex) {
  const openLabel = text.indexOf('[', startIndex);
  if (openLabel === -1) {
    return null;
  }
  const closeLabel = text.indexOf(']', openLabel + 1);
  if (closeLabel === -1 || text[closeLabel + 1] !== '(') {
    return null;
  }

  let depth = 0;
  let cursor = closeLabel + 2;
  for (; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (char === '(') {
      depth += 1;
      continue;
    }
    if (char === ')') {
      if (depth === 0) {
        return {
          index: openLabel,
          label: text.slice(openLabel + 1, closeLabel),
          href: text.slice(closeLabel + 2, cursor),
          nextIndex: cursor + 1,
        };
      }
      depth -= 1;
    }
  }

  return null;
}
