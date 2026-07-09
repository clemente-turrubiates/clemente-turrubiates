#!/usr/bin/env node
// Renders the footer link icon(s) locally instead of via shieldcn.dev, for
// the same reason as generate-stack.mjs: one static asset beats a remote
// badge-service round trip on every README load.

import { readFile, writeFile } from "node:fs/promises";
import { theme, wrapCard } from "./lib/card.mjs";

const ICON = "x";
const iconPath = (await readFile(new URL(`./icons/${ICON}.path`, import.meta.url), "utf8")).trim();

function renderSvg(mode) {
  const { fg, bg, border } = theme(mode);
  const size = 40;
  const iconSize = 16;
  const iconScale = iconSize / 24;
  const offset = (size - iconSize) / 2;

  const body = `
    <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${size / 2}" fill="${bg}" stroke="${border}" />
    <g transform="translate(${offset} ${offset}) scale(${iconScale})" fill="${fg}">
      <path d="${iconPath}" />
    </g>`;

  return wrapCard({ width: size, height: size, mode, bg: "none", border: "none", body, rx: size / 2 });
}

const light = renderSvg("light");
const dark = renderSvg("dark");

await writeFile(new URL("../x-light.svg", import.meta.url), light);
await writeFile(new URL("../x-dark.svg", import.meta.url), dark);

console.log("wrote x-light.svg and x-dark.svg");
