import { parseAttrs } from './parser.js';
import { injectScopeToTemplate, scopeCss } from './scope.js';
import { transformScriptSetup } from './setup.js';
import type { AuxDescriptor, AuxPluginOptions } from './types.js';

/**
 * Convert PascalCase or camelCase to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert kebab-case or snake_case to PascalCase.
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Find the primary exported or declared class name in the script block.
 */
export function findExportedClassName(scriptCode: string): string | null {
  const defaultClassMatch = /export\s+default\s+class\s+([a-zA-Z0-9_$]+)/.exec(scriptCode);
  if (defaultClassMatch && defaultClassMatch[1]) return defaultClassMatch[1];

  const exportClassMatch = /export\s+class\s+([a-zA-Z0-9_$]+)/.exec(scriptCode);
  if (exportClassMatch && exportClassMatch[1]) return exportClassMatch[1];

  const classMatch = /class\s+([a-zA-Z0-9_$]+)/.exec(scriptCode);
  if (classMatch && classMatch[1]) return classMatch[1];

  return null;
}

/**
 * Derive custom element tag name according to HTML spec (requires a hyphen).
 */
export function deriveTagName(
  filename: string,
  className?: string | null,
  explicitName?: string | null,
): string {
  if (explicitName && explicitName.includes('-')) {
    return explicitName;
  }

  // Derive from exported class name according to Aurelia convention (e.g. UiSelect -> ui-select)
  if (className && className !== 'Component') {
    const fromClass = toKebabCase(className);
    if (fromClass.includes('-')) {
      return fromClass;
    }
  }

  const base = filename.split('/').pop()?.replace(/\.aux(\?.*)?$/, '') || 'component';
  let name = base;
  if (/^[A-Z]/.test(name)) {
    name = toKebabCase(name);
  }

  // HTML Custom Elements standard requires at least one hyphen
  if (!name.includes('-')) {
    if (className && className !== 'Component') {
      name = toKebabCase(className);
    }
    if (!name.includes('-')) {
      name = `au-${name}`;
    }
  }

  return name;
}

export interface TemplateMetaBindable {
  name: string;
  attribute?: string;
  mode?: number;
}

export interface StrippedTemplateMeta {
  html: string;
  imports: string[];
  bindables: Record<string, TemplateMetaBindable>;
  containerless: boolean;
  shadowMode: 'open' | 'closed' | null;
  aliases: string[];
  capture: boolean;
}

/**
 * Map Aurelia binding mode string to numeric BindingMode enum value:
 * oneTime = 1, toView / oneWay = 2, fromView = 4, twoWay = 6.
 */
function parseBindingMode(mode?: string): number | undefined {
  if (!mode) return undefined;
  const normalized = toKebabCase(mode);
  if (normalized === 'one-time') return 1;
  if (normalized === 'one-way' || normalized === 'to-view') return 2;
  if (normalized === 'from-view') return 4;
  if (normalized === 'two-way') return 6;
  return undefined;
}

/**
 * Extracts and strips Aurelia 2 template metadata tags (<import>, <require>,
 * <bindable>, <containerless>, <use-shadow-dom>, <alias>, <capture>) from the
 * inner HTML of a <template> block.
 */
export function extractTemplateMeta(rawHtml: string): StrippedTemplateMeta {
  const imports: string[] = [];
  const bindables: Record<string, TemplateMetaBindable> = {};
  let containerless = false;
  let shadowMode: 'open' | 'closed' | null = null;
  const aliases: string[] = [];
  let capture = false;

  const metaTagRegex =
    /<(import|require|bindable|containerless|use-shadow-dom|alias|capture)\b([^>]*?)(?:\/>|>\s*<\/\1>|>)/gi;

  const html = rawHtml.replace(metaTagRegex, (fullMatch, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const attrs = parseAttrs(rawAttrs || '');

    if (tag === 'import' || tag === 'require') {
      const from = typeof attrs['from'] === 'string' ? attrs['from'].trim() : '';
      if (from) {
        imports.push(from);
      }
      return '';
    }

    if (tag === 'bindable') {
      const name =
        typeof attrs['name'] === 'string'
          ? attrs['name'].trim()
          : typeof attrs['property'] === 'string'
            ? attrs['property'].trim()
            : '';
      if (name) {
        const entry: TemplateMetaBindable = { name };
        if (typeof attrs['attribute'] === 'string' && attrs['attribute'].trim()) {
          entry.attribute = attrs['attribute'].trim();
        }
        const mode =
          typeof attrs['mode'] === 'string' ? parseBindingMode(attrs['mode']) : undefined;
        if (mode !== undefined) {
          entry.mode = mode;
        }
        bindables[name] = entry;
      }
      return '';
    }

    if (tag === 'containerless') {
      containerless = true;
      return '';
    }

    if (tag === 'use-shadow-dom') {
      shadowMode = attrs['mode'] === 'closed' ? 'closed' : 'open';
      return '';
    }

    if (tag === 'alias') {
      const nameAttr = typeof attrs['name'] === 'string' ? attrs['name'] : '';
      for (const item of nameAttr.split(',')) {
        const trimmed = item.trim();
        if (trimmed) aliases.push(trimmed);
      }
      return '';
    }

    if (tag === 'capture') {
      capture = true;
      return '';
    }

    return fullMatch;
  });

  return {
    html: html.trim(),
    imports,
    bindables,
    containerless,
    shadowMode,
    aliases,
    capture,
  };
}

/**
 * Compiles a .aux descriptor into a complete TypeScript/JavaScript module
 * following Aurelia 2 CustomElement conventions.
 */
export function compileAux(
  descriptor: AuxDescriptor,
  options: AuxPluginOptions = {},
): { code: string; styles: { index: number; css: string; scoped: boolean }[] } {
  const { filename, template, script, styles, scopeId } = descriptor;

  // Determine explicit tag name if specified on <template as-custom-element="..."> or <template name="...">
  const explicitName =
    (template?.attrs['as-custom-element'] as string) ||
    (template?.attrs['name'] as string) ||
    null;

  const scriptContent = script ? script.content.trim() : '';
  const detectedClass = scriptContent ? findExportedClassName(scriptContent) : null;
  const baseFile = filename.split('/').pop()?.replace(/\.aux(\?.*)?$/, '') || 'AuxComponent';
  const className = detectedClass || toPascalCase(baseFile);
  const tagName = options.tagNameResolver
    ? options.tagNameResolver(filename, className)
    : deriveTagName(filename, className, explicitName);

  // Extract Aurelia template metadata tags (<import>, <bindable>, <containerless>, etc.)
  const rawInnerTemplate = (template ? template.content : '<au-slot></au-slot>').trim();
  const templateMeta = extractTemplateMeta(rawInnerTemplate);

  // Merge <template bindable="a, b"> attribute with <bindable> child tags
  const templateBindables: Record<string, TemplateMetaBindable> = { ...templateMeta.bindables };
  const bindableAttr = template?.attrs['bindable'];
  if (typeof bindableAttr === 'string') {
    for (const part of bindableAttr.split(',')) {
      const bName = part.trim();
      if (bName && !templateBindables[bName]) {
        templateBindables[bName] = { name: bName };
      }
    }
  }

  // Process <script setup> if present (auto-infer bindables and convert to Aurelia class)
  const setupScript = descriptor.setupScript;
  const serverScript = descriptor.serverScript;
  const isClientOnly = Boolean(template?.attrs['client-only'] || template?.attrs['clientOnly']);
  const isServerOnly = Boolean(template?.attrs['server-only'] || template?.attrs['serverOnly']);

  const transformedSetup = setupScript ? transformScriptSetup(setupScript.content) : null;
  if (transformedSetup) {
    Object.assign(templateBindables, transformedSetup.inferredBindables);
  }

  // Merge <template alias="a, b"> attribute with <alias> child tags
  const aliases = [...templateMeta.aliases];
  const aliasAttr = template?.attrs['alias'];
  if (typeof aliasAttr === 'string') {
    for (const part of aliasAttr.split(',')) {
      const aName = part.trim();
      if (aName && !aliases.includes(aName)) {
        aliases.push(aName);
      }
    }
  }

  // Check if scoped styles are present
  const hasScopedStyle = styles.some((s) => s.scoped);
  let rawTemplateHtml = templateMeta.html;

  if (hasScopedStyle) {
    rawTemplateHtml = injectScopeToTemplate(rawTemplateHtml, scopeId);
  }

  // Containerless & Shadow DOM options
  const isContainerless =
    templateMeta.containerless ||
    Boolean(template?.attrs['containerless']) ||
    Boolean(options.containerless);

  const shadowAttr =
    (template?.attrs['shadow'] as string | boolean | undefined) ??
    (template?.attrs['use-shadow-dom'] as string | boolean | undefined);

  const shadowMode: 'open' | 'closed' | undefined =
    templateMeta.shadowMode ??
    (typeof shadowAttr === 'string' && (shadowAttr === 'open' || shadowAttr === 'closed')
      ? shadowAttr
      : shadowAttr === true
        ? 'open'
        : options.shadowOptions?.mode);

  const isCapture = templateMeta.capture || Boolean(template?.attrs['capture']);

  // Process style blocks
  const compiledStyles = styles.map((styleBlock, index) => {
    let css = styleBlock.content;
    if (styleBlock.scoped) {
      css = scopeCss(css, scopeId);
    }
    return {
      index,
      css,
      scoped: Boolean(styleBlock.scoped),
    };
  });

  // Prepare header and imports
  const useShadowCss = Boolean(shadowMode && compiledStyles.length > 0);
  const aureliaImports = useShadowCss
    ? `CustomElement as __au_CE, shadowCSS as __au_shadowCSS`
    : `CustomElement as __au_CE`;

  const headerLines: string[] = [`import { ${aureliaImports} } from 'aurelia';`];
  const dependencyIdentifiers: string[] = [];

  // Hoist module imports extracted from <script setup>
  if (transformedSetup && transformedSetup.moduleImports.length > 0) {
    headerLines.push(...transformedSetup.moduleImports);
  }

  // Emit imports from <import from="..."> / <require from="...">
  templateMeta.imports.forEach((importPath, index) => {
    const depIdent = `__au_dep_${index}`;
    headerLines.push(`import * as ${depIdent} from ${JSON.stringify(importPath)};`);
    dependencyIdentifiers.push(depIdent);
  });

  // In Light DOM, import virtual CSS modules so Vite's CSS pipeline processes and hot-reloads them.
  // In Shadow DOM, register styles via Aurelia's shadowCSS() in the element's dependencies.
  if (useShadowCss) {
    compiledStyles.forEach((styleObj) => {
      dependencyIdentifiers.push(`__au_shadowCSS(${JSON.stringify(styleObj.css)})`);
    });
  } else {
    for (let index = 0; index < styles.length; index++) {
      headerLines.push(
        `import ${JSON.stringify(`${filename}?aux&type=style&index=${index}.css`)};`,
      );
    }
  }

  const templateConstant = `const __au_template = ${JSON.stringify(rawTemplateHtml)};`;

  // Build definition options
  const defOptions: string[] = [
    `  name: ${JSON.stringify(tagName)},`,
    `  template: __au_template,`,
  ];
  if (dependencyIdentifiers.length > 0) {
    defOptions.push(`  dependencies: [${dependencyIdentifiers.join(', ')}],`);
  }
  if (isContainerless) {
    defOptions.push(`  containerless: true,`);
  }
  if (shadowMode) {
    defOptions.push(`  shadowOptions: { mode: ${JSON.stringify(shadowMode)} },`);
  }
  if (isCapture) {
    defOptions.push(`  capture: true,`);
  }
  if (Object.keys(templateBindables).length > 0) {
    defOptions.push(`  bindables: ${JSON.stringify(templateBindables)},`);
  }
  if (aliases.length > 0) {
    defOptions.push(`  aliases: ${JSON.stringify(aliases)},`);
  }

  let bodyCode = '';

  if (setupScript && transformedSetup) {
    const setupConsts = transformedSetup.moduleConsts.length > 0
      ? `\n${transformedSetup.moduleConsts.join('\n')}\n`
      : '';

    bodyCode = `
${setupConsts}
export class ${className} {
${transformedSetup.classFields.join('\n')}

${transformedSetup.classMethods.join('\n')}
}

__au_CE.define({
${defOptions.join('\n')}
}, ${className});

export default ${className};
export { ${className} };
`;
  } else if (!scriptContent) {
    // Template-only component
    bodyCode = `
export class ${className} {}

__au_CE.define({
${defOptions.join('\n')}
}, ${className});

export default ${className};
`;
  } else {
    // Has script
    let processedScript = scriptContent;

    // If default anonymous class was used (e.g. export default class { ... })
    if (/export\s+default\s+class\s*\{/.test(processedScript)) {
      processedScript = processedScript.replace(
        /export\s+default\s+class\s*\{/,
        `export class ${className} {`,
      );
    }

    const hasExportDefault = /export\s+default\s+/.test(processedScript);
    const hasNamedExport = new RegExp(
      `export\\s+(?:class|const|let|var|function)\\s+${className}\\b`,
    ).test(processedScript);

    const registration = `
__au_CE.define({
${defOptions.join('\n')}
}, ${className});
`;

    const defaultExportLine = !hasExportDefault ? `\nexport default ${className};` : '';
    const namedExportLine = !hasNamedExport ? `\nexport { ${className} };` : '';

    bodyCode = `
${processedScript}
${registration}
${namedExportLine}${defaultExportLine}
`;
  }

  // Execution boundary markers
  if (isClientOnly) {
    bodyCode += `\n${className}.clientOnly = true;\n`;
  }
  if (isServerOnly) {
    bodyCode += `\n${className}.serverOnly = true;\n`;
  }

  // Co-located server script block (attached for SSR, stripped for client)
  if (serverScript && options.isServer) {
    const serverCode = serverScript.content.trim();
    const exportMatches = serverCode.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var)\s+([a-zA-Z0-9_$]+)/g);
    const serverExports: string[] = [];
    for (const m of exportMatches) {
      if (m[1]) serverExports.push(m[1]);
    }

    const strippedServerCode = serverCode
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+/g, '');

    const assignments = serverExports
      .map((exp) => `if (typeof ${exp} !== 'undefined') ${className}.${exp} = ${exp};`)
      .join('\n');

    bodyCode += `\n// --- Server-Only Script Block ---\n{\n${strippedServerCode}\n${assignments}\n}\n`;
  }

  const fullCode = `${headerLines.join('\n')}\n${templateConstant}\n${bodyCode}`.trim() + '\n';

  return {
    code: fullCode,
    styles: compiledStyles,
  };
}
