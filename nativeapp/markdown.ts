import {
  Data,
  Heading,
  Link,
  List,
  ListItem,
  Literal,
  Paragraph,
  Root,
  Text,
} from 'mdast';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import { select } from 'unist-util-select';

import type { PersistedLink, PersistedTab, Workspace } from './schema';

const processor = remark()
  .data('settings', {
    bullet: '-',
    tightDefinitions: true,
    join: [
      (left, right) =>
        (left.type === 'paragraph' && right.type === 'list') ||
        (left.type === 'listItem' && right.type === 'listItem')
          ? 0
          : null,
    ],
  })
  .use(remarkFrontmatter);

interface YamlO extends Literal {
  type: 'yaml';
  data?: Data;
}

declare module 'mdast' {
  interface FrontmatterContentMap {
    // Allow using TOML nodes defined by `remark-frontmatter`.
    yaml: YamlO;
  }
}
export function mdToWorkspace(file: string, name: string): Workspace {
  const root = processor.parse(file);
  return {
    name,
    history: getSection(root, 'History'),
    tabs: getSection(root, 'Tabs'),
    bookmarks: getSection(root, 'Bookmarks'),
  };
}
export function extractFrontmatter(file: string): unknown {
  const root = processor.parse(file);

  return YAML.parse(
    root.children.find((v) => v.type === 'yaml')?.value ?? '{}',
  );
}
export function updateMdWithWorkspace(
  file: string,
  workspace: Workspace,
): Promise<string> {
  return processor()
    .use(updateWorkspace(workspace))
    .process(file)
    .then((v) => v.toString());
}

function updateWorkspace(workspace: Workspace) {
  return () =>
    function (tree: Root) {
      updateSection(tree, 'History', workspace.history);
      updateSection(tree, 'Bookmarks', workspace.bookmarks);
      updateSection(tree, 'Tabs', workspace.tabs);
    };
}

function getSection(tree: Root, sectionName: string): PersistedTab[] {
  const list = select(`${sectionHeader(sectionName)} + list`, tree) as
    | List
    | undefined;
  if (list) {
    return list.children.map(listItemToPersistentTab).filter((v) => v !== null);
  } else {
    return [];
  }
}

function listItemToPersistentTab(listItem: ListItem): PersistedTab | null {
  const link = select('link', listItem) as Link | undefined;
  const linkText = select('link > text', listItem) as Text | undefined;
  const list = select('list', listItem) as List | undefined;
  if (!link || !linkText) return null;
  return {
    title: linkText.value,
    url: link.url,
    children:
      list?.children.map(listItemToPersistentTab).filter((v) => v !== null) ??
      [],
  };
}

const sectionHeader = (sectionName: string) =>
  `heading[depth="2"]:has(> text[value="${sectionName}"])`;

function updateSection(
  tree: Root,
  sectionName: string,
  tabs: (PersistedTab | PersistedLink)[],
) {
  const list = select(`${sectionHeader(sectionName)} + list`, tree) as
    | List
    | undefined;
  const heading = select(sectionHeader(sectionName), tree) as
    | Heading
    | undefined;
  if (list) {
    list.children = tabs.map(persistedTabToListItem);
  } else if (heading) {
    tree.children.splice(tree.children.findIndex((v) => v === heading) + 1, 0, {
      type: 'list',
      children: tabs.map(persistedTabToListItem),
    });
  }
}

function persistedTabToListItem(tab: PersistedTab | PersistedLink): ListItem {
  const link: Paragraph = {
    type: 'paragraph',
    children: [
      {
        type: 'link',
        children: [{ type: 'text', value: tab.title }],
        url: tab.url,
      },
    ],
  };
  const sublist: List = {
    type: 'list',
    children: 'children' in tab ? tab.children.map(persistedTabToListItem) : [],
  };
  return {
    type: 'listItem',
    children:
      'children' in tab && tab.children.length ? [link, sublist] : [link],
  };
}
