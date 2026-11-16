import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'resumable-todo',
  template: './resumable-todo.html'
})
export class ResumableTodo {
  @bindable taskCount = 3;
}
