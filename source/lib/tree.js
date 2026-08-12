import { SEPARATOR } from "./constants";

// Display path of a folder, e.g. "Root / Parent / Child".
export const fullTitle = (node) =>
  node.titlePrefix
    ? `${node.titlePrefix}${SEPARATOR}${node.title}`
    : node.title;

export const sortNodes = (a, b) => {
  if (a.containsCurrentTab && !b.containsCurrentTab) {
    return -1;
  } else if (b.containsCurrentTab && !a.containsCurrentTab) {
    return 1;
  } else {
    return b.dateGroupModified - a.dateGroupModified;
  }
};

// Collects every node for which predicate returns true, walking the whole tree.
export function collectMatchingNodes(nodes, predicate, results = []) {
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
  nodeArray,
  parentNode,
  filterFn,
  results = [],
) => {
  // Pre-compute parent path information
  const parentTitlePrefix =
    parentNode?.titlePrefix && parentNode?.title
      ? `${parentNode.titlePrefix}${SEPARATOR}${parentNode.title}`
      : parentNode?.title || null;

  for (const node of nodeArray) {
    const hasChildren = node.children && node.children.length > 0;

    // Set titlePrefix efficiently
    node.titlePrefix = parentTitlePrefix;

    // Set dirPath based on whether it's a bookmark or folder.
    // Leaf bookmarks are skipped: they are filtered out below and never
    // searched or rendered, so computing their dirPath is wasted work.
    if (!node.url || hasChildren) {
      node.dirPath = node.url
        ? parentTitlePrefix
          ? `${parentTitlePrefix}${SEPARATOR}${node.title}`
          : node.title
        : parentTitlePrefix || node.title;
    }

    if (filterFn(node)) results.push(node);

    // Recursively process children if they exist
    if (hasChildren) {
      filterRecursively(node.children, node, filterFn, results);
    }
  }

  return results;
};
