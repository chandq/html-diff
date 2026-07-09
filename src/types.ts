export interface RootVNode {
  type: 'root';
  children: VNode[];
}

export interface TextVNode {
  type: 'text';
  text: string;
}

export interface ElementVNode {
  type: 'element';
  tagName: string;
  attrs: Record<string, string>;
  children: VNode[];
}

export type VNode = RootVNode | TextVNode | ElementVNode;

export type Patch =
  | { status: 'added'; node: VNode }
  | { status: 'removed'; node: VNode }
  | { status: 'merged'; oldNode: VNode; newNode: VNode };

export interface DiffOptions {
  ignoreWhitespace?: boolean;
}

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
}

export type RenderMode = 'shadow' | 'scoped' | 'none';

export interface RenderHtmlDiffOptions extends DiffOptions {
  container: HTMLElement;
  oldHtml: string;
  newHtml: string;
  mode?: RenderMode;
}

export interface DiffResult {
  fragment: DocumentFragment;
  stats: DiffStats;
}

export interface RenderResult extends DiffResult {
  root: HTMLElement;
  shadowRoot?: ShadowRoot;
  html: string;
  destroy: () => void;
}
