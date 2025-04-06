import { PersistedTab } from '@/nativeapp/schema';
import { CreateTRPCProxyClient } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import { ContextualIdentities } from 'wxt/browser';
import { z } from 'zod';

import type { AppRouter as NativeAppRouter } from '../../nativeapp/router';
import { localWorkspaceSchema } from './schema';
import {
  getDataDir,
  getNewTab,
  getPinDashboard,
  setDataDir,
  setNewTab,
  setPinDashboard,
} from './storage';

export const t = initTRPC.context<Context>().create({
  isServer: false,
  allowOutsideOfServer: true,
});

interface Context {
  nativeClient: CreateTRPCProxyClient<NativeAppRouter>;
}

async function getOpenedWorkspaceTabs(name: string) {
  const container = await browser.contextualIdentities
    .query({ name: name })
    .then((v) => v[0]);
  if (!container) return [[], null] as const;
  return [
    await browser.tabs.query({
      cookieStoreId: container.cookieStoreId,
    }),
    container.cookieStoreId,
  ] as const;
}
async function getWorkspaceContainer(name: string) {
  const container = await browser.contextualIdentities
    .query({ name: name })
    .then((v) => v[0]);
  if (container) return container;
  const newContainer = await browser.contextualIdentities.create({
    name,
    color: 'red',
    icon: 'fingerprint',
  });
  return newContainer;
}
export const cookieIdLocks = new Set<string>();
export const openedWorkspaces = new Set<string>();

export const appRouter = t.router({
  listWorkspaces: t.procedure
    .output(localWorkspaceSchema.array())
    .query(async ({ ctx }) => {
      const dataDir = await getDataDir();
      const allWorkspaces = await ctx.nativeClient.listWorkspaces.query({
        options: { dataDir },
      });

      const containers = await browser.contextualIdentities.query({});

      const tabs = await browser.tabs.query({});
      return allWorkspaces.map((v) => {
        const container = containers.find((c) => c.name === v.name);
        const openedTab = container
          ? tabs.find((t) => t.cookieStoreId === container.cookieStoreId)
          : undefined;

        return {
          ...v,
          status: openedTab ? 'opened' : container ? 'stashed' : 'stored',
        };
      });
    }),
  closeWorkspace: t.procedure
    .input(
      z.object({
        name: z.string(),
        ignoreTabIds: z.number().array().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [openedTabs, cookieStoreId] = await getOpenedWorkspaceTabs(
        input.name,
      );
      if (!cookieStoreId) return;
      if (cookieIdLocks.has(cookieStoreId)) return;
      openedWorkspaces.delete(cookieStoreId);
      cookieIdLocks.add(cookieStoreId);
      try {
        const ids = openedTabs
          .map((v) => v.id)
          .filter((v) => typeof v === 'number')
          .filter((v) => !input.ignoreTabIds?.includes(v));
        await browser.tabs.remove(ids);
      } catch (error) {
        console.error(error);
      } finally {
        openedWorkspaces.delete(cookieStoreId);
        cookieIdLocks.delete(cookieStoreId);
      }
    }),
  getContainer: t.procedure.input(z.string()).query(async ({ input }) => {
    const container = await getWorkspaceContainer(input);
    return container;
  }),
  openWorkspace: t.procedure
    .input(
      z
        .object({
          cookieStoreId: z.string(),
          existingTabId: z.number().optional(),
        })
        .or(
          z.object({ name: z.string(), existingTabId: z.number().optional() }),
        ),
    )
    .mutation(async ({ input, ctx }) => {
      const cookieStoreId =
        'name' in input
          ? await getWorkspaceContainer(input.name).then((v) => v.cookieStoreId)
          : input.cookieStoreId;

      if (cookieIdLocks.has(cookieStoreId)) return;
      openedWorkspaces.add(cookieStoreId);
      cookieIdLocks.add(cookieStoreId);

      const name = await browser.contextualIdentities
        .get(cookieStoreId)
        .then((v: ContextualIdentities.ContextualIdentity | null) => v?.name);

      if (!name) return;

      const dataDir = await getDataDir();
      const allWorkspaces = await ctx.nativeClient.listWorkspaces.query({
        options: { dataDir },
      });
      const workspace = allWorkspaces.find((w) => w.name === name) ?? {
        name: input,
        tabs: [],
        bookmarks: [],
        history: [],
      };
      // const [openedTabs] = await getOpenedWorkspaceTabs(input);
      // if (openedTabs.length) return;

      async function openTab(persisted: PersistedTab, openerTabId?: number) {
        const tab = await browser.tabs.create({
          url: persisted.url,
          openerTabId,
          active: false,
          discarded: true,
          title: persisted.title,
          cookieStoreId,
        });
        for (const child of persisted.children) {
          await openTab(child, tab.id);
        }
      }
      try {
        let group: browser.tabs.Tab;
        if (input.existingTabId !== undefined) {
          group = await browser.tabs.update(input.existingTabId, {
            url: getGroupUrl(name),
            active: true,
            pinned: await getPinDashboard(),
          });
        } else {
          group = await browser.tabs.create({
            cookieStoreId,
            url: getGroupUrl(name),
            active: true,
            pinned: await getPinDashboard(),
          });
        }

        for (const tab of workspace.tabs) {
          await openTab(tab, group.id);
        }
        for (const tab of workspace.bookmarks) {
          await openTab(tab, group.id);
        }
      } finally {
        cookieIdLocks.delete(cookieStoreId);
      }
      return true;
    }),
  updateDataDir: t.procedure
    .input(z.string().nullable())
    .mutation(async ({ input }) => {
      await setDataDir(input);
      return input;
    }),
  getDataDir: t.procedure.query(async () => {
    try {
      return await getDataDir();
    } catch {
      return null;
    }
  }),
  updateNewTab: t.procedure
    .input(z.string().nullable())
    .mutation(async ({ input }) => {
      await setNewTab(input);
      return input;
    }),
  getNewTab: t.procedure.query(async () => {
    try {
      return await getNewTab();
    } catch {
      return null;
    }
  }),
  updatePinDashboard: t.procedure
    .input(z.boolean())
    .mutation(async ({ input }) => {
      await setPinDashboard(input);
      return input;
    }),
  getPinDashboard: t.procedure.query(async () => {
    try {
      return await getPinDashboard();
    } catch {
      return null;
    }
  }),
});

export type AppRouter = typeof appRouter;

export function getGroupUrl(input: string): string {
  return `${browser.runtime.getURL('/workspace.html')}#${encodeURIComponent(input)}`;
}
