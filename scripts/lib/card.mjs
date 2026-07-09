// Shared card chrome (border, shadow, entrance animation) so every
// generated SVG shares one visual language instead of duplicating markup.

export const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function theme(mode) {
  return mode === "dark"
    ? { fg: "#ffffff", bg: "#0f0f0f", border: "#2c2c2a" }
    : { fg: "#0f0f0f", bg: "#ffffff", border: "#e1e0d9" };
}

export function wrapCard({ width, height, mode, bg, border, body, rx = 12 }) {
  const shadow =
    mode === "dark"
      ? `<feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#000000" flood-opacity="0.4" />`
      : `<feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#0f0f0f" flood-opacity="0.08" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 8}" viewBox="0 0 ${width} ${height + 8}">
  <defs>
    <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="160%">
      ${shadow}
    </filter>
  </defs>
  <g filter="url(#card-shadow)" opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0s" dur="0.25s" fill="freeze" />
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx}" fill="${bg}" stroke="${border}" />
    ${body}
  </g>
</svg>`;
}
