import type { TemplateMetaBindable } from './compiler.js';

export interface TransformedSetup {
  moduleImports: string[];
  moduleConsts: string[];
  classFields: string[];
  classMethods: string[];
  inferredBindables: Record<string, TemplateMetaBindable>;
}

function prefixClassFieldReferences(
  body: string,
  fieldNames: Set<string>,
  params: string,
): string {
  if (fieldNames.size === 0) return body;

  const paramNames = new Set<string>();
  params.split(',').forEach((p) => {
    const m = /([a-zA-Z0-9_$]+)/.exec(p.trim());
    if (m && m[1]) paramNames.add(m[1]);
  });

  // Mask string literals and comments so identifiers within them are never rewritten
  const stringTokens: string[] = [];
  let maskedBody = body.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,
    (str) => {
      stringTokens.push(str);
      return `__AU_STR_TOKEN_${stringTokens.length - 1}__`;
    },
  );

  for (const field of fieldNames) {
    if (paramNames.has(field)) continue;

    // Match field when not preceded by dot, declaration keyword, or followed by colon in object literal
    const regex = new RegExp(`(?<![.\\w$])(${field})(?![$\\w])`, 'g');
    maskedBody = maskedBody.replace(regex, (match, _p1, offset, fullStr) => {
      const before = fullStr.slice(Math.max(0, offset - 25), offset);
      if (/\b(?:let|const|var|function|class|type|interface|as|catch\s*\(?)\s+$/.test(before)) {
        return match;
      }
      const after = fullStr.slice(offset + match.length, offset + match.length + 20);
      if (/^\s*\??:(?!:)/.test(after)) {
        return match; // Object property key or interface/type property (e.g. { stats: ... } or { stats?: ... })
      }
      if (/[,{]\s*$/.test(before) && /^\s*[,}]/.test(after)) {
        return `${match}: this.${match}`; // Object shorthand expansion
      }
      return `this.${match}`;
    });
  }

  // Restore string literals and comments
  const restoredBody = maskedBody.replace(
    /__AU_STR_TOKEN_(\d+)__/g,
    (_, idx) => stringTokens[Number(idx)] ?? '',
  );

  return restoredBody;
}

/**
 * Transforms an ergonomic <script setup> block into canonical Aurelia 2 class members
 * and automatically infers bindables without needing boilerplate <template bindable="...">.
 */
export function transformScriptSetup(setupCode: string): TransformedSetup {
  const moduleImports: string[] = [];
  const moduleConsts: string[] = [];
  const classFields: string[] = [];
  const classMethods: string[] = [];
  const inferredBindables: Record<string, TemplateMetaBindable> = {};
  const declaredFieldNames = new Set<string>();

  const rawMethods: Array<{ isAsync: boolean; funcName: string; params: string; body: string }> = [];
  const rawGetters: Array<{ propName: string; returnType: string; body: string }> = [];
  const rawSetters: Array<{ propName: string; params: string; body: string }> = [];

  // Strip block comments and single-line comments for clean statement parsing
  // while preserving string literals
  const lines = setupCode.split('\n');
  const buffer: string[] = [];

  let inMultiLineComment = false;

  for (const line of lines) {
    let cleaned = line;
    if (inMultiLineComment) {
      const endComment = cleaned.indexOf('*/');
      if (endComment !== -1) {
        cleaned = cleaned.slice(endComment + 2);
        inMultiLineComment = false;
      } else {
        continue;
      }
    }

    const startComment = cleaned.indexOf('/*');
    if (startComment !== -1) {
      const endComment = cleaned.indexOf('*/', startComment + 2);
      if (endComment !== -1) {
        cleaned = cleaned.slice(0, startComment) + cleaned.slice(endComment + 2);
      } else {
        cleaned = cleaned.slice(0, startComment);
        inMultiLineComment = true;
      }
    }

    // Strip single-line comments not inside quotes
    const singleComment = cleaned.indexOf('//');
    if (singleComment !== -1) {
      // Basic check: Ensure // is not inside a string literal
      const pre = cleaned.slice(0, singleComment);
      const singleQuotes = (pre.match(/'/g) || []).length;
      const doubleQuotes = (pre.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        cleaned = pre;
      }
    }

    buffer.push(cleaned);
  }

  const rawCode = buffer.join('\n');

  // Extract defineProps
  // Matches defineProps<{ title: string; count?: number }>() or defineProps(['title', 'count'])
  const definePropsGenericMatch = /defineProps\s*<\s*\{([^}]+)\}\s*>\s*\(\s*\)/.exec(rawCode);
  if (definePropsGenericMatch && definePropsGenericMatch[1]) {
    const propsString = definePropsGenericMatch[1];
    const propLines = propsString.split(/[;,]/);
    for (const pl of propLines) {
      const trimmed = pl.trim();
      if (!trimmed) continue;
      const propMatch = /^([a-zA-Z0-9_$]+)(\??)\s*:\s*(.+)$/.exec(trimmed);
      if (propMatch && propMatch[1] && propMatch[3]) {
        const propName = propMatch[1];
        const modifier = propMatch[2] === '?' ? '?' : '!';
        const propType = propMatch[3].trim();
        inferredBindables[propName] = { name: propName };
        declaredFieldNames.add(propName);
        classFields.push(`public ${propName}${modifier}: ${propType};`);
      }
    }
  }

  const definePropsArrayMatch = /defineProps\s*\(\s*\[([^\]]+)\]\s*\)/.exec(rawCode);
  if (definePropsArrayMatch && definePropsArrayMatch[1]) {
    const propNames = definePropsArrayMatch[1].split(',');
    for (const rawName of propNames) {
      const propName = rawName.replace(/['"\s]/g, '').trim();
      if (propName && /^[a-zA-Z0-9_$]+$/.test(propName)) {
        inferredBindables[propName] = { name: propName };
        declaredFieldNames.add(propName);
        classFields.push(`public ${propName}: unknown;`);
      }
    }
  }

  // Parse statements by scanning through rawCode
  let pos = 0;
  const len = rawCode.length;

  while (pos < len) {
    // Skip whitespace
    while (pos < len && /\s/.test(rawCode[pos]!)) {
      pos++;
    }
    if (pos >= len) break;

    // 1. Imports
    if (rawCode.slice(pos).startsWith('import ')) {
      let end = rawCode.indexOf(';', pos);
      if (end === -1) end = rawCode.indexOf('\n', pos);
      if (end === -1) end = len;
      else end = end + 1;

      const stmt = rawCode.slice(pos, end).trim();
      if (stmt) moduleImports.push(stmt);
      pos = end;
      continue;
    }

    // 2. Skip defineProps assignment or invocation if already handled
    if (/^(?:const\s+[a-zA-Z0-9_$]+\s*=\s*)?defineProps/.test(rawCode.slice(pos))) {
      let end = rawCode.indexOf(';', pos);
      if (end === -1) end = rawCode.indexOf('\n', pos);
      if (end === -1) end = len;
      else end = end + 1;
      pos = end;
      continue;
    }

    // 3. TypeScript Type Aliases: (export )?type Name<...> = ...;
    const typeMatch = /^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)/.exec(rawCode.slice(pos));
    if (typeMatch) {
      let cur = pos;
      let pDepth = 0;
      let bDepth = 0;
      let cDepth = 0;
      let aDepth = 0;
      while (cur < len) {
        const ch = rawCode[cur]!;
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth = Math.max(0, pDepth - 1);
        else if (ch === '[') bDepth++;
        else if (ch === ']') bDepth = Math.max(0, bDepth - 1);
        else if (ch === '{') cDepth++;
        else if (ch === '}') cDepth = Math.max(0, cDepth - 1);
        else if (ch === '<') aDepth++;
        else if (ch === '>') aDepth = Math.max(0, aDepth - 1);
        else if (ch === ';' && pDepth === 0 && bDepth === 0 && cDepth === 0 && aDepth === 0) {
          cur++;
          break;
        }
        cur++;
      }
      const stmt = rawCode.slice(pos, cur).trim();
      if (stmt) moduleConsts.push(stmt.endsWith(';') ? stmt : stmt + ';');
      pos = cur;
      continue;
    }

    // 4. TypeScript Interfaces: (export )?interface Name { ... }
    const ifaceMatch = /^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)(?:<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{/.exec(rawCode.slice(pos));
    if (ifaceMatch) {
      const headerLength = ifaceMatch[0].length;
      let braceDepth = 1;
      let bodyEnd = pos + headerLength;
      while (braceDepth > 0 && bodyEnd < len) {
        const ch = rawCode[bodyEnd]!;
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        bodyEnd++;
      }
      const stmt = rawCode.slice(pos, bodyEnd).trim();
      if (stmt) moduleConsts.push(stmt);
      pos = bodyEnd;
      continue;
    }

    // 5. Getters: (public )?get name() (: type)? { ... }
    const getterMatch = /^(?:export\s+)?(?:public\s+)?get\s+([a-zA-Z0-9_$]+)\s*\(\)\s*(?::\s*([^{]+))?\s*\{/.exec(rawCode.slice(pos));
    if (getterMatch) {
      const propName = getterMatch[1]!;
      const returnType = getterMatch[2]?.trim() ? `: ${getterMatch[2].trim()}` : '';
      const headerLength = getterMatch[0].length;

      let braceDepth = 1;
      let bodyEnd = pos + headerLength;
      while (braceDepth > 0 && bodyEnd < len) {
        const ch = rawCode[bodyEnd]!;
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        bodyEnd++;
      }

      const body = rawCode.slice(pos + headerLength, bodyEnd - 1).trim();
      rawGetters.push({ propName, returnType, body });

      pos = bodyEnd;
      continue;
    }

    // 6. Setters: (public )?set name(param) { ... }
    const setterMatch = /^(?:export\s+)?(?:public\s+)?set\s+([a-zA-Z0-9_$]+)\s*\(([^)]+)\)\s*(?::\s*([^{]+))?\s*\{/.exec(rawCode.slice(pos));
    if (setterMatch) {
      const propName = setterMatch[1]!;
      const params = setterMatch[2]!;
      const headerLength = setterMatch[0].length;

      let braceDepth = 1;
      let bodyEnd = pos + headerLength;
      while (braceDepth > 0 && bodyEnd < len) {
        const ch = rawCode[bodyEnd]!;
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        bodyEnd++;
      }

      const body = rawCode.slice(pos + headerLength, bodyEnd - 1).trim();
      rawSetters.push({ propName, params, body });

      pos = bodyEnd;
      continue;
    }

    // 7. Top-level functions & methods: function name(...) { ... }, async name(...) { ... }, name(...) { ... }
    const funcMatch = /^(?:export\s+)?(?:public\s+)?(async\s+)?(?:function\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*\{/.exec(rawCode.slice(pos));
    const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'do', 'return', 'import', 'export', 'type', 'interface', 'class', 'const', 'let', 'var', 'get', 'set']);
    if (funcMatch && !KEYWORDS.has(funcMatch[2]!)) {
      const isAsync = Boolean(funcMatch[1]);
      const funcName = funcMatch[2]!;
      const params = funcMatch[3]!;
      const headerLength = funcMatch[0].length;

      // Find matching closing brace
      let braceDepth = 1;
      let bodyEnd = pos + headerLength;

      while (braceDepth > 0 && bodyEnd < len) {
        const ch = rawCode[bodyEnd]!;
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        bodyEnd++;
      }

      const body = rawCode.slice(pos + headerLength, bodyEnd - 1).trim();
      rawMethods.push({ isAsync, funcName, params, body });

      pos = bodyEnd;
      continue;
    }

    // 8. Top-level let / var declarations (auto-inferred bindables & class fields)
    const letHeaderMatch = /^(?:export\s+)?(?:let|var)\s+([a-zA-Z0-9_$]+)/.exec(rawCode.slice(pos));
    if (letHeaderMatch) {
      const varName = letHeaderMatch[1]!;
      declaredFieldNames.add(varName);
      let cur = pos + letHeaderMatch[0].length;
      let pDepth = 0;
      let bDepth = 0;
      let cDepth = 0;
      let aDepth = 0;
      let equalPos = -1;

      while (cur < len) {
        const ch = rawCode[cur]!;
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth = Math.max(0, pDepth - 1);
        else if (ch === '[') bDepth++;
        else if (ch === ']') bDepth = Math.max(0, bDepth - 1);
        else if (ch === '{') cDepth++;
        else if (ch === '}') cDepth = Math.max(0, cDepth - 1);
        else if (ch === '<') aDepth++;
        else if (ch === '>') aDepth = Math.max(0, aDepth - 1);
        else if (ch === '=' && equalPos === -1 && pDepth === 0 && bDepth === 0 && cDepth === 0 && aDepth === 0) {
          equalPos = cur;
        } else if (ch === ';' && pDepth === 0 && bDepth === 0 && cDepth === 0 && aDepth === 0) {
          cur++;
          break;
        } else if (ch === '\n' && pDepth === 0 && bDepth === 0 && cDepth === 0 && aDepth === 0) {
          break;
        }
        cur++;
      }

      let typeAnno: string | undefined;
      let initVal: string | undefined;

      if (equalPos !== -1) {
        const typePart = rawCode.slice(pos + letHeaderMatch[0].length, equalPos).trim();
        if (typePart.startsWith(':')) {
          typeAnno = typePart.slice(1).trim();
        }
        initVal = rawCode.slice(equalPos + 1, cur).replace(/;$/, '').trim();
      } else {
        const rest = rawCode.slice(pos + letHeaderMatch[0].length, cur).replace(/;$/, '').trim();
        if (rest.startsWith(':')) {
          typeAnno = rest.slice(1).trim();
        }
      }

      // If variable doesn't start with private prefix '_', treat as bindable
      if (!varName.startsWith('_')) {
        const isTwoWay = varName === 'value' || varName === 'checked' || varName === 'model';
        inferredBindables[varName] = isTwoWay
          ? { name: varName, mode: 6 }
          : { name: varName };
      }

      let fieldStr = `  public ${varName}`;
      if (typeAnno) fieldStr += `: ${typeAnno}`;
      if (initVal) fieldStr += ` = ${initVal}`;
      fieldStr += ';';

      classFields.push(fieldStr);
      pos = cur;
      continue;
    }

    // 9. Top-level const declarations (module-level constants, preserving export)
    const constHeaderMatch = /^(?:export\s+)?const\s+([a-zA-Z0-9_$]+)/.exec(rawCode.slice(pos));
    if (constHeaderMatch) {
      let cur = pos;
      let pDepth = 0;
      let bDepth = 0;
      let cDepth = 0;
      while (cur < len) {
        const ch = rawCode[cur]!;
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth = Math.max(0, pDepth - 1);
        else if (ch === '[') bDepth++;
        else if (ch === ']') bDepth = Math.max(0, bDepth - 1);
        else if (ch === '{') cDepth++;
        else if (ch === '}') cDepth = Math.max(0, cDepth - 1);
        else if (ch === ';' && pDepth === 0 && bDepth === 0 && cDepth === 0) {
          cur++;
          break;
        }
        cur++;
      }
      const rawStmt = rawCode.slice(pos, cur).trim();
      if (rawStmt) {
        moduleConsts.push(rawStmt.endsWith(';') ? rawStmt : rawStmt + ';');
      }
      pos = cur;
      continue;
    }

    // Fallback: Skip unknown statement up to semicolon or newline
    let nextSemi = rawCode.indexOf(';', pos);
    let nextNl = rawCode.indexOf('\n', pos);
    let advanceTo = len;
    if (nextSemi !== -1 && nextNl !== -1) {
      advanceTo = Math.min(nextSemi, nextNl) + 1;
    } else if (nextSemi !== -1) {
      advanceTo = nextSemi + 1;
    } else if (nextNl !== -1) {
      advanceTo = nextNl + 1;
    }
    pos = advanceTo;
  }

  for (const getter of rawGetters) {
    const transformedBody = prefixClassFieldReferences(getter.body, declaredFieldNames, '');
    classMethods.push(`  get ${getter.propName}()${getter.returnType} {\n    ${transformedBody}\n  }`);
  }

  for (const setter of rawSetters) {
    const transformedBody = prefixClassFieldReferences(setter.body, declaredFieldNames, setter.params);
    classMethods.push(`  set ${setter.propName}(${setter.params}) {\n    ${transformedBody}\n  }`);
  }

  for (const method of rawMethods) {
    const transformedBody = prefixClassFieldReferences(method.body, declaredFieldNames, method.params);
    classMethods.push(`  ${method.isAsync ? 'async ' : ''}${method.funcName}(${method.params}) {\n    ${transformedBody}\n  }`);
  }

  return {
    moduleImports,
    moduleConsts,
    classFields,
    classMethods,
    inferredBindables,
  };
}
