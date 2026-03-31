import type { ResourceType } from './resource';

/**
 * Install manifest returned by GET /api/resources/:id/install-manifest
 */
export interface InstallManifest {
  type: ResourceType | string;
  name: string;
  version: string;
  installUrl: string;
  content: unknown;
}
