import type { DiffOptions, ElementVNode, RootVNode, TextVNode, VNode } from './types';

export function parseHtmlToVNode(html: string, options: DiffOptions = {}): RootVNode {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, 'text/html');
  const children = Array.from(documentNode.body.childNodes)
    .map(node => toVNode(node, options))
    .filter((node): node is VNode => node !== null);

  return {
    type: 'root',
    children
  };
}

function toVNode(node: Node, options: DiffOptions): VNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';

    if (options.ignoreWhitespace !== false && !text.trim()) {
      return null;
    }

    const textNode: TextVNode = {
      type: 'text',
      text
    };

    return textNode;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const attrs: Record<string, string> = {};
  Array.from(element.attributes).forEach(attribute => {
    attrs[attribute.name] = attribute.value;
  });

  const children = Array.from(element.childNodes)
    .map(child => toVNode(child, options))
    .filter((child): child is VNode => child !== null);

  const elementNode: ElementVNode = {
    type: 'element',
    tagName: element.tagName.toLowerCase(),
    attrs,
    children
  };

  return elementNode;
}
