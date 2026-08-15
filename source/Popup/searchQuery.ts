import { fullTitle } from "../lib/tree";
import type { BookmarkTreeNode, FolderNode } from "../lib/tree";
import { SEPARATOR } from "../lib/constants";
import type FuseIndex from "./searchEngine";
import type { SearchNode } from "./searchEngine";

// A "NEW" entry that lets the user create a folder and bookmark the current
// tab into it in one step.
export interface NewFolderNode {
  title: string;
  id: "NEW";
  parentTitle: string;
  parentId: string;
  children: never[];
  titlePrefix?: string | null;
  containsCurrentTab?: boolean;
  // When set, creates these folders in order (last is deepest) instead of a
  // single folder named `title`. Used to build a missing path like
  // "frontend / book" as nested folders.
  path?: string[];
}

export type CategoryNode = FolderNode | NewFolderNode;

// FolderNode.id is a plain string, so `node.id === "NEW"` cannot narrow the
// union on its own; use this predicate instead.
export const isNewFolderNode = (node: CategoryNode): node is NewFolderNode =>
  node.id === "NEW";

const createNewFolderButton = (
  title: string,
  parentNode: SearchNode,
): NewFolderNode => ({
  title,
  id: "NEW",
  parentTitle: fullTitle(parentNode),
  parentId: parentNode.id,
  children: [],
});

const createPathNewFolderButton = (
  title: string,
  parentNode: SearchNode,
  path: string[],
): NewFolderNode => ({
  title,
  id: "NEW",
  parentTitle: fullTitle(parentNode),
  parentId: parentNode.id,
  path,
  children: [],
});

// True when the typed path (e.g. "foo / bar") matches an existing folder
// plus one of its children, so the search should select it rather than
// offering to create a new one. Takes the already-computed parent matches.
const hasExactPathMatch = (
  parentMatches: SearchNode[],
  parentPath: string,
  lastPart: string,
  filteredNodes: SearchNode[],
): boolean => {
  if (parentMatches.length === 0 || parentMatches[0].title !== parentPath) {
    return false;
  }

  const fullPath = `${fullTitle(parentMatches[0])} / ${lastPart}`;
  return filteredNodes.some((node) => {
    const nodePath = fullTitle(node);
    return (
      nodePath === fullPath ||
      (node.title === lastPart &&
        node.titlePrefix &&
        node.titlePrefix.includes(parentMatches[0].title))
    );
  });
};

export interface SearchResults {
  categoryNodes: CategoryNode[];
  cursor: number;
}

/*
 * Computes the list of items to show for a search query.
 *
 * Returns { categoryNodes, cursor }. A path query ("foo / bar") first tries
 * to match the parent folder "foo" and offers to create "bar" inside it;
 * otherwise the full query is offered as a new folder under each root node.
 */
export const buildSearchResults = (
  text: string,
  {
    rootNodes,
    search,
  }: {
    rootNodes: BookmarkTreeNode[];
    search: FuseIndex;
  },
): SearchResults => {
  const texts = text.split("/").map((x) => x.trim());
  const isPathSearch = texts.length > 1;

  let lastPart: string | null = null;
  let parentPath = text;
  if (isPathSearch) {
    lastPart = texts.pop()!;
    parentPath = texts.join(" / ");
  }

  const filteredNodes = search.search(text);
  // Parent-path matches are shared between the exact-child-path check below
  // and the create options further down, so search only once.
  const parentMatches = isPathSearch ? search.search(parentPath) : [];

  // Check if we have an exact match for the full search text
  const hasExactMatch =
    filteredNodes.length > 0 && filteredNodes[0].title === text;

  // For path searches, check if we have an exact match for the child in the parent
  const hasExactChildMatch =
    isPathSearch &&
    hasExactPathMatch(parentMatches, parentPath, lastPart!, filteredNodes);

  if (hasExactMatch || hasExactChildMatch) {
    return { categoryNodes: filteredNodes, cursor: 0 };
  }

  const newBtns: NewFolderNode[] = [];

  // If we have a path like "foo / bar", search for parent directories
  // matching "foo" and offer to create "bar" inside them.
  if (isPathSearch) {
    // Limit to top 5 parent matches for performance
    const topParentMatches = parentMatches.slice(0, 5);
    if (topParentMatches.length > 0) {
      topParentMatches.forEach((x) => {
        newBtns.push(createNewFolderButton(lastPart!, x));
      });
    } else {
      // The parent folder doesn't exist. Offer to create the whole path under
      // each root folder, either as nested folders ("frontend" then "book")
      // or as a single flat folder named "frontend / book".
      const segments = [...texts, lastPart!];
      const fullPath = segments.join(SEPARATOR);
      rootNodes.forEach((x) => {
        newBtns.push(createPathNewFolderButton(fullPath, x, segments));
        newBtns.push(createNewFolderButton(fullPath, x));
      });
    }
  } else {
    // Also offer to create the full search text under root folders
    rootNodes.forEach((x) => {
      newBtns.push(createNewFolderButton(text, x));
    });
  }

  const cursor = !isPathSearch && filteredNodes.length > 0 ? newBtns.length : 0;
  return { categoryNodes: [...newBtns, ...filteredNodes], cursor };
};

// Slice of categoryNodes to render around the cursor, so only a fixed number
// of items is mounted at once (performance for very large trees).
export const getVisibleWindow = (
  nodes: CategoryNode[],
  cursor: number,
  maxVisibleItems: number,
): { visibleNodes: CategoryNode[]; startIndex: number } => {
  if (nodes.length <= maxVisibleItems) {
    return { visibleNodes: nodes, startIndex: 0 };
  }
  const half = Math.floor(maxVisibleItems / 2);
  const start = Math.max(0, cursor - half);
  return {
    visibleNodes: nodes.slice(start, start + maxVisibleItems),
    startIndex: start,
  };
};
