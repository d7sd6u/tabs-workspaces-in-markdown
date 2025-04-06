import { initTRPC } from '@trpc/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import 'zx/globals';

import { mdToWorkspace, updateMdWithWorkspace } from './markdown';
import {
  PersistedTab,
  Workspace,
  optionsSchema,
  workspaceSchema,
} from './schema';

const t = initTRPC.create({
  isServer: false,
  allowOutsideOfServer: true,
});

export const appRouter = t.router({
  listWorkspaces: t.procedure
    .input(z.object({ options: optionsSchema }))
    .output(workspaceSchema.array())
    .query(
      async ({
        input: {
          options: { dataDir },
        },
      }) => {
        const stat = await fs.stat(dataDir);
        if (!stat.isDirectory()) throw new Error('dataDir is not a directory!');
        const workspaces: Workspace[] = [];
        const res = $`rg --glob '*.md' '^# Tabs Workspace\\s*$' ${dataDir} --files-with-matches`;

        try {
          for await (const child of res) {
            try {
              const md = await fs.readFile(child, {
                encoding: 'utf-8',
              });
              workspaces.push(mdToWorkspace(md, path.basename(child, '.md')));
            } catch (error) {
              await fs.appendFile(
                path.join(dataDir, 'tabs_md_workspaces.error.log'),
                String(error),
              );
            }
          }
        } catch (error) {
          await fs.appendFile(
            path.join(dataDir, 'tabs_md_workspaces.error.log'),
            String(error),
          );
        }
        return workspaces;
      },
    ),
  updateWorkspace: t.procedure
    .input(z.object({ workspace: workspaceSchema, options: optionsSchema }))
    .mutation(
      async ({
        input: {
          workspace: input,
          options: { dataDir },
        },
      }) => {
        const stat = await fs.stat(dataDir);
        if (!stat.isDirectory()) throw new Error('dataDir is not a directory!');
        const file =
          (await glob(dataDir, {
            expandDirectories: { files: [input.name], extensions: ['md'] },
          }).then((v) => v[0])) ?? path.join(dataDir, `${input.name}.md`);
        try {
          const md = await fs.readFile(file, { encoding: 'utf-8' });
          const existing: Workspace = mdToWorkspace(md, input.name);
          const before = existing.tabs.flatMap(listAll);
          const existingHistory = new Set(input.history.map((v) => v.url));
          const after = new Set(input.tabs.flatMap(listAll).map((v) => v.url));
          input.history.push(
            ...[...before].filter(
              (v) =>
                !after.has(v.url) &&
                !existingHistory.has(v.url) &&
                v.url !== 'about:blank',
            ),
          );
          const bookmarks = new Set(
            input.bookmarks.flatMap(listAll).map((v) => v.url),
          );
          input.history = input.history.filter(
            (v) => !after.has(v.url) && !bookmarks.has(v.url),
          );
          await fs.writeFile(file, await updateMdWithWorkspace(md, input));
        } catch {
          await fs.writeFile(
            file,
            await updateMdWithWorkspace(
              `# Tabs Workspace\n\n## Bookmarks\n\n## Tabs\n\n## History`,
              input,
            ),
          );
        }
      },
    ),
});

function listAll(tab: PersistedTab): PersistedTab[] {
  return [tab, ...tab.children.flatMap(listAll)];
}

export type AppRouter = typeof appRouter;
