export const ROOT_CLASS = 'shd-root';
export const STYLE_ATTRIBUTE = 'data-html-diff-style';

export const DIFF_STYLE_TEXT = `
:host,
.${ROOT_CLASS} {
  --shd-add-bg: #ecfdf3;
  --shd-remove-bg: #fff1f2;
  --shd-add-accent: rgba(5, 150, 105, 0.24);
  --shd-remove-accent: rgba(190, 24, 93, 0.86);
  --shd-add-border: rgba(5, 150, 105, 0.28);
  --shd-remove-border: rgba(225, 29, 72, 0.28);
  --shd-modified-border: rgba(217, 119, 6, 0.34);
  --shd-panel-bg: #ffffff;
  --shd-surface: #f8fafc;
  --shd-border: rgba(15, 23, 42, 0.12);
  color: inherit;
  font: inherit;
  line-height: inherit;
}

.${ROOT_CLASS} {
  display: block;
  background: var(--shd-panel-bg);
  color: inherit;
  font: inherit;
  line-height: inherit;
}

.${ROOT_CLASS} .shd-content {
  display: block;
  border: 1px solid var(--shd-border);
  border-radius: 18px;
  padding: 20px;
  color: inherit;
  font: inherit;
  line-height: inherit;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 30%),
    linear-gradient(180deg, #ffffff, var(--shd-surface));
  overflow-wrap: anywhere;
}

.${ROOT_CLASS} pre {
  display: block;
  max-inline-size: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.${ROOT_CLASS} [data-shd-state="added"] {
  background: var(--shd-add-bg);
  border-radius: 0.25em;
  box-shadow: inset 0 -0.08em 0 var(--shd-add-accent);
}

.${ROOT_CLASS} [data-shd-state="removed"] {
  background: var(--shd-remove-bg);
  border-radius: 0.25em;
  text-decoration-line: line-through;
  text-decoration-color: var(--shd-remove-accent);
  text-decoration-thickness: 0.12em;
  text-decoration-skip-ink: none;
}

.${ROOT_CLASS} .shd-text-marker {
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.${ROOT_CLASS} [data-shd-media-state] {
  position: relative;
  display: inline-block;
  max-inline-size: 100%;
  margin: 10px 6px;
  padding: 34px 10px 10px;
  vertical-align: top;
  border: 1px solid var(--shd-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.${ROOT_CLASS} [data-shd-media-state]::before {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  content: attr(data-shd-media-label);
}

.${ROOT_CLASS} [data-shd-media-state] > img {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
  border-radius: 10px;
}

.${ROOT_CLASS} [data-shd-media-state="added"] {
  border-color: var(--shd-add-border);
  background: linear-gradient(180deg, rgba(236, 253, 243, 0.98), rgba(255, 255, 255, 0.96));
}

.${ROOT_CLASS} [data-shd-media-state="added"]::before {
  background: #059669;
}

.${ROOT_CLASS} [data-shd-media-state="removed"] {
  border-color: var(--shd-remove-border);
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.98), rgba(255, 255, 255, 0.96));
}

.${ROOT_CLASS} [data-shd-media-state="removed"]::before {
  background: #e11d48;
}

.${ROOT_CLASS} [data-shd-media-state="removed"] > img {
  filter: grayscale(1);
  opacity: 0.45;
}

.${ROOT_CLASS} .shd-image-wrapper {
  position: relative;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
  margin: 10px 6px;
  padding: 34px 10px 10px;
  vertical-align: top;
  max-inline-size: 100%;
  border-radius: 14px;
  border: 1px solid var(--shd-border);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.${ROOT_CLASS} .shd-image-wrapper::after {
  position: absolute;
  top: 8px;
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

.${ROOT_CLASS} .shd-image-stage {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
  max-inline-size: 100%;
}

.${ROOT_CLASS} .shd-image-stage[data-shd-image-role-label]::before {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.58);
  content: attr(data-shd-image-role-label);
}

.${ROOT_CLASS} .shd-image-wrapper > img,
.${ROOT_CLASS} .shd-image-stage > img {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
  border-radius: 10px;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="added"] {
  border-color: var(--shd-add-border);
  background: linear-gradient(180deg, rgba(236, 253, 243, 0.98), rgba(255, 255, 255, 0.96));
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="added"]::after {
  background: #059669;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="removed"] {
  border-color: var(--shd-remove-border);
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.98), rgba(255, 255, 255, 0.96));
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="removed"]::after {
  background: #e11d48;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="removed"] .shd-image-stage > img {
  filter: grayscale(1);
  opacity: 0.45;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="removed"] > img {
  filter: grayscale(1);
  opacity: 0.45;
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="modified"] {
  border-color: var(--shd-modified-border);
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.96));
}

.${ROOT_CLASS} .shd-image-wrapper[data-diff-kind="modified"]::after {
  background: #d97706;
}

.${ROOT_CLASS} .shd-image-old {
  filter: grayscale(1);
  opacity: 0.45;
}
`;
