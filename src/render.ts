import { DIFF_STYLE_TEXT, ROOT_CLASS, STYLE_ATTRIBUTE } from './constants';
import { diffChildren } from './diff';
import { parseHtmlToVNode } from './parse';
import type {
  DiffOptions,
  DiffResult,
  DiffStats,
  ElementVNode,
  RenderHtmlDiffOptions,
  RenderMode,
  RenderResult,
  RootVNode,
  TextVNode,
  VNode
} from './types';
import { attrsEqual, cloneStats, countRenderableNodes, createStats } from './utils';

export function diffHtml(oldHtml: string, newHtml: string, options: DiffOptions = {}): DiffResult {
  const oldTree = parseHtmlToVNode(oldHtml, options);
  const newTree = parseHtmlToVNode(newHtml, options);
  const stats = createStats();
  const documentNode = document.implementation.createHTMLDocument('html-diff');
  const fragment = mergeNodes(oldTree, newTree, documentNode, stats) as DocumentFragment;

  return {
    fragment,
    stats
  };
}

export function createHtmlDiffFragment(
  oldHtml: string,
  newHtml: string,
  options: DiffOptions = {}
): DocumentFragment {
  return diffHtml(oldHtml, newHtml, options).fragment;
}

export function createHtmlDiffHtml(
  oldHtml: string,
  newHtml: string,
  options: DiffOptions = {}
): string {
  const documentNode = document.implementation.createHTMLDocument('html-diff-serialize');
  const stats = createStats();
  const merged = mergeNodes(
    parseHtmlToVNode(oldHtml, options),
    parseHtmlToVNode(newHtml, options),
    documentNode,
    stats
  );

  const wrapper = documentNode.createElement('div');
  wrapper.appendChild(merged.cloneNode(true));
  return wrapper.innerHTML;
}

export function renderHtmlDiff(options: RenderHtmlDiffOptions): RenderResult {
  const requestedMode = options.mode ?? 'shadow';
  const oldTree = parseHtmlToVNode(options.oldHtml, options);
  const newTree = parseHtmlToVNode(options.newHtml, options);
  const stats = createStats();
  const ownerDocument = options.container.ownerDocument ?? document;
  const mergedFragment = mergeNodes(oldTree, newTree, ownerDocument, stats) as DocumentFragment;
  const mode = resolveRenderMode(options.container, requestedMode);

  const root = ownerDocument.createElement('div');
  root.className = ROOT_CLASS;
  root.dataset.htmlDiff = 'root';

  const content = ownerDocument.createElement('div');
  content.className = 'shd-content';
  content.appendChild(mergedFragment);
  root.appendChild(content);

  const html = root.innerHTML;
  const mountResult = mountIntoContainer(options.container, root, mode);
  const exportedFragment = ownerDocument.createDocumentFragment();
  exportedFragment.appendChild(root.cloneNode(true));

  return {
    fragment: exportedFragment,
    stats: cloneStats(stats),
    root,
    shadowRoot: mountResult.shadowRoot,
    html,
    destroy: mountResult.destroy
  };
}

function resolveRenderMode(container: HTMLElement, requestedMode: RenderMode): RenderMode {
  if (requestedMode !== 'shadow') {
    return requestedMode;
  }

  return typeof container.attachShadow === 'function' ? 'shadow' : 'scoped';
}

function mountIntoContainer(
  container: HTMLElement,
  root: HTMLElement,
  mode: RenderMode
): { destroy: () => void; shadowRoot?: ShadowRoot } {
  container.replaceChildren();

  if (mode === 'shadow' && typeof container.attachShadow === 'function') {
    const mountHost = (container.ownerDocument ?? document).createElement('div');
    mountHost.dataset.htmlDiffMount = 'shadow-host';
    container.appendChild(mountHost);

    const shadowRoot = mountHost.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(createStyleNode(container.ownerDocument ?? document));
    shadowRoot.appendChild(root);

    return {
      shadowRoot,
      destroy: () => {
        container.replaceChildren();
      }
    };
  }

  if (mode === 'scoped') {
    container.appendChild(createStyleNode(container.ownerDocument ?? document));
  }

  container.appendChild(root);

  return {
    destroy: () => {
      container.replaceChildren();
    }
  };
}

function createStyleNode(documentNode: Document): HTMLStyleElement {
  const style = documentNode.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, '');
  style.textContent = DIFF_STYLE_TEXT;
  return style;
}

function mergeNodes(
  oldNode: VNode | undefined,
  newNode: VNode | undefined,
  documentNode: Document,
  stats: DiffStats
): Node {
  if (!oldNode && !newNode) {
    return documentNode.createDocumentFragment();
  }

  if (!oldNode && newNode) {
    return wrapAddedNode(newNode, documentNode, stats);
  }

  if (oldNode && !newNode) {
    return wrapRemovedNode(oldNode, documentNode, stats);
  }

  if (!oldNode || !newNode) {
    return documentNode.createDocumentFragment();
  }

  if (oldNode.type === 'root' && newNode.type === 'root') {
    return mergeRoot(oldNode, newNode, documentNode, stats);
  }

  if (oldNode.type !== newNode.type) {
    stats.modified += 1;
    return createReplacementFragment(oldNode, newNode, documentNode, stats);
  }

  if (oldNode.type === 'text' && newNode.type === 'text') {
    return mergeText(oldNode, newNode, documentNode, stats);
  }

  if (oldNode.type !== 'element' || newNode.type !== 'element') {
    stats.modified += 1;
    return createReplacementFragment(oldNode, newNode, documentNode, stats);
  }

  if (oldNode.tagName !== newNode.tagName) {
    stats.modified += 1;
    return createReplacementFragment(oldNode, newNode, documentNode, stats);
  }

  if (oldNode.tagName === 'img') {
    return mergeImage(oldNode, newNode, documentNode, stats);
  }

  return mergeElement(oldNode, newNode, documentNode, stats);
}

function mergeRoot(
  oldNode: RootVNode,
  newNode: RootVNode,
  documentNode: Document,
  stats: DiffStats
): DocumentFragment {
  const fragment = documentNode.createDocumentFragment();
  const patches = diffChildren(oldNode.children, newNode.children);

  patches.forEach(patch => {
    if (patch.status === 'added') {
      fragment.appendChild(wrapAddedNode(patch.node, documentNode, stats));
      return;
    }

    if (patch.status === 'removed') {
      fragment.appendChild(wrapRemovedNode(patch.node, documentNode, stats));
      return;
    }

    fragment.appendChild(mergeNodes(patch.oldNode, patch.newNode, documentNode, stats));
  });

  return fragment;
}

function mergeText(
  oldNode: TextVNode,
  newNode: TextVNode,
  documentNode: Document,
  stats: DiffStats
): Node {
  if (oldNode.text === newNode.text) {
    return documentNode.createTextNode(newNode.text);
  }

  stats.modified += 1;

  const wrapper = documentNode.createElement('span');
  wrapper.className = 'shd-text-diff';
  wrapper.appendChild(createTextMarker('del', 'removed', oldNode.text, documentNode));
  wrapper.appendChild(createTextMarker('ins', 'added', newNode.text, documentNode));
  return wrapper;
}

function mergeElement(
  oldNode: ElementVNode,
  newNode: ElementVNode,
  documentNode: Document,
  stats: DiffStats
): HTMLElement {
  const element = documentNode.createElement(newNode.tagName);
  applyAttrs(element, newNode.attrs);

  if (!attrsEqual(oldNode.attrs, newNode.attrs)) {
    stats.modified += 1;
  }

  const patches = diffChildren(oldNode.children, newNode.children);
  patches.forEach(patch => {
    if (patch.status === 'added') {
      element.appendChild(wrapAddedNode(patch.node, documentNode, stats));
      return;
    }

    if (patch.status === 'removed') {
      element.appendChild(wrapRemovedNode(patch.node, documentNode, stats));
      return;
    }

    element.appendChild(mergeNodes(patch.oldNode, patch.newNode, documentNode, stats));
  });

  return element;
}

function mergeImage(
  oldNode: ElementVNode,
  newNode: ElementVNode,
  documentNode: Document,
  stats: DiffStats
): Node {
  if (oldNode.attrs.src === newNode.attrs.src && attrsEqual(oldNode.attrs, newNode.attrs)) {
    const element = documentNode.createElement('img');
    applyAttrs(element, newNode.attrs);
    return element;
  }

  stats.modified += 1;
  const wrapper = createImageWrapper('modified', 'Image replaced', documentNode);
  const oldImage = documentNode.createElement('img');
  oldImage.className = 'shd-image-old';
  applyAttrs(oldImage, oldNode.attrs);
  oldImage.title = 'Previous image';

  const newImage = documentNode.createElement('img');
  newImage.className = 'shd-image-new';
  applyAttrs(newImage, newNode.attrs);
  newImage.title = 'Current image';

  wrapper.appendChild(oldImage);
  wrapper.appendChild(newImage);
  return wrapper;
}

function wrapAddedNode(node: VNode, documentNode: Document, stats: DiffStats): Node {
  return wrapAddedNodeInternal(node, documentNode, stats, true);
}

function wrapAddedNodeInternal(
  node: VNode,
  documentNode: Document,
  stats: DiffStats,
  shouldCount: boolean
): Node {
  if (shouldCount) {
    stats.added += countRenderableNodes(node);
  }

  if (node.type === 'root') {
    const fragment = documentNode.createDocumentFragment();
    node.children.forEach(child => {
      fragment.appendChild(wrapAddedNodeInternal(child, documentNode, stats, false));
    });
    return fragment;
  }

  if (node.type === 'text') {
    return createTextMarker('ins', 'added', node.text, documentNode);
  }

  if (node.tagName === 'img') {
    const wrapper = createImageWrapper('added', 'Image added', documentNode);
    const image = documentNode.createElement('img');
    image.className = 'shd-image-added';
    applyAttrs(image, node.attrs);
    wrapper.appendChild(image);
    return wrapper;
  }

  const element = documentNode.createElement(node.tagName);
  applyAttrs(element, node.attrs);
  applyDiffState(element, 'added');
  node.children.forEach(child => {
    element.appendChild(wrapAddedNodeInternal(child, documentNode, stats, false));
  });
  return element;
}

function wrapRemovedNode(node: VNode, documentNode: Document, stats: DiffStats): Node {
  return wrapRemovedNodeInternal(node, documentNode, stats, true);
}

function wrapRemovedNodeInternal(
  node: VNode,
  documentNode: Document,
  stats: DiffStats,
  shouldCount: boolean
): Node {
  if (shouldCount) {
    stats.removed += countRenderableNodes(node);
  }

  if (node.type === 'root') {
    const fragment = documentNode.createDocumentFragment();
    node.children.forEach(child => {
      fragment.appendChild(wrapRemovedNodeInternal(child, documentNode, stats, false));
    });
    return fragment;
  }

  if (node.type === 'text') {
    return createTextMarker('del', 'removed', node.text, documentNode);
  }

  if (node.tagName === 'img') {
    const wrapper = createImageWrapper('removed', 'Image removed', documentNode);
    const image = documentNode.createElement('img');
    image.className = 'shd-image-removed';
    applyAttrs(image, node.attrs);
    wrapper.appendChild(image);
    return wrapper;
  }

  const element = documentNode.createElement(node.tagName);
  applyAttrs(element, node.attrs);
  applyDiffState(element, 'removed');
  node.children.forEach(child => {
    element.appendChild(wrapRemovedNodeInternal(child, documentNode, stats, false));
  });
  return element;
}

function createReplacementFragment(
  oldNode: VNode,
  newNode: VNode,
  documentNode: Document,
  stats: DiffStats
): DocumentFragment {
  const fragment = documentNode.createDocumentFragment();
  fragment.appendChild(wrapRemovedNode(oldNode, documentNode, stats));
  fragment.appendChild(wrapAddedNode(newNode, documentNode, stats));
  return fragment;
}

function createTextMarker(
  tagName: 'del' | 'ins',
  state: 'added' | 'removed',
  text: string,
  documentNode: Document
): HTMLElement {
  const element = documentNode.createElement(tagName);
  applyDiffState(element, state);
  element.textContent = text;
  return element;
}

function createImageWrapper(
  kind: 'added' | 'removed' | 'modified',
  label: string,
  documentNode: Document
): HTMLElement {
  const wrapper = documentNode.createElement('span');
  wrapper.className = 'shd-image-wrapper';
  wrapper.dataset.diffKind = kind;
  wrapper.dataset.diffLabel = label;
  return wrapper;
}

function applyAttrs(element: HTMLElement, attrs: Record<string, string>): void {
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function applyDiffState(element: HTMLElement, state: 'added' | 'removed'): void {
  element.setAttribute('data-shd-state', state);
}
