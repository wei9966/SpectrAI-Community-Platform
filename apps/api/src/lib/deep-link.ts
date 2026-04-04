import crypto from "crypto";
import type { ResourceType } from "../types/shared.js";

/**
 * Deep link protocol prefix for ClaudeOps desktop app.
 */
const DEEP_LINK_PROTOCOL = "claudeops://";

/**
 * Community web base URL — falls back to NEXT_PUBLIC_APP_URL env or localhost.
 */
function getWebBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Generate a deep-link URL for one-click resource installation.
 * Format: claudeops://install/{type}/{id}?version={version}
 */
export function generateInstallUrl(
  type: ResourceType | string,
  id: string,
  version?: string
): string {
  const base = `${DEEP_LINK_PROTOCOL}install/${type}/${encodeURIComponent(id)}`;
  if (version) {
    return `${base}?version=${encodeURIComponent(version)}`;
  }
  return base;
}

/**
 * Generate a community web page URL for a resource.
 * Format: {baseUrl}/resources/{type}/{id}
 */
export function generateWebUrl(
  type: ResourceType | string,
  id: string
): string {
  return `${getWebBaseUrl()}/resources/${type}/${encodeURIComponent(id)}`;
}

/**
 * Parsed result of a claudeops:// deep link URL.
 */
export interface ParsedInstallUrl {
  type: string;
  id: string;
  version?: string;
}

/**
 * Parse a claudeops:// deep link URL and extract type, id, version.
 * Returns null if the URL is not a valid install link.
 */
export function parseInstallUrl(url: string): ParsedInstallUrl | null {
  if (!url.startsWith(DEEP_LINK_PROTOCOL)) {
    return null;
  }

  const pathAndQuery = url.slice(DEEP_LINK_PROTOCOL.length);
  const [path, queryString] = pathAndQuery.split("?");

  // Expected: install/{type}/{id}
  const segments = path.split("/");
  if (segments.length < 3 || segments[0] !== "install") {
    return null;
  }

  const type = segments[1];
  const id = decodeURIComponent(segments[2]);

  let version: string | undefined;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    version = params.get("version") || undefined;
  }

  return { type, id, version };
}

/**
 * Compute a SHA-256 checksum of the resource content.
 * Deterministic: sorts object keys before hashing.
 */
export function computeContentChecksum(content: unknown): string {
  const serialized = JSON.stringify(content, Object.keys(content as object).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
