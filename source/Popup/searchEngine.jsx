import Fuse from 'fuse.js/dist/fuse.basic.esm.js'
// import FlexSearch from 'flexsearch'
// import Fuzzysort from 'fuzzysort'

// https://github.com/farzher/fuzzysort

class FuseIndex {
    fuseOptions = {
        keys: ['pinyinTitle', 'firstLetter', 'title', 'titlePrefix'],
        threshold: 0.3,
        findAllMatches: false,
        isCaseSensitive: false
    }
    constructor(categoryNodes){
        this.fuse = new Fuse(categoryNodes, this.fuseOptions)
    }

    search(str){
        return this.fuse.search(str).map(x => x.item);
    }
}   

/* class FuzzysortIndex {
    constructor(categoryNodes){
        this.fuse = new Fuse(categoryNodes, this.fuseOptions)
    }

    search(str){

    }
} */

/* class FlexIndex{
    options = {
        keys: ['pinyinTitle', 'firstLetter', 'title', 'titlePrefix'],
        threshold: 0.3,
        findAllMatches: true,
        isCaseSensitive: false
    }
    constructor(categoryNodes){
        this.index = new FlexSearch()
        this.index.add(categoryNodes)
    }

    search(str){
        return this.index.search(str, { limit: 15}).map(x => x.item);
    }
}
 */

export default FuseIndex