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
  text: string;
}

interface TextMatch {
  oldStart: number;
  newStart: number;
  length: number;
}

type TextBlockIndex = Map<string, number[]>;

const MAX_TEXT_DIFF_MATRIX_CELLS = 16384;
const MAX_TEXT_MATCH_BLOCK_SIZE = 4;
const MAX_TEXT_MATCH_STACK_DEPTH = 256;
const MAX_TEXT_MATCH_CANDIDATES = 256;

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

  return tokenOperationsToSegments(diffTextTokens(oldTokens, newTokens));
}

function tokenizeText(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let currentType: 'word' | 'space' | null = null;

  for (const character of text) {
    const type = getTextTokenCharacterType(character);

    if (type === 'word' || type === 'space') {
      if (currentType === type) {
        current += character;
        continue;
      }

      if (current) {
        tokens.push(current);
      }

      current = character;
      currentType = type;
      continue;
    }

    if (current) {
      tokens.push(current);
      current = '';
      currentType = null;
    }

    tokens.push(character);
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function getTextTokenCharacterType(character: string): 'word' | 'space' | 'symbol' {
  if (isTextWhitespace(character)) {
    return 'space';
  }

  if (isTextWordCharacter(character)) {
    return 'word';
  }

  return 'symbol';
}

function isTextWhitespace(character: string): boolean {
  const code = character.charCodeAt(0);

  if (code === 9 || code === 10 || code === 12 || code === 13 || code === 32 || code === 160) {
    return true;
  }

  return /\s/.test(character);
}

function isTextWordCharacter(character: string): boolean {
  const code = character.charCodeAt(0);

  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 35 ||
    code === 64 ||
    code === 95
  );
}

function diffTextTokens(oldTokens: string[], newTokens: string[]): TokenDiffOperation[] {
  // Small text nodes use exact LCS so inline replacements stay minimal. Larger nodes switch
  // to matching blocks to avoid allocating an oldTokens x newTokens matrix.
  if (oldTokens.length * newTokens.length > MAX_TEXT_DIFF_MATRIX_CELLS) {
    return diffTextTokensByMatchingBlocks(oldTokens, newTokens);
  }

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

function diffTextTokensByMatchingBlocks(
  oldTokens: string[],
  newTokens: string[]
): TokenDiffOperation[] {
  const operations: TokenDiffOperation[] = [];
  const blockIndexes = createTextBlockIndexes(newTokens);
  const matches = findTextMatches(oldTokens, newTokens, blockIndexes);
  let oldIndex = 0;
  let newIndex = 0;

  matches.push({
    oldStart: oldTokens.length,
    newStart: newTokens.length,
    length: 0
  });

  matches.forEach(match => {
    if (oldIndex < match.oldStart) {
      pushTokenOperationRange(operations, 'removed', oldTokens, oldIndex, match.oldStart);
    }

    if (newIndex < match.newStart) {
      pushTokenOperationRange(operations, 'added', newTokens, newIndex, match.newStart);
    }

    if (match.length > 0) {
      pushTokenOperationRange(
        operations,
        'equal',
        newTokens,
        match.newStart,
        match.newStart + match.length
      );
    }

    oldIndex = match.oldStart + match.length;
    newIndex = match.newStart + match.length;
  });

  return operations;
}

// Recursively find the longest stable token runs, then diff the gaps around them.
// The prebuilt indexes are shared across ranges so long text does not rebuild maps repeatedly.
function findTextMatches(
  oldTokens: string[],
  newTokens: string[],
  blockIndexes: TextBlockIndex[]
): TextMatch[] {
  const matches: TextMatch[] = [];
  const stack: Array<{
    oldStart: number;
    oldEnd: number;
    newStart: number;
    newEnd: number;
    depth: number;
  }> = [
    {
      oldStart: 0,
      oldEnd: oldTokens.length,
      newStart: 0,
      newEnd: newTokens.length,
      depth: 0
    }
  ];

  while (stack.length > 0) {
    const range = stack.pop();

    if (!range || range.oldStart >= range.oldEnd || range.newStart >= range.newEnd) {
      continue;
    }

    if (range.depth >= MAX_TEXT_MATCH_STACK_DEPTH) {
      continue;
    }

    const match = findBestTextMatch(
      oldTokens,
      newTokens,
      range.oldStart,
      range.oldEnd,
      range.newStart,
      range.newEnd,
      blockIndexes
    );

    if (!match || match.length === 0) {
      continue;
    }

    matches.push(match);

    stack.push({
      oldStart: match.oldStart + match.length,
      oldEnd: range.oldEnd,
      newStart: match.newStart + match.length,
      newEnd: range.newEnd,
      depth: range.depth + 1
    });
    stack.push({
      oldStart: range.oldStart,
      oldEnd: match.oldStart,
      newStart: range.newStart,
      newEnd: match.newStart,
      depth: range.depth + 1
    });
  }

  matches.sort((left, right) => left.oldStart - right.oldStart || left.newStart - right.newStart);
  return matches;
}

function findBestTextMatch(
  oldTokens: string[],
  newTokens: string[],
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number,
  blockIndexes: TextBlockIndex[]
): TextMatch | null {
  let best: TextMatch | null = null;
  const maxBlockSize = Math.min(MAX_TEXT_MATCH_BLOCK_SIZE, oldEnd - oldStart, newEnd - newStart);

  for (let blockSize = maxBlockSize; blockSize >= 1; blockSize -= 1) {
    const newBlockIndex = blockIndexes[blockSize];

    for (let oldIndex = oldStart; oldIndex <= oldEnd - blockSize; oldIndex += 1) {
      const positions = newBlockIndex.get(createTextBlockKey(oldTokens, oldIndex, blockSize));

      if (!positions) {
        continue;
      }

      let checkedCandidates = 0;
      const firstCandidate = findFirstPositionAtOrAfter(positions, newStart);

      for (let index = firstCandidate; index < positions.length; index += 1) {
        const newIndex = positions[index];

        if (newIndex > newEnd - blockSize) {
          break;
        }

        checkedCandidates += 1;

        if (checkedCandidates > MAX_TEXT_MATCH_CANDIDATES) {
          break;
        }

        const match = expandTextMatch(
          oldTokens,
          newTokens,
          oldIndex,
          newIndex,
          blockSize,
          oldStart,
          oldEnd,
          newStart,
          newEnd
        );

        if (
          !best ||
          match.length > best.length ||
          (match.length === best.length &&
            (match.oldStart < best.oldStart ||
              (match.oldStart === best.oldStart && match.newStart < best.newStart)))
        ) {
          best = match;
        }
      }
    }

    if (best) {
      return best;
    }
  }

  return best;
}

// Build token block indexes once per long text diff. Each token position appears in at most
// MAX_TEXT_MATCH_BLOCK_SIZE indexes, keeping memory linear in the token count.
function findFirstPositionAtOrAfter(positions: number[], target: number): number {
  let low = 0;
  let high = positions.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (positions[middle] < target) {
      low = middle + 1;
      continue;
    }

    high = middle;
  }

  return low;
}

function createTextBlockIndexes(tokens: string[]): TextBlockIndex[] {
  const indexes: TextBlockIndex[] = [];
  const maxBlockSize = Math.min(MAX_TEXT_MATCH_BLOCK_SIZE, tokens.length);

  for (let blockSize = 1; blockSize <= maxBlockSize; blockSize += 1) {
    indexes[blockSize] = createTextBlockIndex(tokens, blockSize);
  }

  return indexes;
}

function createTextBlockIndex(tokens: string[], blockSize: number): TextBlockIndex {
  const index: TextBlockIndex = new Map();

  for (let position = 0; position <= tokens.length - blockSize; position += 1) {
    const key = createTextBlockKey(tokens, position, blockSize);
    const positions = index.get(key);

    if (positions) {
      positions.push(position);
      continue;
    }

    index.set(key, [position]);
  }

  return index;
}

function createTextBlockKey(tokens: string[], start: number, blockSize: number): string {
  let key = tokens[start];

  for (let offset = 1; offset < blockSize; offset += 1) {
    key += '\u0000' + tokens[start + offset];
  }

  return key;
}

function expandTextMatch(
  oldTokens: string[],
  newTokens: string[],
  oldIndex: number,
  newIndex: number,
  blockSize: number,
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number
): TextMatch {
  let matchOldStart = oldIndex;
  let matchNewStart = newIndex;
  let length = blockSize;

  while (
    matchOldStart > oldStart &&
    matchNewStart > newStart &&
    oldTokens[matchOldStart - 1] === newTokens[matchNewStart - 1]
  ) {
    matchOldStart -= 1;
    matchNewStart -= 1;
    length += 1;
  }

  while (
    matchOldStart + length < oldEnd &&
    matchNewStart + length < newEnd &&
    oldTokens[matchOldStart + length] === newTokens[matchNewStart + length]
  ) {
    length += 1;
  }

  return {
    oldStart: matchOldStart,
    newStart: matchNewStart,
    length
  };
}

function pushTokenOperation(
  operations: TokenDiffOperation[],
  type: TokenDiffOperation['type'],
  token: string
): void {
  const previous = operations[operations.length - 1];

  if (previous && previous.type === type) {
    previous.text += token;
    return;
  }

  operations.push({
    type,
    text: token
  });
}

function pushTokenOperationRange(
  operations: TokenDiffOperation[],
  type: TokenDiffOperation['type'],
  tokens: string[],
  start: number,
  end: number
): void {
  for (let index = start; index < end; index += 1) {
    pushTokenOperation(operations, type, tokens[index]);
  }
}

function tokenOperationsToSegments(operations: TokenDiffOperation[]): TextDiffSegment[] {
  const segments: TextDiffSegment[] = [];

  operations.forEach(operation => {
    if (operation.text) {
      segments.push({
        type: operation.type,
        text: operation.text
      });
    }
  });

  return mergeTextSegments(segments);
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
