import { z } from 'zod';

export type PersistedTab = PersistedLink & { children: PersistedTab[] };
export type PersistedLink = z.infer<typeof persistedLink>;
export type Workspace = z.infer<typeof workspaceSchema>;
export const persistedLink = z.object({ url: z.string(), title: z.string() });
export const persistedTab: z.ZodType<PersistedTab> = persistedLink.extend({
  children: z.lazy(() => persistedTab.array()),
});
export const workspaceSchema = z.object({
  name: z.string(),
  history: persistedLink.array(),
  bookmarks: persistedTab.array(),
  tabs: persistedTab.array(),
});
export const optionsSchema = z.object({
  dataDir: z.string().regex(/^\//, 'Must be an absolute path'),
});
