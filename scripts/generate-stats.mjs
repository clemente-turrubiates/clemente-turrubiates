#!/usr/bin/env node
// Renders a minimal, monochrome stats card (with a computed rank) as two
// SVGs (light/dark) from live GitHub GraphQL data. No third-party stats
// service involved.

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
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    contributionsCollection {
      contributionCalendar { totalContributions }
      totalCommitContributions
      totalPullRequestReviewContributions
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes {
        stargazerCount
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
const stars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);

const languageBytes = new Map();
for (const repo of user.repositories.nodes) {
  for (const edge of repo.languages.edges) {
    languageBytes.set(edge.node.name, (languageBytes.get(edge.node.name) || 0) + edge.size);
  }
}
const topLanguage = [...languageBytes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

// Same rank formula as github-readme-stats' calculateRank.js (percentile
// across commits/PRs/issues/reviews/stars/followers, exponential + log-normal
// CDFs), so the letter grade means the same thing people already recognize.
function exponentialCdf(x) {
  return 1 - 2 ** -x;
}
function logNormalCdf(x) {
  return x / (1 + x);
}
function calculateRank({ commits, prs, issues, reviews, stars, followers }) {
  const COMMITS_MEDIAN = 250,
    COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50,
    PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25,
    ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2,
    REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50,
    STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10,
    FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT + PRS_WEIGHT + ISSUES_WEIGHT + REVIEWS_WEIGHT + STARS_WEIGHT + FOLLOWERS_WEIGHT;

  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const LEVELS = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

  const rank =
    1 -
    (COMMITS_WEIGHT * exponentialCdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  const level = LEVELS[THRESHOLDS.findIndex((t) => rank * 100 <= t)];
  return { level, percentile: rank * 100 };
}

const { level, percentile } = calculateRank({
  commits: user.contributionsCollection.totalCommitContributions,
  prs: user.pullRequests.totalCount,
  issues: user.issues.totalCount,
  reviews: user.contributionsCollection.totalPullRequestReviewContributions,
  stars,
  followers: user.followers.totalCount,
});

const rows = [
  ["Repos", String(repoCount)],
  ["Contributions", String(contributions)],
  ["Language", topLanguage],
];

function renderSvg({ fg, bg, border, mode }) {
  const width = 380;
  const rowHeight = 26;
  const padY = 20;
  const labelX = 20;
  const valueX = 200;
  const dividerX = 224;
  const ringSize = 68;
  const textBlockHeight = rows.length * rowHeight;
  const height = Math.max(padY * 2 + textBlockHeight, padY * 2 + ringSize);

  const rowsSvg = rows
    .map((row, i) => {
      const y = padY + i * rowHeight + rowHeight / 2 + 4;
      const delay = (0.15 + i * 0.1).toFixed(2);
      return `
        <g opacity="0">
          <animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.35s" fill="freeze" />
          <text x="${labelX}" y="${y}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="${fg}" opacity="0.7">${row[0]}</text>
          <text x="${valueX}" y="${y}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="${fg}" text-anchor="end" font-weight="600">${row[1]}</text>
        </g>`;
    })
    .join("");

  const ringCx = width - 20 - ringSize / 2;
  const ringCy = height / 2;
  const radius = ringSize / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - percentile / 100;
  const dashOffset = circumference * (1 - progress);

  const ring = `
    <g opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.4s" fill="freeze" />
      <circle cx="${ringCx}" cy="${ringCy}" r="${radius}" fill="none" stroke="${border}" stroke-width="4" />
      <circle cx="${ringCx}" cy="${ringCy}" r="${radius}" fill="none" stroke="${fg}" stroke-width="4"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
        transform="rotate(-90 ${ringCx} ${ringCy})">
        <animate attributeName="stroke-dashoffset" from="${circumference}" to="${dashOffset}" begin="0.3s" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" keyTimes="0;1" />
      </circle>
      <text x="${ringCx}" y="${ringCy + 7}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="21" font-weight="700" fill="${fg}" text-anchor="middle">${level}</text>
    </g>`;

  const divider = `<line x1="${dividerX}" y1="${padY}" x2="${dividerX}" y2="${height - padY}" stroke="${border}" />`;

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
    ${rowsSvg}
    ${divider}
    ${ring}
  </g>
</svg>`;
}

const light = renderSvg({ fg: "#0f0f0f", bg: "#ffffff", border: "#e1e0d9", mode: "light" });
const dark = renderSvg({ fg: "#ffffff", bg: "#0f0f0f", border: "#2c2c2a", mode: "dark" });

await writeFile(new URL("../stats-light.svg", import.meta.url), light);
await writeFile(new URL("../stats-dark.svg", import.meta.url), dark);

console.log(`wrote stats-light.svg and stats-dark.svg (rank ${level}, percentile ${percentile.toFixed(1)})`);
