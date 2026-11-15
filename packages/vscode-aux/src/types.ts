/**
 * Represents a member of an Aurelia ViewModel class.
 */
export interface ViewModelMember {
  name: string;
  kind: 'property' | 'getter' | 'method';
  typeString: string;
  isBindable: boolean;
  docComment?: string;
  offset: number;
  length: number;
  line: number;
  column: number;
  parameters?: { name: string; type: string }[];
}

/**
 * Information extracted from the <script> block.
 */
export interface ScriptAnalysis {
  className: string;
  members: Map<string, ViewModelMember>;
  scriptStartOffset: number;
  scriptEndOffset: number;
  hasScript: boolean;
}

/**
 * A binding command found on an element in the <template>.
 */
export interface TemplateBinding {
  targetAttribute: string;
  command: string; // e.g. "bind", "trigger", "for"
  expression: string;
  fullAttributeName: string;
  nameRange: { start: number; end: number };
  valueRange: { start: number; end: number };
  elementTagName: string;
}

/**
 * An interpolation expression: ${...} found in the <template>.
 */
export interface TemplateInterpolation {
  expression: string;
  range: { start: number; end: number };
}

/**
 * Analysis of the <template> block.
 */
export interface TemplateAnalysis {
  bindings: TemplateBinding[];
  interpolations: TemplateInterpolation[];
  templateStartOffset: number;
  templateEndOffset: number;
  rawHtml: string;
}

/**
 * Full analysis result for an .aux file.
 */
export interface AuxDocumentAnalysis {
  script: ScriptAnalysis;
  template: TemplateAnalysis;
}
