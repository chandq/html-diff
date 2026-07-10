import { ROOT_CLASS, STYLE_ATTRIBUTE, createDiffStyleText } from './constants';
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

interface TextDiffSegment {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

interface TokenDiffOperation {
  type: 'equal' | 'added' | 'removed';
  tokens: string[];
}

const TEXT_TOKEN_PATTERN = /\S+\s*|\s+/g;
const MAX_TEXT_DIFF_TOKENS = 128;
const MAX_TEXT_DIFF_MATRIX_CELLS = 4096;

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
  const mountResult = mountIntoContainer(options.container, root, mode, options.theme);
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
  mode: RenderMode,
  theme: DiffOptions['theme']
): { destroy: () => void; shadowRoot?: ShadowRoot } {
  container.replaceChildren();

  if (mode === 'shadow' && typeof container.attachShadow === 'function') {
    const mountHost = (container.ownerDocument ?? document).createElement('div');
    mountHost.dataset.htmlDiffMount = 'shadow-host';
    container.appendChild(mountHost);

    const shadowRoot = mountHost.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(createStyleNode(container.ownerDocument ?? document, theme));
    shadowRoot.appendChild(root);

    return {
      shadowRoot,
      destroy: () => {
        container.replaceChildren();
      }
    };
  }

  if (mode === 'scoped') {
    container.appendChild(createStyleNode(container.ownerDocument ?? document, theme));
  }

  container.appendChild(root);

  return {
    destroy: () => {
      container.replaceChildren();
    }
  };
}

function createStyleNode(documentNode: Document, theme: DiffOptions['theme']): HTMLStyleElement {
  const style = documentNode.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, '');
  style.textContent = createDiffStyleText(theme);
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
  const fragment = documentNode.createDocumentFragment();
  const segments = diffTextSegments(oldNode.text, newNode.text);
  let hasMarker = false;

  segments.forEach(segment => {
    if (!segment.text) {
      return;
    }

    if (segment.type === 'equal') {
      fragment.appendChild(documentNode.createTextNode(segment.text));
      return;
    }

    hasMarker = true;
    fragment.appendChild(createTextMarker(segment.type, segment.text, documentNode));
  });

  return hasMarker ? fragment : documentNode.createTextNode(newNode.text);
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
  wrapper.appendChild(
    createImageStage('Previous image', oldNode.attrs, documentNode, {
      imageClassName: 'shd-image-old',
      roleLabel: 'Before'
    })
  );
  wrapper.appendChild(
    createImageStage('Current image', newNode.attrs, documentNode, {
      roleLabel: 'After'
    })
  );
  return wrapper;
}

function wrapAddedNode(node: VNode, documentNode: Document, stats: DiffStats): Node {
  return wrapAddedNodeInternal(node, documentNode, stats, true, false);
}

function wrapAddedNodeInternal(
  node: VNode,
  documentNode: Document,
  stats: DiffStats,
  shouldCount: boolean,
  suppressNestedImageDiff: boolean
): Node {
  if (shouldCount) {
    stats.added += countRenderableNodes(node);
  }

  if (node.type === 'root') {
    const fragment = documentNode.createDocumentFragment();
    node.children.forEach(child => {
      fragment.appendChild(wrapAddedNodeInternal(child, documentNode, stats, false, false));
    });
    return fragment;
  }

  if (node.type === 'text') {
    return createTextMarker('added', node.text, documentNode);
  }

  if (node.tagName === 'img') {
    return suppressNestedImageDiff
      ? createImageNode(node.attrs, documentNode, 'Added image')
      : createStandaloneImageWrapper('added', 'Image added', node.attrs, documentNode);
  }

  const element = documentNode.createElement(node.tagName);
  applyAttrs(element, node.attrs);
  applyDiffState(element, 'added');
  applyMediaDiffState(element, node, 'added');
  node.children.forEach(child => {
    element.appendChild(wrapAddedNodeInternal(child, documentNode, stats, false, true));
  });
  return element;
}

function wrapRemovedNode(node: VNode, documentNode: Document, stats: DiffStats): Node {
  return wrapRemovedNodeInternal(node, documentNode, stats, true, false);
}

function wrapRemovedNodeInternal(
  node: VNode,
  documentNode: Document,
  stats: DiffStats,
  shouldCount: boolean,
  suppressNestedImageDiff: boolean
): Node {
  if (shouldCount) {
    stats.removed += countRenderableNodes(node);
  }

  if (node.type === 'root') {
    const fragment = documentNode.createDocumentFragment();
    node.children.forEach(child => {
      fragment.appendChild(wrapRemovedNodeInternal(child, documentNode, stats, false, false));
    });
    return fragment;
  }

  if (node.type === 'text') {
    return createTextMarker('removed', node.text, documentNode);
  }

  if (node.tagName === 'img') {
    return suppressNestedImageDiff
      ? createImageNode(node.attrs, documentNode, 'Removed image')
      : createStandaloneImageWrapper('removed', 'Image removed', node.attrs, documentNode);
  }

  const element = documentNode.createElement(node.tagName);
  applyAttrs(element, node.attrs);
  applyDiffState(element, 'removed');
  applyMediaDiffState(element, node, 'removed');
  node.children.forEach(child => {
    element.appendChild(wrapRemovedNodeInternal(child, documentNode, stats, false, true));
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
  state: 'added' | 'removed',
  text: string,
  documentNode: Document
): HTMLElement {
  const element = documentNode.createElement('span');
  element.className = 'shd-text-marker';
  element.dataset.shdMarker = 'text';
  applyDiffState(element, state);
  element.textContent = text;
  return element;
}

function diffTextSegments(oldText: string, newText: string): TextDiffSegment[] {
  const prefixLength = getCommonPrefixLength(oldText, newText);
  const suffixLength = getCommonSuffixLength(oldText, newText, prefixLength);
  const segments: TextDiffSegment[] = [];

  if (prefixLength > 0) {
    segments.push({
      type: 'equal',
      text: oldText.slice(0, prefixLength)
    });
  }

  const oldMiddle = oldText.slice(prefixLength, oldText.length - suffixLength);
  const newMiddle = newText.slice(prefixLength, newText.length - suffixLength);

  segments.push(...diffTextMiddle(oldMiddle, newMiddle));

  if (suffixLength > 0) {
    segments.push({
      type: 'equal',
      text: oldText.slice(oldText.length - suffixLength)
    });
  }

  return mergeTextSegments(segments);
}

function diffTextMiddle(oldText: string, newText: string): TextDiffSegment[] {
  if (!oldText && !newText) {
    return [];
  }

  if (!oldText) {
    return [{ type: 'added', text: newText }];
  }

  if (!newText) {
    return [{ type: 'removed', text: oldText }];
  }

  const oldTokens = tokenizeText(oldText);
  const newTokens = tokenizeText(newText);

  if (shouldFallbackToDirectTextDiff(oldTokens, newTokens)) {
    return refineReplacementSegments(oldText, newText);
  }

  return refineTokenOperations(diffTextTokens(oldTokens, newTokens));
}

function tokenizeText(text: string): string[] {
  const tokens = text.match(TEXT_TOKEN_PATTERN);
  return tokens ?? [text];
}

function shouldFallbackToDirectTextDiff(oldTokens: string[], newTokens: string[]): boolean {
  return (
    oldTokens.length > MAX_TEXT_DIFF_TOKENS ||
    newTokens.length > MAX_TEXT_DIFF_TOKENS ||
    oldTokens.length * newTokens.length > MAX_TEXT_DIFF_MATRIX_CELLS
  );
}

function diffTextTokens(oldTokens: string[], newTokens: string[]): TokenDiffOperation[] {
  const oldLength = oldTokens.length;
  const newLength = newTokens.length;
  const matrix = Array.from({ length: oldLength + 1 }, () => new Uint16Array(newLength + 1));

  for (let oldIndex = oldLength - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLength - 1; newIndex >= 0; newIndex -= 1) {
      if (oldTokens[oldIndex] === newTokens[newIndex]) {
        matrix[oldIndex][newIndex] = matrix[oldIndex + 1][newIndex + 1] + 1;
        continue;
      }

      matrix[oldIndex][newIndex] =
        matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1]
          ? matrix[oldIndex + 1][newIndex]
          : matrix[oldIndex][newIndex + 1];
    }
  }

  const operations: TokenDiffOperation[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLength && newIndex < newLength) {
    if (oldTokens[oldIndex] === newTokens[newIndex]) {
      pushTokenOperation(operations, 'equal', oldTokens[oldIndex]);
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1]) {
      pushTokenOperation(operations, 'removed', oldTokens[oldIndex]);
      oldIndex += 1;
      continue;
    }

    pushTokenOperation(operations, 'added', newTokens[newIndex]);
    newIndex += 1;
  }

  while (oldIndex < oldLength) {
    pushTokenOperation(operations, 'removed', oldTokens[oldIndex]);
    oldIndex += 1;
  }

  while (newIndex < newLength) {
    pushTokenOperation(operations, 'added', newTokens[newIndex]);
    newIndex += 1;
  }

  return operations;
}

function pushTokenOperation(
  operations: TokenDiffOperation[],
  type: TokenDiffOperation['type'],
  token: string
): void {
  const previous = operations[operations.length - 1];

  if (previous && previous.type === type) {
    previous.tokens.push(token);
    return;
  }

  operations.push({
    type,
    tokens: [token]
  });
}

function refineTokenOperations(operations: TokenDiffOperation[]): TextDiffSegment[] {
  const segments: TextDiffSegment[] = [];

  for (let index = 0; index < operations.length; index += 1) {
    const current = operations[index];
    const next = operations[index + 1];

    if (
      next &&
      current.type !== 'equal' &&
      next.type !== 'equal' &&
      current.type !== next.type
    ) {
      const removedText =
        current.type === 'removed' ? current.tokens.join('') : next.tokens.join('');
      const addedText = current.type === 'added' ? current.tokens.join('') : next.tokens.join('');

      segments.push(...refineReplacementSegments(removedText, addedText));
      index += 1;
      continue;
    }

    const text = current.tokens.join('');

    if (text) {
      segments.push({
        type: current.type,
        text
      });
    }
  }

  return mergeTextSegments(segments);
}

function refineReplacementSegments(oldText: string, newText: string): TextDiffSegment[] {
  const prefixLength = getCommonPrefixLength(oldText, newText);
  const suffixLength = getCommonSuffixLength(oldText, newText, prefixLength);
  const segments: TextDiffSegment[] = [];

  if (prefixLength > 0) {
    segments.push({
      type: 'equal',
      text: oldText.slice(0, prefixLength)
    });
  }

  const oldCore = oldText.slice(prefixLength, oldText.length - suffixLength);
  const newCore = newText.slice(prefixLength, newText.length - suffixLength);

  if (oldCore) {
    segments.push({
      type: 'removed',
      text: oldCore
    });
  }

  if (newCore) {
    segments.push({
      type: 'added',
      text: newCore
    });
  }

  if (suffixLength > 0) {
    segments.push({
      type: 'equal',
      text: oldText.slice(oldText.length - suffixLength)
    });
  }

  return segments;
}

function mergeTextSegments(segments: TextDiffSegment[]): TextDiffSegment[] {
  const merged: TextDiffSegment[] = [];

  segments.forEach(segment => {
    if (!segment.text) {
      return;
    }

    const previous = merged[merged.length - 1];

    if (previous && previous.type === segment.type) {
      previous.text += segment.text;
      return;
    }

    merged.push({
      type: segment.type,
      text: segment.text
    });
  });

  return merged;
}

function getCommonPrefixLength(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let index = 0;

  while (index < length && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function getCommonSuffixLength(left: string, right: string, prefixLength: number): number {
  const leftRemaining = left.length - prefixLength;
  const rightRemaining = right.length - prefixLength;
  const length = Math.min(leftRemaining, rightRemaining);
  let index = 0;

  while (
    index < length &&
    left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1;
  }

  return index;
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

function createStandaloneImageWrapper(
  kind: 'added' | 'removed',
  label: string,
  attrs: Record<string, string>,
  documentNode: Document
): HTMLElement {
  const wrapper = createImageWrapper(kind, label, documentNode);
  wrapper.appendChild(createImageNode(attrs, documentNode, label));
  return wrapper;
}

function createImageStage(
  title: string,
  attrs: Record<string, string>,
  documentNode: Document,
  options: {
    imageClassName?: string;
    roleLabel?: string;
  } = {}
): HTMLElement {
  const stage = documentNode.createElement('span');
  stage.className = 'shd-image-stage';

  if (options.roleLabel) {
    stage.dataset.shdImageRoleLabel = options.roleLabel;
  }

  const image = createImageNode(attrs, documentNode, title, options.imageClassName);
  stage.appendChild(image);
  return stage;
}

function createImageNode(
  attrs: Record<string, string>,
  documentNode: Document,
  title: string,
  className?: string
): HTMLImageElement {
  const image = documentNode.createElement('img');

  if (className) {
    image.className = className;
  }

  applyAttrs(image, attrs);
  image.title = title;
  return image;
}

function applyAttrs(element: HTMLElement, attrs: Record<string, string>): void {
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function applyDiffState(element: HTMLElement, state: 'added' | 'removed'): void {
  element.setAttribute('data-shd-state', state);
}

function applyMediaDiffState(
  element: HTMLElement,
  node: ElementVNode,
  state: 'added' | 'removed'
): void {
  if (!hasDirectImageChild(node)) {
    return;
  }

  element.dataset.shdMediaState = state;
  element.dataset.shdMediaLabel = state === 'added' ? 'Image added' : 'Image removed';
}

function hasDirectImageChild(node: ElementVNode): boolean {
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];

    if (child.type === 'element' && child.tagName === 'img') {
      return true;
    }
  }

  return false;
}
