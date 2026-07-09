import { createHtmlDiffHtml, diffHtml, parseHtmlToVNode, renderHtmlDiff } from '../src';

describe('html-diff', () => {
  it('parses sibling html nodes into a root vnode', () => {
    const vnode = parseHtmlToVNode('<p>A</p><p>B</p>');

    expect(vnode.type).toBe('root');
    expect(vnode.children).toHaveLength(2);
  });

  it('renders text changes with added and removed markers', () => {
    const html = createHtmlDiffHtml('<p>Hello world</p>', '<p>Hello brave world</p>');

    expect(html).toContain('data-shd-state="added"');
    expect(html).toContain('data-shd-state="removed"');
  });

  it('renders image replacements with the dedicated wrapper', () => {
    const html = createHtmlDiffHtml(
      '<img src="https://example.com/a.png" alt="before" />',
      '<img src="https://example.com/b.png" alt="after" />'
    );

    expect(html).toContain('shd-image-wrapper');
    expect(html).toContain('Image replaced');
  });

  it('returns stats for add, remove, and modify operations', () => {
    const result = diffHtml('<p>One</p>', '<p>Two</p><p>Three</p>');

    expect(result.stats.modified).toBeGreaterThan(0);
    expect(result.stats.added).toBeGreaterThan(0);
  });

  it('mounts into a shadow root by default', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const result = renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>'
    });

    expect(result.shadowRoot).toBeTruthy();
    expect(result.shadowRoot?.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeTruthy();
    expect(result.html).toContain('shd-content');
  });

  it('can switch from shadow mode to scoped mode on the same container', () => {
    const host = document.createElement('div');

    const shadowResult = renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow'
    });

    expect(shadowResult.shadowRoot).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeTruthy();

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'scoped'
    });

    expect(host.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('.shd-content')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeFalsy();
  });

  it('can switch from shadow mode to none mode on the same container', () => {
    const host = document.createElement('div');

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow'
    });

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'none'
    });

    expect(host.querySelector('.shd-content')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-style]')).toBeFalsy();
  });

  it('falls back to scoped mode when shadow dom is unavailable', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'attachShadow', {
      value: undefined,
      configurable: true
    });

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow'
    });

    expect(host.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('.shd-content')).toBeTruthy();
  });
});
