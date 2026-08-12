import Fuse from "fuse.js";

const FUSE_OPTIONS = {
  // https://www.fusejs.io/concepts/scoring-theory.html#fuzziness-score
  findAllMatches: false,
  isCaseSensitive: false,
  ignoreLocation: true,
  ignoreFieldNorm: true,
};

export default class FuseIndex {
  constructor(categoryNodes, isSupportPinyin) {
    const keys = [
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

  search(str, limit = 1000) {
    return this.fuse.search(str, { limit }).map((x) => x.item);
  }
}
