export const ROOT_CLASS = 'shd-root';
export const STYLE_ATTRIBUTE = 'data-html-diff-style';

export const DIFF_STYLE_TEXT = `
:host,
.${ROOT_CLASS} {
  --shd-add-bg: #ecfdf3;
  --shd-add-text: #047857;
  --shd-remove-bg: #fff1f2;
  --shd-remove-text: #be123c;
  --shd-modified-border: #f59e0b;
  --shd-panel-bg: #ffffff;
  --shd-surface: #f8fafc;
  --shd-border: rgba(15, 23, 42, 0.12);
  --shd-text: #0f172a;
  color: var(--shd-text);
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  line-height: 1.6;
}

.${ROOT_CLASS} {
  display: block;
  background: var(--shd-panel-bg);
  color: var(--shd-text);
}

.${ROOT_CLASS} .shd-content {
  display: block;
  border: 1px solid var(--shd-border);
  border-radius: 18px;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 30%),
    linear-gradient(180deg, #ffffff, var(--shd-surface));
  overflow-wrap: anywhere;
}

.${ROOT_CLASS} [data-shd-state="added"] {
  background: var(--shd-add-bg);
  color: var(--shd-add-text);
  border-radius: 0.25em;
  text-decoration: none;
}

.${ROOT_CLASS} [data-shd-state="removed"] {
  background: var(--shd-remove-bg);
  color: var(--shd-remove-text);
  border-radius: 0.25em;
  text-decoration: line-through;
}

.${ROOT_CLASS} .shd-text-diff {
  display: inline-flex;
  gap: 0.3em;
  flex-wrap: wrap;
}

.${ROOT_CLASS} .shd-image-wrapper {
  position: relative;
  display: inline-flex;
  gap: 10px;
  margin: 10px 6px;
  padding: 8px;
  vertical-align: top;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.${ROOT_CLASS} .shd-image-wrapper::after {
  position: absolute;
  top: -12px;
  left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  content: attr(data-diff-label);
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="added"]::after {
  background: #059669;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="removed"]::after {
  background: #e11d48;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="modified"]::after {
  background: #d97706;
}

.${ROOT_CLASS} .shd-image-added {
  outline: 3px solid #10b981;
}

.${ROOT_CLASS} .shd-image-removed {
  outline: 3px solid #e11d48;
  filter: grayscale(1);
  opacity: 0.38;
}

.${ROOT_CLASS} .shd-image-old {
  max-width: 180px;
  filter: grayscale(1);
  opacity: 0.45;
}

.${ROOT_CLASS} .shd-image-new {
  max-width: 180px;
  outline: 2px solid #10b981;
}
`;
