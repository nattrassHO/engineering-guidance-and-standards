export function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return /^true$/i.test(String(value).trim());
}

export function parseLabels(value) {
  return (value || "content")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}
import fsSync from "node:fs";
import path from "node:path";

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function stripFrontMatter(content) {
  if (!content.startsWith("---\n")) {
    return content;
  }
  const endOffset = content.indexOf("\n---", 4);
  if (endOffset < 0) {
    return content;
  }
  return content.slice(endOffset + "\n---".length).trimStart();
}

export function parsePageHeaderMetadata(content) {
  const pageBody = stripFrontMatter(content);
  if (pageBody === content) {
    return {};
  }
  const pageHeaderMetadataText = content
    .slice(4, content.length - pageBody.length - "\n---".length)
    .trim();
  const metadata = {};
  for (const rawLine of pageHeaderMetadataText.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key) metadata[key] = value;
  }
  return metadata;
}

export function isScannableContentFile(repoRelativePath) {
  const normalizedPath = toPosixPath(repoRelativePath);
  if (!/^docs\/(standards|principles|patterns)\/.+\.md$/.test(normalizedPath)) return false;
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
  if (Number.isNaN(reviewedAt.getTime())) return null;
  const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
  const ageMs = now.getTime() - reviewedAt.getTime();
  return Math.floor(ageMs / MILLISECONDS_PER_DAY);
}

export function createReviewKey(repoRelativePath) {
  return `review-key: ${toPosixPath(repoRelativePath)}`;
}
