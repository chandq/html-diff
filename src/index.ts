export { DEFAULT_DIFF_THEME, DIFF_STYLE_TEXT, ROOT_CLASS, createDiffStyleText } from './constants';
export { diffChildren, isSameNode } from './diff';
export { parseHtmlToVNode } from './parse';
export { createHtmlDiffFragment, createHtmlDiffHtml, diffHtml, renderHtmlDiff } from './render';
export type {
  DiffOptions,
  DiffTheme,
  DiffThemeState,
  DiffResult,
  DiffStats,
  ElementVNode,
  Patch,
  RenderHtmlDiffOptions,
  RenderMode,
  RenderResult,
  RootVNode,
  TextVNode,
  VNode
} from './types';
