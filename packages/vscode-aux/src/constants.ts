/**
 * Standard Aurelia 2 Binding Commands
 */
export const AURELIA_COMMANDS: Record<string, { label: string; doc: string; insertSnippet?: string }> = {
  bind: {
    label: 'bind',
    doc: 'Default Aurelia binding command. Automatically uses two-way binding for form inputs and to-view for other HTML elements/attributes.',
    insertSnippet: 'bind="$1"',
  },
  trigger: {
    label: 'trigger',
    doc: 'Attaches a standard DOM event listener directly to the element. Calls the specified ViewModel method when the event fires.',
    insertSnippet: 'trigger="$1($event)"',
  },
  capture: {
    label: 'capture',
    doc: 'Attaches a DOM event listener during the capturing phase rather than the bubbling phase.',
    insertSnippet: 'capture="$1($event)"',
  },
  'two-way': {
    label: 'two-way',
    doc: 'Forces bidirectional synchronization between the ViewModel property and the View element value.',
    insertSnippet: 'two-way="$1"',
  },
  'to-view': {
    label: 'to-view',
    doc: 'One-way data binding from the ViewModel to the View. Changes to the ViewModel update the DOM.',
    insertSnippet: 'to-view="$1"',
  },
  'from-view': {
    label: 'from-view',
    doc: 'One-way data binding from the View back to the ViewModel. Changes in the DOM update the ViewModel.',
    insertSnippet: 'from-view="$1"',
  },
  'one-time': {
    label: 'one-time',
    doc: 'One-time data binding. Renders the initial ViewModel value once and unsubscribes from future changes.',
    insertSnippet: 'one-time="$1"',
  },
  for: {
    label: 'for',
    doc: 'Iterates over a collection or array using repeat.for="item of items".',
    insertSnippet: 'for="${1:item} of ${2:items}"',
  },
  attr: {
    label: 'attr',
    doc: 'Explicitly binds to an HTML attribute rather than a DOM property (e.g. width.attr, role.attr).',
    insertSnippet: 'attr="$1"',
  },
  class: {
    label: 'class',
    doc: 'Binds class names dynamically to the element.',
    insertSnippet: 'class="$1"',
  },
  style: {
    label: 'style',
    doc: 'Binds inline CSS style declarations dynamically.',
    insertSnippet: 'style="$1"',
  },
};

/**
 * Standard Aurelia 2 Template Directives
 */
export const AURELIA_DIRECTIVES: Record<string, { label: string; doc: string; insertSnippet: string }> = {
  'if.bind': {
    label: 'if.bind',
    doc: 'Conditionally creates or destroys DOM elements based on truthiness.',
    insertSnippet: 'if.bind="$1"',
  },
  else: {
    label: 'else',
    doc: 'Follows an if.bind element to provide an alternative branch.',
    insertSnippet: 'else',
  },
  'repeat.for': {
    label: 'repeat.for',
    doc: 'Repeats a template for every item in an array or iterable.',
    insertSnippet: 'repeat.for="${1:item} of ${2:items}"',
  },
  'switch.bind': {
    label: 'switch.bind',
    doc: 'Evaluates an expression and renders matching case blocks.',
    insertSnippet: 'switch.bind="$1"',
  },
  case: {
    label: 'case',
    doc: 'Renders this block when matching the parent switch.bind expression value.',
    insertSnippet: 'case="$1"',
  },
  'default-case': {
    label: 'default-case',
    doc: 'Fallback block rendered when no case matches the switch.bind expression.',
    insertSnippet: 'default-case',
  },
  'promise.bind': {
    label: 'promise.bind',
    doc: 'Renders asynchronous pending, then, and catch states from a Promise.',
    insertSnippet: 'promise.bind="$1"',
  },
  portal: {
    label: 'portal',
    doc: 'Teleports the rendered DOM subtree into a target container (e.g. portal="body").',
    insertSnippet: 'portal="${1:body}"',
  },
  ref: {
    label: 'ref',
    doc: 'Creates a direct reference to the DOM element or custom element ViewModel instance.',
    insertSnippet: 'ref="$1"',
  },
  containerless: {
    label: 'containerless',
    doc: 'Instructs Aurelia to replace the custom element host with its template contents in the DOM.',
    insertSnippet: 'containerless',
  },
  'as-custom-element': {
    label: 'as-custom-element',
    doc: 'Explicitly sets the HTML custom element tag name for the template.',
    insertSnippet: 'as-custom-element="$1"',
  },
};

/**
 * Built-in contextual variables available inside Aurelia templates
 */
export const AURELIA_CONTEXT_VARIABLES: Record<string, { label: string; doc: string; type: string }> = {
  $event: {
    label: '$event',
    doc: 'The native DOM Event object passed to .trigger or .capture handlers.',
    type: 'Event | CustomEvent | MouseEvent | KeyboardEvent',
  },
  $this: {
    label: '$this',
    doc: 'The current ViewModel instance context.',
    type: 'any',
  },
  $parent: {
    label: '$parent',
    doc: 'The parent binding context when nested inside repeaters or scopes.',
    type: 'any',
  },
  $index: {
    label: '$index',
    doc: 'The current 0-based iteration index inside a repeat.for loop.',
    type: 'number',
  },
  $first: {
    label: '$first',
    doc: 'True if the current item is the first element in repeat.for.',
    type: 'boolean',
  },
  $last: {
    label: '$last',
    doc: 'True if the current item is the last element in repeat.for.',
    type: 'boolean',
  },
  $even: {
    label: '$even',
    doc: 'True if the current iteration index is even in repeat.for.',
    type: 'boolean',
  },
  $odd: {
    label: '$odd',
    doc: 'True if the current iteration index is odd in repeat.for.',
    type: 'boolean',
  },
  $length: {
    label: '$length',
    doc: 'Total number of items in the repeated collection.',
    type: 'number',
  },
};

/**
 * Standard HTML5 / MDN Attributes per tag name
 */
export const MDN_HTML_ATTRIBUTES: Record<string, string[]> = {
  global: [
    'id',
    'class',
    'style',
    'title',
    'hidden',
    'tabindex',
    'role',
    'aria-label',
    'aria-hidden',
    'aria-disabled',
    'aria-invalid',
    'aria-describedby',
    'aria-live',
    'data-',
  ],
  select: ['name', 'disabled', 'required', 'multiple', 'size', 'autofocus', 'form'],
  input: [
    'type',
    'name',
    'value',
    'placeholder',
    'disabled',
    'required',
    'readonly',
    'autocomplete',
    'autofocus',
    'min',
    'max',
    'step',
    'checked',
    'pattern',
  ],
  button: ['type', 'disabled', 'name', 'value', 'form', 'autofocus'],
  label: ['for', 'form'],
  option: ['value', 'selected', 'disabled', 'label'],
  textarea: ['name', 'rows', 'cols', 'placeholder', 'disabled', 'required', 'readonly', 'autofocus'],
};
