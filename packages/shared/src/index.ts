// Types
export * from './types';

// Schemas
export * from './schemas';

// API Client
export { resourcesApi, authApi, searchApi, usersApi, fetchApi, ApiError } from './api-client';
export { SpectrAICreditClient, SpectrAIApiError } from './spectrai-credits-client';
export type { ClientConfig } from './spectrai-credits-client';
export * from './types/credits-sdk';
export type { InstallManifest } from './types/install-manifest';

// Re-export zod for convenience
import { z } from 'zod';
export { z };