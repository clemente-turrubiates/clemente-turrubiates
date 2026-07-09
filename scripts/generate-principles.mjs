#!/usr/bin/env node
// Renders the principles list as a card matching the stats card's visual
// language (same font, border, shadow, entrance animation), instead of a
// plain GitHub markdown table that doesn't carry the site's monochrome look.

import { writeFile } from "node:fs/promises";

const PRINCIPLES = [
  ["Routing over orchestration", "Send work to the right primitive instead of centrally managing it."],
  ["Observable failure", "A failure should be visible and diagnosable, never silent."],
  ["Honest scope", "A tool does exactly what it claims — nothing more."],
];

function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderSvg({ fg, bg, border, mode }) {
  const width = 460;
  const padX = 24;
  const padY = 22;
  const titleGap = 20;
  const descLineHeight = 18;
  const rowGap = 20;
  const maxDescChars = 56;

  let y = padY;
  const blocks = PRINCIPLES.map((row, i) => {
    const [title, desc] = row;
    const lines = wrap(desc, maxDescChars);
    const titleY = y + 14;
    const descStartY = titleY + titleGap;
    const blockHeight = titleGap + lines.length * descLineHeight;
    const delay = (0.15 + i * 0.12).toFixed(2);

    const descSvg = lines
      .map((line, li) => `<tspan x="${padX}" dy="${li === 0 ? 0 : descLineHeight}">${line}</tspan>`)
      .join("");

    const block = `
      <g opacity="0">
        <animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.4s" fill="freeze" />
        <text x="${padX}" y="${titleY}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700" fill="${fg}">${title}</text>
        <text x="${padX}" y="${descStartY}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12.5" fill="${fg}" opacity="0.65">${descSvg}</text>
      </g>`;

    const dividerY = y + blockHeight + rowGap / 2;
    const divider =
      i < PRINCIPLES.length - 1
        ? `<line x1="${padX}" y1="${dividerY}" x2="${width - padX}" y2="${dividerY}" stroke="${border}" />`
        : "";

    y += blockHeight + rowGap;
    return block + divider;
  }).join("");

  const height = y - rowGap + padY;

  const shadow =
    mode === "dark"
      ? `<feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.45" />`
      : `<feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0f0f0f" flood-opacity="0.08" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 12}" viewBox="0 0 ${width} ${height + 12}">
  <defs>
    <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="160%">
      ${shadow}
    </filter>
  </defs>
  <g filter="url(#card-shadow)" opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0s" dur="0.4s" fill="freeze" />
    <animateTransform attributeName="transform" type="translate" from="0 6" to="0 0" begin="0s" dur="0.5s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="${bg}" stroke="${border}" />
    ${blocks}
  </g>
</svg>`;
}

const light = renderSvg({ fg: "#0f0f0f", bg: "#ffffff", border: "#e1e0d9", mode: "light" });
const dark = renderSvg({ fg: "#ffffff", bg: "#0f0f0f", border: "#2c2c2a", mode: "dark" });

await writeFile(new URL("../principles-light.svg", import.meta.url), light);
await writeFile(new URL("../principles-dark.svg", import.meta.url), dark);

console.log("wrote principles-light.svg and principles-dark.svg");
