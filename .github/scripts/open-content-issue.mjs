/**
 * Open the weekly content issue against the GitHub REST API.
 *
 * The workflow used to shell out to `gh issue create`. That works on
 * GitHub-hosted runners, which ship the CLI preinstalled, but this job runs on
 * the self-hosted Ubuntu box (it needs `docker cp` to read the ingestion
 * container's offer file) and there is no `gh` there. Every scheduled run since
 * the workflow landed died at exit 127 with "gh: command not found", so the
 * generator has never actually delivered a week of copy.
 *
 * `setup-node` runs earlier in the job, so Node 22 with global fetch is
 * guaranteed — no CLI, no jq, nothing extra to keep installed on the server.
 *
 *   node open-content-issue.mjs "<title>" <body-file>
 *
 * Env: GITHUB_TOKEN, GITHUB_REPOSITORY ("owner/repo").
 */

import { readFileSync } from "node:fs";

const LABEL = "content";
const LABEL_COLOUR = "f5a800"; // The site's own "deal" marigold.

const [title, bodyPath] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;

if (!title || !bodyPath) {
  console.error('Usage: node open-content-issue.mjs "<title>" <body-file>');
  process.exit(2);
}
if (!token || !repo) {
  console.error("GITHUB_TOKEN and GITHUB_REPOSITORY must be set.");
  process.exit(2);
}

const body = readFileSync(bodyPath, "utf-8");

function api(path, init = {}) {
  return fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...init.headers,
    },
  });
}

/**
 * Make sure the label exists before using it.
 *
 * The repo only carries GitHub's default labels, so the original
 * `--label content` would have failed even with the CLI present. Creating it is
 * one call and makes the issues filterable; a failure here is not fatal, since
 * an unlabelled issue still delivers the copy.
 */
async function ensureLabel() {
  const existing = await api(`/labels/${encodeURIComponent(LABEL)}`);
  if (existing.ok) return true;

  const created = await api("/labels", {
    method: "POST",
    body: JSON.stringify({
      name: LABEL,
      color: LABEL_COLOUR,
      description: "Wekelijkse content, gegenereerd uit de offerdata",
    }),
  });
  if (created.ok) return true;

  console.warn(`::warning::Could not create the "${LABEL}" label (${created.status}).`);
  return false;
}

async function createIssue(labels) {
  const response = await api("/issues", {
    method: "POST",
    body: JSON.stringify({ title, body, ...(labels ? { labels } : {}) }),
  });
  return response;
}

const labelled = await ensureLabel();

let response = await createIssue(labelled ? [LABEL] : undefined);

// One retry without the label: a labelling problem must not cost us the copy.
if (!response.ok && labelled) {
  console.warn(`::warning::Labelled issue failed (${response.status}); retrying unlabelled.`);
  response = await createIssue(undefined);
}

if (!response.ok) {
  console.error(`Failed to open the issue: ${response.status} ${response.statusText}`);
  console.error(await response.text());
  process.exit(1);
}

const issue = await response.json();
console.log(`Opened ${issue.html_url}`);
