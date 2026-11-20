import sanitize from 'sanitize-html';

/**
 * Clean rich text from the editor (notices, process documents) before saving or showing it.
 * Keeps normal formatting, tables and images; removes scripts, event handlers and
 * javascript: links so pasted content can never run code in another admin's browser.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitize(html, {
    allowedTags: [
      'p', 'br', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr',
      'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      '*': ['class', 'style'],
    },
    allowedClasses: { '*': [/^ql-/] }, // Quill editor formatting classes
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
        'text-align': [/^(left|right|center|justify)$/],
        'font-weight': [/^(bold|normal|\d{3})$/],
        'font-style': [/^(italic|normal)$/],
        'text-decoration': [/^[a-z\s-]+$/],
        'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}
