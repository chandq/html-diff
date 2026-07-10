import type { DiffStats, ElementVNode, VNode } from './types';

export function createStats(): DiffStats {
  return {
    added: 0,
    removed: 0,
    modified: 0
  };
}

export function countRenderableNodes(node: VNode): number {
  if (node.type === 'text') {
    return isWhitespaceOnly(node.text) ? 0 : 1;
  }

  if (node.type === 'root') {
    return node.children.reduce((total, child) => total + countRenderableNodes(child), 0);
  }

  return 1 + node.children.reduce((total, child) => total + countRenderableNodes(child), 0);
}

export function attrsEqual(
  left: Record<string, string>,
  right: Record<string, string>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => left[key] === right[key]);
}

export function getNodeKey(node: ElementVNode): string | undefined {
  return node.attrs['data-key'] || node.attrs.id || node.attrs.key || node.attrs.name;
}

export function cloneStats(stats: DiffStats): DiffStats {
  return {
    added: stats.added,
    removed: stats.removed,
    modified: stats.modified
  };
}

export function isWhitespaceOnly(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (
      code !== 9 &&
      code !== 10 &&
      code !== 12 &&
      code !== 13 &&
      code !== 32 &&
      code !== 160
    ) {
      return false;
    }
  }

  return true;
}
