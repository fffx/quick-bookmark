import Fuse from 'fuse.js'
class FuseIndex {
    // https://www.fusejs.io/concepts/scoring-theory.html#fuzziness-score
    fuseOptions = {
        // threshold: {
        //     pinyinTitle: 0.5,
        //     firstLetter: 0.5,
        //     title: 0.8,
        //     titlePrefix: 0.7
        // },
        findAllMatches: false,
        isCaseSensitive: false,
        ignoreLocation: true,
        ignoreFieldNorm: true
    }
    constructor(categoryNodes, isSupportPinyin){
        const keys = [
            { name: 'title', weight: 5 },
            { name: 'dirPath', weight: 6 }
        ]
        // Only index pinyin fields when they are populated (Chinese users).
        // For other languages pinyinTitle duplicates title, doubling work.
        if (isSupportPinyin) {
            keys.unshift('pinyinTitle', 'firstLetter')
        }
        this.fuse = new Fuse(categoryNodes, { ...this.fuseOptions, keys })
    }

    search(str, limit = 1000){
        return this.fuse.search(str, { limit }).map(x => x.item);
    }
}

export default FuseIndex
