# @chandq/html-diff

[![Release](https://github.com/chandq/html-diff/actions/workflows/release.yml/badge.svg)](https://github.com/chandq/html-diff/actions/workflows/release.yml)
[![html-diff](https://img.shields.io/github/package-json/v/chandq/html-diff?style=flat-square)](https://www.npmjs.com/package/@chandq/html-diff)
[![license:MIT](https://img.shields.io/npm/l/vue.svg?sanitize=true)](https://github.com/chandq/html-diff/blob/main/LICENSE)

Browser HTML diff renderer for rich-text previews, CMS review pages, and editor integrations.

It accepts two HTML strings and returns a visual diff as a mounted view, `DocumentFragment`, or serialized HTML. The renderer is style-safe by default and handles text, inline markup, images, and preformatted code blocks.

## Install

```bash
npm install @chandq/html-diff
```

## Usage

```ts
import { renderHtmlDiff } from '@chandq/html-diff';

renderHtmlDiff({
  container: document.getElementById('diff-root')!,
  oldHtml: '<p>Hello <strong>world</strong></p>',
  newHtml: '<p>Hello brave <strong>world</strong></p>',
  mode: 'shadow'
});
```

## API

### `renderHtmlDiff(options)`

Mounts the diff into a container and returns the rendered root, fragment, stats, and `destroy()`.

```ts
renderHtmlDiff({
  container,
  oldHtml,
  newHtml,
  mode: 'shadow',
  ignoreWhitespace: true
});
```

| Option | Type | Default |
| --- | --- | --- |
| `container` | `HTMLElement` | required |
| `oldHtml` | `string` | required |
| `newHtml` | `string` | required |
| `mode` | `'shadow' \| 'scoped' \| 'none'` | `'shadow'` |
| `ignoreWhitespace` | `boolean` | `true` |

### Other Exports

| Function | Returns |
| --- | --- |
| `diffHtml(oldHtml, newHtml, options?)` | `{ fragment, stats }` |
| `createHtmlDiffFragment(oldHtml, newHtml, options?)` | `DocumentFragment` |
| `createHtmlDiffHtml(oldHtml, newHtml, options?)` | serialized diff HTML |
| `parseHtmlToVNode(html, options?)` | internal VNode tree |

## Rendering Notes

- `shadow` is the safest mode for embedding in existing pages.
- `scoped` injects prefixed styles into the container when `ShadowRoot` is unavailable or unwanted.
- `none` renders markup only; use it when you provide styles yourself.
- Existing text styles are preserved where possible. Diff styles are additive and scoped.

## Development

```bash
npm install
npm run dev
npm run test:unit
npm run typecheck
npm run build
```
