import { workspaceSchema } from '@/nativeapp/schema';
import { z } from 'zod';

export const localWorkspaceSchema = workspaceSchema.extend({
  status: z.enum(['opened', 'stashed', 'stored']),
});
