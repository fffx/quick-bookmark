import { SEPARATOR } from "./constants";
import type Browser from "webextension-polyfill";

export type BookmarkTreeNode = Browser.Bookmarks.BookmarkTreeNode;

// A folder node annotated with search metadata by loadBookmarks.
export interface FolderNode extends BookmarkTreeNode {
  titlePrefix?: string | null;
  dirPath?: string | null;
  pinyinTitle?: string;
  firstLetter?: string;
  containsCurrentTab?: boolean;
  // Best match of this folder to the current tab (0–5). Used to surface
  // likely folders when the tab is not bookmarked yet.
  urlMatchScore?: number;
}

// Minimal shape needed by the sort comparator.
export interface SortableNode {
  containsCurrentTab?: boolean;
  urlMatchScore?: number;
  dateGroupModified?: number;
}

// Display path of a folder, e.g. "Root / Parent / Child".
export const fullTitle = (node: {
  title: string;
  titlePrefix?: string | null;
}): string =>
  node.titlePrefix
    ? `${node.titlePrefix}${SEPARATOR}${node.title}`
    : node.title;

export const sortNodes = (a: SortableNode, b: SortableNode): number => {
  if (a.containsCurrentTab && !b.containsCurrentTab) {
    return -1;
  } else if (b.containsCurrentTab && !a.containsCurrentTab) {
    return 1;
  }
  const scoreDiff = (b.urlMatchScore ?? 0) - (a.urlMatchScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return (b.dateGroupModified ?? 0) - (a.dateGroupModified ?? 0);
};

// Collects every node for which predicate returns true, walking the whole tree.
export function collectMatchingNodes(
  nodes: BookmarkTreeNode[],
  predicate: (node: BookmarkTreeNode) => boolean,
  results: BookmarkTreeNode[] = [],
): BookmarkTreeNode[] {
  for (const node of nodes) {
    if (predicate(node)) results.push(node);
    if (node.children) {
      collectMatchingNodes(node.children, predicate, results);
    }
  }
  return results;
}

/*
 * Walks the tree, annotating each folder with titlePrefix / dirPath and keeping
 * nodes that pass filterFn. Folder nodes (and nodes with children) are always
 * processed; leaf bookmarks that don't pass the filter are skipped entirely.
 */
export const filterRecursively = (
  nodeArray: BookmarkTreeNode[],
  parentNode: BookmarkTreeNode | null,
  filterFn: (node: FolderNode) => boolean,
  results: FolderNode[] = [],
): FolderNode[] => {
  const parentFolder = parentNode as FolderNode | null;

  // Pre-compute parent path information
  const parentTitlePrefix =
    parentFolder?.titlePrefix && parentFolder?.title
      ? `${parentFolder.titlePrefix}${SEPARATOR}${parentFolder.title}`
      : parentFolder?.title || null;

  for (const node of nodeArray) {
    const folderNode = node as FolderNode;
    const hasChildren = node.children && node.children.length > 0;

    // Set titlePrefix efficiently
    folderNode.titlePrefix = parentTitlePrefix;

    // Set dirPath based on whether it's a bookmark or folder.
    // Leaf bookmarks are skipped: they are filtered out below and never
    // searched or rendered, so computing their dirPath is wasted work.
    if (!node.url || hasChildren) {
      folderNode.dirPath = node.url
        ? parentTitlePrefix
          ? `${parentTitlePrefix}${SEPARATOR}${node.title}`
          : node.title
        : parentTitlePrefix || node.title;
    }

    if (filterFn(folderNode)) results.push(folderNode);

    // Recursively process children if they exist
    if (hasChildren) {
      filterRecursively(node.children!, node, filterFn, results);
    }
  }

  return results;
};
