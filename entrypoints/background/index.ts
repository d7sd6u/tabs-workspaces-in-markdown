/* eslint-disable @typescript-eslint/no-misused-promises */
import { PersistedTab, Workspace } from '@/nativeapp/schema';
import { createTRPCProxyClient } from '@trpc/client';
import { createCallerFactory } from '@trpc/server';
import debounce from 'lodash-es/debounce';
import { createChromeHandler } from 'trpc-browser/adapter';

import type { AppRouter as NativeAppRouter } from '../../nativeapp/router';
import { nativeLink } from '../../trpc-native/link';
import {
  appRouter,
  cookieIdLocks,
  getGroupUrl,
  openedWorkspaces,
} from './router';
import { getDataDir, getNewTab, setDataDir } from './storage';

declare global {
  interface ImportMetaEnv {
    readonly WXT_DEV_VAULT?: string;
  }
}

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  if (import.meta.env.WXT_DEV_VAULT)
    void setDataDir(import.meta.env.WXT_DEV_VAULT);

  void browser.tabs.query({}).then((v) => {
    v.forEach((v) => openedWorkspaces.add(v.cookieStoreId ?? ''));
  });
  const nativeClient = createTRPCProxyClient<NativeAppRouter>({
    links: [
      nativeLink({ port: browser.runtime.connectNative('tabs_md_workspaces') }),
    ],
  });

  createChromeHandler({
    router: appRouter,
    createContext: () => ({ nativeClient }),
    onError: console.error,
  });
  const caller = createCallerFactory()(appRouter)({ nativeClient });

  const tabIdToCookieStoreId = new Map<number, string | undefined>();
  const tabIdToUrl = new Map<number, string | undefined>();

  async function updateWorkspace(cookieStoreId: string) {
    if (!openedWorkspaces.has(cookieStoreId)) return;
    const container = (await browser.contextualIdentities.get(
      cookieStoreId,
    )) as browser.contextualIdentities.ContextualIdentity | undefined;
    if (!container) return;

    const dataDir = await getDataDir();
    const existingWorkspace: Workspace = (await nativeClient.listWorkspaces
      .query({ options: { dataDir } })
      .then((v) => v.find((v) => v.name === container.name))) ?? {
      name: container.name,
      history: [],
      bookmarks: [],
      tabs: [],
    };
    const name = container.name;
    const all = await browser.tabs.query({
      cookieStoreId: container.cookieStoreId,
    });
    const root = all.filter((v) => v.url === getGroupUrl(container.name));
    const fromroot = await Promise.all(
      root.map(async (v) => browser.tabs.query({ openerTabId: v.id })),
    ).then((a) => a.flat());
    const topmost = [
      ...all.filter(
        (v) =>
          (v.openerTabId === undefined ||
            (v.openerTabId && !all.find((a) => a.id === v.openerTabId))) &&
          v.url !== getGroupUrl(container.name),
      ),
      ...fromroot,
    ];

    const visited = new Set<number | undefined>();
    async function browserTabToPersistedTab(
      tab: browser.tabs.Tab,
    ): Promise<PersistedTab[]> {
      if (visited.has(tab.id)) return [];
      visited.add(tab.id);
      const tabs = await browser.tabs.query({ openerTabId: tab.id });
      const persistedTabs = await Promise.all(
        tabs.map(async (v) =>
          browserTabToPersistedTab(v).then((v) => v.flat()),
        ),
      ).then((v) => v.flat());
      if (
        existingWorkspace.bookmarks.some((b) => b.url === tab.url) ||
        tab.url === getGroupUrl(name)
      )
        return persistedTabs;
      return [
        {
          url: tab.url ?? 'about:blank',
          title: tab.title ?? 'empty',
          children: persistedTabs,
        },
      ];
    }
    existingWorkspace.tabs = [];
    for (const tab of topmost) {
      existingWorkspace.tabs.push(...(await browserTabToPersistedTab(tab)));
    }

    await nativeClient.updateWorkspace.mutate({
      workspace: existingWorkspace,
      options: { dataDir },
    });
  }
  const sync = debounce(function sync(cookieStoreId: string) {
    updateWorkspace(cookieStoreId).catch(console.error);
  }, 500);
  const withErrorLog = <R extends Promise<unknown>, A extends unknown[]>(
    fn: (...args: A) => R,
  ): typeof fn => {
    return (...args) => fn(...args).catch(console.error) as R;
  };
  browser.tabs.onRemoved.addListener(
    withErrorLog(async (tabId) => {
      const cookieStoreId = tabIdToCookieStoreId.get(tabId);
      if (!cookieStoreId || cookieIdLocks.has(cookieStoreId)) return;
      const name = await browser.contextualIdentities
        .get(cookieStoreId)
        .then((v) => v.name);
      if (tabIdToUrl.get(tabId) === getGroupUrl(name)) {
        await caller.closeWorkspace({ name, ignoreTabIds: [tabId] });
      } else {
        sync(cookieStoreId);
      }
      tabIdToCookieStoreId.delete(tabId);
      tabIdToCookieStoreId.delete(tabId);
    }),
  );
  browser.tabs.onUpdated.addListener(
    withErrorLog(async (tabId, _, tab) => {
      tabIdToCookieStoreId.set(tabId, tab.cookieStoreId);
      tabIdToUrl.set(tabId, tab.url);
      if (
        !tab.cookieStoreId ||
        tab.cookieStoreId === 'firefox-default' ||
        cookieIdLocks.has(tab.cookieStoreId) ||
        tab.url === 'about:blank'
      )
        return;
      const workspaceOpened =
        tab.cookieStoreId && !openedWorkspaces.has(tab.cookieStoreId);
      const existingTabs = await browser.tabs.query({
        cookieStoreId: tab.cookieStoreId,
      });
      if (workspaceOpened) {
        const isFirstCreatedNewTab =
          ['about:newtab', 'about:blank', await getNewTab()].includes(
            tab.url ?? '',
          ) &&
          existingTabs.length <= 1 &&
          !tab.url?.includes('workspace.html');
        await caller
          .openWorkspace({
            cookieStoreId: tab.cookieStoreId,
            existingTabId: isFirstCreatedNewTab ? tab.id : undefined,
          })
          .catch(async (v: unknown) => {
            console.error(v);
            await browser.tabs.create({
              url: browser.runtime.getURL('/error.html'),
            });
            return false;
          });
      } else sync(tab.cookieStoreId);
    }),
  );

  browser.contextMenus.create({
    contexts: ['tab'],
    title: 'Close workspace',
    onclick: (_, tab) => {
      if (tab.cookieStoreId && !!/\d/.exec(tab.cookieStoreId))
        browser.contextualIdentities
          .get(tab.cookieStoreId)
          .then((v) =>
            caller.closeWorkspace({
              name: v.name,
            }),
          )
          .catch(console.error);
    },
  });
});
