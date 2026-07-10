import type { DiffOptions, ElementVNode, RootVNode, TextVNode, VNode } from './types';
import { isWhitespaceOnly } from './utils';

export function parseHtmlToVNode(html: string, options: DiffOptions = {}): RootVNode {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, 'text/html');
  const childNodes = documentNode.body.childNodes;
  const children: VNode[] = [];

  for (let index = 0; index < childNodes.length; index += 1) {
    const vnode = toVNode(childNodes[index], options);

    if (vnode !== null) {
      children.push(vnode);
    }
  }

  return {
    type: 'root',
    children
  };
}

function toVNode(node: Node, options: DiffOptions): VNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';

    if (options.ignoreWhitespace !== false && isWhitespaceOnly(text)) {
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
  const attributes = element.attributes;

  for (let index = 0; index < attributes.length; index += 1) {
    const attribute = attributes[index];
    attrs[attribute.name] = attribute.value;
  }

  const childNodes = element.childNodes;
  const children: VNode[] = [];

  for (let index = 0; index < childNodes.length; index += 1) {
    const child = toVNode(childNodes[index], options);

    if (child !== null) {
      children.push(child);
    }
  }

  const elementNode: ElementVNode = {
    type: 'element',
    tagName: element.tagName.toLowerCase(),
    attrs,
    children
  };

  return elementNode;
}
