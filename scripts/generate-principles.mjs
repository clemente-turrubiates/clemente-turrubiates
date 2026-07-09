#!/usr/bin/env node
// Renders the principles list as a card matching the stats card's visual
// language (same font, border, shadow), instead of a plain GitHub markdown
// table that doesn't carry the site's monochrome look.

import { writeFile } from "node:fs/promises";
import { FONT, theme, wrapCard } from "./lib/card.mjs";

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

function renderSvg(mode) {
  const { fg, bg, border } = theme(mode);
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

    const descSvg = lines
      .map((line, li) => `<tspan x="${padX}" dy="${li === 0 ? 0 : descLineHeight}">${line}</tspan>`)
      .join("");

    const block = `
      <text x="${padX}" y="${titleY}" font-family="${FONT}" font-size="14" font-weight="700" fill="${fg}">${title}</text>
      <text x="${padX}" y="${descStartY}" font-family="${FONT}" font-size="12.5" fill="${fg}" opacity="0.65">${descSvg}</text>`;

    const dividerY = y + blockHeight + rowGap / 2;
    const divider =
      i < PRINCIPLES.length - 1
        ? `<line x1="${padX}" y1="${dividerY}" x2="${width - padX}" y2="${dividerY}" stroke="${border}" />`
        : "";

    y += blockHeight + rowGap;
    return block + divider;
  }).join("");

  const height = y - rowGap + padY;

  return wrapCard({ width, height, mode, bg, border, body: blocks });
}

const light = renderSvg("light");
const dark = renderSvg("dark");

await writeFile(new URL("../principles-light.svg", import.meta.url), light);
await writeFile(new URL("../principles-dark.svg", import.meta.url), dark);

console.log("wrote principles-light.svg and principles-dark.svg");
