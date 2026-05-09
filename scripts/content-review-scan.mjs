import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Number of milliseconds in a 24-hour day.
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------- Pure helpers ----------

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function parsePageHeaderMetadata(content) {
  // Parse only the top YAML-style metadata block delimited by --- lines.
  if (!content.startsWith("---\n")) {
    return {};
  }

  const endOffset = content.indexOf("\n---", 4);
  if (endOffset < 0) {
    return {};
  }

  const pageHeaderMetadataText = content.slice(4, endOffset).trim();
  const metadata = {};

  for (const rawLine of pageHeaderMetadataText.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key) {
      metadata[key] = value;
    }
  }

  return metadata;
}

export function isScannableContentFile(repoRelativePath) {
  const normalizedPath = toPosixPath(repoRelativePath);

  if (!/^docs\/(standards|principles|patterns)\/.+\.md$/.test(normalizedPath)) {
    return false;
  }

  return !normalizedPath.endsWith(".template.md") && !normalizedPath.endsWith("/index.md");
}

export function toPagePath(repoRelativePath) {
  const normalizedPath = toPosixPath(repoRelativePath);
  const withoutDocsPrefix = normalizedPath.replace(/^docs\//, "");
  const withoutExt = withoutDocsPrefix.replace(/\.md$/, "");

  if (withoutExt.endsWith("/index")) {
    return `/${withoutExt.slice(0, -"/index".length)}/`;
  }

  return `/${withoutExt}/`;
}

export function calculateAgeDays(dateIsoString, now = new Date()) {
  const reviewedAt = new Date(`${dateIsoString}T00:00:00.000Z`);
  if (Number.isNaN(reviewedAt.getTime())) {
    return null;
  }

  const ageMs = now.getTime() - reviewedAt.getTime();
  return Math.floor(ageMs / MILLISECONDS_PER_DAY);
}

export function createReviewKey(repoRelativePath) {
  return `review-key: ${toPosixPath(repoRelativePath)}`;
}

function buildPageUrl(siteRoot, pagePath) {
  const rootWithoutTrailingSlash = siteRoot.replace(/\/$/, "");
  return `${rootWithoutTrailingSlash}${pagePath}`;
}

export function buildIssuePayload({
  repoRelativePath,
  title,
  dateIso,
  ageDays,
  siteRoot,
  labels
}) {
  const pagePath = toPagePath(repoRelativePath);
  const pageUrl = buildPageUrl(siteRoot, pagePath);
  const reviewKey = createReviewKey(repoRelativePath);
  const safeTitle = title || path.basename(repoRelativePath, ".md");

  return {
    // Keep issue body aligned with the existing review issue template for triage consistency.
    title: `[Content review] ${safeTitle}`,
    labels,
    body: [
      "We welcome feedback on all of the content on the site. Please let us know what you think we could change or improve below.",
      "",
      "**Which content do you think should be reviewed?**",
      "Please provide urls so we can quickly identify the page in question",
      pageUrl,
      "",
      "**Why do you think we should review this?**",
      "Please provide a brief description of your rationale for a review",
      `Automated review cycle alert. Last reviewed/updated on ${dateIso} (${ageDays} days ago).`,
      "",
      "**Do you have a suggestion for how this could be improved?**",
      "If you want to suggest an improvement then please outline it here",
      "",
      "**Additional information**",
      "Add any other information you think would be useful here",
      `Source file: ${toPosixPath(repoRelativePath)}`,
      "",
      "**Please confirm the below**",
      "",
      "- [ ] I have checked through the issues on the repository and don't think this has already been suggested",
      "",
      `<!-- ${reviewKey} -->`
    ].join("\n"),
    reviewKey,
    pageUrl
  };
}

async function findMarkdownFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return /^true$/i.test(String(value).trim());
}

function parseLabels(value) {
  return (value || "content")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

// ---------- Domain scan logic ----------

export async function scanRepository({
  repoRoot = process.cwd(),
  reviewWindowDays = 180,
  siteRoot = "https://engineering.homeoffice.gov.uk",
  now = new Date()
} = {}) {
  const roots = [
    path.join(repoRoot, "docs", "standards"),
    path.join(repoRoot, "docs", "principles"),
    path.join(repoRoot, "docs", "patterns")
  ];

  const absoluteFiles = [];
  for (const root of roots) {
    absoluteFiles.push(...(await findMarkdownFiles(root)));
  }

  const overdue = [];
  const skipped = [];

  for (const absolutePath of absoluteFiles) {
    const repoRelativePath = toPosixPath(path.relative(repoRoot, absolutePath));
    // Only scan content pages that should appear in review cycles.
    if (!isScannableContentFile(repoRelativePath)) {
      continue;
    }

    const content = await fs.readFile(absolutePath, "utf8");
    const pageHeaderMetadata = parsePageHeaderMetadata(content);

    if (!pageHeaderMetadata.date || !/^\d{4}-\d{2}-\d{2}$/.test(pageHeaderMetadata.date)) {
      // Missing/invalid dates are reported, not failed, to avoid blocking all automation.
      skipped.push({
        filePath: repoRelativePath,
        reason: "missing-or-invalid-date"
      });
      continue;
    }

    const ageDays = calculateAgeDays(pageHeaderMetadata.date, now);
    // Eligible pages are those at or beyond the configured review window.
    if (ageDays === null || ageDays < reviewWindowDays) {
      continue;
    }

    overdue.push({
      filePath: repoRelativePath,
      dateIso: pageHeaderMetadata.date,
      ageDays,
      issue: buildIssuePayload({
        repoRelativePath,
        title: pageHeaderMetadata.title,
        dateIso: pageHeaderMetadata.date,
        ageDays,
        siteRoot,
        labels: []
      })
    });
  }

  return {
    scannedCount: absoluteFiles.length,
    overdue,
    skipped
  };
}

// ---------- GitHub API I/O ----------

async function githubRequest({ token, method, endpoint, body }) {
  // Use raw REST calls so local CLI runs and GitHub Actions runs share one code path.
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "content-review-scan-script",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`GitHub API error ${response.status} for ${method} ${endpoint}: ${responseText}`);
  }

  return response.json();
}

async function findExistingOpenIssueByKey({ token, repository, reviewKey }) {
  // Stateless dedupe: search open issues for a deterministic marker derived from file path.
  const searchQuery = [
    `repo:${repository}`,
    "is:issue",
    "is:open",
    "in:body",
    `\"${reviewKey}\"`
  ].join(" ");

  const result = await githubRequest({
    token,
    method: "GET",
    endpoint: `/search/issues?q=${encodeURIComponent(searchQuery)}`
  });

  return (result.items || []).length > 0;
}

async function createIssue({ token, repository, issue }) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  return githubRequest({
    token,
    method: "POST",
    endpoint: `/repos/${owner}/${repo}/issues`,
    body: {
      title: issue.title,
      body: issue.body,
      labels: issue.labels
    }
  });
}

// ---------- CLI orchestration ----------

export async function runCli({ env = process.env, stdout = console.log } = {}) {
  const dryRun = parseBoolean(env.DRY_RUN, true);
  const reviewWindowDays = Number(env.REVIEW_WINDOW_DAYS || "180");
  const siteRoot = env.SITE_ROOT || "https://engineering.homeoffice.gov.uk";
  const repository = env.GITHUB_REPOSITORY;
  const token = env.GITHUB_TOKEN;
  const labels = parseLabels(env.ISSUE_LABELS);
  const maxIssuesPerRun = Number(env.MAX_ISSUES_PER_RUN || "0");
  const now = env.NOW ? new Date(env.NOW) : new Date();

  if (!Number.isFinite(reviewWindowDays) || reviewWindowDays <= 0) {
    throw new Error("REVIEW_WINDOW_DAYS must be a positive number");
  }

  const scanResult = await scanRepository({
    reviewWindowDays,
    siteRoot,
    now
  });

  stdout(`Scanned ${scanResult.scannedCount} markdown files.`);
  stdout(`Found ${scanResult.overdue.length} overdue content pages.`);
  stdout(`Skipped ${scanResult.skipped.length} pages due to metadata issues.`);

  if (scanResult.skipped.length > 0) {
    for (const skipped of scanResult.skipped) {
      stdout(`Skipped ${skipped.filePath} (${skipped.reason})`);
    }
  }

  const actionable = maxIssuesPerRun > 0
    ? scanResult.overdue.slice(0, maxIssuesPerRun)
    : scanResult.overdue;

  if (dryRun) {
    // Dry runs are intended for safe previews in manual workflow dispatch and local testing.
    stdout("DRY_RUN is enabled. No issues will be created.");
    for (const content of actionable) {
      stdout(`Would create issue for ${content.filePath} (${content.issue.pageUrl})`);
    }
    return;
  }

  if (!token || !repository) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required when DRY_RUN is false");
  }

  let createdCount = 0;
  let existingCount = 0;

  for (const content of actionable) {
    const issue = {
      ...content.issue,
      labels
    };

    const exists = await findExistingOpenIssueByKey({
      token,
      repository,
      reviewKey: issue.reviewKey
    });

    if (exists) {
      existingCount += 1;
      stdout(`Issue already exists for ${content.filePath}`);
      continue;
    }

    const created = await createIssue({
      token,
      repository,
      issue
    });

    createdCount += 1;
    stdout(`Created issue #${created.number} for ${content.filePath}`);
  }

  stdout(`Done. Created: ${createdCount}. Existing open: ${existingCount}.`);
}

const isMainModule = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
