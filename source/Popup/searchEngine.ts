import Fuse from "fuse.js";
import type { FuseOptionKey } from "fuse.js";
import type { BookmarkTreeNode } from "../lib/tree";

// A bookmark node annotated with search metadata.
export type SearchNode = BookmarkTreeNode & {
  titlePrefix?: string | null;
  dirPath?: string | null;
  pinyinTitle?: string;
  firstLetter?: string;
};

const FUSE_OPTIONS = {
  // https://www.fusejs.io/concepts/scoring-theory.html#fuzziness-score
  findAllMatches: false,
  isCaseSensitive: false,
  ignoreLocation: true,
  ignoreFieldNorm: true,
};

export default class FuseIndex {
  private fuse: Fuse<SearchNode>;

  constructor(categoryNodes: SearchNode[], isSupportPinyin: boolean) {
    const keys: FuseOptionKey<SearchNode>[] = [
      { name: "title", weight: 5 },
      { name: "dirPath", weight: 6 },
    ];
    // Only index pinyin fields when they are populated (Chinese users).
    // For other languages pinyinTitle duplicates title, doubling work.
    if (isSupportPinyin) {
      keys.unshift("pinyinTitle", "firstLetter");
    }
    this.fuse = new Fuse(categoryNodes, { ...FUSE_OPTIONS, keys });
  }

  search(str: string, limit = 1000): SearchNode[] {
    return this.fuse.search(str, { limit }).map((x) => x.item);
  }
}
