import Fuse from 'fuse.js'
class FuseIndex {
    // https://www.fusejs.io/concepts/scoring-theory.html#fuzziness-score
    fuseOptions = {
        keys: [
            'pinyinTitle', 'firstLetter',
            {
                name: 'title',
                weight: 5
            },
            {
                name: 'dirPath',
                weight: 6
            }
        ],
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
    constructor(categoryNodes){
        this.fuse = new Fuse(categoryNodes, this.fuseOptions)
    }

    search(str){
        return this.fuse.search(str).map(x => x.item);
    }
}

export default FuseIndex
