#!/usr/bin/env node
// Renders the stack row as chips with icon + label, from locally embedded
// icon paths (scripts/icons/*.path, sourced from Simple Icons) instead of
// three separate external shieldcn.dev badge requests per theme.

import { readFile, writeFile } from "node:fs/promises";
import { FONT, theme, wrapCard } from "./lib/card.mjs";

const ITEMS = [
  { name: "Python", icon: "python", label: "Python" },
  { name: "Rust", icon: "rust", label: "Rust" },
];

const paths = Object.fromEntries(
  await Promise.all(
    ITEMS.map(async (item) => [
      item.icon,
      (await readFile(new URL(`./icons/${item.icon}.path`, import.meta.url), "utf8")).trim(),
    ]),
  ),
);

function textWidth(text, fontSize) {
  return text.length * fontSize * 0.62;
}

function renderSvg(mode) {
  const { fg, bg, border } = theme(mode);
  const chipHeight = 40;
  const chipGap = 12;
  const iconSize = 15;
  const padX = 14;
  const iconTextGap = 9;
  const fontSize = 13;

  let x = 0;
  const chips = ITEMS.map((item) => {
    const labelWidth = textWidth(item.label, fontSize);
    const chipWidth = padX * 2 + iconSize + iconTextGap + labelWidth;
    const iconScale = iconSize / 24;
    const iconX = x + padX;
    const iconY = (chipHeight - iconSize) / 2;
    const textX = iconX + iconSize + iconTextGap;
    const textY = chipHeight / 2 + fontSize * 0.35;

    const chip = `
      <g>
        <rect x="${x}" y="0" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="none" stroke="${border}" />
        <g transform="translate(${iconX} ${iconY}) scale(${iconScale})" fill="${fg}">
          <path d="${paths[item.icon]}" />
        </g>
        <text x="${textX}" y="${textY}" font-family="${FONT}" font-size="${fontSize}" font-weight="600" fill="${fg}">${item.label}</text>
      </g>`;

    x += chipWidth + chipGap;
    return chip;
  }).join("");

  const width = x - chipGap;
  const height = chipHeight;

  return wrapCard({ width, height, mode, bg: "none", border: "none", body: chips, rx: 0 });
}

const light = renderSvg("light");
const dark = renderSvg("dark");

await writeFile(new URL("../stack-light.svg", import.meta.url), light);
await writeFile(new URL("../stack-dark.svg", import.meta.url), dark);

console.log("wrote stack-light.svg and stack-dark.svg");
