import { Action } from '../input/Input';
import { Renderer } from '../render/Renderer';

export interface Scene {
  update(dt: number): void;
  render(r: Renderer): void;
  onAction(a: Action): void;
  /** Called when the tab is hidden/shown. */
  onVisibility?(visible: boolean): void;
  dispose?(): void;
}
