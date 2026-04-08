/**
 * API base URL for pages that use /api/... path prefix.
 * Strips trailing /api from NEXT_PUBLIC_API_URL to avoid double /api/api/ paths.
 */
const _raw = process.env.NEXT_PUBLIC_API_URL || '';
export const API_BASE = _raw.endsWith('/api') ? _raw.slice(0, -4) : _raw;
