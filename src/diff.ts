import type { Patch, VNode } from './types';
import { getNodeKey } from './utils';

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
    isSameNode(oldChildren[start], newChildren[start])
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
    isSameNode(oldChildren[oldEnd], newChildren[newEnd])
  ) {
    suffix.push({
      status: 'merged',
      oldNode: oldChildren[oldEnd],
      newNode: newChildren[newEnd]
    });
    oldEnd -= 1;
    newEnd -= 1;
  }

  const middle: Patch[] = [];
  let oldIndex = start;
  let newIndex = start;

  while (oldIndex <= oldEnd || newIndex <= newEnd) {
    if (oldIndex > oldEnd) {
      middle.push({
        status: 'added',
        node: newChildren[newIndex]
      });
      newIndex += 1;
      continue;
    }

    if (newIndex > newEnd) {
      middle.push({
        status: 'removed',
        node: oldChildren[oldIndex]
      });
      oldIndex += 1;
      continue;
    }

    if (isSameNode(oldChildren[oldIndex], newChildren[newIndex])) {
      middle.push({
        status: 'merged',
        oldNode: oldChildren[oldIndex],
        newNode: newChildren[newIndex]
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (newIndex + 1 <= newEnd && isSameNode(oldChildren[oldIndex], newChildren[newIndex + 1])) {
      middle.push({
        status: 'added',
        node: newChildren[newIndex]
      });
      newIndex += 1;
      continue;
    }

    if (oldIndex + 1 <= oldEnd && isSameNode(oldChildren[oldIndex + 1], newChildren[newIndex])) {
      middle.push({
        status: 'removed',
        node: oldChildren[oldIndex]
      });
      oldIndex += 1;
      continue;
    }

    middle.push({
      status: 'removed',
      node: oldChildren[oldIndex]
    });
    middle.push({
      status: 'added',
      node: newChildren[newIndex]
    });
    oldIndex += 1;
    newIndex += 1;
  }

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
