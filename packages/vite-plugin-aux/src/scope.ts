/**
 * Scopes CSS rules to a specific component scope attribute [data-scopeId].
 */
export function scopeCss(css: string, scopeId: string): string {
  // Scope each selector outside of at-rules
  return css.replace(
    /([^\r\n,{}]+)(,(?=[^{}]*\{)|(?:\s*\{))/g,
    (match, selector, suffix) => {
      const trimmed = selector.trim();
      if (
        !trimmed ||
        trimmed.startsWith('@') ||
        trimmed.startsWith(':root') ||
        trimmed.startsWith('from') ||
        trimmed.startsWith('to') ||
        /^\d+%$/.test(trimmed)
      ) {
        return match;
      }

      const isBlockOpen = suffix.includes('{');

      const scopedSelector = trimmed
        .split(',')
        .map((part: string) => {
          const s = part.trim();
          if (!s) return s;

          // Handle pseudo-classes/elements: button:hover -> button[data-scopeId]:hover
          const pseudoMatch = /(:{1,2}[a-zA-Z0-9_-]+.*)$/.exec(s);
          if (pseudoMatch) {
            const base = s.slice(0, pseudoMatch.index);
            const pseudo = pseudoMatch[1];
            return `${base}[data-${scopeId}]${pseudo}`;
          }
          return `${s}[data-${scopeId}]`;
        })
        .join(', ');

      return `${scopedSelector}${isBlockOpen ? ' {' : ', '}`;
    }
  );
}

/**
 * Injects data-scopeId into HTML tags in the template for scoped CSS matching.
 */
export function injectScopeToTemplate(templateHtml: string, scopeId: string): string {
  return templateHtml.replace(
    /<([a-zA-Z0-9_-]+)(\s*|\s+[^>]*?)(\/?)>/g,
    (match, tagName, attrs, selfClose) => {
      const lower = tagName.toLowerCase();
      // Skip meta-tags
      if (lower === 'template' || lower === 'au-slot') {
        return match;
      }
      const trimmedAttrs = attrs ? ` ${attrs.trim()}` : '';
      return `<${tagName} data-${scopeId}${trimmedAttrs}${selfClose ? ' /' : ''}>`;
    }
  );
}
