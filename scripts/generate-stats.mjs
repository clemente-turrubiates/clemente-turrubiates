#!/usr/bin/env node
// Renders a minimal, monochrome stats card as two SVGs (light/dark) from
// live GitHub GraphQL data. No third-party stats service involved.

import { writeFile } from "node:fs/promises";

const USERNAME = process.env.STATS_USERNAME || "clemente-turrubiates";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const query = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes {
        languages(first: 1, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name } }
        }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, variables: { login: USERNAME } }),
});

if (!res.ok) {
  throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
}

const { data, errors } = await res.json();
if (errors) throw new Error(JSON.stringify(errors));

const user = data.user;
const repoCount = user.repositories.totalCount;
const contributions = user.contributionsCollection.contributionCalendar.totalContributions;

const languageBytes = new Map();
for (const repo of user.repositories.nodes) {
  for (const edge of repo.languages.edges) {
    languageBytes.set(edge.node.name, (languageBytes.get(edge.node.name) || 0) + edge.size);
  }
}
const topLanguage = [...languageBytes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

const rows = [
  ["Public repos", String(repoCount)],
  ["Contributions (past year)", String(contributions)],
  ["Top language", topLanguage],
];

function renderSvg({ fg, bg, border }) {
  const width = 360;
  const rowHeight = 26;
  const padY = 20;
  const height = padY * 2 + rows.length * rowHeight;

  const rowsSvg = rows
    .map((row, i) => {
      const y = padY + i * rowHeight + rowHeight / 2 + 4;
      return `
        <text x="20" y="${y}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="${fg}">${row[0]}</text>
        <text x="${width - 20}" y="${y}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="${fg}" text-anchor="end" font-weight="600">${row[1]}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${bg}" stroke="${border}" />
  ${rowsSvg}
</svg>`;
}

const light = renderSvg({ fg: "#0f0f0f", bg: "#ffffff", border: "#e1e0d9" });
const dark = renderSvg({ fg: "#ffffff", bg: "#0f0f0f", border: "#2c2c2a" });

await writeFile(new URL("../stats-light.svg", import.meta.url), light);
await writeFile(new URL("../stats-dark.svg", import.meta.url), dark);

console.log("wrote stats-light.svg and stats-dark.svg");
