import type { Patch, VNode } from './types';
import { attrsEqual, getNodeKey } from './utils';

const MAX_CHILD_DIFF_MATRIX_CELLS = 4096;
const STRONG_ALIGNMENT_SCORE = 0.95;
const MIN_ALIGNMENT_SCORE = 0.1;
const MAX_TEXT_SIMILARITY_MATRIX_CELLS = 4096;
const TEXT_WORD_PATTERN = /\S+/g;

export function isSameNode(oldNode: VNode, newNode: VNode): boolean {
  if (oldNode.type !== newNode.type) {
    return false;
  }

  if (oldNode.type === 'text' && newNode.type === 'text') {
    return true;
  }

  if (oldNode.type === 'root' && newNode.type === 'root') {
    return true;
  }

  if (oldNode.type !== 'element' || newNode.type !== 'element') {
    return false;
  }

  if (oldNode.tagName !== newNode.tagName) {
    return false;
  }

  const oldKey = getNodeKey(oldNode);
  const newKey = getNodeKey(newNode);

  if (oldKey || newKey) {
    return oldKey === newKey;
  }

  if (oldNode.tagName === 'img') {
    return true;
  }

  return true;
}

export function diffChildren(oldChildren: VNode[], newChildren: VNode[]): Patch[] {
  let start = 0;
  let oldEnd = oldChildren.length - 1;
  let newEnd = newChildren.length - 1;

  const prefix: Patch[] = [];
  const suffix: Patch[] = [];

  while (
    start <= oldEnd &&
    start <= newEnd &&
    isStrongAlignment(oldChildren[start], newChildren[start])
  ) {
    prefix.push({
      status: 'merged',
      oldNode: oldChildren[start],
      newNode: newChildren[start]
    });
    start += 1;
  }

  while (
    oldEnd >= start &&
    newEnd >= start &&
    isStrongAlignment(oldChildren[oldEnd], newChildren[newEnd])
  ) {
    suffix.push({
      status: 'merged',
      oldNode: oldChildren[oldEnd],
      newNode: newChildren[newEnd]
    });
    oldEnd -= 1;
    newEnd -= 1;
  }

  const middle = diffMiddleChildren(oldChildren, newChildren, start, oldEnd, newEnd);

  if (suffix.length > 1) {
    suffix.reverse();
  }

  const patches = new Array<Patch>(prefix.length + middle.length + suffix.length);
  let patchIndex = 0;

  for (let index = 0; index < prefix.length; index += 1) {
    patches[patchIndex] = prefix[index];
    patchIndex += 1;
  }

  for (let index = 0; index < middle.length; index += 1) {
    patches[patchIndex] = middle[index];
    patchIndex += 1;
  }

  for (let index = 0; index < suffix.length; index += 1) {
    patches[patchIndex] = suffix[index];
    patchIndex += 1;
  }

  return patches;
}

function diffMiddleChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  start: number,
  oldEnd: number,
  newEnd: number
): Patch[] {
  const oldLength = oldEnd - start + 1;
  const newLength = newEnd - start + 1;

  if (oldLength <= 0) {
    return createAddedPatches(newChildren, start, newEnd);
  }

  if (newLength <= 0) {
    return createRemovedPatches(oldChildren, start, oldEnd);
  }

  if (oldLength * newLength > MAX_CHILD_DIFF_MATRIX_CELLS) {
    return diffMiddleChildrenGreedy(oldChildren, newChildren, start, oldEnd, newEnd);
  }

  const matrix = Array.from(
    { length: oldLength + 1 },
    () => new Float32Array(newLength + 1)
  );

  for (let oldOffset = oldLength - 1; oldOffset >= 0; oldOffset -= 1) {
    for (let newOffset = newLength - 1; newOffset >= 0; newOffset -= 1) {
      const score = getAlignmentScore(
        oldChildren[start + oldOffset],
        newChildren[start + newOffset]
      );
      const diagonal =
        score >= MIN_ALIGNMENT_SCORE ? matrix[oldOffset + 1][newOffset + 1] + score : 0;
      const removed = matrix[oldOffset + 1][newOffset];
      const added = matrix[oldOffset][newOffset + 1];

      matrix[oldOffset][newOffset] = Math.max(diagonal, removed, added);
    }
  }

  const patches: Patch[] = [];
  let oldOffset = 0;
  let newOffset = 0;

  while (oldOffset < oldLength && newOffset < newLength) {
    const oldNode = oldChildren[start + oldOffset];
    const newNode = newChildren[start + newOffset];
    const score = getAlignmentScore(oldNode, newNode);
    const diagonalScore =
      score >= MIN_ALIGNMENT_SCORE ? matrix[oldOffset + 1][newOffset + 1] + score : 0;

    if (
      score >= MIN_ALIGNMENT_SCORE &&
      diagonalScore >= matrix[oldOffset + 1][newOffset] &&
      diagonalScore >= matrix[oldOffset][newOffset + 1]
    ) {
      patches.push({
        status: 'merged',
        oldNode,
        newNode
      });
      oldOffset += 1;
      newOffset += 1;
      continue;
    }

    if (matrix[oldOffset + 1][newOffset] >= matrix[oldOffset][newOffset + 1]) {
      patches.push({
        status: 'removed',
        node: oldNode
      });
      oldOffset += 1;
      continue;
    }

    patches.push({
      status: 'added',
      node: newNode
    });
    newOffset += 1;
  }

  while (oldOffset < oldLength) {
    patches.push({
      status: 'removed',
      node: oldChildren[start + oldOffset]
    });
    oldOffset += 1;
  }

  while (newOffset < newLength) {
    patches.push({
      status: 'added',
      node: newChildren[start + newOffset]
    });
    newOffset += 1;
  }

  return patches;
}

function diffMiddleChildrenGreedy(
  oldChildren: VNode[],
  newChildren: VNode[],
  start: number,
  oldEnd: number,
  newEnd: number
): Patch[] {
  const patches: Patch[] = [];
  let oldIndex = start;
  let newIndex = start;

  while (oldIndex <= oldEnd || newIndex <= newEnd) {
    if (oldIndex > oldEnd) {
      patches.push({
        status: 'added',
        node: newChildren[newIndex]
      });
      newIndex += 1;
      continue;
    }

    if (newIndex > newEnd) {
      patches.push({
        status: 'removed',
        node: oldChildren[oldIndex]
      });
      oldIndex += 1;
      continue;
    }

    const currentScore = getAlignmentScore(oldChildren[oldIndex], newChildren[newIndex]);

    if (currentScore >= MIN_ALIGNMENT_SCORE) {
      patches.push({
        status: 'merged',
        oldNode: oldChildren[oldIndex],
        newNode: newChildren[newIndex]
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (
      newIndex + 1 <= newEnd &&
      getAlignmentScore(oldChildren[oldIndex], newChildren[newIndex + 1]) >= MIN_ALIGNMENT_SCORE
    ) {
      patches.push({
        status: 'added',
        node: newChildren[newIndex]
      });
      newIndex += 1;
      continue;
    }

    if (
      oldIndex + 1 <= oldEnd &&
      getAlignmentScore(oldChildren[oldIndex + 1], newChildren[newIndex]) >= MIN_ALIGNMENT_SCORE
    ) {
      patches.push({
        status: 'removed',
        node: oldChildren[oldIndex]
      });
      oldIndex += 1;
      continue;
    }

    patches.push({
      status: 'removed',
      node: oldChildren[oldIndex]
    });
    patches.push({
      status: 'added',
      node: newChildren[newIndex]
    });
    oldIndex += 1;
    newIndex += 1;
  }

  return patches;
}

function createAddedPatches(newChildren: VNode[], start: number, end: number): Patch[] {
  const patches: Patch[] = [];

  for (let index = start; index <= end; index += 1) {
    patches.push({
      status: 'added',
      node: newChildren[index]
    });
  }

  return patches;
}

function createRemovedPatches(oldChildren: VNode[], start: number, end: number): Patch[] {
  const patches: Patch[] = [];

  for (let index = start; index <= end; index += 1) {
    patches.push({
      status: 'removed',
      node: oldChildren[index]
    });
  }

  return patches;
}

function isStrongAlignment(oldNode: VNode, newNode: VNode): boolean {
  return getAlignmentScore(oldNode, newNode) >= STRONG_ALIGNMENT_SCORE;
}

function getAlignmentScore(oldNode: VNode, newNode: VNode): number {
  if (oldNode.type !== newNode.type) {
    return 0;
  }

  if (oldNode.type === 'root' && newNode.type === 'root') {
    return 1;
  }

  if (oldNode.type === 'text' && newNode.type === 'text') {
    if (oldNode.text === newNode.text) {
      return 1;
    }

    return getTextSimilarity(oldNode.text, newNode.text);
  }

  if (oldNode.type !== 'element' || newNode.type !== 'element') {
    return 0;
  }

  if (oldNode.tagName !== newNode.tagName) {
    return 0;
  }

  const oldKey = getNodeKey(oldNode);
  const newKey = getNodeKey(newNode);

  if (oldKey || newKey) {
    return oldKey === newKey ? 1 : 0;
  }

  if (oldNode.tagName === 'img') {
    return 0.9;
  }

  const oldText = getNodeText(oldNode);
  const newText = getNodeText(newNode);
  const textSimilarity = getTextSimilarity(oldText, newText);
  const attrBonus = attrsEqual(oldNode.attrs, newNode.attrs) ? 0.05 : 0;

  if (!oldText && !newText) {
    return Math.min(0.85 + attrBonus, 1);
  }

  return Math.min(0.25 + textSimilarity * 0.75 + attrBonus, 1);
}

function getNodeText(node: VNode): string {
  if (node.type === 'text') {
    return node.text;
  }

  if (node.type === 'root') {
    return node.children.map(getNodeText).join('');
  }

  return node.children.map(getNodeText).join('');
}

function getTextSimilarity(leftText: string, rightText: string): number {
  const left = normalizeComparableText(leftText);
  const right = normalizeComparableText(rightText);

  if (left === right) {
    return 1;
  }

  if (!left || !right) {
    return 0;
  }

  return Math.max(getWordSimilarity(left, right), getCharacterSimilarity(left, right));
}

function normalizeComparableText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function getWordSimilarity(left: string, right: string): number {
  const leftWords = left.match(TEXT_WORD_PATTERN) ?? [];
  const rightWords = right.match(TEXT_WORD_PATTERN) ?? [];

  if (leftWords.length === 0 || rightWords.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  let matches = 0;

  leftWords.forEach(word => {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  rightWords.forEach(word => {
    const count = counts.get(word) ?? 0;

    if (count === 0) {
      return;
    }

    matches += 1;
    counts.set(word, count - 1);
  });

  return (matches * 2) / (leftWords.length + rightWords.length);
}

function getCharacterSimilarity(left: string, right: string): number {
  if (left.length * right.length > MAX_TEXT_SIMILARITY_MATRIX_CELLS) {
    return 0;
  }

  const matrix = Array.from(
    { length: left.length + 1 },
    () => new Uint16Array(right.length + 1)
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (left[leftIndex] === right[rightIndex]) {
        matrix[leftIndex][rightIndex] = matrix[leftIndex + 1][rightIndex + 1] + 1;
        continue;
      }

      matrix[leftIndex][rightIndex] =
        matrix[leftIndex + 1][rightIndex] >= matrix[leftIndex][rightIndex + 1]
          ? matrix[leftIndex + 1][rightIndex]
          : matrix[leftIndex][rightIndex + 1];
    }
  }

  return (matrix[0][0] * 2) / (left.length + right.length);
}
